import car2 from '../assets/cars/ChatGPT Image Jun 3, 2026, 03_47_56 PM.png'
import car3 from '../assets/cars/ChatGPT Image Jun 3, 2026, 03_45_15 PM.png'
import car4 from '../assets/cars/ChatGPT Image Jun 3, 2026, 03_56_47 PM.png'
import car5 from '../assets/cars/ChatGPT Image Jun 3, 2026, 03_58_20 PM.png'

import part1 from '../assets/parts/partz1.png'
import part2 from '../assets/parts/partz2.png'
import part3 from '../assets/parts/partz3.png'
import part4 from '../assets/parts/partz4.png'

import SlideShow from '../components/SlideShow'
import CategoriesSection from '../components/CategoriesSection'
import { useNavigate } from 'react-router-dom'

const cars = [car2,car3,car4,car5];
const parts = [part1,part2,part3,part4];

const RED = "#e8161b";
const CONDENSED = "'Montserrat', sans-serif";
const MONO = "'Share Tech Mono', monospace";

/*
    useNavigate lets homepage navigate itself completely independent
*/
export default function HomePage(){
   
    const navigate = useNavigate();

    return(  
    <div> 
        
            {/* This wrapper is the anchor for the overlay text */}
            <div style={{position: "relative", display: "flex", height: "100%",}}>
                {/** side by side */}
                <div style={{flex:4}}>
                    <SlideShow slides={cars} label="Cars"/>
                </div>
                <div style={{flex:2}}>
                    <SlideShow slides={parts} label="Parts"/>
                </div>
            </div>



    <div style={{position:"absolute",
            top: "50%",           
            left: "50%",
            textAlign: "center",
            transform: "translate(-50%, -50%)",  // shifts it back by half its own width/height to perfectly center it
            zIndex: 10, // make sure it stis above the overlay inside slideshow
            padding: "32px 0 16px",
            userSelect: "none"
        }}>
            <div style={{ fontWeight: "bold", fontFamily: CONDENSED, fontSize: 25, letterSpacing: "0.35em", color: "white", textTransform: "uppercase" }}>
            Suzuki Racing Development
            </div>
            {/**Big Brand Name */}
            <div style={{fontFamily: CONDENSED,
                fontWeight: 900,
                fontSize: 62,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "white",
                lineHeight: 1,  // tightens the vertical space between lines if it wraps
                textAlign: "center"
            }}>SUZUKI
            <span style={{color: RED}}>RD</span>
            </div>

            <button onClick={() => navigate("/shop")}
            className='shop-parts-btn'
            >Shop Parts</button>    
        </div>
    
            {/** Shop categories section that is below the slideshow/title shop parts button */}
     
                <CategoriesSection />
</div>
    );
}