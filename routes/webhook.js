/*
    Stripe webhook route - SERVER SIDE source of truth for payment confirmation

    Why this exists: the client calling /confirm-payment can fail (closed tab,
    dropped network). Stripe calls THIS endpoint directly, server-to-server, so
    confirmation happens regardless of what the customer's browser does.

    Security: every call is verified against STRIPE_WEBHOOK_SECRET. An attacker
    can't fake a "payment succeeded" because they can't forge Stripe's signature.

    IMPORTANT: this route needs the RAW request body (not parsed JSON) for
    signature verification — see how it's mounted in server.js.
*/
import express from "express";  
import Stripe from "stripe";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { sendOrderEmails, sendPaymentMismatchAlert, sendPaymentReviewEmail } from "../utils/orderEmails.js";
import { reReserveStock } from "../utils/stock.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

router.post("/", async (req, res) => {

    const sig = req.headers["stripe-signature"];    
    let event;

    // verify the signature - req.body here is the RAW buffer, not parsed JSON
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error("Webhook signature verification failed.", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    // we only care about successful payment events, ignore others
    if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata.orderId;

        try {
            const order = await Order.findById(orderId);
            if (!order) {
                console.warn(`Webhook: order ${orderId} not found`);
                return res.json({ received: true });
            }

            const expectedCents = Math.round((order.totalPrice + order.shippingCost) * 100);
            if (paymentIntent.amount !== expectedCents) {
                console.warn(`Webhook amount mismatch for order ${orderId}: expected ${expectedCents}, got ${paymentIntent.amount}`);
                sendPaymentMismatchAlert({ orderId, expectedCents, actualCents: paymentIntent.amount, source: "webhook" })
                    .catch(err => console.error("Mismatch alert email failed:", err.message));
                sendPaymentReviewEmail(order)
                    .catch(err => console.error("Customer review email failed:", err.message));
                return res.json({ received: true });
            }

            // atomic claim — see confirm-payment for the why
            const claimed = await Order.findOneAndUpdate(
                { _id: order._id, paymentConfirmed: false },
                { $set: { paymentConfirmed: true } },
                { returnDocument: "after" }
            );
            if (!claimed) return res.json({ received: true }); // already handled elsewhere

            // expired-race guard
            if (claimed.status === "expired" || claimed.stockRestored) {
                const result = await reReserveStock(claimed.items);
                if (!result.ok) {
                    await stripe.refunds.create({ payment_intent: paymentIntent.id });
                    claimed.paymentConfirmed = false;
                    claimed.status = "refunded";
                    await claimed.save();
                    console.warn(`Order ${orderId} expired and sold out — refunded via webhook`);
                    return res.json({ received: true });
                }
                claimed.stockRestored = false;
                claimed.status = "pending";
                await claimed.save();
            }

            sendOrderEmails(claimed).catch(err => console.error("Webhook order email failed:", err.message));
            console.log(`Order ${orderId} confirmed via webhook`);
        } catch (err) {
            console.error("Webhook order processing failed:", err.message);
            return res.status(500).json({ error: "Webhook order processing failed" });
        }
    }
    res.json({ received: true });
});

export default router;
