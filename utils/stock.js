import Product from "../models/Product.js";

// internal: put stock back for a list of { product, quantity }
const giveBack = async (items) => {
    await Promise.all(
        items.map(i => Product.updateOne({ _id: i.product }, { $inc: { stock: i.quantity } }))
    );
};

/*
    Atomically re-reserve stock for an order's items. Used when a payment lands
    on an order whose stock was already released by the abandoned-order sweep.
    Returns { ok: true } if every item was available and decremented, or
    { ok: false, soldOut: <productName> } if any item is now unavailable — in
    which case anything already re-reserved is rolled back before returning.
*/
export const reReserveStock = async (items) => {
    const reserved = [];
    for (const item of items) {
        const updated = await Product.findOneAndUpdate(
            { _id: item.product, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity } },
            { returnDocument: "after" }
        );
        if (!updated) {
            await giveBack(reserved);              // roll back partial reservation
            return { ok: false, soldOut: item.name };
        }
        reserved.push({ product: item.product, quantity: item.quantity });
    }
    return { ok: true };
};