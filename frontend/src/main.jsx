import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './App.css';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { CartProvider } from "./context/CartContext.jsx"; // allows so any component in the true can call const { cart, addToCart, cartCount, cartTotal } = useCart();

// Initializing sentry
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN, // sentry gives this when creating a project

  environment: import.meta.env.MODE, // filter out dev noise, Tags every error with "development" or "production" automatically

  // captures real user sessions to replay what happened - DVR for the UI
  integrations: [
    Sentry.browserTracingIntegration(), // tracks page load and navigation performance
    Sentry.replayIntegration()  // records session replays on errors
  ],

  // tracing - captures 100% of transactions in dev, drop to 0.1 in production once theres real traffic so we dont burn through the free quota
  tracesSampleRate: import.meta.env.MODE === "development" ? 1.0 : 0.1,

  // only enable distributed tracing for actual domains, replace production url with real one when we deploy
  tracePropagationTargets: [
    "localhost",
    /^https:\/\/suzukird\.com\/api/ // regex syntax taht tells us Match any URL that starts with exactly https://suzukird.com/api", ^ secures the url 
  ],

  // records 10% of nomral sessions, but 100% of sessions where an error occurs
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // sends console.log/warn/error calls to sentry alongside errors, useful to see code working before crahs
  enableLogs: true,

  // collects user information, enabled FOR NOW LATER EDIT-------
  sendDefaultPii: true,
});


/* BrowserRouter lives here — one time, at the very top of the app
-----This gives every component below it access to React Router (useNavigate, Link, useSearchParams, etc.)----
 If we wrap BrowserRouter anywhere else (like inside App.jsx or NavigationBar), you get two routers fighting each other
*/
 createRoot(document.getElementById('root')).render(
 
  // strictmode is a wrapper used during development for helping debug and catch issues pre development launch
  <StrictMode> 
    
    <BrowserRouter>
    
      <ErrorBoundary>
       
        <CartProvider>
       
        <App />
       
        </CartProvider>
   
      </ErrorBoundary>
    
    </BrowserRouter>
  
  </StrictMode>
)
