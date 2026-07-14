/*
    Auth routes handles admin login and token generation

    only 1 route for now - POST /api/auth/login - validates credentials & returns a jWT token

     SECURITY NOTES (auth design decisions — for future reference):

    - Token storage: the admin app stores this JWT in localStorage. This is a
      deliberate tradeoff, not an oversight. localStorage is simple but readable
      by any JS on the page, so an XSS bug would expose the token. Acceptable here
      because the admin app is small, single-user, and has no XSS sinks
      (no dangerouslySetInnerHTML anywhere). If the admin app grows or handles
      other users' data, migrate to an httpOnly cookie (JS can't read it) — but
      that requires adding CSRF protection, so it's a real tradeoff either way.

    - Token expiry: set to "1d" (was "7d"). Shorter expiry shrinks the window a
      stolen token is usable. Cost is logging in once a day — fine for one admin.

    - No server-side revocation yet: a valid token works until it expires; there's
      no way to kill it early. Post-launch improvement: add a `tokenValidAfter`
      timestamp on the Admin model and check it against the token's `iat` in the
      authenticate middleware — lets you invalidate all live tokens instantly.

    - Enforcement lives in the backend `authenticate` middleware, NOT the frontend
      ProtectedRoute (that's only UX gating and can be bypassed).

    - Login is protected against brute force by loginLimiter (5 attempts / 15 min)
      in server.js, and returns a generic "Invalid credentials" to prevent username
      enumeration.
*/
import express from "express";
import jwt from "jsonwebtoken"
import Admin from "../models/Admin.js";

const router = express.Router();

/*
    POST /api/auth/login
    accepts username password and returns a signed JWT token if valid

    The admin app sends this on login form submit: 
    Body { "username": "raul", "password": "yourpw"}
    On SUCCESS:
    { "token": "1fesfes..." }

    The admin app stores the token and uses it for every request as an auth header: 
    Authorization: Bearer 1fesfes...
*/
router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        // input check for both fields - we dont tell the user which input is wrong - value information=better
        if(!username || !password){
            return res.status(400).json({ error: "Username and password required "});
        }

        // look up admin by username, .findOne() returns the first matching document or null
        const admin = await Admin.findOne({ username: username.toLowerCase()});

        /* check if admin username matches password in db if not return same error message.
            
            admin?.comparePassword() uses optional chaining (?.) —
            if admin is null, it skips the method call and returns undefined (falsy)
            instead of throwing "cannot read properties of null".
        */
       const isMatch = await admin?.comparePassword(password);

       if (!admin || !isMatch) {
        return res.status(401).json({ error: "Invalid credentials"});
       }

       /*
       jwt.sign() creates a signed toke with 3 parts:
            1. Payload - data embeded in the token (id, username), not secret never store passwords, used to identify who is making the request
            2. Secret - process.env.JWT_SECRET, a long random string only the server knows, makes token trustworthy, if someone tampers payload, signature wont match=token rejected
            3. Options - expiresIn: "1d" means token expires in 1 day. then admin has to login again
       */
      const token = jwt.sign(
        {
            id: admin._id, 
            username: admin.username
        }, process.env.JWT_SECRET, {
            expiresIn: "1d"
        });

        // send token to admin app - there admin app stores in memory/local storage to attach it to every future request
        res.json({
            token,
            admin: {id: admin._id, username: admin.username}
        });

    } catch (err){
        console.error("POST /auth/login error:", err);
        res.status(500).json({ error: "Login failed" });
    }
});
export default router;