/*
    axios.js - the confirgured api client for the entire admin

    here one axios instance here with the base URL preconfigured instead of writing the full backend url in
    every single fetch call. Every page imports this instead of raw axios.

    Without this every request looks like: 
    axios.get("http://localhost:5000/api/products")
    axios.post("http://localhost:5000/api/orders")

    with axios: 
    api.get("/products")
    api.post("/orders")
*/
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
    baseURL: BASE_URL,
});

/*
    Interceptors - functions running automatically on every request/response before the code sees it, middleware but on the frontend
    
    api.interceptors.request.use() runs before EVERY request is sent.
    We use it to automatically attach the JWT token to every request, w/o it you manually have to add the token header in every api call,     api.get("/products", { headers: { Authorization: `Bearer ${token}` } })

    With interceptor token is attached automatically, just call api.get("/products") & token goes with it
*/
api.interceptors.request.use((config) => {
    // localStorage is built in key value storage - persists across page refreshes - store JWT token here after login so it survives page refreshes. key "adminToken" just a nane we pick
    // localStorage.getItem("adminToken") returns the token string or null if it doesn't exist yet (not logged in).
    const token = localStorage.getItem("adminToken");

    // if key exists - attach to authorization header - "Bearer", the standatd prefix for JWT tokens in HTTP headers., express authenticate formate middleware expects: "Authorization: Bearer 12rqfew...."
    // config is axios request config object - contains url, method, headers, body, ect. Mutate headers here and return the modified config so axios can use it
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // always return config - axios needs it to send requests
    return config;
})

/*
    Response inceptor - runs automatically on every response BEFORE .then() or await sees it.

    Use this to handle token expiry globally, if any request comes back with 401 (unauthorized) / 403 (forbidden) - token expired or missing
*/
api.interceptors.response.use(
    // first arg - success handler, response => response just passes successful responses through unchanged. nothing to do to successful responses
    (response) => response,
    // second arg - error handler - runs when serever returns 4xx or 5xx code
    (error) => {
    /*
        error.response is the actual HTTP response, error.response?.status uses optional chaining — if error.response is undefined (network error, server down), .status won't crash.
    */
   if (error.response?.status === 401 || error.response?.status === 403) {
    // clear stored token it is not valid according to http response.
    localStorage.removeItem("adminToken");  // .removeItem from local storage the adminToken
    window.location.href = "/login";        // force redirect to /login, we use this because interceptor lives outside react componenets (NO NAVIGATE())
   }
   // rethrow the error so the individual pages can still catch and show specific error messages if needed
   return Promise.reject(error); //  Without this, errors would be silently swallowed here and your try/catch blocks in components would never fire.
});
export default api;