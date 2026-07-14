/*
    Route for Stripe payments

    When a user hits "checkout" on the site, the frontend can't talk to Stripe directly with the secret key
     because that would expose it to anyone who opens DevTools. So instead, the frontend calls the server (POST /api/payments/create-intent), 
     and the server talks to Stripe on its behalf.
*/
import Stripe from "stripe";
import express from "express";
import Product from "../models/Product.js"
import Order from "../models/Order.js";
import mongoose from "mongoose";

// initialize Strip with secret key from env
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const router = express.Router();


// POST /api/payments/create-intent
router.post("/create-intent", async (req, res) => {

    try {
        const { orderId } = req.body; // items & shipping cost sent from the cart

       // verify the orderId is valid
       if (!mongoose.Types.ObjectId.isValid(orderId)){
            return res.status(400).json({ error: "Invalid order ID" });
       }
    
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ error: "Order not found" });

        if (order.paymentConfirmed) return res.status(400).json({ error: "Order already paid" });

        // read the stored total — same formula confirm-payment uses, so the two always agree
        const totalCents = Math.round((order.totalPrice + order.shippingCost) * 100);

        // create paymentIntent - strip holds payment until we confirm it - amount must be in the smallest currency unit (cents for USD)
        const paymentIntent = await stripe.paymentIntents.create({
            amount: totalCents,
            currency: "usd",
         // automatic_payment_methods lets Stripe show the right payment options
         // (card, Apple Pay, Google Pay, etc.) based on the customer's browser
            automatic_payment_methods: { enabled: true },
            metadata: { orderId: order._id.toString() }, //binding paymentintent to a specific order ID
        });

        // send only clientSecret to frontend, stripe elements uses this to securely collect and confirm payment
        // never send the full payment intent object it contains sensitive data
        res.json({clientSecret: paymentIntent.client_secret });
    } catch (err) {
        console.error("Stripe Error: ", err);
        res.status(500).json({ error: "Payment failed"});
    }
});
export default router;