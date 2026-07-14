import { useState, useEffect } from 'react';


const RED = "#e8161b";
const CONDENSED = "'Montserrat', sans-serif";
const MONO = "'Share Tech Mono', monospace";


// Slideshow component that handles logic and displaying of slides
// receives slide=array of cars or parts
// receives a label telling us what is being passed
export default function SlideShow({ slides, label }){
    // 'current' tracks each slide index (0,1,2,...)
    // starts at 0
    const [current, setCurrent] = useState(0);

    // useEffect runs after component renders on screen and we use it to:
    // start an automatic timer that advances the slide every 4 seconds
    useEffect(() => {
        // setInterval-built in js function that calls the function inside every 4000ms (4 seconds)
        const timer = setInterval(() => {

            // "i => (i + 1) % slides.length" is a safe way to advance the index
           // the % (modulo) wraps it back to 0 when it reaches the end
          // e.g. if you're on slide 2 and there are 3 slides: (2+1) % 3 = 0 and loops back to 0
          setCurrent(i => (i+1) % slides.length);
            }, 4000);

            // this is the cleanup function-react calls this when the component unmounts/when you switch to a different tab/page
            // without this timer runs forever - memory leak
            return () => clearInterval(timer);
    }, []); // empty []means "only run this effect once, when the component first mounts"

    return(
    // position:relative makes this the "anchor" for all the layers inside
    // everything with position:absolute inside will be placed relative to THIS div
        <div style={{position: "relative",
            width: "100%",
            height: "520px",
            overflow: "visible"  // clips anything that goes outside the box  (image edges)
        }}>

        {/** layer 1 - actual photo */}
        <img 
        src={slides[current]}
        alt={`slide ${current+1}`}
        style={{width: "100%",
            height: "100%",
            objectFit: "cover", // this fills the box without stretching or squishing the image
            objectPosition: "center",   // keeps the center of the image in frame when cropping
            display: "block"    // removes small default gap under images that inline elements have
        }}
        />

        {/**Layer 2 - black transparent sheet that sits on the image 
         * self-closing because its just the black sheet sheet
        */}
        <div style={{position: "absolute",  
        inset: 0,   // inset 0 + position: absolute allows " stretch to cover the entire parent div"
        background: "rgba(0,0,0,0.55)"
        }} />   

       
        </div>

    )





}