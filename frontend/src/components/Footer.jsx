import React from "react";
import { Link } from 'react-router-dom'
import { useNavigate } from "react-router-dom";

const RED = "#e8161b";
const DARK = "#1c1c1c";
/*
    Footer is also a link to paths, react router handles the navigation
*/
export default function Footer() {

    const navigate = useNavigate();

    // handle scroll to the top of the page FUNCTION
    const handleScroll = (page) => {
                window.scrollTo({ top: 0, behavior: "smooth"});
    };

    return(

        // Section container
        <footer style={{ 
        background: DARK,
        padding: "40px 20px 24px",
        }}>
            {/**Top section - 3 columns side by side */}
            <div style={{ display: "flex", 
            justifyContent:"space-between",
            flexWrap: "wrap",
            gap: 24,
            marginBottom: 40,
            }}>
            {/* Column 1 - Brand */}
                <div>
                    <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900, fontSize: 28, textTransform: "uppercase" }}>
                        SUZUki<span style={{ color: RED }}>RD</span>
                    </div>
                    <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 11, color: "grey", marginTop: 8, lineHeight: 1.8 }}>
                        Suzuki Racing Development.<br />
                        Performance parts for the streets<br />
                        and the track.
                    </p>
                </div>


                <div style={{display: "flex", 
                    flexDirection: "column",
                    
                    }}>
                    <button 
                    onClick={() => {
                        navigate("/privacy-policy");
                        handleScroll();
                    }
                    }
                    className="footer-btns"
                    >Privacy Policy</button>

                    <button onClick={() =>{
                        navigate("./returns");
                        handleScroll();
                    }} 
                    
                    className="footer-btns"
                    >Refund and Returns Policy</button>
                    </div>
                

                {/* Column 3 - Contact */}
                <div>
                    <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 16 }}>
                        Contact
                    </div>
                    <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 12, color: "grey", lineHeight: 2 }}>
                        <div>📞 +1.786.264.1706</div>
                        <div>📧 sales@suzukird.com</div>
                        <div>📍 Miami, FL</div>
                    </div>
                </div>

            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid #333", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, color: "grey", letterSpacing: "0.1em" }}>
                    © 2026 SUZUKIRD. ALL RIGHTS RESERVED.
                </div>
          
          
                <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, color: RED, letterSpacing: "0.1em" }}>
                    BUILT FOR THE TRACK.
                </div>
            </div>

        </footer>
    );
}

       