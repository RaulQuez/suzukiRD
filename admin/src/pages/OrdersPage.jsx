/*
    OrdersPage.jsx
    Page that displays orders for admin
*/
import React from 'react';
import { useState, useEffect, useMemo } from 'react';
import api from "../api/axios.js";
import "../App.css";

// Status for all valid orders, matches enum in Order mongoose schema exactly, used for both the filter buttons and the status dropdown
const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled", "refunded"];

// status colors that maps each status to a css color for a colored badge. Defined here so its not recreated on every render
const STATUS_COLORS = {
    pending: "badge-pending",
    confirmed: "badge-confirmed",
    shipped: "badge-shipped",
    delivered: "badge-delivered",
    cancelled: "badge-cancelled",
    refunded: "badge-refunded",
}
const OrdersPage = () => {
// states
const [ orders, setOrders] = useState([]);
const [ loading, setLoading] = useState(true);
const [ error, setError] = useState("");

// state which filter button is selected "all" shows all orders on startup/default
const [ filterStatus, setFilterStatus] = useState("all");
// expandedID is the _id of the order row currently expanded to show details, null if no order is expanded, only one row can be expanded at a time, clicking the same row again closes it
const [ expandedID, setExpandedID] = useState(null);
// notes state that tracks notes input for each order, we store it as an object keyed by order _id so each order has its own notes value/state
const [ notes, setNotes] = useState({});
// updatingId tracks which order is currently being updated so we can show a laoding state on just that row's dropdown
const [ updatingId, setUpdatingId] = useState(null);

// fetch orders function on mount
const fetchOrders = async () => {
    try {
        setLoading(true);
        setError("");   
        const response = await api.get("/orders");
        
        // validate response and guarentee its an array before setting state, if not set to empty array to avoid crashes
        const data = Array.isArray(response.data) ? response.data : [];
        setOrders(data);

        /*
        Pre populute the notes state with existing notes from the db. When the admin expands an order the notes textarea should
        already show whatever notes were previously saved for that order, allowing the admin to edit existing notes instead of starting from a blank textarea every time.

        .reduce() builds the map in one pass over the orders array, same pattern as the allowedFields reduce in the PATCH route - acc is the object being built
        order is the current item
        */
        const initialNotes = data.reduce((acc, order) => {
            acc[order._id] = order.notes || ""; // initialize notes state for each order, default to empty string if no notes
            return acc;
        }, {});

        setNotes(initialNotes);

    } catch (err) {
        setError("Failed to fetch orders");
    } finally {
        setLoading(false);
    }
 };
// runs on mount 1 time to fetch orders, empty dependency array means it only runs once on mount, not on updates
useEffect(() => {
    fetchOrders();
}, []);

// function same as useMemo pattern on ProductsPage, only recomputes when orders or filterStatus changes, dependency array is [orders, filterStatus]
const filteredOrders = useMemo(() => {
    if (filterStatus ==="all")return orders; // if "all" is selected return all orders

    return orders.filter((o) => o.status === filterStatus);

}, [orders, filterStatus]);

// expands a row if its collapsed, collapses if already open, ternary checks if clicked row is already expanded, set to null (collapse) otherwise set to this order's ID (expand)
const toggleExpand = (id) => {
    setExpandedID((prev) => (prev===id? null : id));
};

// handle status change updates a single order's status. called when admin selects a new value in the status dropdown. 
// we update local storage so the ui updates immediately, then confirm with the api call, if api call fails we revery by refreshing
const handleStatusChange = async (orderId, newStatus) => {
    // validate newStatus is one of the allowed values
    if (!STATUSES.includes(newStatus)) {
        alert("Invalid status");
        return;
    }

    // skip if the status isn't actually changing — no point hitting the API
    const current = orders.find((o) => o._id === orderId);
    if (current?.status === newStatus) return;

    // if markeding shipped, ask for the UPS tracking number
    let trackingNumber;
    if (newStatus === "shipped") {
        trackingNumber = window.prompt("Enter the UPS tracking number for this order:");
        // if they hit cancel or leave it blank, abort — don't ship without a number
        if (!trackingNumber || !trackingNumber.trim()) return;
        trackingNumber = trackingNumber.trim();
    }

    setUpdatingId(orderId); // set updatingId to show loading state on this row's dropdown

    // optimistic update - immediately update the order in local state before API responds. makes the UI feel instant, 
    // .map returns a new array - we never mutate state directly, for the matchigng order we spread all its fields and override status
    // all other orders we return unchanged
    setOrders((prev) => 
    prev.map((o) => o._id === orderId ? {...o, status: newStatus,
        ...(trackingNumber && { trackingNumber }) 
    } : o));

    try {
        await api.patch(`/orders/${orderId}/status`, { status: newStatus, trackingNumber });
    } catch (err) {
        alert(err.response?.data?.error || "Failed to update status");
        fetchOrders(); // refresh orders to revert optimistic update if API call fails, revert
    } finally {
        setUpdatingId(null); // clear updatingId to remove loading state from dropdown
    }
};

// handleNotesSave saves the notes for one order, called when the admine clicks "save notes" inside expanded row
const handleSaveNotes = async (orderId) => {
    setUpdatingId(orderId); // set updatingId to show loading state on this row's save button

    try {
        await api.patch(`/orders/${orderId}/notes`, {
            notes: notes[orderId] // get the current notes value for this order from state
        })

        // update notes field in local state so saved value persists without needing full refresh
        setOrders((prev) => 
            prev.map((o) => o._id === orderId ? { ...o, notes: notes[orderId] } : o )
        );
        alert("Notes updated successfully");

    } catch (err) {
        alert(err.response?.data?.error || "Failed to update notes");
    } finally {
        setUpdatingId(null); // clear updatingId to remove loading state from save button
    }
}

// formatDate converts mongoDB iso timestamp to a readable string. (str) parses iso string into js date object. .tolocaledatasstring() formats the date into a readable string based on local timezone, we can pass options to specify what parts of the date we want to show() formats it based on user locale (location)
const formatDate = (str) => {
    return new Date(str).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};
    // countByStatus builds a count of orders per status for the filter badges. shows how many orders are in each state so the admin
    // can quickly see how many are pending without clicking filter, .reduce counts occurrences - acc[status] starts undefined, (acc[status] || 0) + 1 handles first occurence cleanly
    const countByStatus = useMemo(() => {
        // .reduce iterates over orders array once, acc is the object being built, order is the current item
        return orders.reduce((acc, order) => {
            acc[order.status] = (acc[order.status] || 0) + 1;
            return acc;
        }, {});
    }, [orders]);


return(
    // orders page container, we will build the rest of the page inside this div, including the header, filter buttons, and order table
<div style={{padding: "32px 24px", maxWidth:"12000px", margin: "0 auto"}}>
        {/**page header */}
     <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px"}}>
        <div>
        <h1 style={{fontSize: 20, fontWeight: 500, color: "red", marginBottom: 4}}>Orders</h1>
        <p style={{fontSize: 13, color: "white", fontWeight: 450}}>{orders.length} total orders</p>
        </div>
    </div>

    {/**filter status buttons */}
    <div style={{display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20}}>
        <button className={`filter-btn ${filterStatus === "all" ? "active" : ""}`}
        onClick={() => setFilterStatus("all")}>
            All <span style={{fontSize: 12, padding: "1px 6px", borderRadius: 4, background: "#222", color: "#666"}}>{orders.length}</span>
        </button>

        {STATUSES.map((s) => (
            <button key={s}
            className={`filter-btn ${filterStatus === s ? "active" : ""}`}
            onClick={() => setFilterStatus(s)}>

                {/**Capatalize first letter of status, and then s.slice(1) gets everything after the first char and combines the full string */}
                {s[0].toUpperCase() + s.slice(1)}
                
                {/** Only show count badge if there are orders with this status. 
                 * && short circuits - if countByStatus[s] is 0 or undefined(falsy), the span doesnt render
                 */}
            {countByStatus[s] && (<span style={{
                fontSize: 12, padding: "1px 6px", borderRadius: 4, background: "#222", color: "#666"
            }}>{countByStatus[s]}</span>
        )}
            </button>
        ))}
    </div>

    {/** states: loading/error/empty/table */}
    { loading ? (
        <div className="state-msg">Loading orders...</div>
    ) : error ? (
        <div className="state-msg error">{error}</div>
    ) : filteredOrders.length === 0 ? (
        <div className="state-msg">No orders found</div>
    ) : (
        // table wrapper
        <div style={{background: "#1a1a1a", border: "0.5px solid #2a2a2a", borderRadius: 12, overflow:"hidden"}}>
            {/** orders table */}
            <table className="orders-table">
            <thead>
                <tr>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
            {/**React.fragment with a key we need to render two <tr> elements
    per order (the summary row and expanded detailed row), but .map() only returns one element
    
    Fragment lets us group them without adding an extra DOM element like a <div>
            */}
        {filteredOrders.map((order) => (
            <React.Fragment key={order._id}>
                {/** summary row */}
            <tr key={order}
                className={`order-row ${expandedID === order._id ? "expanded" : ""}`}
                onClick={() => toggleExpand(order._id)}>
                    <td>
                    <div style={{fontWeight: 500, color: "#e0e0e0", marginBottom: 2}}>{order.customer.name}</div>
                    <div style={{fontSize: 12, color:"rgba(255, 0, 0, 0.84)"}}>{order.customer.email}</div>
                    </td>

                    <td>{formatDate(order.createdAt)}</td>
                    <td>{order.items.length} item{order.items.length !== 1 ? "s" : ""}</td>
                    
                    <td style={{fontWeight: 500, color: "#e0e0e0"}}>${order.totalPrice.toFixed(2)}</td>

                    <td>
                        <span className={`status-badge ${STATUS_COLORS[order.status]}`}>
                            {order.status}
                        </span>
                    </td>

                    <td style={{textAlign: "center", width: 32}}>
            {/** The arrow rotates 180 when the arrow is expanded using CSS transform */}
            <span className={`expand-arrow ${expandedID === order._id ? "open" : ""}`}>
                ▾
            </span>
                    </td>
            </tr>

            {/** expanded detail row */}
            {/** only render the detail row when the order is expanded 
             * && short circuits - if expandedId !== order._id, nothing renders
             */}
             {expandedID === order._id && (
                <tr key={`${order._id}-detail`} className="detail-row">
                    {/**colSpan={6} makes this single cell span all 6 columns so the detail panel fills the full table width. */}
                    <td colSpan={6}>
                
                <div style={{padding: "20px 16px", borderTop: "0.5px solid #2a1a1a", }}>
                    {/** 3 column layout */}
                    <div style={{display:"grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24}}>
                        {/**column 1 - order items */}
                        <div className="detail-section">
                        {/** items ordered label */}
                    <div className="detail-label">Items Ordered</div>
                        {order.items.map((item,idx) => (
                            <div key={idx} style={{padding: "8px 0", borderBottom: "0.5px solid #222"}}>
                        <div style={{fontSize: 13, color: "white", marginBottom: 3}}>
                            {item.name}</div>

                            {/** Show the selected variant if it exists:  */}
                            {item.selectedVariant && (
                                <div style={{fontSize: 11, color: "#e57373",fontWeight: 600,marginBottom: 3,letterSpacing: "0.05em",}}>
                                    {item.selectedVariant}
                                </div>
                            )}
                            
                            {/**order item meta */}
                        <div style={{fontSize: 12, color: "white"}}>
                            Qty: {item.quantity} × ${item.price.toFixed(2)}
                            <span style={{marginLeft: 8, color: "white"}}>
                                = ${(item.quantity * item.price).toFixed(2)}
                            </span>
                        </div>
                            </div>   
                        ))}
                <div style={{fontSize: 13, fontWeight: 500, color: "#e0e0e0", marginTop: 10, paddingTop: 10, }}>
                    Total: ${order.totalPrice.toFixed(2)}
                </div> {/** first column ends here now we make the 2nd column below */}
                        </div>
                        {/** column 2 */}
                        <div className="detail-section">
                        <div className="detail-label">Shipping Address</div>
                        {/**address block */}
                        <div style={{color: "white", fontSize: 13, lineHeight: 1.8}}>
                            <div>{order.shippingAddress.fullname}</div>
                            <div>{order.shippingAddress.street}</div>
                            <div>
                            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                            </div>
                        </div>

                        <div className="detail-section">
                          <div className="detail-label" style={{marginTop: 8}}>Order ID</div>
                            {order._id}
                        </div>


                        <div className="detail-label" style={{marginTop: 8}}>Phone Number</div>

                        {order.customer.phone && (
                        <div>📞 {order.customer.phone}</div>
                        )} 
                        </div>

                        {/** Column 3 BELOW STATUS + NOTES */}
                        <div className="detail-section">
                            <div className="detail-label">Update Status</div>
                {/*
                    e.stopPropagation() — same reason as the modal.
                    The row has an onClick to toggle expand.
                    Without stopPropagation, clicking the dropdown
                    would also trigger the row's onClick and collapse it.
                */}
                    <select
                    className="status-select"
                    value={order.status}
                    disabled={updatingId === order._id}
                    onChange={(e) => {
                        e.stopPropagation();
                        handleStatusChange(order._id, e.target.value);
                    }}    
                    onClick={(e) => e.stopPropagation()}>
                        {STATUSES.map((s) => (
                            <option key={s} value={s}>
                                {s[0].toUpperCase() + s.slice(1)}
                            </option>
                        ))}
                    </select>

                    <div className="detail-label" style={{marginTop: 14}}>
                        Internal Notes
                    </div>
                        {/** Notes area */}
                    <textarea className="notes-input" rows={3} placeholder="Add notes visible only to admins"
                    value={notes[order._id] || ""}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                        e.stopPropagation();
                        // update only this orders notes in map, spread ...prev keeps all ofther orders' notes, then override just this orders entry
                        setNotes((prev) => ({...prev, [order._id]: e.target.value}));
                    }}
                    />
                    <button className="save-notes-btn" disabled={updatingId === order._id}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleSaveNotes(order._id);
                    }}>
                        {updatingId === order._id ? "Saving ..." : "Save Notes"}
                    </button>
                        </div>
                    </div>
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
export default OrdersPage;