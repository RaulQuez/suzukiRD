// Login page
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios"
import "../App.css";
import SuzukirdLogo from "../components/SuzukirdLogo";
import { useEffect } from "react";

const LoginPage = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    // useAuth() gives us the login function from authContext. after successful api response call login(token, adminData) that stores token and updates global state.
    const { login } = useAuth();

    // handleSubmit runs when form is submitted, e.preventDefault() stops browser default form behavior which reloads the entire page on submit.
    // we handle form submission in js 
    const handleSubmit = async (e) => {
        e.preventDefault();
        // clear error messages
        setError("");
        setLoading(true);
        try {
            // POST /api/auth/login with form values. api - configugured axios instance from axios.js - base url is already there so we just write "/auth.login"
            // response.data = axios puts parsed json body & returns { token: "eyJ...", admin: { id, username } }
            const response = await api.post("/auth/login", {
                username, password,
            });

            // desctructure token & admin to pass into authcontext's login() for localstorage and update states
            const { token, admin } = response.data;
            login(token, admin);

            /* Navigate to dashboard after successfull login, replace: true replaces current history entry instead of pushing new one
            WHY: Without replace, if the admin hits the browser back
            button from the dashboard, they'd go back to /login.
            With replace, /login is removed from history so
            back button goes somewhere sensible instead.
            */
           navigate("/", { replace: true });
        } catch (err) {
            // error message we recieve from our backend ex - "Invalid Credentials"
            setError(err.response?.data?.error || "Something went wrong. Try again.");
        } finally {
            setLoading(false);
        }
    };
    // removing scrolling from the page
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "unset";
        }
    }, []);
    
    return (
        // login page
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems : "center",
            justifyContent: "center",
            background: "#0f0f0f",
        }}>
            {/**Login card */}
            <div style={{
                background: "#1a1a1a",
                border: "0.5 solid #2a2a2a",
                borderRadius: "12px",
                padding: "40px",
                width: "100%",
                maxWidth: 380,
            }}>
                {/**Logo & branding */}
                <div style={{fontSize: 20, fontWeight: 600, color: "#fff", marginBottom: 6, pointerEvents: "none"}}>
                    Suzukird <span style={{color: "#c0392b"}}>Admin</span> 
                    <span style={{display: "inline-flex",
                    alignItems: "center", verticalAlign: "middle", paddingLeft: 6
                    }}><SuzukirdLogo size={50}/></span> 
                </div>
                <p style={{fontWeight: 550,fontSize: 13, color: "#666", marginBottom: 28}}>Sign in to manage your store</p>

                    {/** onsubmit={handelSubmit} - called when the form i submitted (enter key or button click). Handled in JS instead of browser default */}
                    <form onSubmit={handleSubmit} style={{display: "flex", flexDirection: "column", gap: 16}}>
                        <div style={{display: "flex", flexDirection: "column", gap: 6,}}>
                            {/**htmlFor and id must match — this links the
                            label to the input for accessibility. Clicking
                            the label focuses the input. */}
                            <label htmlFor="username" style={{color: "white"}}>Username</label>
                                <input id="username" className="login-input"
                                type="text" value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter username"
                                autoComplete="username"
                                required
                                />
                        </div>
                        
                        {/** Same of pw, htmlfor + input pair */}
                          <div style={{display: "flex", flexDirection: "column", gap: 6,}}>
                            <label htmlFor="password" style={{color: "white"}}>Password</label>
                            <input id="password" className="login-input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            autoComplete="current-password"
                            required
                            />    
                        </div>  
                            {/**Only renders error div if theres an error 
                             * && is short circuit eval - if error is empty string (falsy), React skips rendering div
                             * when error has a value (truthy) div renders
                             */}
                             {error && (
                                <div style={{
                                    background: "#1f0f0f", border: "0.5 solid #5a1a1a", borderRadius: 8,
                                    padding: "10px 12px", fontSize: 13, color: "#e57373"
                                }}>{error}</div>
                             )}

                             {/**disable={loading} - grays out and disables button while 
                              * api call is in flight to prevent double submits.
                              * Button text changes to "Signing in" as feedback
                              */}
                            <button
                            type="submit"
                            className="login-btn"
                            disabled={loading}
                            >
                                {loading ? "Signing In..." : "Sign in"}
                            </button>
                    </form>
            </div>
        </div>
    )
}
export default LoginPage;