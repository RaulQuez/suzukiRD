/*
    Order route - all order related endpoints

    Public routes (customers can call these):
    POST /api/orders — place a new order (checkout)

    Admin only routes (require JWT token):
    GET  /api/orders — view all orders, filter by status
    GET  /api/orders/:id — view one order in detail
    PATCH /api/orders/:id/status — update order status
    PATCH /api/orders/:id/notes — add internal admin notes
*/
import express from "express";
import mongoose from "mongoose";
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import authenticate from '../middleware/authenticate.js';
import nodemailer from "nodemailer";
import Stripe from "stripe"
import { cleanHeader, isValidEmail } from '../utils/sanitize.js';
import { sendOrderEmails } from '../utils/orderEmails.js';   
import { calculateShipping, ShippingError } from "../utils/calculateShipping.js";
import { reReserveStock } from "../utils/stock.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/*
    sends a status update email to the customer when the admin changes an order's status
    email for: confirmed, shipped, delivered, cancelled, refunded - we skip pending because its the default state on order creation
*/
const sendStatusEmail = async (order, newStatus) => {
    // only email for statuses the customer cares about
    const emailableStatuses = ["confirmed", "shipped", "delivered", "cancelled", "refunded"];

    // validate the newStatus received
    if(!emailableStatuses.includes(newStatus)) return;

    if (!isValidEmail(order.customer.email)) {
        console.warn(`Skipping status email for order ${order._id}: invalid email`);
        return;   
    }
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.CONTACT_GMAIL,
            pass: process.env.CONTACT_PW,
        },
    });

    // subject & message body change based on the new status so each status gets a relevant message so the email feels fresh/personal
    const statusMessages = {
        confirmed: {
            subject: `Order Confirmed — Suzuki Racing Development #${order._id}`,
            body: `Hi ${order.customer.name},\n\nGreat news — your order has been confirmed and is being prepared for shipment.\n\nOrder ID: ${order._id}\nTotal: $${order.totalPrice.toFixed(2)}\n\nWe'll send you another update when your order ships.\n\nTrack your order at:\nhttps://suzukird.com/track-order\n\n— Suzuki Racing Development`,
        },
        shipped: {
            subject: `Your Order Has Shipped — Suzuki Racing Development #${order._id}`,
            body: `Hi ${order.customer.name},\n\nYour order is on its way!\n\nOrder ID: ${order._id}\nTotal: $${order.totalPrice.toFixed(2)}${
            order.trackingNumber
            ? `\n\nUPS Tracking Number: ${order.trackingNumber}\nTrack it live:\nhttps://www.ups.com/track?tracknum=${order.trackingNumber}`
            : ""
            }\n\nShipping to:\n${order.shippingAddress.fullname}\n${order.shippingAddress.street}\n${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}\n\n— Suzuki Racing Development`,
        },
        delivered: {
            subject: `Order Delivered — Suzuki Racing Development #${order._id}`,
            body: `Hi ${order.customer.name},\n\nYour order has been delivered. We hope you enjoy your new parts!\n\nOrder ID: ${order._id}\n\nIf you have any questions or issues, please don't hesitate to contact us.\n\nhttps://suzukird.com/contact\n\n— Suzuki Racing Development`,
        },
        cancelled: {
            subject: `Order Cancelled — Suzuki Racing Development #${order._id}`,
            body: `Hi ${order.customer.name},\n\nYour order #${order._id} has been cancelled.\n\nIf you have any questions about this cancellation, please contact us at:\nhttps://suzukird.com/contact\n\n— Suzuki Racing Development`,
        },
        refunded: {
            subject: `Refund Issued — Suzuki Racing Development #${order._id}`,
            body: `Hi ${order.customer.name},\n\nA refund has been issued for your order #${order._id}.\n\nRefunds typically take 5-10 business days to appear on your statement depending on your bank.\n\nIf you have any questions, contact us at:\nhttps://suzukird.com/contact\n\n— Suzuki Racing Development`,
        },
    };

    const { subject, body } = statusMessages[newStatus];
    
    await transporter.sendMail({
        from: process.env.CONTACT_GMAIL,
        to: cleanHeader(order.customer.email),
        subject: cleanHeader(subject),
        text: body,
    });
};

// puts stock back for a list of { product, quantity } — used on rollback and cancellation
const restoreStock = async (reserved) => {
    await Promise.all(
        reserved.map(r =>
            Product.updateOne({ _id: r.product }, { $inc: { stock: r.quantity } })
        )
    );
};

const router = express.Router();

