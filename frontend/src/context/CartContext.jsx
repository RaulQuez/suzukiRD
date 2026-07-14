/*
    Cart Context - global state manager for the shopping cart
*/

import { useContext, createContext, useState, useEffect } from "react";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
    // lazy initaliater pattern that first checks for a saved cart in the browsers localStorage
    const [ cart, setCart ] = useState(() => {
        try {   
            // JSON.parse - converts stored JSON String back into js array
            return JSON.parse(localStorage.getItem("cart")) || [];
        } catch (err) {
            return [];
        }
});

// saves cart
// wrap write in try/catch block (localStorage blocked in incognito/storage-full)
useEffect(()=>{
        try {
            // .setItem saves cart under "cart" key in browswer localStorage
            localStorage.setItem("cart", JSON.stringify(cart));  // converting cart into JSON string (localStorage can only store strings.)
        } catch (err) {
            // storage unavailable - silently fails
        }
}, [cart]);

/*
    add to cart function - PREV - guarantees were working with latest state not stale snapshot
    Increment: Copy all of the existing cart item's properties into a new object, but override quantity with the incremented value.
    Append: Copy all of the product's properties into a new object, but inject a brand new quantity: 1 field that didn't exist before.
*/
const addToCart = (product) => {
    setCart((prev) => {
        // searches current cart array for item that matches _id of product being added, returns item if found , undefined if !
        const existing = prev.find((item) => item._id === product._id && item.selectedVariant === product.selectedVariant);
        
        if (existing) {     // if item found this will be true/defined
            return prev.map((item) => // for matching item, spread (...item) to copy all its properties then override just quantity + 1, every other item is unchanged
            item._id === product._id && item.selectedVariant === product.selectedVariant ? 
            { ...item, quantity: item.quantity + 1} : item); 
        }
        // if its new, we append, spreads (...p) the existing cart into a new array (product comes from database)
        return [...prev, {...product, quantity: 1}];
    });
};

// filters the cart down a to a new array containing only items whos _id does not match the one removed
const removeFromCart = (productId, selectedVariant) => {
        // current cart -> find item ->   keep item if id doesn't match the one passed 
    setCart((prev) => prev.filter((item) => !(item._id === productId && item.selectedVariant === selectedVariant)));
};

// update Quantity
const updateQuantity = (productId, selectedVariant, quantity) => {
    // if the quantity of an item is 0 remove from the Cart
    if (quantity < 1 ){
        removeFromCart(productId, selectedVariant);
        return;
    }
    // its looping over ...prev which is every item in the array and then if the ids match we take that individual item and ...item creates a new object for that item since theyre all objects with properties
    setCart((prev) => 
    prev.map((item) => 
    item._id === productId && item.selectedVariant === selectedVariant ? { ...item, quantity} : item));
};

// clearing cart - simply just override its state with an empty array
const clearCart = () => setCart([]);

// .reduce loops over every item and accumulates a single value - total count (total) - item is the current item being looped (1) and we start at 0 hence ,0 at the end
const cartCount = cart.reduce((total,item) => total + item.quantity, 0);

// again .reduce loop, Number() numberify the price (Originally a string in DB) and calculate
const cartTotal = cart.reduce(
    // for the quantity of each item we mulitply 2 engines $100.00 - 100 * 100 = total, starting at 0
    (total, item) => total + Number(item.price) * item.quantity, 0
);

return (
    <CartContext.Provider 
    value={{cart, addToCart, removeFromCart, updateQuantity,clearCart, cartCount,cartTotal }}>
        {children}
    </CartContext.Provider>
    );
};

// custom hook that catches errors & give components clean access to cartContext
export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error("useCart must be inside CartProvider");
    return context; // holds everything passed in value on the provider
};

export default CartContext;