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
