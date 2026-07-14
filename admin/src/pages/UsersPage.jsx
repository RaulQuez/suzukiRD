/*
    users page that displays all users that have placed orders 
    They are grouped by email and show us how many orders they have placed + items

*/
import "../App.css"
import api from "../api/axios.js"
import {useState, useEffect, useMemo} from "react"
import React from "react";

const UsersPage = () => {

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [orders, setOrders] = useState([]);
    const [search, setSearch] = useState("");
    const [expandedEmail, setExpandedEmail] = useState(null);

    useEffect(() => {

        const fetchOrders = async () => {
            try {
                const response = await api.get("/orders");
               
                const data = Array.isArray(response.data) ? response.data : [];
                setOrders(data);
            } catch (err) {
                console.log("Error: ", err);
                setError("Failed to fetch orders");
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    /*
    customers useMemo func - core derived data structure 
    we weduce the flat orders ararp into a map keyed by email. Each entry accumulates order 
    count, total spent and order history.
        - map = o(1) lookups by email.
    The final result is sorted by total spent descending to view best customers at the top
    */
const customers = useMemo(() => {
    // build map wehre the key= customer email, value= customer summary object
    const map = new Map();

    orders.forEach((order) => {
        const email = order.customer.email;
        const existing = map.get(email);

        if (existing) {
            // customer already in map - update their running totals, we push this order into their orders array and add total spent
            existing.orders.push(order);
            existing.totalSpent += order.totalPrice;
            existing.orderCount += 1;

            // track the most recent order date
            if (new Date(order.createdAt) > new Date(existing.lastOrderDate)) {
                existing.lastOrderDate = order.createdAt;
            } 

        } else {
                // first time seeing this email - create a new customer entry, we store the name from the first order we see for this email
                map.set(email, {
                    name: order.customer.name,
                    email,
                    phone: order.customer.phone || "",
                    orderCount: 1,
                    totalSpent: order.totalPrice,
                    lastOrderDate: order.createdAt,
                    // store the full orders array so admin can see their order history
                    orders: [order],
                });
            }
    });

    // convert map to array for rending - map.values() returns an iterator - array.from() converts it to an array.
    // .sort() orders by totalSpent descending - best customers first
    return Array.from(map.values()).sort(
        (a,b) => b.totalSpent - a.totalSpent
    );
}, [orders]); 

// search filters by name or email
const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers;

    const term = search.toLowerCase();
    return customers.filter(
        (c) => 
            c.name.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term)
    );
}, [customers, search]);

// toggle expand - clicking the same row again collapses it
const toggleExpand = (email) => {
    setExpandedEmail((prev) => (prev === email ? null : email));
}
// formating the date
const formatDate = (str) =>
    new Date(str).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
});

// status colors same as the other pages
const statusColor = {
    pending:   "badge-pending",
    confirmed: "badge-confirmed",
    shipped:   "badge-shipped",
    delivered: "badge-delivered",
    cancelled: "badge-cancelled",
    refunded:  "badge-refunded",
}
    return(
    /**page container for the users page */
    <div style={{padding: "32px 24px", maxWidth: "1200px", margin: "0 auto"}}>
        {/** page header */}
        <div style={{display:"flex", justifyContent:"space-between", alignItems: "flex-start", marginBottom: 24}}>
            <div>
                <h1 style={{fontSize: 20, fontWeight: 500, color: "red", marginBottom: 4}}>Customers</h1>
                <p style={{color: "white", fontSize: 13}}>
                    {customers.length} unique customer{customers.length !== 1 ? "s": ""}
                </p>
            </div>
        </div>

        {/** Search */}
        <input 
        className="user-search-input"
        type="text"
        placeholder="Search by name or email ..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        />

        {/** states */}
        {loading ? (<div className="state-msg">Loading Customers ... </div>) : error ?
        (<div className="state-msg">{error}</div>) : filteredCustomers.length === 0 ? 
        (<div className="state-msg">No customers found</div>) : (
            /**table wrapper */
            <div style={{background: "#1a1a1a", border: "0.5px solid #2a2a2a", borderRadius: 12, overflow: "hidden"}}>
                {/** table */}
                <table className="users-table">
                    <thead>
                <tr>
                    <th>Customer</th>
                    <th>Orders</th>
                    <th>Total Spent</th>
                    <th>Last Order</th>
                    <th></th>
                </tr>
                    </thead>

                <tbody>
                    {filteredCustomers.map((customer) => (
            <React.Fragment key={customer.email}>
                {/** summary row */}
                <tr 
                className={`user-row ${expandedEmail === customer.email ? "expanded" : ""}`}
                onClick={() => toggleExpand(customer.email)}>
                    <td>
                        {/** avatar circle shows the first letter of the customers name as a visual, customer.name[0] gets the first character */}
                    <div className="customer-info">
                            <div className="avatar">
                                {customer.name[0].toUpperCase()}
                            </div>

                        <div>
                            <div>{customer.name}</div>
                            <div>{customer.email}</div>
                            {customer.phone && (
                                <div>{customer.phone}</div>)}
                        </div>                        
                        
                    </div>

                    </td>

                    <td>
                        <span className="order-count-badge">
                            {customer.orderCount} order{customer.orderCount !== 1 ? "s" : ""}
                        </span>
                    </td>

                    <td>
                        ${customer.totalSpent.toFixed(2)}
                    </td>

                    <td>
                        {formatDate(customer.lastOrderDate)}
                    </td>

                    <td className="expand-cell">
                    <span className={`expand-arrow ${expandedEmail === customer.email ? "open" : ""}`}>
                        ▾
                    </span>
                    </td>
                </tr>
            
            {/** expanded order history MODAL */}
            {expandedEmail === customer.email && (
        <tr key={`${customer.email}-detail`} className="detail-row">
            <td colSpan={5}>
                <div className="detail-panel">
                    <div className="detail-label">Order history</div>
            <table className="orders-inner-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Items</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Shipping to</th>
                    </tr>
                </thead>
                <tbody>
                    {/*
                        Sort this customer's orders newest first.
                        We sort a copy with [...customer.orders] so we
                        don't mutate the original array in the Map.
                        Mutating state data directly causes hard to
                        track bugs in React.
                    */}
            {[...customer.orders]
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .map((order) => (
                    <tr key={order._id} className="inner-order-row">
                        <td>{formatDate(order.createdAt)}</td>
                        <td>
                            {/*
                                Show each item on its own line.
                                "x2" shows quantity if more than 1.
                            */}
                            <div className="order-items-list">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="order-item-line">
                                        {item.name}
                                        {item.quantity > 1 && (
                                            <span className="item-qty"> x{item.quantity}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </td>
                        <td className="inner-total">
                            ${order.totalPrice.toFixed(2)}
                        </td>
                        <td>
                            <span className={`status-badge ${statusColor[order.status]}`}>
                                {order.status}
                            </span>
                        </td>
                        <td className="shipping-to">
                            {order.shippingAddress.city}, {order.shippingAddress.state}
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
                </div>
            </td>
        </tr>
    )}
            </React.Fragment>
                    ))}
                </tbody>


                </table>
            </div>
        )}



    </div>
    

    )
}

export default UsersPage;