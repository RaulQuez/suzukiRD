import SuzukirdLogo from "../components/SuzukirdLogo";

    const RED="#e8161b";
    const DARK="#1c1c1c";
    const BORDER="1px solid #e0e0e0";
    const MONO="'Share Tech Mono', monospace";
    const CONDENSED = "'Barlow Condensed', sans-serif";
export default function PrivacyPolicy() {
  return(

<div style={{minHeight: "80vh",}}>
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
      }}>PRIVACY POLICY
        </div>

      
          <div style={{
            marginTop: 20,
            alignSelf: "center",
            maxWidth: 800,
            fontSize: 16,
            fontFamily: CONDENSED,
            fontWeight: 600,
          }}>Personal Information is information that can be used to identify, locate, or contact an individual.It also includes other information that may be associated with Personal Information. We collect the following types of Personal Information:<br /> <br />
         
          <span style={{color: RED}}> Contact Information</span> that allows us to communicate with you, such as your name, postal addresses, email addresses, social media website user account names, telephone numbers, or other addresses at which you receive communications from or on behalf of marketpress.
          <br /><br />
          <span style={{color: RED}}> Transaction Information </span> about how you purchase and redeem
          <br /><br />
          <span style={{color: RED}}> Financial Account Information </span> as needed to process payments for marketpress.com that you buy, such as your credit or debit card number, expiration date.
          <br /><br />
          </div>
      
          <div style={{
            marginTop: 20,
            alignSelf: "center",
            maxWidth: 800,
            fontSize: 16,
            fontFamily: CONDENSED,
            fontWeight: 600,
            }}><span style={{color: RED}}>Stripe</span> collects personal information when users directly provide 
            it—such as during account creation, payment processing, or when filling 
            out forms on its platform. It also gathers data automatically through cookies, 
            device information, and transaction details, as well as from third parties like 
            financial institutions or business partners.
            
          </div>

         <div style={{padding: 10, marginTop: 10}}>
                              <SuzukirdLogo size={150}/>
          </div>
          
    </div>
  </div>
  )
}
