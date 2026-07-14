import express from 'express';
import nodemailer from 'nodemailer';
import { cleanHeader, isValidEmail } from '../utils/sanitize.js';   

const router = express.Router();

console.log("Email credentials:", !!process.env.CONTACT_GMAIL, !!process.env.CONTACT_PW);

// router post
router.post("/", async (req, res) => {

    const { firstName, lastName, email, message } = req.body;

    // create transporter that sends and receives emails from form input
    //validate
    if(!firstName || !email || !message) {
        return res.status(400).json({error: "Name, email and message are required"});
    }

    // length bounds — reject oversized input before doing any work
    if (
        firstName.length > 50 ||
        (lastName && lastName.length > 50) ||
        email.length > 200 ||
        message.length > 5000
    ) {
        return res.status(400).json({ error: "One or more fields exceed the allowed length" });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email address" });
    }

    try {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.CONTACT_GMAIL, // app email for gmail
            pass: process.env.CONTACT_PW,   // app passkey for gmail
        }
    });

    // sanitize inputs for email headers
    const safeName = cleanHeader(`${firstName} ${lastName || ""}`.trim());

    await transporter.sendMail({
        from: process.env.CONTACT_GMAIL,
        to: process.env.CONTACT_GMAIL, // app email for gmail
        replyTo: email, // user email for reply
        subject: `New Contact Form Submission - ${safeName}`,
        text: `Name: ${safeName}\nEmail: ${email}\nMessage: ${message}`,
    });

    res.json({ success: true });
} catch (error) { 
    console.error("Email error: ", error.message);
    res.status(500).json({ error: "Failed to send email. Please try again later."});
}
});
export default router;  