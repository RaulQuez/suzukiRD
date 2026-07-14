/*
    Landing page of the admin app
*/
import "../App.css"
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const Dashboard = () => {
    // states we use
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // navigation
    const navigate = useNavigate();

useEffect(() => {
        // promise.all() : fetch products + orders simultaneously - 200ms, Promise.all() takes an array of promises and resolves when ALL of them finish.
        // If any one fails, the whole thing rejects — caught by our catch block.
const fetchData = async () => { 

    try { 
        const [productsRes, ordersRes] = await Promise.all([
            api.get("/products"),
            api.get("/orders"),
        ]);
        const products = Array.isArray(productsRes.data) ? productsRes.data : [];
        const orders = Array.isArray(ordersRes.data) ? ordersRes.data : [];

        setProducts(products);
        setOrders(orders);
    } catch (err) {
        setError("Failed to load dashboard data.");
        console.error(err);
    } finally {
        setLoading(false);
    }
};

    fetchData();
}, []);

/*
All metrics are computed from the fetched data using useMemo.
We never store these as separate state — they're derived values.
Derived means "calculated from existing data" — if products or orders
change, the metrics automatically update without extra setState calls.
*/

// filters orders places TODAY:
const todayOrders = useMemo(()=>{
    
    // new Date().toDateString() returns something like "Mon Jan 15 2024".
const today = new Date().toDateString();
    // we compare each order's createdAt date string and if they match today then we return
    return orders.filter((o) => new Date(o.createdAt).toDateString() === today);

}, [orders]);

// todayRevenue sums totalPrice of all orders placed today, .reduce() accumlumates the total starting from 0.
const todayRevenue = useMemo(() =>{
    return todayOrders.reduce((sum, o) => sum + o.totalPrice, 0);
}, [todayOrders]);

// low stock products with stock under 3, sorted stock ascending so the most critical (0) appears first
const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.stock < 3)
        .sort((a,b) => a.stock - b.stock);
}, [products]);

// recent orders, 5 most recent orders for the dashboard sorted newest first from API already so we just slice the first 5
const recentOrders = useMemo(() => {
    return orders.slice(0,5);   // orders 0-5 in array
}, [orders]);

// pending count that shows how many orders are still pending, shown as a subtitle on the orders metric card so admin knows how many need attention
const pendingCount = useMemo(()=>{
    return orders.filter((o) => o.status === "pending").length;
}, [orders]);

// status colors
const statusColor = {
    pending:   "badge-pending",
    confirmed: "badge-confirmed",
    shipped:   "badge-shipped",
    delivered: "badge-delivered",
    cancelled: "badge-cancelled",
    refunded:  "badge-refunded",
};

const formatDate = (str) => 
    new Date(str).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
});
if (loading) return <div style={{textAlign: "center", padding: 48, color: "#666"}}>Loading Dashboard ...</div>
if (error) return <div style={{textAlign:"center", padding: 48, color: "red"}}>{error}</div>


return (
    // dashboard container/page (keep in mind this is under the navbar)
    <div style={{padding: "32px 24px", maxWidth: "1200px", margin: "0 auto"}}>
        {/** header */}
        <div style={{marginBottom: 28}}>
            <h1 style={{fontSize: 20, fontWeight: 500, color: "red", marginBottom: 4}}>Dashboard</h1>
            <p style={{fontSize: 13, color: "white"}}>
                {/** todays date */}
                {new Date().toLocaleDateString("en-US", {
                    weekday: "long", month: "long", day: "numeric",
                })}
            </p>
        </div>

        {/** metric card */}
        {/** metrics grid */}
        <div style={{display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24,}}>
                {/**each card is clickable - clicking navigates to relevant page. */}
            <div className="metric-card" onClick={() => navigate("/products")}>
                <div className="metric-label">Total Products</div>
                <div className="metric-value">{products.length}</div>
                <div className="metric-sub">across 8 categories</div>
            </div>

                <div className="metric-card" onClick={() => navigate("/orders")}>
                <div className="metric-label">Orders Today</div>
                <div className="metric-value">{todayOrders.length}</div>
                <div className="metric-sub">
                    {/** conditional subtitle - if there are pending orders show the count as a warning otherwise show "all clear" */}
                    {pendingCount > 0 ? `${pendingCount} pending review`
                                        : "none pending"}
                </div>
            </div>

            <div className="metric-card">
                <div className="metric-label">Revenue Today</div>
                <div className="metric-value">
                    ${todayRevenue.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })}
                </div>
                <div className="metric-sub">
                    from {todayOrders.length} order{todayOrders.length !== 1 ? "s" : ""}
                </div>
            </div>
                <div className={`metric-card ${lowStockProducts.length > 0 ? "metric-card-warning" : ""}`}
                    onClick={() => navigate("/products")}>
                        <div className="metric-label">Low Stock</div>
                        <div className={`metric-value ${lowStockProducts.length > 0 ? "value-warning": ""}`}>
                            {lowStockProducts.length}
                        </div>
                        <div className="metric-sub">
                            {lowStockProducts.length > 0 ? "items need restocking" : "all items stocked"}
                        </div>
                </div>
            </div>

            {/** Bottom 2 columns */}
            {/** dash grid */}
        <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16}}>
            {/** recent orders */}
            <div className="dash-card">
                    <div className="dash-card-header">
                    <span className="dash-card-title">Recent Orders</span>
                    {/** "view all" navigates to the full orders page */}
                    <button className="dash-link-btn" onClick={() => navigate("/orders")}>
                    View All →
                    </button>
                    </div>
                    {recentOrders.length === 0 ? (
                        <div className="dash-empty">No orders yet.</div>
                    ) : ( 
                        <table className="dash-table">
                            <thead>
                        <tr>
                            <th>Customer</th>
                            <th>Date</th>
                            <th>Total</th>
                            <th>Status</th>
                        </tr>
                            </thead>
                            <tbody>
                                {recentOrders.map((order) => (
                                    <tr key={order._id}
                                    className="dash-table-row" 
                                    onClick={() => navigate("/orders")}>
                                        <td>
                                            <div style={{color: "white"}}>{order.customer.name}</div>
                                            <div style={{color: "white"}}>{order.customer.email}</div>
                                        </td>
                                        <td style={{color: "white"}}>{formatDate(order.createdAt)}</td>
                                        <td style={{color: "white"}}>${order.totalPrice.toFixed(2)}</td>
                                        <td>
                                            <span className={`status-badge ${statusColor[order.status]}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
            </div>

            {/** Low stock alerts */}
            <div className="dash-card">
                <div className="dash-card-header">
                    <span className="dash-card-title">Low stock alerts</span>
                    <button className="dash-link-btn" onClick={() => navigate("/products")}>
                    Manage →
                    </button>
                </div>

                {lowStockProducts.length === 0 ? (<div className="dash-empty">All products are well stocked</div>) : 
                (
                    <table className="dash-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Category</th>
                                <th>Stock</th>
                            </tr>
                        </thead>
                    <tbody>
                        {lowStockProducts.map((product) => (
                            <tr key={product._id} className="dash-table-row"
                            onClick={() => navigate("/products")}>
                                <td style={{color:"white"}}>{product.name}</td>
                                <td style={{color:"white"}}>{product.category}</td>
                                <td >
                                    {/**color stock number based on severity. 0=red (out of stock), 1-2=amber(critical low) */}
                                    <span className={product.stock === 0 ? "stock-zero" : "stock-low"}>
                                        {product.stock === 0 ? "Out of stock" : product.stock}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    </table>
                )}
            </div>
        </div>
    </div>
    )
}

export default Dashboard;