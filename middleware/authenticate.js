/*
    authenticate middleware - protects admin-only routes

    Request->authenticate() -> Route Handler -> Response

    if token is valid we call next() and request continues to the route, if missing/invalid we reject here and route never runs

    usage in routes: 
    router.post("/", AUTHENTICATE, async...)
*/
import jwt from "jsonwebtoken"

const authenticate = (req, res, next) => {
    /*
    JWT tokens are sent in the authorization header : 
    Authorization: bearer sjifho...

    req.headers.authorization gives us the full string "Bearer eyJhbGci..."
    .split(" ") splits on the space -> ["Bearer", "eyJhbGci..."]
    [1] grabs just the token part

    The ?. means if its missing entirely we get undefined instead of a crash
    */
   const token = req.headers.authorization?.split(" ")[1];

   // no token at all - not logged in - 401 = unauthorized - must authenticate
   if(!token) {
    return res.status(401).json({ error: "No token provided"});
   }

   try {
    /*
        jwt.verify() - checks signature, was this signed with JWT_SECRET? - if someone made a fake token the signartures wont match & throws
                     - checks expiry, if expiresIn: "7d" passed it throws
        
        if both pass, returns decoded payload we put when signing: { id: ...., username: .... iat: 12343, exp: 124323 }
    */
   const decoded = jwt.verify(token, process.env.JWT_SECRET);
   
   // attach to req.admin so any route that runs after this middleware can access who made the request
    req.admin = decoded;

   // next() tells express the middleware is done move on to the next one. without next() the request hangs forever - no response ever gets sent
   next();
   } catch (err) {
        return res.status(403).json({ error: "Invalid or expired token" }); // 403 - forbidden, we know who you are but not allowed in
   }
};

export default authenticate;