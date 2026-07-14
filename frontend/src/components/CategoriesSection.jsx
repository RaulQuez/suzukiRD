import air_intake from "../assets/category_pictures/air-intake.png"
import clutch_driveline from '../assets/category_pictures/clutch-dl.png';
import engine_crate_engine from '../assets/category_pictures/engine-crate.png';
import engine_parts from '../assets/category_pictures/engine-parts.png';
import exhaust_system from '../assets/category_pictures/exhaust.png';
import fuel_ignition from '../assets/category_pictures/fuel.png';
import suspension_brakes from '../assets/category_pictures/brakes-susp.png';
import turbos_components from '../assets/category_pictures/turbos.png';

import { useNavigate } from 'react-router-dom';

const DARK="#1c1c1c";
const RED = "#e8161b";
const CONDENSED = "'Montserrat', sans-serif";
const MONO = "'Share Tech Mono', monospace";

const Categories= [
    {label: "Air Intake Systems", img: air_intake},
    {label: "Clutch Drive Lines", img: clutch_driveline},
    {label: "Engine Parts", img: engine_parts},
    {label: "Engine-Crate Engines", img: engine_crate_engine},
    {label: "Exhaust Systems", img: exhaust_system},
    {label: "Fuel and Ignition", img: fuel_ignition},
    {label: "Suspension and Brakes", img: suspension_brakes},
    {label: "Turbos and Components", img: turbos_components}
]
// Category card is one small reusable component for each one card in the grid
// receives label = category name... img= the image 
function CategoryCard({ label, img, onClick }){
    return(

        
        //card container
        //position relative makes it the anchor for absolute layers inside (same as slideshow)
        // overflow hidden clips the image when it zooms on hover so it doesnt bleed outide the card
        <div onClick={onClick}  // clickable
            style={{
            position: "relative",
            height: 350,
            overflow: "visible",
            cursor: "pointer"
        }}>

            {/** layer 1 - background photo */}
            <img src={img} alt={label} style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
                display: "block",   // removes the small default gap under images
                transition: "transform 0.4s ease"   // animation on hover
            }} className="categories-card" />


            {/** layer 2 - dark overlay */}
             <div style={{position: "absolute",  
                inset: 0,   // inset 0 + position: absolute allows " stretch to cover the entire parent div"
                background: "rgba(0,0,0,0.55)",
                transition: "background 0.3s"
                }} />       
            
            {/** layer 3 - text content - floats above image and overlay 
             *   flexDirection:"column" stacks the label and "All Products" text vertically
            */}
                <div style={{
                    position:"absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0, // space between label and "all products" text
                }}>
                    {/**Catergory Name */}
                    <div className="categories-label" style={{fontFamily: CONDENSED,
                        fontWeight: 800,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "white",
                        textAlign: "center",
                        padding: "0 12px"   // stops text from touching card edges on narrow cards
                        
                    }}>{label}</div>
                    {/* "All Products >" link text in red below the category name
            &gt; is the HTML code for the > character */}
                    <div style={{
                    fontFamily: MONO,
                    fontSize: 11,
                    color: RED,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",

                    }}>All Products</div>
                </div>
                
        </div>
    );
}

// This is the main exported componenet with full categories section
// renders header text and the grid of categorycards
export default function CategoriesSection() {

    const navigate = useNavigate();

    return(
        // dark background section
        <div style={{background: DARK, padding: "48px 0"}}>
            {/**Section header - "Categories" title & red tagline */}
            <div style={{textAlign:"center", marginBottom: 36}}>
            <div style={{fontFamily:CONDENSED,
                fontWeight: 900,
                fontSize: 42,
                textTransform:"uppercase",
                color: "white",
                letterSpacing: "0.08em",
            }}>categories</div>
            {/**Red tagline below title */}
            <div style={{fontFamily: CONDENSED,
                fontSize: 11,
                letterSpacing: "0.3em",
                color: RED,
                textTransform: "uppercase",
                marginTop: 6
            }}>Take it to the next level</div>
            </div>  

             {/**THE GRID — displays all 8 category cards in a 4 column x 2 row layout
            *    display:"grid" is like flexbox but for 2D layouts (rows AND columns at the same time)
            *   gridTemplateColumns:"repeat(4, 1fr)" = 4 equal columns
            *    repeat(4, 1fr) is shorthand for "1fr 1fr 1fr 1fr"
            *     1fr means "1 fraction of the available space" so each column gets 25% of the width
            *    gridTemplateRows:"repeat(2, 1fr)" = 2 equal rows
            *    gap:4 = 4px space between every card
            *   maxWidth + margin:"0 auto" centers the grid on wide screens 
              */}
            <div style={{display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gridTemplateRows: "repeat(2, 1fr)",
                gap: 4,
                maxHeight: 1200,
                maxWidth: 1200,
                margin: "0 auto",
                padding: "0 24px"
            }}>
                {/**Loop over categories array */}
                {Categories.map((cat) => (
                    <CategoryCard key={cat.label} label={cat.label} img={cat.img} 
                    onClick={() => {
                        navigate(`/shop?category=${encodeURIComponent(cat.label)}`);
                        window.scrollTo({ top: 0, behavior: "smooth"});
                    }}
                    />
                ))}

            </div>

        </div>
    )
}