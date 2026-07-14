/* this is the entry point for the entire express backend
 1. creates the express app
 2. registers middleware (which runs on every request before routes)
 3. mounts route files at their URL prefixes and connects to MongoDB then starts listening for requests
*/
import "./config/env.js" // loads .env file, without it code cant read variables put inside of .env this reads the .env file and loads every variable into process.env before anything else tries to read them

import express from "express";  // framework that creates server & backend work
import mongoose from "mongoose";    // lets server talk to MongoDB & gives easy methods to read/write to database   
import cors from "cors";    // (Cross Origin Resource Sharing) allows frontend and backend to talk to each other, without it browser blocks requests between different ports, frontend->localhost 5173, ! backend->localhost 50000 

import authRoutes from './routes/auth.js'
import orderRoutes from './routes/orders.js'
// import route files, each file handles one group of related endpoints such as products,auth, and orders
import productRoutes from "./routes/products.js"
import paymentRoutes from "./routes/payments.js";
import contactRoutes from "./routes/contact.js";
import shippingRoutes from "./routes/shipping.js";
import { startAbandonedOrderSweep } from "./utils/releaseAbandonedOrders.js";  // cron job that runs every 5 minutes to reclaim stock from unpaid orders 
import rateLimit from "express-rate-limit";  // middleware to limit how many requests a client can make in a given time window, helps prevent abuse and DDoS attacks
import webhookRoutes from "./routes/webhook.js";  // stripe webhook route, must be mounted before express.json() so it can read the raw request body for signature verification


const app = express();// creates the express application instance
const PORT = process.env.PORT || 5000; // deployment platforms (railway,render) inject their own ports || 5000 is a fallback for local deployment
app.set("trust proxy", 1); // needed for rate limiting to work correctly behind a reverse proxy (like render/railway) so it can get the real client IP address

// Rate Limiting Middleware TIGHT - brute force protection on login, 10 attempts per 15 mins per ip
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: { error: "Too many login attempts from this IP, please try again after 15 minutes" },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers so client can see remaining quota
    legacyHeaders: false, // disable the older X-RateLimit-* headers, we only want the new standard headers
});
// MODERATE - for write actions that cost (emails and orders)
const writeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    skip: (req) => req.method === "GET", // skip GET requests, only limit POST/PATCH/DELETE
    message: { error: "Too many requests. Please slow down and try again shortly." },
    standardHeaders: true,
    legacyHeaders: false,
});
// LOOSE - general protection on everything else
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: { error: "Too many requests. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});
// Middleware
/*  - functions that run on every incoming request before it reaches the route handlers:
form a pipeline == Request -> cors() -> express.json() -> Route Handler -> Response

app.use(fn) registers middleware globally (all routes, all methods).
---Order matters — middleware runs top to bottom.

cors() adds the right response headers to allow front and back to speak to each other
*/
app.use(cors({
    origin: [
    "http://localhost:5173",    // vite dev server (default port)
    "http://localhost:5174", // vite backup if 73 is taken
    "http://localhost:5175",
    process.env.SHOP_URL,   // production frontend "https://suzukird.com"
    process.env.ADMIN_URL,   // production admit "https://admin.sukukird.com"
    ].filter(Boolean),  //.filter(Boolean) removes undefined entries — if SHOP_URL isn't set yet in .env,
                        // it would be undefined. undefined in the array would cause cors to crash.

    /*
    tells the server exactly what kind of requests it will accept/allow
    GET-Read-datafetch all products
    POST-Create new data-add a new product
    PATCH-Update existing data-edit a product
    DELETE-Remove data-delete a product
    Content-Type — tells the server what format the data is in (usually JSON)
    Authorization — used to send a token proving who you are (JWT tokens - JSON Web Token)
    */
    methods: ["GET", "POST", "PATCH", "DELETE"], 
    allowedHeaders: ["Content-Type", "Authorization", "sentry-trace", "baggage"],  //Authorization header is needed for JWT tokens on admin routes
}));

// BEFORE express.json() - the webhook needs raw body for signature verification
app.use("/api/webhook", express.raw({ type: "application/json" }), webhookRoutes);

// express.json() - parses incoming request bodies where content-type is application/json, without this req.body is always undefined in POST/PATCH routes
app.use(express.json({ limit: "100kb" }));  // limit request body size to 100kb, prevents abuse and DoS attacks

// express.urlencoded - parses form-encoded bodies (content-type: application/x-wwww-form-urlencoded). {extended: true} allows nested objects in form data, not strictly need if json is only used but good to have just in case
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

/*  Routes
app.use(prefix, router) mounts a router at a url prefix.
    HOW: app.use("/api/products", productRoutes)
   → A request to GET /api/products hits productRoutes at "/"
   → A request to GET /api/products/123 hits productRoutes at "/123"
*/

// apply rate limiting middleware to specific routes
app.use("/api", generalLimiter); // general protection on everything else

app.use("/api/contact", writeLimiter); // limit contact form submissions
app.use("/api/auth/login", loginLimiter);
app.use("/api/orders", writeLimiter); // limit order creation and updates

app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes)
app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/shipping", shippingRoutes);

/* Check status - 
 simple GET - returns 200 OK with no auth required. - railway/render ping this to verify server is alive
*/
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",  // mongoose.connection.readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    });
});

// 404 handler - if no route above matched the request, express falls through to here as a last resort.
// app.use() with no path prefix matches everything, must come after all your routes - express checks them top to botton in order, if this was 
// first every result would get a 404
app.use((req, res) => {
    res.status(404).json({
        error: `Route not found: ${req.method} ${req.path}`,
    });
});

// GLOBAL ERROR HANDLER , express recognizes a function with 4 parameters below
// as a error handler, when any of the routes does throw new Error(...) or calls next(error), express skips all
// regular middleware and jumps here so this must be after 404 handler amd always be last.
app.use((err, req, res, next) => {  // next - Function to pass to the next middleware
    console.error("Unhandled Error: ", err.stack);  // .stack is a property on every JavaScript error object that contains the full error trace — meaning it shows you exactly where in your code the error happened.
    res.status(500).json({ error: "Internal server error"});
});

// Start the server--- we connect to mongoDB FIRST, then start listening, if DB connection fails we dont accept requests that would immediately fail so we exit early
// async/await lets us write clean top to bottom style, no callbacks
const startServer = async () => {
    try {
        // mongoose.connect() returns a promise, await pauses here until mongoDB confirms connection
        // throws if the URI is wrong, password is bad, or the IP isnt whitelisted in Atlas Network Access.
        console.log("Connecting to MongoDB .... ");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB Successfully.");

        // start the abandoned order sweep cron job that runs every 5 minutes to reclaim stock from unpaid orders
        startAbandonedOrderSweep();

        // app.listen() starts the HTTP server on the given port & the callback runs once the server is ready to accept requests
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            console.log(`Health Check: https://localhost:${PORT}/health`);
            console.log(`Products API: https://localhost:${PORT}/api/products`);
        })
    } catch (err) {
        /* Common issues: "bad auth" → wrong password in MONGO_URI
            "ECONNREFUSED" → MONGO_URI points to localhost but MongoDB isn't installed
            "timed out" → your IP isn't whitelisted in Atlas Network Access
        */
       console.error("Failed to start server", err.message);
       process.exit(1); // - non-zero exit code signals failure to the DB, on railway/render this triggers automatic restart
    }
};

startServer();
