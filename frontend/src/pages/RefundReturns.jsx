import SuzukirdLogo from "../components/SuzukirdLogo";
    const RED="#e8161b";
    const DARK="#1c1c1c";
    const BORDER="1px solid #e0e0e0";
    const MONO="'Share Tech Mono', monospace";
    const CONDENSED = "'Barlow Condensed', sans-serif";
export default function RefundReturns() {
  return(
  <div style={{ minHeight: "80vh" 
}}>
    <div style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      padding: "50px",
    }}>
        <div style={{fontSize: 40,
      fontFamily: CONDENSED,
      fontWeight: 700,
      letterSpacing: "0.015em",
      color: RED,
      padding: 30
      }}>REFUNDS AND RETURNS
        </div>

          <div style={{
            marginTop: 20,
            alignSelf: "center",
            maxWidth: 800,
            fontSize: 16,
            fontFamily: CONDENSED,
            fontWeight: 600,
          }}>No refunds. All sales are final. Appointment deposits and Class early registrations are non-refundable. No refunds in any digital or tuning service
            <br /> <br />
          <span style={{color: RED}}><br/><br/>Need Help?</span><br /><br/><br/><br/>Contact us at <span style={{color: RED}}>suzukird25@gmail.com</span> for questions related to refunds and returns.
          </div>
          
  
          <div style={{padding: 10, marginTop: 10}}>
                      <SuzukirdLogo size={150}/>
          </div>

    </div>
  </div>
  )
}
