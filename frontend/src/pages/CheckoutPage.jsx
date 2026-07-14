/*
    Checkout Page
*/
import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useCart } from "../context/CartContext";
import api from "../api/axios";

    const RED="#e8161b";
    const DARK="#1c1c1c";
    const BORDER="1px solid #e0e0e0";
    const MONO="'Share Tech Mono', monospace";
    const CONDENSED = "'Barlow Condensed', sans-serif";

// initialize stripe outside component so it only happens once
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// small list of countries for the country dropdown list and we can add more if neede, the ups api supports any country code but we limit the dropdown to major ones
const COUNTRIES = [
    {code: "AR", label: "Argentina"},
    {code: "AU", label: "Australia"},
    {code: "AT", label: "Austria"},
    {code: "BE", label: "Belgium"},
    {code: "BR", label: "Brazil"},
    {code: "CA", label: "Canada"},
    {code: "CL", label: "Chile"},
    {code: "CN", label: "China"},
    {code: "CO", label: "Colombia"},
    {code: "CZ", label: "Czech Republic"},
    {code: "DK", label: "Denmark"},
    {code: "FI", label: "Finland"},
    {code: "FR", label: "France"},
    {code: "DE", label: "Germany"},
    {code: "GR", label: "Greece"},
    {code: "HU", label: "Hungary"},
    {code: "IN", label: "India"},
    {code: "IE", label: "Ireland"},
    {code: "IL", label: "Israel"},
    {code: "IT", label: "Italy"},
    {code: "JP", label: "Japan"},
    {code: "MY", label: "Malaysia"},
    {code: "MX", label: "Mexico"},
    {code: "NL", label: "Netherlands"},
    {code: "NZ", label: "New Zealand"},
    {code: "NO", label: "Norway"},
    {code: "PH", label: "Philippines"},
    {code: "PL", label: "Poland"},
    {code: "PT", label: "Portugal"},
    {code: "RO", label: "Romania"},
    {code: "RU", label: "Russia"},
    {code: "SA", label: "Saudi Arabia"},
    {code: "SG", label: "Singapore"},
    {code: "ZA", label: "South Africa"},
    {code: "KR", label: "South Korea"},
    {code: "ES", label: "Spain"},
    {code: "SE", label: "Sweden"},
    {code: "CH", label: "Switzerland"},
    {code: "TH", label: "Thailand"},
    {code: "TR", label: "Turkey"},
    {code: "AE", label: "United Arab Emirates"},
    {code: "GB", label: "United Kingdom"},
    {code: "US", label: "United States"},
    {code: "VN", label: "Vietnam"},
];


