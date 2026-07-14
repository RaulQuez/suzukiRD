import cron from "node-cron";
import Order from "../models/Order.js";
import Product from "../models/Product.js";

// how long an unpaid pending order may hold stock before we reclaim it
const TIMEOUT_MINUTES = 30;

const releaseAbandonedOrders = async () => {
    const cutoff = new Date(Date.now() - TIMEOUT_MINUTES * 60 * 1000);

    // only pending, unpaid, not-yet-restored orders older than the cutoff
    const stale = await Order.find({
        status: "pending",
        paymentConfirmed: false,
        stockRestored: false,
        createdAt: { $lt: cutoff },
    });

    for (const order of stale) {
        // give each item's stock back
        await Promise.all(
            order.items.map(item =>
                Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } })
            )
        );
        order.status = "expired";
        order.stockRestored = true;
        await order.save();
        console.log(`Released abandoned order ${order._id}`);
    }
};

// run every 5 minutes
export const startAbandonedOrderSweep = () => {
    cron.schedule("*/5 * * * *", () => {
        releaseAbandonedOrders().catch(err =>
            console.error("Abandoned order sweep failed:", err.message)
        );
    });
    console.log("Abandoned order sweep scheduled (every 5 min)");
};