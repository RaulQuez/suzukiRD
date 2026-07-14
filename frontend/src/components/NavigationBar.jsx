import { useState } from "react";
import { NavLink } from "react-router-dom";
import SuzukirdLogo from "./SuzukirdLogo";
import {useCart} from "../context/CartContext"
import { useNavigate } from "react-router-dom";
import { X, ShoppingCart, Trash2, Plus, Minus, Search } from "lucide-react"; // emoji's
import "../App.css"

// We declare these global constants so if we want to change the web-wide font,color or anyhting we do it once here
    // Easier for writing and reading
    const RED="#e8161b";
    const DARK="#1c1c1c";
    const BORDER="1px solid #e0e0e0";
    const MONO="'Share Tech Mono', monospace";
    const CONDENSED = "'Barlow Condensed', sans-serif";
// Nav links - home, shop, contact, privacy polic, and refunds/returns
// Defining the tabs as a constant GLOBAL array outside the component, this way react doesnt re-create this array on every render
const tabs = [
    {label: "Home",     path: "/"},
    {label: "Shop",     path: "/shop"},
    {label: "Contact",  path: "/contact"},
    {label: "Privacy Policy",    path: "/privacy-policy"},
    {label: "Refunds & Returns", path: "/returns"}, 
    ];

function CartModal({ onClose }) {
    const { cart, cartTotal, cartCount, removeFromCart, updateQuantity } = useCart();
    
    const navigate = useNavigate();

    return (
        <>
        <div onClick={onClose} style={{position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 998,}} />
            {/** Drawer slides in from the right animation */}
            <div style={{position: "fixed", top: 0, right: 0, bottom: 0,
                width: "min(420px, 100vw)", 
                background: "#0f0f0f", 
                borderLeft: "1px solid #2a2a2a", 
                zIndex: 999, 
                display: "flex", 
                flexDirection: "column", 
                animation: "slideIn 0.25s ease"}}>
                    {/** header */}
                    <div style={{display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #1f1f1f",}}>
                            <div style={{fontFamily: CONDENSED, fontWeight: 800,
                                fontSize: 20, letterSpacing: "0.12em", textTransform: "uppercase", color: "white"}}>
                                    Your Cart
                                    {cartCount > 0 && (
                                        <span style={{marginLeft: 10, background: "#e8161b", color:"white", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 2}}>
                                            {cartCount}
                                        </span>
                                    )}
                            </div>
                            <button onClick={onClose} className="cart-modal-close-btn">
                                <X size={30} />
                            </button>
                    </div>

                    {/** empty state */}
                {cart.length === 0 ? (
                    <div style={{flex:1, display: "flex", flexDirection: "column", 
                        alignItems: "center", justifyContent: "center", gap: 16, color: "#444",}}>
                        <ShoppingCart size={48} strokeWidth={1} />
                        <div style={{
                            fontFamily: CONDENSED, fontSize: 12, letterSpacing: "0.1em", color: "#555"}}>
                                YOUR CART IS EMPTY</div>
                            <button onClick={() => { onClose(); navigate("/shop"); }} style={{
                                marginTop: 8, background: "none", border: "1px solid #e8161b",color: RED, fontFamily: CONDENSED,
                                fontWeight: 700, fontSize: 13, letterSpacing: "0.1em", cursor: "pointer", transition: "background 0.2s, color 0.2s",}}
                            onMouseEnter={e => { e.currentTarget.style.background = RED; e.currentTarget.style.color = "white";}}
                            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = RED;}}>    
                                Browse Parts
                            </button>
                        </div>
                ) : ( 
                    <>
                    {/** Cart items - scrollable */}
                    <div style={{flex: 1, overflowY: "auto", padding: "8px 0"}}>
                        {cart.map((item) => (
                            
                        <div key={`${item._id} - ${item.selectedVariant || "default"}`} style={{display: "flex", gap: 14, padding: "16px 24px", alignItems: "center", border: "1px solid #1a1a1a"}}>
                                {/** image */}
                                <div style={{width: 64, height: 64, flexShrink: 0, background: "white", border: "1px solid #2a2a2a", overflow: "hidden",
                                    display: "flex", justifyContent:"center", alignItems:"center"
                                }}>
                            {item.imageUrl ? <img src={item.imageUrl} alt={item.name} style={{width: "100%", height: "100%", objectFit: "contain", padding: 4}} />
                                    : <ShoppingCart size={20} color="#ccc" />}
                                </div>

                                {/** INFO */}
                            <div style={{flex:1, minWidth: 0}}> 
                                
                                <div style={{fontFamily: CONDENSED, color: "white", fontWeight: 600, paddingBottom: 5}}>
                                {item.name} ({item.quantity})
                                </div>
                            
                            {item.selectedVariant && (
                                <div style={{ fontFamily: MONO, color: RED, fontSize: 11, paddingBottom: 5 }}>
                                {item.selectedVariant}
                                </div>
                            )}
                                <div style={{fontFamily: CONDENSED, color: "white", fontWeight: 500, fontSize: 13, paddingBottom: 5}}> 
                                {item.category}
                                </div>
                                
                                <div style={{fontFamily: CONDENSED, color: "white", fontWeight: 500, fontSize: 13,}}>
                                 ${(item.price * item.quantity).toFixed(2)}  
                                </div>

                                {/** QUANTIY CONTROLS MINUS BUTTON */}
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8}}>
                                    <div style={{display: "flex", alignItems: "center", gap: 0, padding: 2}}>
                                        <button onClick={() => updateQuantity(item._id, item.selectedVariant, item.quantity - 1)} className="update-quantity-btn">
                                            <Minus size={13} />
                                        </button>
                                    </div>
                                </div>
                                {/** QUANTIY CONTROLS PLUS BUTTON */}
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8}}>
                                    <div style={{display: "flex", alignItems: "center", gap: 0, padding: 2}}>
                                        <button onClick={() => updateQuantity(item._id, item.selectedVariant, item.quantity + 1)} 
                                        disabled={item.quantity >= item.stock}
                                        className="update-quantity-btn">
                                            <Plus size={13} />
                                        </button>
                                    </div>
                                    {item.quantity >= item.stock && (
                                    <div style={{ fontFamily: MONO, fontSize: 9, color: RED, letterSpacing: "0.05em", textAlign: "center" }}>
                                        Max in cart
                                    </div>
                                )}
                                </div>

                                {/** REMOVE BUTTON */}
                                <button onClick={() => removeFromCart(item._id, item.selectedVariant)} className="remove-item-btn">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        ))}
                    </div>
                    
                    {/** Footer with total and checkout button */}  
            <div style={{
                padding: "20px 24px", borderTop: "1px solid #1f1f1f", background: "#0a0a0a",}}>
                        <div style={{display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16}}>
                            <span style={{color: "white"}}>Total
                            <span style={{color: "white", marginLeft: 5}}>{cartTotal.toFixed(2)}
                            </span></span>
                        </div>
                    <button onClick={() =>{onClose(); navigate("/checkout");}} className="checkout-btn">
                        Proceed to Checkout →
                    </button>

                    <button onClick={()=> {onClose(); navigate("/shop")}} className="continue-shopping-btn">
                        Continue Shopping →
                    </button>
            </div>

            {/* slide in animation */}
            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
            `}</style>
            
                    </>
                )}
                </div>
    
            
    </>
    )   
}
// Utility Bar Function
function UtilityBar() {

    const navigate = useNavigate();

    return (
            // outer div= positioning
            // inner div= styles inside 
            // Space between pushes left group to left and right group to the right
        <div style={{background:DARK, 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        padding: "5px 12px",
        width: "100%",
        }}>
            {/** LEFT SIDE OF THE BAR, shipping/contact Info 
             * alignItems = y-axis control
             * justifyContent = x-axis control
             * space-between automatically goes left to right according to the children, one left and one right
             * 
            */}
           
                {/** This is the shipping/contact information & its styles 
                 * flex = row display & unlocks justifyContent, alignItems, gap (space between children), flexDirection (switch to column instead of row), flexWrap (whether children wrap to next line if they overflow)
                */}
                <div style={{display: "flex", 
                gap: 16, 
                alignItems: "center",
            }}>
                {/** Here we style the actual text and objects in the container/div */}
                <span style={{color: "white", fontSize: 10, fontFamily: "'Montserrat', sans-serif", letterSpacing: "0.175em"}}>
                    International Shipping
                </span>

                {/**Divider */}
                <span style={{color: "white", fontWeight: "800"}}> | </span>

                {/** Phone Emoji && Number */}
                 <span style={{color: "white", fontSize: 10, fontFamily: "'Montserrat', sans-serif", letterSpacing: "0.2em"}}>
                  📞 <span style={{color: "green", fontWeight: "bold"}}>+1.786.264.1706</span>
                </span>
                </div>

                {/** RIGHT SIDE OF THE BAR, track order link */}
                <button className="track-btn" onClick={() => navigate("/track-order")}>
                    Track Your Order
                </button>
           
                
           
        </div>
    )
}

// Logo W/ Small Title- extracted as its own small component to keep main bar
function Logo() {

    const navigate = useNavigate();

    return(
        <div style={{display: "flex", 
            alignItems: "center", 
            gap: 0,
            paddingRight:12,
            paddingTop: 10,
            paddingBottom: 10,
            borderRight: BORDER,    // right border acts as a visual divider between the logo and search bar
            flexShrink: 0,  // prevents logo from squishing the search bar grows
            minWidth: 0,
        }}>

        <div style={{display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            cursor: "pointer",
            minWidth: 0,

        }}
        
        onClick={() => navigate("/")}>

            <SuzukirdLogo />

        {/** Brand Name & tagline, we wrapp in a regular div becasue by default elements stack unless given display:flex */}
        <div>
        <div style={{fontFamily: CONDENSED,
            fontWeight: 800,
            fontSize: 18,
            letterSpacing: "0.08em",
            color: "#1c1c1c",
            textTransform: "uppercase",
            lineHeight: 1,
        }}>suzuki<span style={{color: RED}}>rd</span>
        </div>

            <div style={{fontFamily: MONO,
            fontSize: 8,
            color: "grey",
            letterSpacing: "0.1em",
            marginTop: 4,
            display: "none",
            }}>Suzuki Racing Development</div>
            </div>
        </div>
        </div>
    );
}

function NavLinks(){
    return(
        <div style={{
            background: DARK,
            display: "flex",
            alignItems: "stretch",
            padding: "0 4px",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
        }}>
            {tabs.map((tab) => {
// React Router compares tab.path to the current URL to determine isActive
// end prop on "/" means it only matches exactly "/" and not every route that starts with "/"
            return(
                <NavLink 
                key={tab.path}
                to={tab.path}
                end={tab.path === "/"} 
                className="tab-link"
                // isActive - looks at to prop and asks does tab.path match the current url? yes - isActive=true no - isactive=false
                style={({ isActive }) => ({
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 10px",
                    textDecoration: "none",
                    fontFamily: CONDENSED,
                    fontWeight: 700,
                    fontSize: 20,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: isActive ? `${RED}` : "white",
                    borderBottom: isActive ? `2px solid ${RED}` : "2px solid transparent",
                    transition: "color 0.5s",
                })}>
                    {tab.label}
                </NavLink>  
            );
            })}
        </div>
    );
}
// Search Bar- has a wide layout input in the middle of the MainBAr()
function SearchBar(){
    // local state just for the input in the search bar
    const [query, setQuery] = useState("");

    const navigate = useNavigate();

    const handleSearch = () => {

    if (!query.trim()) return;

    // navigate to the /shop with the search term as a URL query paramerter
    navigate(`/shop?q=${encodeURIComponent(query.trim())}`);
    setQuery("");   // clear input after searching.
    }
    return(
        // Flex: 1 makes this div expand to fill all remaining horizontal space between
        // the logo (left side) to the cart button (right)
        <div style={{flex: 1, display: "flex", padding: "0 4px", minWidth: 0}}>

            {/** input - border radius on left side only so that it connects to the button */}
            <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search by part..."
            style={{
                flex: 1, 
                height: 40, 
                border: "1.5px solid white", 
                borderRight: "none",
                borderRadius: "4px 0 0 4px", // removes double border where input meets the button
                padding: "0 8px", 
                fontSize: 13, 
                fontFamily: "'Barlow', sans-serif",
                color: "black", 
                outline: "none", 
                background: "white",
            }}
            />
            {/**Here is the search button - borderRadius on right side only, completing the pill-split look */}
        </div>
    );
}

// Main Bar with big center row: logo + search + cart
function MainBar() {

    // navigation hook
    const navigate = useNavigate();
    // here we make the cart state (temperory)
    const { cartCount } = useCart();
    const [cartOpen, setCartOpen] = useState(false);

    return(
        <>
        <div style={{display: "flex",
            alignItems: "stretch",   // stretch makes all children fill the full height of this row
            background: "white",
            width: "100%",
            overflow: "hidden",
        }}>

            <Logo />
            <SearchBar/>

        {/**Cart button, two stacked lines (icon+label) */}
        <button className="cart-btn" onClick={() => setCartOpen(true)}>
        <span style={{ fontSize: 20, lineHeight: 1}}>🛒</span>
        <span style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.05em",
            color: "white"
           }}>Cart ({cartCount})
           </span>
        </button>

        </div>
           {cartOpen && <CartModal onClose={() => setCartOpen(false)} />} 
        </>
    );
}

export default function NavigationBar() {

    return (
            // max-width + margin: 0 auto centers the navbar on wide screens
        <div style={{maxWidth: "100%", margin: 0,        
        }}>

            {/** overflow: hidden clips children so rounded cornners show */}
            <div style={{ 
                borderRadius: 0, 
                overflow: "hidden", 
                boxShadow:"0 2px 24px rgba(0,0,0,0.08)"
            }}>

            <UtilityBar />
            <MainBar />
            <NavLinks />

            </div>
        </div>
    );
}