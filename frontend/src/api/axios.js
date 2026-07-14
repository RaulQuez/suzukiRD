/*
    axios.js - configured API client for the storefront

    One axios instance with the base URL preconfigured so pages call api.get("/products")
    instead of the full backend URL.

    UNLIKE Admin app, storefornt has no login or JWT - guest checkout only. No auth interceptors.
    Purel a base-URL convencience wrapper.

*/
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/*
    api.create() builds an axios instance with baseURL baked in.
    Every call like api.get("/products") becomes a request to
    baseURL + path → e.g. http://localhost:5000/api/products in dev,
    or https://api.sukukird.com/api/products in production.
    Write the short path once; VITE_API_URL swaps the base between
    local and production with no code changes.
*/
const api = axios.create({
    baseURL: BASE_URL,
});
export default api;