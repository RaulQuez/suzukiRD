/*
    Nav bar that displays a navigation bar on all pages except /login
*/
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SuzukirdLogo from "./SuzukirdLogo";
import '../App.css';


const Navbar = () => {
// useAuth gives admin object (if logged in) and logout (function that clears the roken and sets admin to null)
const {admin, logout} = useAuth();

// useNavigate() - navigation hook to redirect to /login after logging out
const navigate = useNavigate();

// useLocation() - gives current url location object, .pathname is current path string: "/", "/orders", ect. we use this to highlight the active nav link
const location = useLocation();

// handleLogout clears auth state then redirects to /login. we call logout() from authcontext first - clears local storage and sets admin to null in global state
// then we navigate to /login - protectedRoute will catch this since admin would be null but navigating explicitly is cleaner and faster than waitinf for protectedRoute
const handleLogout = () =>{
    logout();
    navigate("/login", {replace: true});
};

// nav links array of objects defining each nav item
// path - url link navigates to & label - text shown in the navbar
const navLinks = [
    {path: "/", label: "Dashboard"},
    {path: "/products", label: "Products"},
    {path: "/orders", label: "Orders"},
    {path: "/users", label: "Users"},
];

return(
    // <nav> is a semantic HTML element telling browser and screen readers this is a navigation section
    <nav style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        height: 70, background: "#1a1a1a",
        borderBottom: "0.5px solid #2a2a2a",
        display: 'flex', 
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        zIndex: 100,
    }}>
        {/** <Link> is react router's navigation component - renders as a <a> tag but naviagtes client side without full page 
         * reload just like useNavigate() but declaritve in jsx instead of imperative in js
         */}
        <Link to="/" style={{fontSize: 20, fontWeight: 500, color: "#fff", textDecoration: "none", display: "flex", alignItems: "center", gap: 4}}>
        Suzukird<span style={{color: "red"}}>Admin</span> <SuzukirdLogo size={40} />
        </Link>

        {/** Center - navigation links */}
        <div className="navbar-links">
            {navLinks.map((link) => (
                <Link 
                key={link.path}
                to={link.path}
                //activates link activeness effect on navbar
                className={`navbar-link ${location.pathname === link.path ? "active" : ""}`}
                >
                    {link.label} 
                </Link>
            ))}
        </div>

        {/* Right admin badge & logout */}
        <div >
             {/*
                    admin?.username — optional chaining just in case
                    admin is null for any reason. Renders nothing
                    instead of crashing with "cannot read properties of null".
                    In practice admin is always set here since Navbar
                    only renders on protected pages, but it's good habit.
            */}

            {admin?.username && (
                <span style={{fontSize: 15, padding: "3px 10px", fontWeight: 550, borderRadius: 8, pointerEvents: "none"}}>{admin.username}</span>
            )}
            <button className="logout-btn" onClick={handleLogout}>
            Log Out
            </button>
        </div>
    </nav>
)

}
export default Navbar;