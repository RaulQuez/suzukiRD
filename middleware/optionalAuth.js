// middleware/optionalAuth.js
import jwt from "jsonwebtoken";

/*
    Soft authentication — NEVER blocks the request.
    If a valid admin token is present, sets req.admin so downstream code
    knows this is an admin. If not, the request continues as a normal
    customer (req.admin stays undefined). Used on routes that serve both
    audiences with different data (e.g. hiding inactive products from customers).
*/
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    // no token → just continue as a customer, don't reject
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next();
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = decoded; // valid token → tag as admin
    } catch (err) {
        // invalid/expired token → ignore it, continue as customer
    }

    next(); // always continue
};

export default optionalAuth;