/*
    POST /api/orders
    Places a new order - checkout endpoint
    Called when customer submits their cart

    No authentication required

    example body: 
    {
        "customer": { "name": "John", "email": "john@gmail.com", "phone": "305..." },
        "items": [
            { "productId": "64abc123", "quantity": 2 },
            { "productId": "64abc456", "quantity": 1 }
        ],
        "shippingAddress": { "fullName": "John", "street": "123 Main", "city": "Miami", "state": "FL", "zipCode": "33101", "country": "US" }
    }
*/
router.post("/", async (req, res) => {
    try {
        const { customer, items, shippingAddress } = req.body;
    
        // validate all 3 
        if (!customer || !items || !shippingAddress) {
            return res.status(400).json({ error: "Customer, items, and shipping address are required" });
        }
        // check if items is actaully an array & if there are items
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "Order must contain at least one item" });
        }
    /*
    extract all productIds from the cart items.
    .map transforms each item into just its productId string, then we fetch all those products in 1 query
    instead of querying the db once per item

    Example: 
    items = [{ productId: "64abc", quantity: 2 }, { productId: "64def", quantity: 1 }]
    productIds = ["64abc", "64def"]
    */
        const productIds = items.map(item => item.productId);

    // $in is a mongodb operator that matches any document whose _id is provided in array, one query returns all matching products
        const products = await Product.find({ _id: {$in: productIds } }); // extracts the product in which matches the productIds

    /*
    Build a Map for O(1) lookups by product id.
    A Map is like an object but optimized for frequent lookups.
    productMap.get("64abc123") instantly returns that product.

    Without this, for each cart item you'd have to loop through
    the entire products array to find the matching one — O(n²).
    With a Map it's O(1) per lookup — much faster.

    .toString() converts the MongoDB ObjectId to a plain string
    so it works as a Map key.
    */
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    // build the order items array - creates a snapshot. for each item in the cart we look up the real product and copy its current properties into the order
    let totalPrice = 0;
    const orderItems = [];

    for (const item of items){
        // validate 
        if (!item.productId || !item.quantity || item.quantity < 1 || !Number.isInteger(item.quantity)) { // veriify the quantity is a positive integer, not a float or negative number
          return res.status(400).json({ error: "Each item needs a productId and quantity >= 1" });
        }

        const product = productMap.get(item.productId);

        // if the product wasnt found - we reject the whole order rather than skipping the item - notify customer
        if (!product) {
          return res.status(404).json({ error: `Product not found: ${item.productId}` });   
        }
        // check stock
        if (product.stock < item.quantity) {
         return res.status(400).json({ error: `Not enough stock for "${product.name}". Available: ${product.stock}` });       
        }

        // build order item with price snapshot, use product.price from DB not any price the client sends - .push method that adds elements to the end of an array
        orderItems.push({
            product: product._id,
            name: product.name,  // snapshots
            price: product.price,
            imageUrl: product.imageUrl,
            quantity: item.quantity,
            selectedVariant: item.selectedVariant || null,
        });

        // accumulate totalprice using db prices
        totalPrice += product.price * item.quantity;
    }

    // build the shipping calculation server side before stock reservation loop
    // import { calculateShipping, ShippingError } from "../utils/calculateShipping.js";
    
    let shippingCost;
    try {
        shippingCost = (await calculateShipping(
            items.map(i => ({ productId: i.productId, quantity: i.quantity })),
            {
                city: shippingAddress.city,
                state: shippingAddress.state,
                zip: shippingAddress.zipCode, // schema field is zipCode & calculateShipping takes zipCode
                country: shippingAddress.country,
            }
        )).cost;
    } catch (err) {
        if (err instanceof ShippingError) return res.status(err.status).json({ error: err.message});
        throw err;
    }

    // pass 2 
    const reserved = [];
    for (const item of orderItems) {
        const updated = await Product.findOneAndUpdate(
            { _id: item.product, stock: { $gte: item.quantity } }, // only update if stock is enough
            { $inc: { stock: -item.quantity } }, // decrement stock
            { new: true } // return the updated product
        );
        if (!updated) {
            await restoreStock(reserved); // rollback any stock we already reserved
            return res.status(400).json({ error: `"${item.name}" just sold out. Please try again later.` });
        }
        reserved.push({ product: item.product, quantity: item.quantity }); // keep track of what we reserved so we can roll it back if needed
    }
    
    // create & save order - all stock checks passed, products exist & total is calculated
    const order = new Order({
        customer,
        items: orderItems,
        shippingAddress,
        totalPrice,
        shippingCost: shippingCost || 0,
        status: "pending", // always starts as pending
    });

    const savedOrder = await order.save(); // we save the order to mongodb & hand it to savedOrder to give it to the frontend later

    res.status(201).json(savedOrder);
    

    /* fire and forget - we send email after responding to the customer.
            
        WHY AFTER res.json():
        res.json() sends the response immediately. The customer's browser
        gets the confirmation right away without waiting for emails to send.
        Nodemailer can take 1-2 seconds — we don't want to make the customer
        wait for that.

        WHY .catch() instead of await:
        If the email fails for any reason (Gmail down, wrong credentials),
        the order is already saved and the customer already got their 201.
        We log the error so you can investigate but we never crash the request.
        A failed email should never undo a valid order.
    */

    // dont send email unit after user pays
    // sendOrderEmails(savedOrder).catch(err => {
    //     console.error("Order email failed: ", err.message);
    // });

    } catch (err) {        
        if (err.name === "ValidationError") {
            return res.status(400).json({ error: err.message });
        }
        console.error("POST /orders error: ", err);
        res.status(500).json({ error: "Failed to place order" });
    }
});

