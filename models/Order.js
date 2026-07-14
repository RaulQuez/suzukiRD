/*
    Order model - represents a customer purchase

    An order contains:
    - WHO ordered (customer info)
    - WHAT they ordered (array of products + quantities)
    - WHERE to ship it (shipping address)
    - HOW MUCH it cost (totalPrice)
    - WHAT STATE it's in (status)

    We store a snapshot of each product at the time of purchase.
    This is important — if you later change a product's price or delete it,
    the order should still show what the customer actually paid for.
    That's why we store name/price/imageUrl directly on the order item
    instead of just referencing the product by id.
*/  
import mongoose from "mongoose";

// create the sub schema for each item inside an order, lives inside the order document, not its own collection.
const orderItemSchema = new mongoose.Schema({
    // ref: "product" creates a reference to the product collection, .populate("items.product") later to pull in full product document
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    // Snapshot of product data at time of purchase (price stock ect)
    price: {
        type: Number,
        required: true,
        min: 0,
    },
    imageUrl: {
        type: String,
        default: null,
    },
    selectedVariant: {
        type: String,
        default: null // default null means no variant-product only has one version by default
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, "Quantity must be at least 1"],
    },
}, { toJSON: { virtuals: true } }); // convert to json & pass virtual values (subtotal) hence true

// virutal field exists on document memory but never stored in DB, "subtotal" is the given name for the field
// regular function — this refers to the document
orderItemSchema.virtual("subtotal").get(function () {
    return this.price * this.quantity;
});

// shipping address schema - subschema for delivery address & embedded in order document
const shippingAddressSchema = new mongoose.Schema({
    fullname: {type: String, required: true, trim: true},
    street: {type: String, required: true, trim: true},
    city: {type: String, required: true, trim: true},
    state: {type: String, required: true, trim: true},
    zipCode: {type: String, required: true, trim: true},
    country: {type: String, required: true, trim: true, default: "US", maxlength: [100, "Country too long"]},
});

// Main order schema
const orderSchema = new mongoose.Schema({
    // customer info stored as snapshot
    customer: {
        name: {type: String, required: true, trim: true, maxlength: [100, "Name too long"]},
        email: {type: String, required: true, trim: true, lowercase: true, maxlength: [200, "Email too long"],},
        phone: {type: String, default: "", maxlength: [30, "Phone too long"]},
    },
    // items - sub document from orderItemSchema (sub-schema) - validator ensures cart is never empty
    items: {
        // every item must look like the orderItemSchema
        type: [orderItemSchema],
        validate: {
            validator: function (arr) { return arr.length > 0; },
            message: "Order must contain at least one item",
        },
    },
    // shipping address sub schema
    shippingAddress: {
        type: shippingAddressSchema,
        required: true,
    },
    // total price - stored explicitly instead of summing items total on the fly because of discounts, taxes, or shipping
    totalPrice: {
        type: Number,
        required: true,
        min: 0,
    },
    shippingCost: {
        type: Number,
        default: 0,
        min: 0,
    },
    // status tracks where order is in fulfillment pipeline, admin app moves orders through these stages
    status: {
        type: String,
        enum: ["pending", "confirmed", "shipped", "delivered", "cancelled", "refunded", "expired"],
        default: "pending",
    },
    // notes is an option field for admin to leave internal comments
    notes: {
        type: String,
        default: "",
        trim: true,
        maxlength: [2000, "Notes cannot exceed 2000 characters"],
    },
    paymentConfirmed: {
        type: Boolean,
        default: false, // only true after stripe confirms payment succeeded.
    },
    trackingNumber: {
        type: String,
        default: null,
    },
    stockRestored: {
        type: Boolean,
        default: false, // only true after stock is restored on rollback or cancellation
    },
}, { timestamps: true } ); // createdAt = when order was placed, updatedAt = last status change

// index on status and createdat - admin app wil often query "show me all pending orders" or show me recent orders. the index make those queries fast
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });   // -1 = descending, newest first

const Order = mongoose.model("Order", orderSchema);

export default Order;
