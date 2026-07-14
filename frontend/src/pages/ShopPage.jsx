/*
    Full shop page:
    1. reads ?category = from URL (set by categoriesSection) 
    2. fetches matching products from express/mongoDB backend
    3. renders them in a grid-layout

    plugs into navbar.jsx 
*/
import { useState, useEffect } from 'react';
// useSearchParams reads/writes URL query params
import { useSearchParams } from 'react-router-dom';
import './Shop.css'
import SuzukirdLogo from '../components/SuzukirdLogo';
import { useCart } from "../context/CartContext";
import {X, ShoppingCart} from "lucide-react";
import api from "../api/axios.js";

const RED       = "#e8161b";
const DARK      = "#1c1c1c";
const CONDENSED = "'Montserrat', sans-serif";
const MONO      = "'Share Tech Mono', monospace";

// Product card - one per product, receives product object as a prop
// product contains  _id, name, category, price, imageUrl, stock, inStock
function ProductCard({ product }) {

    // inside product card component we implement a cart button
    const { addToCart, cart } = useCart();
   
    // modal state
    const [modalOpen, setModalOpen] = useState(false);

   // Variant products states - we parse variants into groups: NAME & OPTIONS
const variantGroups = (product.variants || []).map(v => {
    const colonIndex = v.indexOf(":");
    
    //"If there's no colon in this string, we can't split it into a name and options — so just use the whole string as both the name and the only option, then bail out early."
    if (colonIndex === -1) return { name: v, options: [v] };
    const name = v.slice(0, colonIndex).trim();
    const options = v.slice(colonIndex + 1).split(",").map(o => o.trim()).filter(Boolean);
    return { name, options };
});

    const hasVariants = variantGroups.length > 0;
    
   // one selected value per variant group as a STATE and builds an object
   const [ selectedVariants, setSelectedVariants ] = useState(
    () => Object.fromEntries(variantGroups.map(g => [g.name, ""]))
   );

    // how many of this product (matching variant) are already in the cart 
    const variantSummary = hasVariants ? variantGroups.map(g => `${g.name}: ${selectedVariants[g.name]}`).join(" | ") : null;
    const qtyInCart = cart.filter(item => item._id === product._id && item.selectedVariant === variantSummary).reduce(
        (sum, item) => sum + item.quantity, 0
    );

    // true when the cart alreadu holds all available stock
    const atStockLimit = qtyInCart >= product.stock;



   // tracks what option user picked for every variant group (true or false) - we use to gate the add to cart button 
   const allVariantsSelected = hasVariants && variantGroups.every(g => selectedVariants[g.name]); // .every() returns true only if the callback returns truthy for every single element in the array. One falsy value and it returns false immediately.

   
   // returns true or false based on if the product is in stock or if variants have been selected or dont exist
   const canAddToCart = product.inStock && (!hasVariants || allVariantsSelected) && !atStockLimit;

   const [justAdded, setJustAdded] = useState(false);

   const handleAddToCart = () => {
    addToCart({ ...product, selectedVariant: variantSummary });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1000); // we show and reset after 1.5 seconds so the button returns to normal
   }
    return(
    <>
        {/** NEW - product card that shows minimal details and onclick displays modal with full details of the product */}
        <div onClick={() => setModalOpen(true)}
            style={{
                display: "flex", flexDirection: "column", background: "white",
                cursor: "pointer", border: "1px solid white",
                transition: "border-color 0.25s, box-shadow 0.25s",
            }} className="product-card">

            {/** image */}
            <div style={{
                width: "100%", aspectRatio: "4/3", background: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "clip", position: "relative"
            }}>
                {product.imageUrl ? (
                    <img src={product.imageUrl}
                    style={{width: "100%", height: "100%", objectFit: "contain", padding: 12}} />
                ) : ( 
                    <div style={{ color: "#ccc", fontSize: 11, fontFamily: MONO,
                        letterSpacing: "0.1em", textAlign: "center", padding: 16 }}>
                    NO IMAGE </div>
                )}
                
                {!product.inStock && (
                    <div style={{
                        position: "absolute", top: 8, left: 8, background: "#1c1c1c",
                        color: "#e8161b", fontFamily: MONO, fontSize: 10, fontWeight: 700,
                        letterSpacing: "0.12em", textTransform: "uppercase",
                        padding: "4px 8px", border: "1px solid #e8161b",
                    }}>Out of stock</div>
                )}
            </div>

            {/** INFO - price - name - category */}
            <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontFamily: CONDENSED, fontWeight: 700, fontSize: 13, color: DARK, lineHeight: 1.35 }}>
                    {product.name}
                </div>

                <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: "#888", letterSpacing: "0.05em" }}>
                    {product.category}
                </div>

                {/** Stock indicator */}
                <div style={{
                fontFamily: MONO, fontSize: 10, letterSpacing: "0.1em",
                color: product.inStock ? "#4caf50" : RED,
                textTransform: "uppercase"}}>
                    {product.inStock ? `● In Stock  (${product.stock})` : "● Out of Stock"}
                </div>

                <div style={{ fontFamily: CONDENSED, fontWeight: 800, fontSize: 18, color: DARK, marginTop: "auto", paddingTop: 8 }}>
                    ${product.price.toFixed(2)}
                </div>
            </div>
        </div>
    
    {/** MODAL OPEN */}
    {modalOpen && (
        <>
            {/** backdrop transparent background */}
        <div onClick={() => setModalOpen(false)} style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.6)", zIndex: 998,
        }} />

        {/** drawer */}
        <div style={{
                position: "fixed", top: 0, right: 0, bottom: 0,
                width: "min(520px, 100vw)",
                background: "#0f0f0f",
                borderLeft: "1px solid #2a2a2a",
                zIndex: 999,
                display: "flex", flexDirection: "column",
                animation: "slideIn 0.25s ease",
                overflowY: "auto",
            }}>
                {/** Header */}
            <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "20px 24px", borderBottom: "1px solid #1f1f1f", flexShrink: 0,}}>
                <div style={{
                fontFamily: CONDENSED, fontWeight: 800, fontSize: 11,
                letterSpacing: "0.15em", textTransform: "uppercase", color: "#555"}}> 
                {product.category}                   
                </div>

                <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none",
                            cursor: "pointer", transition: "color 0.2s" }}
                className="close-modal-btn">
                <X size={26}/> </button>
            </div>

            {/** image */}
            <div style={{
                    width: "100%", aspectRatio: "4/3", background: "#111",
                    flexShrink: 0, overflow: "hidden", position: "relative"}}>
                {product.imageUrl ? (
                    <img src={product.imageUrl} style={{width: "100%", height: "100%", objectFit: "contain", padding: 24}} />
                ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
                        height: "100%", color: "#333", fontFamily: MONO, fontSize: 11 }}>
                        NO IMAGE
                    </div>
                )}
            </div>
            
            {/** Body */}
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
                {/** Name and Prices */}
                <div>
                    <div style={{
                    fontFamily: CONDENSED, fontWeight: 900, fontSize: 22,
                    color: "white", lineHeight: 1.2, marginBottom: 8}}>
                        {product.name}
                    </div>
                    <div style={{
                            fontFamily: CONDENSED, fontWeight: 800, fontSize: 26, color: RED}}>
                        ${product.price.toFixed(2)}
                    </div>
                </div>

                {/** description */}
                {product.description && (
                    <div style={{
                    fontFamily: CONDENSED, fontSize: 13, color: "#aaa",
                    lineHeight: 1.7, borderTop: "1px solid #1f1f1f", paddingTop: 16}}>
                    {product.description}
                    </div>
                )}

                {/** Variants */}
        {hasVariants && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14,
            borderTop: "1px solid #1f1f1f", paddingTop: 16 }}>
            {variantGroups.map((group) => (
                <div key={group.name}>
                    <div style={{
                        fontFamily: MONO, fontSize: 10, color: "#666",
                        letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6
                    }}>
                        {group.name}
                    </div>
                    <select
                        value={selectedVariants[group.name]}
                        onChange={(e) => setSelectedVariants(prev => ({
                            ...prev, [group.name]: e.target.value
                        }))}
                        style={{
                            width: "100%", padding: "10px 12px",
                            fontFamily: MONO, fontSize: 12,
                            border: `1px solid ${selectedVariants[group.name] ? RED : "#2a2a2a"}`,
                            background: "#1a1a1a",
                            color: selectedVariants[group.name] ? "white" : "#555",
                            cursor: "pointer", outline: "none", borderRadius: 4,
                        }}>
                        <option value="" disabled>Select {group.name}</option>
                        {group.options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>
            ))}
            </div>
        )}

        {/** Stock indicator */}
        <div style={{
        fontFamily: MONO, fontSize: 10, letterSpacing: "0.1em",
        color: product.inStock ? "#4caf50" : RED,
        textTransform: "uppercase"}}>
            {product.inStock ? `● In Stock (${product.stock})` : "● Out of Stock"}
        </div>
    </div> {/** End of the body */}

            {/** footer of modal and add to cart button */}
            <div style={{ padding: "16px 24px", borderTop: "1px solid #1f1f1f", flexShrink: 0 }}>
            <button
            onClick={handleAddToCart}
            disabled={!canAddToCart}
            className="add-to-cart-btn">
                <ShoppingCart size={18} />
                {justAdded ?
                "Added ✓" :
                !product.inStock ? 
                "Out of Stock" : 
                atStockLimit ? "Max in cart" :
                hasVariants && !allVariantsSelected ? "Select Options First" : "Add to Cart"}
            </button>


            </div>
          </div> {/** closes drawer */}
        </>
    )}
    </>   
    )
}