router.patch("/:id/confirm-payment", async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid order ID" });

        const { paymentIntentId } = req.body;
        if (!paymentIntentId) return res.status(400).json({ error: "Payment verification required" });

        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: "Order not found" });
        if (order.paymentConfirmed) return res.json({ message: "Payment already confirmed", order });

        // verify with Stripe — the source of truth
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.status !== "succeeded") return res.status(400).json({ error: "Payment not completed" });
        if (paymentIntent.metadata.orderId !== order._id.toString()) return res.status(400).json({ error: "Payment does not match this order" });

        const expectedCents = Math.round((order.totalPrice + order.shippingCost) * 100);
        if (paymentIntent.amount !== expectedCents) {
            console.warn(`Payment amount mismatch on order ${order._id}: expected ${expectedCents}, got ${paymentIntent.amount}`);
            return res.status(400).json({ error: "Payment amount mismatch" });
        }

        // Atomically claim the order — only ONE confirmer (this route OR the webhook)
        // wins. The loser gets null and stops, so the stock logic never runs twice.
        const claimed = await Order.findOneAndUpdate(
            { _id: order._id, paymentConfirmed: false },
            { $set: { paymentConfirmed: true } },
            { returnDocument: "after" }
        );
        if (!claimed) return res.json({ message: "Payment already confirmed", order });

        // Expired-race guard: if the sweep already released this order's stock,
        // re-reserve it. If it's genuinely sold out now, refund and stop.
        if (claimed.status === "expired" || claimed.stockRestored) {
            const result = await reReserveStock(claimed.items);
            if (!result.ok) {
                await stripe.refunds.create({ payment_intent: paymentIntentId });
                claimed.paymentConfirmed = false;   // money returned — not a confirmed sale
                claimed.status = "refunded";
                await claimed.save();
                return res.status(409).json({
                    error: `"${result.soldOut}" sold out before your payment completed. You were not charged — a refund has been issued.`,
                });
            }
            claimed.stockRestored = false;          // stock is ours again
            claimed.status = "pending";             // back into the normal flow
            await claimed.save();
        }

        res.json({ message: "Payment confirmed", order: claimed });
        sendOrderEmails(claimed).catch(err => console.error("Order email failed: ", err.message));
    } catch (err) {
        console.error("PATCH /orders/:id/confirm-payment error", err);
        res.status(500).json({ error: "Failed to confirm payment" });
    }
});
/*
    GET /api/orders/track - public route No authentication required. 
    Lets customers loop up their own order by email + orderId

    No accounts all users checkout as guests hence - email + orderId

    Query params: GET /api/orders/track?orderId=64abc123&email=join@gmail.com
    Returns safe order data - status, items, shipping details - DOES NOT return internal notes or admin-only fields

    here we are creating the orders array and getting the value from the database but then we do res.json to send it to the frontend with allowed fields when its called
*/
router.get("/track", async (req,res) => {
    try {
        const { orderId, email } = req.query;

        // both fields are required - reject early if either are missing
        if (!orderId || !email) {
            return res.status(400).json({ error: "Order ID and email are required" });
        } 

        // validate the orderId format before hitting MongoDB. if its not a valid 24-char hex string Mongo throws
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(404).json({ error: "Order not found" });
        }
        
        // find the order by ID first. verify the email seperately
        const order = await Order.findById(orderId).lean(); // .lean() tells Mongoose to return a plain JavaScript object instead of a full Mongoose document.

    /*
        Two failure cases return the same 404:
        1. Order doesn't exist
        2. Order exists but email doesn't match

        This prevents enumeration — an attacker can't tell if an
        order ID exists or if they just got the email wrong.

        .toLowerCase() on both sides makes it case-insensitive,
        same as how we store it in the Order model.
    */
        if (!order || order.customer.email.toLowerCase() !== email.toLowerCase().trim()) {
            return res.status(404).json({ error: "Order not found" });
        }

        // we return a safe subset of the order and only omit internal only fields like notes, customer only needs whats relevant to them
        res.json({
            _id: order._id,
            status: order.status,
            createdAt: order.createdAt,
            totalPrice: order.totalPrice,
            items: order.items,
            shippingAddress: order.shippingAddress,
            trackingNumber: order.trackingNumber || null,
            customer: {
                name: order.customer.name,
                email: order.customer.email,
                
            },
        });
    } catch (err) {
        console.error("GET /orders/track error: ", err);
        res.status(500).json({ error: "Failed to track order" });
    }
});

