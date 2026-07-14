import nodemailer from "nodemailer";
import { isValidEmail, cleanHeader } from "./sanitize.js";  // utility functions for email validation and header cleaning    


/*
    Send order emails function that sends 2 emails after a successful order: 
    1. Confirmation email to the customer 
    2. New order alert to the admin

    WHY A SEPARATE FUNCTION:
    Keeps the POST /orders route clean — email logic lives here,
    order logic lives in the route. Single responsibility.

    WHY WE DON'T AWAIT IT IN THE ROUTE:
    We call this with .catch() but don't await it in the main flow.
    This means if the email fails, the order still succeeds.
    The customer already paid — a failed email should never
    cause a 500 error or roll back a valid order
*/
export const sendOrderEmails = async (order) => {
    // same transponder pattern as contact route - GMAIL SMTP with app password from .env
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.CONTACT_GMAIL,
            pass: process.env.CONTACT_PW,
        },
    });

    /* build items list as a plain text string:
    .map turns each item into a line like :
    "-Oil cooler kit 2x - 710.00"
    .join("/n") puts each item on its own line
    */
   const itemsList = order.items.map(item => 
    `- ${item.name} x${item.quantity} - ${(item.price * item.quantity).toFixed(2)}`)
    .join("\n");

    const { shippingAddress, customer, totalPrice, _id } = order;

    // sanitize anything that lands in a header
    const safeName = cleanHeader(customer.name);
    const customerEmailValid = isValidEmail(customer.email);

    // email 1 - customer confirmation, sends email to customer assuming they provided an email, gives them their order ID so they can track their order
   if (customerEmailValid) {
    await transporter.sendMail({
        from: process.env.CONTACT_GMAIL,
        to: cleanHeader(customer.email),
        subject: `Order Confirmed - Suzuki Racing Development #${order._id}`,
        text: `
    Hi ${safeName},
    Thank you for your order! Here's a summary:

    ORDER ID: ${_id}
    Date: ${new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}

    ITEMS ORDERED:
    ${itemsList}

    TOTAL: $${totalPrice.toFixed(2)}

    SHIPPING TO:
    ${shippingAddress.fullname}
    ${shippingAddress.street}
    ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}
    ${shippingAddress.country}

    Track your order at:
    https://suzukird.com/track-order

    Questions? Reply to this email or visit our contact page.
    — Suzuki Racing Development
        `.trim(),
    });
} else {
    console.warn(`Skipping customer confirmation for order ${_id}: invalid email: ${customer.email}`);
}
    // email 2 - admin alert, sends email to the admin gmail to notify a new order came in to start fulfillment
    await transporter.sendMail({
        from: process.env.CONTACT_GMAIL,
        to: process.env.CONTACT_GMAIL,
        subject: `New Order — $${totalPrice.toFixed(2)} from ${safeName}`,
        text: `
    New order received on Suzuki Racing Development.

    ORDER ID: ${_id}
    Customer: ${customer.name} (${customer.email})
    ${customer.phone ? `Phone: ${customer.phone}` : ""}

    ITEMS:
    ${itemsList}

    TOTAL: $${totalPrice.toFixed(2)}

    SHIP TO:
    ${shippingAddress.fullname}
    ${shippingAddress.street}
    ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}
    ${shippingAddress.country}

    View in admin: https://admin.suzukird.com/orders
        `.trim(),    
    });
};