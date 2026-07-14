/*
    Customer facing order tracking page, lives on the storefront at /track-order

    Customer enters email + order ID to look up order status, no account needed
*/
import { useState } from "react";
import "../App.css";
import { useNavigate } from "react-router-dom";
import api from "../api/axios.js";


const RED = "#C0392B";
const DARK = "#1c1c1c";
const CONDENSED = "'Barlow Condensed', sans-serif";
const MONO = "'Share Tech Mono', monospace";

// steps to be shown in the progress bar (order fullfillment timeline)
const STATUS_STEPS = [
    { key: "pending",   label: "Order Placed" }, // step 0
    { key: "confirmed", label: "Confirmed" },   // step 1
    { key: "shipped",   label: "Shipped" },     // step 2
    { key: "delivered", label: "Delivered" },   // step 3
];

// returns which step index the order is currently at, cancelled and refuned are handled seperately as they break the normal flow
const getStepIndex = (status) =>  {
    const index = STATUS_STEPS.findIndex(s => s.key === status);

    return index === -1 ? 0 : index;    // default to 0 if status not in normal flow
}
const TrackOrdersPage = () => {
    const [email, setEmail] = useState("");
    const [order, setOrder] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [orderId, setOrderId] = useState("");

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        
        e.preventDefault(); // stop page refresh
        setError("");
        setOrder(null);
        setLoading(true);

        try {
            // GET /api/orders/track with query params. Axios encodes the params automatically into URL:
            // /api/orders/track?orderId=63abc&email=jogn@gmail.com
            const res = await api.get("/orders/track", {
                params: {
                    orderId: orderId.trim(),
                    email: email.trim(),
                },
            });
            // Axios handles validation of res status codes and automatically throws to catch block
            setOrder(res.data);
        } catch (err) {
            // 404 means order not found or email didnt match
            if (err.response?.status === 404) {
                setError("Order not found. Please check your order ID and email.");
            } else {
                setError("An error occurred while fetching your order. Please try again later.");
            }
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (str) => {
        return new Date(str).toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",      
        });
    };
    /* isCancelled and isRefunded break the normal status flow, we render them as a special state instead of the timeline
    shorter and cleaner version of this: {isCancelled && <p>This order has been cancelled.</p>}

    isCancelled is a boolean ternary, true if the order status is "cancelled", false otherwise
    ?. - access .status only if order is not null/undefined, otherwise return undefined instead of crashing.
    */
    const isCancelled = order?.status === "cancelled";
    const isRefunded = order?.status === "refunded";    
    // figures which step in progress bar to highlight based on order status, defaults to 0 if order is null or status is not in normal flow (eg cancelled or refunded)
    const currentStep = order ? getStepIndex(order.status) : 0;

    return (
    // wrapper div for whole page
    <div style={{background: DARK, minHeight: "100vh", padding: "48px 24px"}}>
        
        <div style={{maxWidth: 600, margin: "0 auto"}}>

        {/** Header */}
        <div style={{marginBottom: 40}}>
         <div style={{fontFamily: MONO, fontSize: 15, color: RED, letterSpacing: "0.25em",
            textTransform: "uppercase", marginBottom: 8}}>
                Suzuki Racing Development
            </div>
             <h1 style={{fontFamily: CONDENSED, fontSize: 48, fontWeight: 900, color: "white", textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1, margin: 0}}>
                Track Your Order
             </h1>
        </div>

        {/** Search input form for order */}
        <form onSubmit={handleSubmit} style={{background: "#111", padding: 28, border: "1px solid #1f1f1f", marginBottom: 32}}>
            <div style={{marginBottom: 18}}>
            <label style={{display: "block", fontFamily: MONO, fontSize: 11, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8,}}>
                Order Id
            </label>

            <input 
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Enter your order ID, e.g 44234acasf134..."
            required
            className="track-order-input"
            />
            </div>

            <div style={{marginBottom: 20}}>
              <label style={{display: "block", fontFamily: MONO, fontSize: 11, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8,}}>
                Email Address
             </label>
              <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              className="track-order-input"
            />
            </div>

            {error && (
                <div style={{background: "#1f0a0a",
                            border: "1px solid #5a1a1a",
                            padding: "10px 14px",
                            color: "#e57373",
                            fontFamily: MONO,
                            fontSize: 12,
                            marginBottom: 16,}}>
                    {error}
                </div>
            )}

            <button type="submit"
            disabled={loading}
            className="track-order-btn">
                {loading ? "loading..." : "Track Order"}
            </button>
        </form>

        {/** Order results */}
        {order && (
        <div>
            {/** header */} 
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 8}}>
            <div>
                <div style={{fontFamily: MONO, fontSize: 15, color: RED, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4}}>
                Order
                </div>
                
                <div style={{fontFamily: MONO, fontSize: 12, color: "#aaa"}}>
                #{order._id}
                </div>
            </div>

        <div style={{textAlign: "right"}}>
            <div style={{fontFamily: MONO, fontSize: 12, color: "#666", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4}}>
                Placed 
            </div>

            <div style={{fontFamily: MONO, fontSize: 12, color: "#aaa"}}>
                {formatDate(order.createdAt)}
            </div>

        </div>
        
            </div> {/**header ends here  below is order status timeline*/}

        {!isCancelled && !isRefunded ? (
            <div style={{background: "#111", border: "1px solid #1f1f1f", padding: "28px 24px", marginBottom: 20,}}> 
                <div style={{fontFamily: MONO, fontSize: 12, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 24}}>
                Order Status
                </div>
                {/** Time line track - horizontal bar with dots at each step. */}
                <div style={{position: "relative", marginBottom: 12}}>
                    {/** background track */}
                 <div style={{position: "absolute", top: 10, left: 0, right: 0, height: 2, background: "#2a2a2a"}} />
                  
                  {/** filed track up to current step: */}
                  <div style={{position: "absolute", top: 10, left: 0, width: `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%`, height: 2, background: RED, transition: "width 0.5s ease"}} />
                  
                  {/** step dots */}
            <div style={{display: "flex", justifyContent: "space-between", position: "relative"}}>
                    {STATUS_STEPS.map((step, index) => {
                        const isCompleted = index <= currentStep;
                        return(
            <div key={step.key} style={{textAlign: "center"}}>
                {/** Dot is filled red if completed, gray outline if not, the current step pulses with a ring effect via border */}
                <div style={{                                                        width: 20, height: 20,
                borderRadius: "50%",
                background: isCompleted ? RED : "#1a1a1a",
                border: `2px solid ${isCompleted ? RED : "#333"}`,
                margin: "0 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",}}>
                    {isCompleted && (
                        <div style={{width: 8, height: 8, background: "#fff", borderRadius: "50%"}}/>
                    )}
                </div>
            </div>
                            );
                    })} 

            </div>

            </div>
        
        {/** Step labels */}
        <div style={{display: "flex", justifyContent: "space-between", marginTop: 10,}}>
        {STATUS_STEPS.map((step, index) => {
            return(
            <div key={step.key} style={{fontFamily: CONDENSED,
            fontSize: 13,
            fontWeight: index <= currentStep ? 700 : 400,
            color: index <= currentStep ? "#fff" : "#555",
            textAlign: "center",
            width: `${100 / STATUS_STEPS.length}%`,}}>
                {step.label}
            </div>
                 );
        })}    
        
        </div>
    </div>
        ) : (
            // cancelled and refunded orders dont follow the normal flow, so we show a special message instead of the timeline
            <div style={{background: "#1f0a0a", border: "1px solid #5a1a1a", padding: "20px 14px",marginBottom: 16,}}>
                <div style={{fontFamily: CONDENSED, fontWeight: 700, fontSize: 18, color: "#e57373", textTransform: "uppercase", marginBottom: 4}}>
                  Order {order.status}  
                </div>
                
                <div style={{ fontFamily: MONO, fontSize: 12, color: "#888",}}>
                {isCancelled
                    ? <p>This order was cancelled. If you have questions, please contact us on our contact page: <button className="track-btn" onClick={() => navigate('/contact')}>Contact</button> </p> 
                    : "A refund has been issued for this order."}
                </div>
                
            </div>
            
        )}    {/** UPS tracking link — only appears once a tracking number exists (i.e. the order has shipped) */}
{order.trackingNumber && (
    <div style={{background: "#111", border: "1px solid #1f1f1f", padding: 24, marginBottom: 20}}>
        <div style={{fontFamily: MONO, fontSize: 12, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12}}>
            Tracking
        </div>
        <div style={{fontFamily: MONO, fontSize: 13, color: "#aaa", marginBottom: 14}}>
            UPS Tracking #: <span style={{color: "#fff"}}>{order.trackingNumber}</span>
        </div>
        <a href={"https://www.ups.com/track?loc=en_US&tracknum=" + order.trackingNumber} target="_blank" rel="noopener noreferrer" style={{display: "inline-block", fontFamily: MONO, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#fff", background: RED, padding: "10px 18px", textDecoration: "none"}}>
            Track on UPS
        </a>
    </div>
)}

        {/** ordered items listed */}
            <div style={{background: "#111", border: "1px solid #1f1f1f", padding: 24, marginBottom: 20,}}>
                <div style={{fontFamily: MONO, fontSize: 12, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16}}>
                    Items Ordered
                </div>

            <div style={{display: "flex", flexDirection: "column", gap: 14}}>
            {order.items.map((item, idx) => (
                <div key={idx} style={{display: "flex", alignItems: "center", gap: 14, paddingBottom: 14,
                    borderBottom: idx < order.items.length - 1 ? "1px solid #1f1f1f" : "none",}}>
                    
                    {/**Product image / placeholder */}
                    <div style={{width: 48, height: 48, background: "#1a1a1a", border: "1px solid #2a2a2a", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center"}}>
            {item.imageUrl ? <img src={item.imageUrl} alt={item.name} style={{width: "100%", height: "100%", objectFit: "contain"}} /> 
                                    : <div style={{fontFamily: MONO, fontSize: 9, color: "#444",}}>NO IMG</div>}
                    </div>
                
            {/**display name and quantity */}
                <div style={{flex: 1}}>
                    <div style={{fontFamily: CONDENSED, fontWeight: 700, fontSize: 15, color: "#e0e0e0", marginBottom: 2}}>
                        {item.name}
                    </div>
                     <div style={{ fontFamily: MONO, fontSize: 11, color: "#666" }}>
                        Qty: {item.quantity}
                    </div>

                    <div style={{fontFamily: CONDENSED, fontWeight: 800,
                    fontSize: 16, color: "#fff",}}>
                    ${(item.price * item.quantity).toFixed(2)}
                    </div>
                </div>
            </div>
        ))}
    </div>


        {/* order total */}
            <div style={{
                borderTop: "1px solid #1f1f1f",
                marginTop: 14, paddingTop: 14,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
            }}>
                <span style={{
                    fontFamily: CONDENSED, fontWeight: 700,
                    fontSize: 14, color: "#888",
                    textTransform: "uppercase",
                }}>
                    Total
                </span>
                <span style={{
                    fontFamily: CONDENSED, fontWeight: 900,
                    fontSize: 24, color: RED,
                }}>
                    ${order.totalPrice.toFixed(2)}
                </span>
            </div>

        </div> {/** closes div for the ordered items list and details */}

    {/* ── Shipping address ── */}
            <div style={{
                background: "#111",
                border: "1px solid #1f1f1f",
                padding: "24px",
                marginBottom: 28,
            }}>
                <div style={{
                    fontFamily: MONO, fontSize: 11, color: "#555",
                    textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14,
                }}>
                    Shipping to
                </div>
                <div style={{ fontFamily: MONO, fontSize: 13, color: "#aaa", lineHeight: 1.8 }}>
                    <div>{order.shippingAddress.fullname}</div>
                    <div>{order.shippingAddress.street}</div>
                    <div>
                        {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                    </div>
                    <div>{order.shippingAddress.country}</div>
                </div>
                
            </div>

    {/* back to shop */}
            <button
                onClick={() => navigate("/shop")}
                className="back-to-shop-btn">
                ← Back to shop
            </button>

        </div>
        )}
        </div>
    </div>
    
    )
}
export default TrackOrdersPage;