/*
    GET /api/orders - returns all orders sorted as newest first ADMIN ONLY ROUTE
    example calls: 
    GET /api/orders - returns all orders
    GET /api/orders?status=pending - only pending orders
*/
router.get("/", authenticate, async (req,res) => {
    try {
        const { status } = req.query; // optional query param to filter by status
        
        // buildng filter - if no status provided then return all orders
        const filter = {};

        if (status) {
            const validStatuses = ["pending", "confirmed", "shipped", "delivered", "cancelled", "refunded"];

            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: `Invalid status: ${status}.`});
            }
            filter.status = status; // if status is valid we add it to the filter object
        }
        // sort by createdAt decending so newest orders come first
        const orders = await Order.find(filter).sort({ createdAt: -1});

        // validate response is a valid array before sending
        if (!Array.isArray(orders)) {
            return res.status(500).json({ error: "Invalid data format received from database" });
        }
        res.json(orders);
    } catch (err) {
        console.error("GET /orders error:", err);
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});


/*
    Get /api/orders/:id
    Returns one order in full detail -- ADMIN ONLY
*/
router.get("/:id", authenticate, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)){
            return res.status(400).json({error: "Invalid order ID"});
        }
        
        const order = await Order.findById(req.params.id).lean(); //.lean() tells Mongoose to skip mongoose methods (.save(), internal metadata, ect) and return a plain JavaScript object instead:

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }
        res.json(order);
    } catch (err) {
        console.error("GET /orders/:id error:", err);
        res.status(500).json({ error: "Failed to fetch order" });
    }
});

/*
    PATCH /api/orders/:id/status
    Updates the status of an order -- ADMIN ONLY

    This is the main action of the admin orders page, moving an order from
    pending -> confirmed -> shipped -> delivered.
*/
router.patch("/:id/status", authenticate, async (req,res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)){
            return res.status(400).json({ error: "Invalid order ID" });
        }

        const { status, trackingNumber } = req.body;    // by desctructing we only pull what we need from the re.body object = { status }

        // validate the status value before hitting db
        const validStatuses = ["pending", "confirmed", "shipped", "delivered", "cancelled", "refunded", ];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                error: `Status must be on of : ${validStatuses.join(", ")}` // .join built in js that converts the array into a string with the seperator we defined (", ") = "pending, confirmed, shipped, delivered, cancelled, refunded"
            });
        }

        // more validation
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // if moving to a state that frees inventory, we havent already restored, put stock back
        const freesStock = status === "cancelled" || status === "refunded";
        if (freesStock && !order.stockRestored) {
            await restoreStock(order.items); // order.items already has { product, quantity }
            order.stockRestored = true; // mark stock restored so we dont do it again if the admin accidentally clicks the button twice 
        }

        // apply the new status to the order we already loaded
        order.status = status;

        // if a tracking number came in (admin marked it shipped), save it too
        if (trackingNumber !== undefined && trackingNumber !== "") {
            order.trackingNumber = trackingNumber;
        }

        await order.save();

        res.json(order);

        sendStatusEmail(order, status).catch(err => {
            console.error("Status email failed: ", err.message);
        });

    } catch (err) {
        console.error("PATCH /orders/:id/status error:", err);
        res.status(500).json({ error: "Failed to update order status" });
    }
});

/*
    PATCH /api/orders/:id/notes
    Adds or updates internal admin notes on an order - ADMIN ONLY
    Notes are only visible in the admin not the customer

    body: { "notes": "Customer called, wants expedited shipping" }
*/
router.patch("/:id/notes", authenticate, async (req,res) => {
    try{
        if (!mongoose.Types.ObjectId.isValid(req.params.id)){
            return res.status(400).json({ error: "Invalid order ID"});
        }
        const { notes } = req.body;

        if (notes === undefined){ // client forgot to send the field -> 400 error
            return res.status(400).json({error: "Notes field is required"});
        }

        const updated = await Order.findByIdAndUpdate(
            req.params.id,
            { $set: { notes } },
            { new: true, runValidators: true } 
        );

        if (!updated) {
        return res.status(404).json({ error: "Order not found" });
            }
            
        res.json(updated);

    } catch (err) {
        console.error("PATCH /orders/:id/notes error:", err);
        res.status(500).json({ error: "Failed to update notes" });
    }
});


export default router;