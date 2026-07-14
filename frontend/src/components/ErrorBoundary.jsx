import { Component } from "react";
import * as Sentry from "@sentry/react"

// we create a own component from scratch hence extends component class - has render cycle, setState, lifecycle methods, ect.
class ErrorBoundary extends Component {
    // constructor runs once automatically the moment React creates the component. props - plain js object containing everything the parent passed in
    // including this.props.children ( componenets we wrap )
    constructor(props) {
        // super - runs react's own component constructor - hard js rule - cannot touch 'this' keyword until super() is called
        super(props);

        // this.state - class component version of useState(), defines all their state as a single object here in the constructor instead of:
        // const [hasError, setHasError] = useState(false)
        this.state = { hasError: false, error: null };
    }
    /*
    This is called automatically when any child component throws an error
    static - this method belongs to the ErrorBoundary class itself not any instances of it, it is called directly

    This MUST be a pure function — no side effects allowed here.
    Pure means: given the same input, always returns the same output,
    and doesn't touch anything outside itself (no console.log, no API calls). Its only job is to return the new state object.

    -----is what tells React "something crashed — switch to the fallback UI."
    */
    static getDerivedStateFromError(error){
        return { hasError: true, error};
    }
    
    /*
    This is called after getDerivedStateFromError once fallback UI is on screen.

    error: actual error object taht was thrown (.message, .stack, ect)
    info: object react gives with extra context
    info.componentStack: string showing the exact path through the component tree to where the crash happened
    */
   componentDidCatch(error, info){
    // console.error logs to the browaser DevTools console with a red error style, useful to see crashes w/o sentry dashboard
    console.error("ErrorBoundary caught: ", error, info.componentStack);

    // sends full error to sentry dashboard
    Sentry.captureException(error);
   }

   /*
   Arrow function syntax (handleReset = () => {}) instead of a regular method
   (handleReset() {}) because of how 'this' works in JavaScript classes.

   Arrow function inherits 'this' from sourounding scope
   */
   handleReset = () => {

    // this.setState() is the class component way of updating state.
    this.setState({ hasError: false, error: null });
   };

   // render() is the class component = of the return statement in a function component. this is called everytime state or props change
   render(){ 
    // this.state - reads current state values
    if (this.state.hasError) {
        // if child crashed show the fallback UI instead of a broken child (blank screen)
        return(
            <div style={{
                display: "flex",
                flexDirection: "column",    
                alignItems: "center",   // center horizontally, X axis
                justifyContent: "center",   // center y axis
                minHeight: "200px",
                padding: "2rem",
                textAlign: "center",
                color: "#ccc",   // light gray
            }}>
                <h2 style={{color: "#e74c3c"}}> Something Went Wrong</h2>

            <button onClick={this.handleReset} style={{
                padding: "0.5rem 1.2rem",
                background: "#6a0dad",
                color:"#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                margin: 10
            }}>Try Again</button>
            </div>
        );
    }
    // if no crash happens
    return this.props.children;
   }
}

export default ErrorBoundary;