/*
    Order confirmation page that stripe redirects user to after payment
*/
import { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";
import { useNavigate } from 'react-router-dom';
import api from "../api/axios.js";

const RED = "#e8161b";
const DARK = "#1c1c1c";
const CONDENSED = "'Barlow Condensed', sans-serif";
const MONO = "'Share Tech Mono', monospace";

const OrderConfirmation = () => {
    const { clearCart } = useCart();
    const navigate = useNavigate();

    // status tracks the confirmation API call: "confirming = calling backend", "success = confirmed, email sent", "error = something went wrong"
    const [status, setStatus] = useState("confirming"); // default status is confirming (in progress)
    const [orderId, setOrderId] = useState(null);

    useEffect(() => {
        const confirmPayment = async () => {
            // pull the order ID we saved before payment in handleCalculateShipping on the checkout page
            const pendingOrderId = sessionStorage.getItem("pendingOrderId");

            if (!pendingOrderId) {
                // no pending order found so customer most likely navigated here without checking out, we still clear the cart just in case but show generic message instead of an error
                clearCart();
                setStatus("success");
                return;
            }

            try {

                // stripe appends ?payment_intent=pi_xxx to the return URL after payment, we read it from URL and send it to the backend
                // which verifies with stripe that this payment actually succeeded before confirming
                const params = new URLSearchParams(window.location.search);
                const paymentIntentId = params.get("payment_intent");

                // this call marks the order as paid and triggers sendOrdereEmails on backend - ONLY place the confirmation email gets sent
                const response = await api.patch(`/orders/${pendingOrderId}/confirm-payment`, {
                    paymentIntentId,
                });
                setOrderId(response.data.order._id);
                setStatus("success");

                // clean up - clear cart now that the payment is confirmed and remove the pending order ID
                clearCart();
                sessionStorage.removeItem("pendingOrderId");

            } catch (err) {
                console.error("Payment confirmation failed: ", err);
                setStatus("error");
            }
        }

        confirmPayment();
    }, []);
    
    return (
        <div style={{
            background: DARK, minHeight: "100vh",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "48px 24px",
        }}>
            <div style={{ maxWidth: 480, textAlign: "center" }}>

                {status === "confirming" && (
                    <>
                        <div style={{ fontFamily: MONO, fontSize: 12, color: "#888", letterSpacing: "0.1em", marginBottom: 16 }}>
                            CONFIRMING YOUR ORDER...
                        </div>
                    </>
                )}

                {status === "success" && (
                    <>
                        <div style={{
                            fontFamily: MONO, fontSize: 11, color: RED,
                            letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 16,
                        }}>
                            Suzuki Racing Development
                        </div>
                        <h1 style={{
                            fontFamily: CONDENSED, fontWeight: 900, fontSize: 40,
                            color: "white", textTransform: "uppercase", letterSpacing: "0.05em",
                            margin: "0 0 16px",
                        }}>
                            Order Confirmed!
                        </h1>
                        <p style={{ fontFamily: MONO, fontSize: 13, color: "#aaa", lineHeight: 1.7, marginBottom: 8 }}>
                            Thanks for your purchase. You'll receive a confirmation email shortly.
                        </p>
                        {orderId && (
                            <p style={{ fontFamily: MONO, fontSize: 12, color: "#666", marginBottom: 32 }}>
                                Order ID: {orderId}
                            </p>
                        )}
                        <button
                            onClick={() => navigate("/shop")}
                            style={{
                                background: "none", border: `1px solid ${RED}`, color: RED,
                                padding: "10px 24px", fontFamily: CONDENSED, fontWeight: 700,
                                fontSize: 14, letterSpacing: "0.1em", textTransform: "uppercase",
                                cursor: "pointer",
                            }}
                        >
                            Continue Shopping
                        </button>
                    </>
                )}

                {status === "error" && (
                    <>
                        <h1 style={{
                            fontFamily: CONDENSED, fontWeight: 900, fontSize: 32,
                            color: "white", textTransform: "uppercase", marginBottom: 16,
                        }}>
                            Payment Received
                        </h1>
                        <p style={{ fontFamily: MONO, fontSize: 13, color: "#aaa", lineHeight: 1.7 }}>
                            Your payment was successful, but we had trouble confirming your order details.
                            Please contact us with your payment receipt and we'll sort it out right away.
                        </p>
                        <button
                            onClick={() => navigate("/contact")}
                            style={{
                                background: "none", border: `1px solid ${RED}`, color: RED,
                                padding: "10px 24px", fontFamily: CONDENSED, fontWeight: 700,
                                fontSize: 14, letterSpacing: "0.1em", textTransform: "uppercase",
                                cursor: "pointer", marginTop: 16,
                            }}
                        >
                            Contact Us
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default OrderConfirmation;
