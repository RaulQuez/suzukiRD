import { useState } from "react";
import SlideShow from "../components/SlideShow";
import car2 from '../assets/cars/ChatGPT Image Jun 3, 2026, 03_47_56 PM.png'
import car3 from '../assets/cars/ChatGPT Image Jun 3, 2026, 03_45_15 PM.png'
import car4 from '../assets/cars/ChatGPT Image Jun 3, 2026, 03_56_47 PM.png'
import car5 from '../assets/cars/ChatGPT Image Jun 3, 2026, 03_58_20 PM.png'
import api from "../api/axios.js";

const cars = [car2, car3, car4, car5];

const CONDENSED = "'Barlow Condensed', sans-serif";

export default function ContactPage({ setActive }) {
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        message: ""
    });

    const [formDataStatus, setFormDataStatus] = useState(""); // "success" or "error" to trigger the message below the form after submission

    // updates only the field that changed, keeps the rest untouched
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        console.log("Form Submitted: ", formData);

        try {
            await api.post("/contact", formData); // POST to /api/contact; server-side nodemailer sends us the email

            setFormDataStatus("success");
            setFormData({
                firstName: "", lastName: "", email: "", phone: "", message: ""
            });
        } catch {
            setFormDataStatus("error");
        }
    };

    return (
        <div>
            {/* This wrapper is the anchor for the overlay form. The form is now a CHILD
                of this relative div, so its absolute positioning anchors to the slideshow. */}
            <div style={{ position: "relative", display: "flex", height: "100%" }}>
                <SlideShow slides={cars} label="Cars" />

                {/* OVERLAY FORM — lives inside the relative anchor above */}
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    position: "absolute",
                    top: "48%",
                    left: "50%",
                    width: "480px",
                    textAlign: "center",
                    boxSizing: "border-box",
                    transform: "translate(-50%, -50%)", // shift back by half its own size to perfectly center it
                    zIndex: 10, // sits above the slideshow overlay
                    padding: "32px 24px"
                }}>
                    <div style={{
                        display: "flex",
                        textAlign: "center",
                        fontFamily: CONDENSED,
                        fontSize: 25,
                        fontWeight: 500,
                        justifyContent: "center",
                        alignItems: "center",
                        color: "white",
                        userSelect: "none",
                        paddingTop: 20
                    }}>
                        <h1>CONTACT US</h1>
                    </div>

                    <div style={{
                        fontSize: 15,
                        fontWeight: 400,
                        fontFamily: CONDENSED,
                        textAlign: "center",
                        marginTop: 10,
                        color: "white",
                        userSelect: "none"
                    }}>
                        <p>Fill out the form below and we will contact you as soon as possible</p>
                    </div>

                    {/* first and last name */}
                    <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                        <input
                            type="text"
                            name="firstName"
                            placeholder="First Name"
                            value={formData.firstName}
                            onChange={handleChange} // listens for typing and updates React state in real time
                            className="contact-info-input"
                            style={{ flex: 1 }}
                        />
                        <input
                            type="text"
                            name="lastName"
                            placeholder="Last Name"
                            value={formData.lastName}
                            onChange={handleChange}
                            className="contact-info-input"
                            style={{ flex: 1 }}
                        />
                    </div>

                    {/* email + phone */}
                    <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                        <input
                            type="email"
                            name="email"
                            placeholder="Email"
                            value={formData.email}
                            onChange={handleChange}
                            className="contact-info-input"
                            style={{ flex: 1 }}
                        />
                        <input
                            type="tel"
                            name="phone"
                            placeholder="Phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="contact-info-input"
                            style={{ flex: 1 }}
                        />
                    </div>

                    {/* message */}
                    <div style={{ marginTop: 12 }}>
                        <textarea
                            name="message"
                            placeholder="Message"
                            value={formData.message}
                            onChange={handleChange}
                            className="contact-info-input"
                            rows={10}
                            style={{ resize: "vertical", width: "100%", boxSizing: "border-box", pointerEvents: "all" }}
                        />

                        <button
                            style={{
                                marginTop: 3,
                                marginBottom: 10,
                                padding: 10,
                                background: "linear-gradient(135deg, #8B0E17, #C1121F, #E63946)",
                                border: "none",
                                color: "white",
                                borderRadius: 14,
                                fontWeight: 700,
                                letterSpacing: "0.15em",
                                textTransform: "uppercase",
                                fontFamily: "'Montserrat', sans-serif",
                                cursor: "pointer",
                                transition: "0.3s ease"
                            }}
                            className="contact-btn"
                            onClick={handleSubmit}
                        >
                            SUBMIT
                        </button>

                        {formDataStatus === "success" && (
                            <p style={{ color: "green", fontWeight: 700, fontFamily: CONDENSED, borderRadius: 5, padding: 5 }}>
                                Message Successfully Sent!
                            </p>
                        )}
                        {formDataStatus === "error" && (
                            <p style={{ color: "red", fontWeight: 700, fontFamily: "'Montserrat', sans-serif" }}>
                                Something went wrong. Please try again.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}