// Filter Chip - one button per category-- same active/inactive highlighting pattern as navlinks
function FilterChip({ label, active, onClick }){
    return(
        <button
        onClick={onClick}
        style={{
            background: "transparent",
            color: RED,
            border: `1px solid ${RED}`,
            fontFamily: CONDENSED,
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            padding: "5px 14px",
            cursor: "pointer",
            transition: "background 0.5s ease, color 0.5s ease, transform 0.5s",
        }}
        className="category-btns"
        >
            {label}
        </button>
    );
}

export default function ShopPage(){
    
    // states
    const [ products, setProducts ] = useState([]);
    const [ loading, setLoading ]   = useState(true);
    const [ error, setError ]       = useState(null);
    const [ activeFilter, setActiveFilter ] = useState("All");

    
    // read ?category from url set by categories section navigate call
    const [ searchParams, setSearchParams ] = useSearchParams();
    const searchQuery = searchParams.get("q") || ""; // get q (query) from searchParams

    // sort state for prices low to high or high to low 
    const [ sortOrder, setSortOrder ] = useState("default");

    const categories = [
    "All",
    "Air Intake Systems",
    "Clutch Drive Lines",
    "Engine Parts",
    "Engine-Crate Engines",
    "Exhaust Systems",
    "Fuel and Ignition",
    "Suspension and Brakes",
    "Turbos and Components",
    ];

    // sync url to the filter mount
    /*
        dependency array [searchParams] means this runs whenever the URL changes.
        if the user clicks a category in categoriessection the url changes: 
            /shop?category=Engine+Parts (example)
        the effect reads that and preselects the right filter chip
    */
    useEffect(() => {
        const categoryFromURL = searchParams.get("category");
        // .get("Category") returns the value or null if not present
        // if statement checks if there is a value present if null it skips
        if (categoryFromURL) setActiveFilter(categoryFromURL);

        if (searchParams.get("q")) setActiveFilter("All");
    }, [searchParams] );

    /* fetch from mongoDB via express:
        runs on mount and whenever activefilter changes, 
        changing a filter chip -> setActiveFilter -> this effect re-fires -> new fetch
    */
    useEffect(() => {
        // use effect cant be async directly - define inner async function then call it
        const fetchProducts = async () => {
            setLoading(true);
            setError(null);

            try{
                // /*      SHORTHAND FOR:
                // let url;
                // if (activeFilter === "All") {
                //     url = `${API_BASE}/api/products`;
                // } else {
                //     url = `${API_BASE}/api/products?category=${encodeURIComponent(activeFilter)}`;
                // }
                // */
                // // build URL and only include ?category= when not "all"
                // const url = activeFilter === "All"
                // ? `${API_BASE}/api/products`    // if true no category filter needed
                // : `${API_BASE}/api/products?category=${encodeURIComponent(activeFilter)}`;  // encodeURIComponent: "Engine Parts" → "Engine%20Parts" (URL-safe)
                
                // // fetch() sends the http get request and waits for reponse headers
                // const res = await fetch(url);

                // if (!res.ok) throw new Error(`Server error: ${res.status}`);    // new error if res is not good and jumps to the catch block

                // const data = await res.json();  // .json() reads the response body and parses it to a json

                // setProducts(data);  // storing it in the state so it triggers a rerender with new products

                const res = await api.get("/products", {
                    params: activeFilter === "All" ? {} : { category: activeFilter },
                });


                setProducts(res.data);

            } catch (err){ 
                setError(err.message);
            } finally {
                setLoading(false);  // always stop the spinner
            }
        };

        fetchProducts();

        // refresh the products and stock when user returns to the tab - picks up any product changes made elsewhere (admin)
        const onFocus = () => fetchProducts();
        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus); // cleanup on unmount

    }, [activeFilter] );

    const visibleProducts = searchQuery ? products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())
    || p.category.toLowerCase().includes(searchQuery.toLowerCase())) : products;

    // sorted products according to default sort or prices low to high or high to low
    const sortedProducts = [...visibleProducts].sort((a,b) => {
        if (sortOrder === "asc") return a.price - b.price;
        if (sortOrder === "desc") return b.price - a.price;
        return 0;   // default no sorting
    });

    return(
    <div style={{minHeight: "60vh"
        }}>
            <div style={{background: DARK, 
            padding: "40px 0 36px",
            }}>
                <div style={{fontFamily:CONDENSED, 
                color: "white", 
                fontSize:42, 
                fontWeight: 600, 
                textTransform: "uppercase", 
                letterSpacing: "0.08em",
                display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px",
                marginTop: -15
                }}>
                Store   
                <SuzukirdLogo size={80}/>
                </div>
                
            <div style={{
                fontFamily: CONDENSED, fontSize: 12, letterSpacing: "0.3em",
                color: RED, textTransform: "uppercase", marginLeft: 15,
            }}>
                Suzuki Racing Development Performace Parts
            </div>
            </div>   
                {/** filter bar */}
                <div style={{
                    background: "#f4f4f4", 
                    padding: "16px 48px",
                    display: "flex", flexWrap: "wrap", gap: 8,
                    borderBottom: "1px solid #e0e0e0",
                }}>
                    {categories.map(cat => (
                        <FilterChip 
                        key={cat}
                        label={cat} 
                        active={activeFilter === cat}
                        onClick={() => {// on click sets the filter and triggers use effect to fetch new products according to filter, setActiveFilter is the dependency array
                            setActiveFilter(cat);
                            setSearchParams(cat === "All" ? {} : { category: cat });
                        }}
                        />
                ))}

                <div style={{marginLeft: "auto", // pushes all the way to the right
                 fontFamily: MONO,
                    fontSize: 11, color: "#888", alignSelf: "center", letterSpacing: "0.05em",
                }}>
                    {/** this checks if loading is true and then the inner ternary (if/else) pluralizes the word product */}
                    {loading ? "Loading ... " : `${sortedProducts.length} product${sortedProducts.length !== 1 ? "s" : ""}`}
                </div>

                {/** filter select by price/default */}
                <select value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                style={{marginLeft: 12,
                    padding: "5px 10px",
                    fontFamily: MONO,
                    fontSize: 11,
                    border: `1px solid ${RED}`,
                    background: "transparent",
                    color: RED,
                    cursor: "pointer",
                    outline: "none",
                    letterSpacing: "0.05em",}}>
                        <option value={"default"}>Sort: Default</option>
                        <option value={"asc"}>Sort: Low to High</option>
                        <option value={"desc"}>Sort: High to Low</option>
                    </select>

            </div> {/** Filtering div ends here */}
            {searchQuery && (  
                <div style={{
                    padding: "12px 48px",
                    fontFamily: MONO,
                    fontSize: 11,
                    color: "#888",
                    letterSpacing: "0.05em",
                    background: "#f4f4f4",
                    borderBottom: "1px solid #e0e0e0",
                }}>
                    Results for: <span style={{ color: RED, fontWeight: 700 }}>"{searchQuery}"</span>
                </div>
            )}

            {/** Content 
             *  && - shorthand for: {loading ? <div>LOADING PRODUCTS...</div> : null}
             *  If the left side is false it stops and renders nothing
             *  If the left side is true it continues and renders the right side
            */}
            {loading && (   // LOADING PRODUCTS 
                <div style={{ 
                    textAlign: "center",
                    padding: "80px 0", fontFamily: MONO, fontSize: 12,
                    color: "#888", letterSpacing: "0.1em"
                }}>
                    Loading Products
                </div>
            )}
            {/** IF ERROR OCCURS 
             * with && operator both conditions must be true for rendering
             * if loading finishes (hence !loading) & error is true
            */}
            {!loading && error && (
                <div style={{
                    textAlign: "center", fontFamily: MONO, fontWeight: 700, padding: "80px", color: RED
                }}>
                  ⚠️ Could not load products: {error} 
                </div>
            )}

            {/** IF CATEGORY IS EMPTY 
             * if loading is finished, no error and products length is 0
            */}
            {!loading && !error && sortedProducts.length === 0 && (
                <div style={{textAlign: "center", padding: 80, fontFamily: CONDENSED, fontSize: 18, color: "#aaa"}}>
                    No Products found in this category
                    </div>
            )}

            {/** GRID ONLY SHOWS IF WE HAVE PRODUCTS FOR THE CATEGORY (or all) */}
            {!loading && !error && sortedProducts.length > 0 && (
                <div style={{
                    display: "grid",
            // repeat(auto-fill, minmax(220px, 1fr)) mirrors CategoriesSection's
            // repeat(4, 1fr) but auto-adjusts for smaller screens.
            // "auto-fill" = make as many columns as fit.
            // "minmax(220px, 1fr)" = each column is at least 220px, grows equally.
                    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24,
                }}>
                {/** products.map() -> one product Card per product.
                 * key = {product_id} uses mongodb's objectid as a key
                 * never use array index as key when the list can reorder
                 */}    
                {sortedProducts.map(product => (
                    <ProductCard
                    key={product._id}
                    product={product}
                    // onAddtoCart is passed down as a prop
                    //productcard calls it when the button is clicked, card state lives here in shop page - "lifting state up
                    />
                ))}    
                </div>
            )}
        </div>

    );
}