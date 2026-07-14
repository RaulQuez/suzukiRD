import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import LoginPage from "./pages/LoginPage";
import ProductsPage from "./pages/ProductsPage";
import OrdersPage from "./pages/OrdersPage";
import Dashboard from "./pages/Dashboard";
import UsersPage from "./pages/UsersPage"
import "./App.css"

const App = () => {
return (
  // Auth provider wraps entire app so they can call useAuth() and get logged in admin state
  <AuthProvider>
    
    {/**Browser Router enables React router for entire app, listens to URL and rerenders matching route when url changes without a page reload */}
    <BrowserRouter>
    
    {/**AppLayout handles conditional navbar. navbar only shows on dashboard pages  We separate this into its own component below so it
    *  can use useLocation() — a React Router hook that
    *  tells us the current URL path.
   */}
    <AppLayout />

    </BrowserRouter>
  </AuthProvider>
 );
};

/*
  App layout renders navbar conditionionall and defines all routes

  seperate component (not inline in app) because it calls useLocation() router hook.
*/
import { useLocation } from "react-router-dom";

const AppLayout = () => {
  // useLocation() returns current location object, location.pathname is the url path string: 
  // "/" -> "/", "/login" -> "/login", "/orders" -> "/orders", we use this to hide navbar on the login page
  const location = useLocation();

  // if we're on /login, false everywhere else. navbar only renders when false
  const isLoginPage = location.pathname === "/login";

  return (
      // with condtionional rendering && if login true - navbar is skipped if false we render at the top
      // !isLoginPage flips the boolean:
      //     on /login -> !true -> false -> Navbar hidden
      //     on /     -> !false -> true -> Navbar shown
    <>
      {!isLoginPage && <Navbar />}

    
    {/** Main content area below navbar, "main-content" class adds top padding so content doesnt hide behind fixed navbar */}
    <main className="main-content">
        {/** Routes look at current URL and render matches ONE at a time */}
      <Routes>

        {/** /login - only public route, no protectedRoute wrapper - any can reach it. */}
        <Route path="/login" element={<LoginPage/>} />

        {/** "/" landing dashboard page when admin first logs in  */}
        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard/>
          </ProtectedRoute>
        } />

        {/** / - is the products dashbboard/default landing page wrapped in protectedRoute - unathenticated users get redirected to /login before ProductsPage renders */}
        <Route path="/products" element={
          <ProtectedRoute>
            <ProductsPage />
          </ProtectedRoute>
        } />

      {/** /orders - orders management page also protected */}
      <Route path="/orders" element={
        <ProtectedRoute>
          <OrdersPage/>
        </ProtectedRoute>
      } />

      {/** /users - displays all the users that have placed orders grouped via emails*/}
      <Route path="/users" element={
        <ProtectedRoute>
          <UsersPage />
        </ProtectedRoute>
      } />

      {/** catch all route- matches any url that didnt match routes above (404),
       *   navigate="/" redirects them to the dashboard.
       *   replace - replaces bad url in history so back button doesnt go back to the broken url 
       *     Example: admin types /settings which doesn't exist                        → redirect to / (products dashboard)
       */}
       <Route path="*" element={
        <Navigate to="/" replace />
       } />
      </Routes>
    </main>
    </>
  );
};
export default App;