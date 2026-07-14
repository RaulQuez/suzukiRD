/*
    Shipping routes - UPS API 
    Calculates real time UPS Ground, expedidted, & worldwide rates

    POST /api/shipping/calculate
    takes cart items destiniation addres and fetches real ups rates, returns the cost

    FLOW: 
    1. authenticate with .env variables to get access token
    2. call UPS rating API with shipment details to get rates
    3. Return the relevenat reate to the frontend 
*/
import express from "express";
import { calculateShipping, ShippingError } from "../utils/calculateShipping.js";

const router = express.Router();

/*
    POST /api/shipping/calculate
    Body: {
        items: [{ productId: "64abc", quantity: 1 }],
        destination: { city: "Miami", state: "FL", zip: "33131", country: "US"}
    }
    Returns: { cost: 18.50, service: "UPS Ground", currency: "USD" }
*/
router.post("/calculate", async(req, res) => {
    try {
        const { items, destination } = req.body;

        // now we build the payload and call the ups rating api
        const result = await calculateShipping(items, destination);

        res.json(result);
        
    } catch (err) {
        
        // a ShippingError is an expected, user-facing problem (bad input,
        // missing weight data, weight limit) — send its status + message
        if (err instanceof ShippingError) {
            return res.status(err.status).json({ error: err.message });
        }

        // anything else is an unexpected failure (UPS down, network, bug)
        // — log the detail, send a generic 500
        if (err.response?.data) {
            console.error("UPS API error: ", JSON.stringify(err.response.data, null, 2));
        } else {
            console.error("POST /shipping/calculate error: ", err.message);
        }
        res.status(500).json({ error: "Failed to calculate shipping. Please try again or contact us." })
    }
});

export default router;