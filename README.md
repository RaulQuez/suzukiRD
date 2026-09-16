# Suzuki Racing Development Performance Parts E-Commerce Platform
A full-stack e-commerce platform for performance auto parts including: a customer storefront, a token secured admin dashboard and an Express/Node API backend with Stripe payments, live UPS shipping rates using an API, Cloudinary media, and Nodemailer for transactional emails.
LIVE DEMO: <img width="2880" height="1472" alt="Screenshot 2026-07-15 154854" src="https://github.com/user-attachments/assets/f0391739-5431-4ffa-bb99-2717e129612e" /><img width="2880" height="1482" alt="Screenshot 2026-07-15 155222" src="https://github.com/user-attachments/assets/fa2078d9-5477-41f4-a320-55fc32046fda" /><img width="2880" height="1484" alt="Screenshot 2026-07-15 155907" src="https://github.com/user-attachments/assets/838018bb-6153-4af9-a74a-995d75b1d125" /><img width="1964" height="1014" alt="Screenshot 2026-07-15 160241" src="https://github.com/user-attachments/assets/45e2c157-e541-4f32-9101-eb2b9427c486" />

# Overview 
Suzuki RD (Racing Development) is a real deployed online store built end to end as 3 seperate applications that share one central API: 
- Storefront: no accounts only guest checkout, a catalog browse/search/filter, a cart, Stripe payments, and self service order tracking via Email and order number.
- Admin dashboard: JWT protected product management with image uploading, inventory control, and order fulfillment.
- Express/Node API: handles all business logic, frontends (store and admin) never compute prices, shipping, or trust.

Main focuses of this project/contract job was correctness and security in the money and inventory path, not just CRUD.

# The TECH STACK
Frontend - React, Vite, React Router, Context API

Backend - Node.js, Express, Mongoose

Database - MongoDB Atlas

Payments - Stripe (PaymentIntents & signed webhooks)

Media - Cloudinary

Email - Nodemailer

Shipping - UPS Rating API

Auth - JWT & bcrypt

Infra - Railway (API), Netlify (the frontends), MongoDB Atlas

# Features
Customer Side: browsing, search, filtering, cart, stripe, checkout, guest order tracking, automated status emails with UPS tracking links

Admin Side: JWT login, product CRUD with Cloudinary image upload, active/inactive product visiblity toggling, order management, status updates that trigger customer emails, UPS tracking number entry.

# Highlights
- Server side price and shipping recomputation: client submitted amounts are NEVER trusted therfore order totals and UPS shipping are calculated from the database at checkout to prevent cart & shipping cost tampering.
- Atomic stock reservation: inventory is decremented with a conditional {findOneAndUpdate({stock: { $gte: qty }}, {$inc: { stock: -qty } }) and rolled back during partial failure to eliminate overselling under concurrent checkout.
- Stripe source of truth: payments are confirmed by signature verified webhooks (NOT THE CLIENT) and each paymentIntent is bound to its order via metadata so one payment can never confirm another order and confirmation is idempotent through an atomic claim so duplicate webhook deliveries can't double process
- Abandoned order sweep: a scheduled job releases a reserved stock from unpaid orders after a specific timeout  with a guard that rereserves or refunds if payment lands on an already expired order
- Defence in depth: tiered rate limiting (login / write / general) behind a trusted proxy, regex escaping to prevent ReDoS in search, request body size length limits, email header injection security & sanitization, restricted Cloudinary uploads (type+size) and enumeration safe order tracking.

# Architecture
2 independent React apps, storefront + admin, that communicates with 1 Express API over a CORS allowlist. The API is the single owner of all business logic including database operations. Frontends NEVER calculate or authorize.


A single optionalAuth middleware allows 1 product endpoint to serve active only products to customers and all products to authenticated admins with no duplicated routes

# Environment Variables
Configuration is supplied via environment variables (see .env.example). Secrets are never committed.

Raul Henriquez
