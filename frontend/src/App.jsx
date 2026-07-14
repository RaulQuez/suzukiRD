import React from "react";
import { Routes, Route } from 'react-router-dom';
import NavigationBar from './components/NavigationBar';
import Footer from "./components/Footer";
import HomePage from "./pages/HomePage";
import ContactPage from "./pages/ContactPage";
import ShopPage from "./pages/ShopPage";
import RefundReturns from "./pages/RefundReturns";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CheckoutPage from "./pages/CheckoutPage";
import OrderConfirmation from "./pages/OrderConfirmation";
import TrackOrdersPage from "./pages/TrackOrdersPage";
/*
    app.jsx - define layout and which page renders at which url
    url is the source of truth - react router reads and renders it 
*/
export default function App() {
    return (
    <>

            {/** Navigation bar and direction tabs */}
            <NavigationBar />

            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/shop" element={<ShopPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/order-confirmation" element={<OrderConfirmation />} />
                <Route path="/track-order" element={<TrackOrdersPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/returns" element={<RefundReturns />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            </Routes>

            <Footer />
    </>
    )
}