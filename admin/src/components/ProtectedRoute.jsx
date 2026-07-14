/*
    Guard component that wraps pages for only logged in admins to see

    Instead of putthing auth checks inside every page component we wrap protected pages with this in App.jsx

    In App.jsx it looks like this:
    <Route path="/" element={
        <ProtectedRoute>
            <ProductsPage />
        </ProtectedRoute>
    } />
     
    Here asks if the admin is logged in if yes -> render page normally if no -> redirect to /login

    useAuth     -> a keycard reader that tells you IF someone has a keycard
    ProtectedRoute -> the locked door that actually stops people without one
*/
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// children - page component nest inside protectedRoute, anything wrapped in <protectRoute> tag becomes the children
const ProtectedRoute = ({ children }) => {
    // pull admin and loading from authContext
    const { admin, loading } = useAuth();

    // while loading is true localStorage hasnt finished yet. we return null here which renders nothing. this gives userEffect time to run find token and setAmdin before any decisions
    if (loading) return null;

    // once loading is false we know the real auth state, if admin is null - not logged in - redirect to /login.
    if (!admin) {
        // replace removes protected page from history so back button doesnt bring them back to a page unauthorized to see
        return <Navigate to="/login" replace />;
    }

    // Admin is logged in - render page normally
    return children;
};

export default ProtectedRoute;