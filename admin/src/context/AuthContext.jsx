/*
    Global authentication state for entire admin app

    : Tells other pages/components admin is logged in and who they are.
    
    Without context, you'd have to pass that info as props through every component:
    App.jsx -> Navbar.jsx (pass token as prop)
    App.jsx -> ProductsPage.jsx (pass token as prop)
    App.jsx -> OrdersPage.jsx (pass token as prop)
  
    prop drilling - passing the same data down through multiple layers - gets messy

    Context - solves that w/ global "store" that any componenet can read from directly
*/
import { createContext, useContext, useState, useEffect } from "react";

// createContext() creates the context object - null is a default value - overwritten immediately when authprovider wraps app.
const AuthContext = createContext(null);

// AuthProvider - component holding auth state & everything inside it
// children - special prop refering to whatever is nested inside the component tags, makes every child component able to access auth state.
export const AuthProvider = ({ children }) => {
    // useState(null) - admin starts as null (not logged in) - seperate from token, token goes into localStorage, admin object goes in state
    const [ admin, setAdmin ] = useState(null);

    // loading - tracks if checking localStorage has finished.
    const [ loading, setLoading ] = useState(true);

    // runs after component mounts - after intial ui renders, empty [] means only run once when component first mounts.
    // this is where we check if a token exists in localStorage from previos sessions. if yes we restore session without making them log in again
    useEffect(() => {
        // checking local storage for existing token and admin info, we store both when they log in - (login())
        const token = localStorage.getItem("adminToken");
        const storedAdmin = localStorage.getItem("adminUser");

        // localStorage only stores strings - use json.parse() to convert admin object back into js object (json format)
        if (token && storedAdmin){
            try {
                // json.parse can throw if stored string is corrupted - try/catch safe
                setAdmin(JSON.parse(storedAdmin));
            } catch (err) {
                // value was corrupted, clear items and force re-login, no log err here this is not a server error
                localStorage.removeItem("adminToken");
                localStorage.removeItem("adminUser");
            }
        }
        // whether finding a token or not - set loading false so protectedRoute can make decisions
        setLoading(false);
    }, []);  

    // login() - called from LoginPage.jsx only after successful api response, recieves token and admin object from server response
    // saves both to localStorage for page refresh survival
    const login = (token, adminData) => {
    
        // localStorage.setItem(...,...) - both must be strings
        localStorage.setItem("adminToken", token);
        localStorage.setItem("adminUser", JSON.stringify(adminData));

        // update state
        setAdmin(adminData);
    };

    const logout = () => {
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminUser");

        // set admin back to null (logged out)
        setAdmin(null);
    };

    /* the value object is what every consumer of the context recieves, any component under useAuth() gets:
        admin - logged-in admin object or null
        login   — function to call after successful login
        logout  — function to call when logging out
        loading — whether we're still checking localStorage on mount
    */
   return (
    // .Provider - shares the value accross componenets, children - children components wrapped inside
    <AuthContext.Provider value={{ admin, login, logout, loading }}>
        {children} 
    </AuthContext.Provider>
   );
};

/*
    useAuth — a custom hook that makes consuming the context cleaner.

    Without this, every component would need to write:
    import { useContext } from "react";
    import { AuthContext } from "../context/AuthContext";
    const { admin, logout } = useContext(AuthContext);

    With this hook, every component just writes:
    import { useAuth } from "../context/AuthContext";
    const { admin, logout } = useAuth();

    Much cleaner. This is the standard pattern for React context.
*/
export const useAuth = () => {
    const context = useContext(AuthContext);

    /*
        If useAuth() is called outside of AuthProvider,
        context will be null (the default we set in createContext).
        This guard catches that mistake immediately with a clear error
        instead of a confusing "cannot read properties of null" crash.
    */
    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider");
    }

    return context;
};

export default AuthContext;