// inner form component inside <Elements>
const CheckoutForm = () => {

    const stripe = useStripe();
    const elements = useElements();
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    
   
    
    const handleSubmit = async (e) => {
        e.preventDefault(); // prevent default browser mechanics for this event giving React control 
        //protects for if user clicks pay now before stripe finishes loading
        if (!stripe || !elements) return;
        
        setLoading(true);
        setError("");

        //hands off payment to stripe to process, err is for if theres a problem with payment but if payment is successful err is undefined
        const { error } = await stripe.confirmPayment({
            elements, // passes the filled in payment form data (card details)
            confirmParams: { // configuration for what happens after
                // stripe redirects here automatically on succes
                return_url: `${window.location.origin}/order-confirmation`,
            },
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <PaymentElement options={{
                fields: {
                    billingDetails: { address: "auto" }
                }
            }}/>  {/** Stripes prebuilt card/apple pay/google pay and address input */}
            {error && <div>{error}</div>}
            <button type="submit" disabled={loading || !stripe} className="pay-btn">
                {loading ? "Processing..." : "Pay Now"}
            </button>
        </form>
    );
};

// outer component that fetches clientSecret from backend and sets up stripe
const CheckoutPage = () => {

    const { cart, cartTotal, cartCount } = useCart();

    // step controls which UI to show, default to shipping (destination form + calculate button) or payment (stripe payment)
    const [step, setStep] = useState("shipping");

    // shipping address form fields, we only need city/state/zip/country for rate calculations - full street isnt needed for Rating API
    const [destination, setDestination] = useState({
        street: "",
        city: "",
        state: "",
        zip: "",
        country: "US",  // DEFAULT
    });

     const [customer, setCustomer] = useState({
        name: "",
        email: "",
        phone: "",
    });

    const [shippingCost, setShippingCost] = useState(null);
    const [shippingService, setShippingService] = useState("");
    const [calculatingShipping, setCalculatingShipping] = useState(false);
    const [shippingError, setShippingError] = useState("");

    const [clientSecret, setClientSecret] = useState("");
    const [fetchError, setFetchError] = useState("");
    const [creatingIntent, setCreatingIntent] = useState(false);

    const handleCustomerChange = (e) => {
        setCustomer((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    }
    const handleDestinationChange = (e) => {
        setDestination((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    }

    // calls backend which calls the real ups rating API, on success we move to STEP PAYMENT, and creates the stripe payment intent for cartTotal + shippingCost
    const handleCalculateShipping = async (e) => {
        e.preventDefault();
        setShippingError("");
        setCalculatingShipping(true);

        try {
            // we send the nessessary fields for caluclating the shipping when calling the api, we tell the api here is the cart items fields and then return the cost and service for shipping
            const response = await api.post("/shipping/calculate", {
                items: cart.map((item) => ({
                    productId: item._id,
                    quantity: item.quantity,
                })),
                destination: {
                    city: destination.city,
                    state: destination.state,
                    zip: destination.zip,
                    country: destination.country,
                },
            });
            // fetch/destructure fields cost and service from the response data
            const { cost, service } = response.data

            setShippingCost(cost);
            setShippingService(service);

            // we create the stripe payment intent for the full total (cart and shipping) we pass shippingCost to the backend so it can add it to the charge amount
            setCreatingIntent(true);

            // we create the order in MONGO DB now BEFORE payment
            const orderResponse = await api.post("/orders", {
                customer: {
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone,
                },
                items: cart.map((item) => ({
                    productId: item._id,
                    quantity: item.quantity,
                    selectedVariant: item.selectedVariant || null,
                })),
                shippingAddress: {
                    fullname: customer.name, // matches schema's fullname field
                    street: destination.street,
                    city: destination.city,
                    state: destination.state,
                    zipCode: destination.zip,
                    country: destination.country,
                },
                shippingCost: cost,
            });
            const createdorder = orderResponse.data;

            // save the orderID so the confirmation page can look it up & we know which order to reference if needed
            sessionStorage.setItem("pendingOrderId", createdorder._id);

            // create the strip payment intent for the full total
            const intentResponse = await api.post("/payments/create-intent", {
                orderId: createdorder._id,
            });

            setClientSecret(intentResponse.data.clientSecret);
            setStep("payment");

        } catch (err) {
            // backend returns friendly message for missing weight/dimensions, otherwise show a generic error
            setShippingError(
                err.response?.data?.error || "Failed to calculate shipping. Please try again."
            );
        } finally {
            setCalculatingShipping(false);
            setCreatingIntent(false);
        }
    };

    // an empty cart - blocks the page before anything else
    if (!cart.length) return(
        <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", padding: 50, fontSize: 40, fontFamily: CONDENSED, fontWeight: 550, color: RED }}>
            Cart is Empty
        </div>
    );

    if (fetchError) return (<div style={{minHeight: "100vh"}}>{fetchError}</div>);

    const grandTotal = cartTotal + (shippingCost || 0);

    return (
        <div style={{ background: DARK, minHeight: "100vh", padding: "48px 24px" }}>
            <div style={{ maxWidth: 1000, margin: "0 auto" }}>

                {/* header */}
                <div style={{ marginBottom: 40 }}>
                    <div style={{
                        fontFamily: MONO, fontSize: 11, color: RED,
                        letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 8,
                    }}>Suzuki Racing Development</div>
                    <h1 style={{
                        fontFamily: CONDENSED, fontWeight: 900, fontSize: 48,
                        color: "white", textTransform: "uppercase", letterSpacing: "0.05em",
                        lineHeight: 1, margin: 0,
                    }}>Checkout</h1>
                </div>

                {/* two column layout */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 380px",
                    gap: 40,
                    alignItems: "start",
                }}>
                    {/* LEFT — shipping form OR payment form */}
                    <div>
                    {step === "shipping" ? (
                        <>
                        <div style={{
                        fontFamily: CONDENSED, fontWeight: 700, fontSize: 14,
                        letterSpacing: "0.15em", textTransform: "uppercase",
                        color: "#888", marginBottom: 20,
                        paddingBottom: 12, borderBottom: "1px solid #1f1f1f",
                        }}>Contact & Shipping</div>
                        
                        <form onSubmit={handleCalculateShipping}>
                        
                    {/* Customer info */}
                            <div style={{ marginBottom: 16 }}>
                                <label style={{display: "block", fontFamily: MONO, fontSize: 11, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Full Name</label>
                    {/** CUSTOMER NAME */}
                                <input name="name" value={customer.name} onChange={handleCustomerChange} required 
                                style={{width: "100%", padding: "10px 14px",
                                    background: "#1a1a1a", border: "1px solid #2a2a2a",
                                    color: "#e0e0e0", fontFamily: MONO, fontSize: 13,
                                    outline: "none", boxSizing: "border-box",}} />
                            </div>
                    {/** CUSTOMER EMAIL */}
                            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{display: "block", fontFamily: MONO, fontSize: 11, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Email</label>
                                    
                                    <input type="email" name="email" value={customer.email} onChange={handleCustomerChange} required 
                                    style={{width: "100%", padding: "10px 14px",
                                    background: "#1a1a1a", border: "1px solid #2a2a2a",
                                    color: "#e0e0e0", fontFamily: MONO, fontSize: 13,
                                    outline: "none", boxSizing: "border-box",}} />
                                </div>
                    {/** CUSTOMER PHONE */}
                                <div style={{ flex: 1 }}>
                                    <label style={{display: "block", fontFamily: MONO, fontSize: 11, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Phone</label>
                                    
                                    <input type="tel" name="phone" value={customer.phone} onChange={handleCustomerChange} 
                                    style={{width: "100%", padding: "10px 14px",
                                    background: "#1a1a1a", border: "1px solid #2a2a2a",
                                    color: "#e0e0e0", fontFamily: MONO, fontSize: 13,
                                    outline: "none", boxSizing: "border-box",}} />
                                </div>
                            </div>
                    {/** country dropdown, drives whether we calculate UPS GROUND (domestic) or worldwide expedited (international) */}
                        <div style={{marginBottom: 16}}>
                            <label style={{display: "block", fontFamily: MONO, fontSize: 11, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                            Country
                            </label>

                            <select name="country" value={destination.country} onChange={handleDestinationChange}
                            required style={{width: "100%", padding: "10px 14px",
                                                background: "#1a1a1a", border: "1px solid #2a2a2a",
                                                color: "#e0e0e0", fontFamily: MONO, fontSize: 13,
                                                outline: "none",}}>
                        {COUNTRIES.map((c) => (
                                <option key={c.code} value={c.code}>{c.label}</option>
                            ))}
                            </select>
                        </div>
                    {/** CUSTOMER ADDRESS (STREET) */}
                        <div style={{marginBottom: 16}}>
                            <label style={{display: "block", fontFamily: MONO, fontSize: 11, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                                Street Address
                            </label>
                            
                            <input name="street" value={destination.street} onChange={handleDestinationChange} required
                            style={{width: "100%", padding: "10px 14px",
                                    background: "#1a1a1a", border: "1px solid #2a2a2a",
                                    color: "#e0e0e0", fontFamily: MONO, fontSize: 13,
                                    outline: "none", boxSizing: "border-box",}} />
                        </div>

                            
                    {/** CUSTOMER CITY */}
                        <div style={{marginBottom: 16}}>
                            <label style={{display: "block", fontFamily: MONO, fontSize: 11, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                                City
                            </label>
                            
                            <input name="city" value={destination.city} onChange={handleDestinationChange} required
                            style={{width: "100%", padding: "10px 14px",
                                    background: "#1a1a1a", border: "1px solid #2a2a2a",
                                    color: "#e0e0e0", fontFamily: MONO, fontSize: 13,
                                    outline: "none", boxSizing: "border-box",}} />
                        </div>

                        {/** State/province - only required for US/CAN */}
                        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                                <div style={{flex: 1}}>
                            <label style={{display: "block", fontFamily: MONO, fontSize: 11, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                            State / Province
                            </label>
                            <input name="state" value={destination.state} onChange={handleDestinationChange} required={destination.country === "US" || destination.country === "CA"}
                            placeholder={destination.country === "US" ? "e.g. FL" : "optional"}
                            style={{width: "100%", padding: "10px 14px",
                                    background: "#1a1a1a", border: "1px solid #2a2a2a",
                                    color: "#e0e0e0", fontFamily: MONO, fontSize: 13,
                                    outline: "none", boxSizing: "border-box",}} />
                                </div>

                    {/** CUSTOMER  ZIP CODE*/}
                        <div style={{flex: 1}}>
                            <label style={{display: "block", fontFamily: MONO, fontSize: 11, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                            Postal / Zip Code
                            </label>
                            <input name="zip" value={destination.zip} onChange={handleDestinationChange} required
                            style={{width: "100%", padding: "10px 14px",
                                    background: "#1a1a1a", border: "1px solid #2a2a2a",
                                    color: "#e0e0e0", fontFamily: MONO, fontSize: 13,
                                    outline: "none", boxSizing: "border-box",}} />
                        </div>

                        </div>

                        {shippingError && (
                            <div style={{background: "#1f0a0a", border: "1px solid #5a1a1a",
                                            padding: "10px 14px", color: "#e57373",
                                            fontFamily: MONO, fontSize: 12, marginBottom: 16,}}>
                                        {shippingError}
                            </div>
                        )}

                        <button type="submit" disabled={calculatingShipping || creatingIntent}
                        className="pay-btn">
                            {calculatingShipping ? "Calculating Shipping ..." : creatingIntent ? "Preparing Checkout ..." : "Continue to Payment"}
                        </button>
                        </form>
                        </>
                    ) : (
                        <>

                        <div style={{
                        fontFamily: CONDENSED, fontWeight: 700, fontSize: 14,
                        letterSpacing: "0.15em", textTransform: "uppercase",
                        color: "#888", marginBottom: 20,
                        paddingBottom: 12, borderBottom: "1px solid #1f1f1f",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        }}>
                            <span>Payment Details</span>
                            {/** back button that lets customer change their address, resets clientSecret so a new intent gets created */}
                        <button onClick={() => {setStep("shipping"); setClientSecret(""); sessionStorage.removeItem("pendingOrderId");}}
                        style={{  background: "none", border: "none", color: RED,
                                            fontFamily: MONO, fontSize: 11, cursor: "pointer",
                                            textTransform: "none", letterSpacing: "normal",
                        }}>← Edit shipping address</button>
                        </div>

                        {clientSecret && (
                            <Elements stripe={stripePromise} options={{
                                clientSecret, appearance: {
                                    theme: "night",
                                    variables: {
                                        colorPrimary: RED,
                                        colorBackground: "#111",
                                        colorText: "#e0e0e0",
                                        colorDanger: "#e57373",
                                        fontFamily: "'Barlow Condensed', sans-serif",
                                        borderRadius: "4px",
                                    },
                                },
                            }}>
                            <CheckoutForm />
                            </Elements>
                        )}
                        </>
                    )}
                    </div>

                    {/* RIGHT — order summary */}
                    <div style={{
                        background: "#111",
                        border: "1px solid #1f1f1f",
                        padding: 24,
                        position: "sticky",
                        top: 24,
                    }}>
                        <div style={{
                            fontFamily: CONDENSED, fontWeight: 700, fontSize: 14,
                            letterSpacing: "0.15em", textTransform: "uppercase",
                            color: "#888", marginBottom: 20,
                            paddingBottom: 12, borderBottom: "1px solid #1f1f1f",
                        }}>Order Summary</div>

                        {/* items */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
                            {cart.map((item) => (
                                <div key={item._id} style={{
                                    display: "flex", gap: 12, alignItems: "center",
                                }}>
                                    <div style={{
                                        width: 48, height: 48, background: "white",
                                        flexShrink: 0, overflow: "hidden",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                    }}>
                                        {item.imageUrl
                                            ? <img src={item.imageUrl} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }} />
                                            : <div style={{ fontSize: 10, color: "#ccc", fontFamily: MONO }}>NO IMG</div>
                                        }
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        
                                        <div style={{
                                            fontFamily: CONDENSED, fontWeight: 700, fontSize: 13,
                                            color: "white", whiteSpace: "nowrap",
                                            overflow: "hidden", textOverflow: "ellipsis",
                                        }}>{item.name}</div>

                                        
                                        <div style={{
                                            fontFamily: MONO, fontSize: 10, color: "#666", marginTop: 2,
                                        }}>QTY: {item.quantity}</div>
                                    </div>

                                    <div style={{
                                        fontFamily: CONDENSED, fontWeight: 800,
                                        fontSize: 15, color: "white", flexShrink: 0,
                                    }}>${(item.price * item.quantity).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* totals */}
                        <div style={{ borderTop: "1px solid #1f1f1f", paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ fontFamily: MONO, fontSize: 11, color: "#666", letterSpacing: "0.05em" }}>
                                    SUBTOTAL ({cartCount} items)
                                </span>
                                <span style={{ fontFamily: CONDENSED, fontWeight: 700, fontSize: 15, color: "white" }}>
                                    ${cartTotal.toFixed(2)}
                                </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ fontFamily: MONO, fontSize: 11, color: "#666", letterSpacing: "0.05em"}}>
                                    SHIPPING {shippingService && `(${shippingService})`}
                                </span>
                                {shippingCost !== null ? (
                                    <span style={{fontFamily: CONDENSED, fontWeight: 700, fontSize: 15, color: "white"}}>
                                        ${shippingCost.toFixed(2)}
                                    </span>
                                ) : ( 
                                    <span style={{fontFamily: MONO, fontSize: 11, color: "#888"}}>
                                        Enter Destination
                                    </span>
                                )}
                            </div>
                            <div style={{
                                display: "flex", justifyContent: "space-between",
                                paddingTop: 12, borderTop: "1px solid #2a2a2a", marginTop: 4,
                            }}>
                                <span style={{ fontFamily: CONDENSED, fontWeight: 700, fontSize: 16, color: "white", letterSpacing: "0.08em", textTransform: "uppercase" }}>Total</span>
                                <span style={{ fontFamily: CONDENSED, fontWeight: 900, fontSize: 28, color: RED }}>
                                    ${grandTotal.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CheckoutPage;