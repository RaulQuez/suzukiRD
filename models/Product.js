/*
    This is the blueprint for every product stored in MongoDB, mongo reads this schema
    and enforces it on every document saved to the products collection in the database

    This allows us to define the data, read, write, update and delete documents (products)

*/
import mongoose from "mongoose";

// mongoose.Schema() defines what fields a product document CAN have, what type each field must be and optional rules (required, default, ect)
const productSchema = new mongoose.Schema(
  {
    // this is name and its fields:
    name: {
        type: String,
        required: [true, "Product name is required"],
        trim: true, // automatically strips leading/trailing whitespaces on save
    },
    // client based ID 
    pID: {
        type: String,
        default: "",
    },
    // category must match one of the 8 labels
    // enum is mongo's way of saying only these values are allowed, if you try to save category: wheels, mongoose throws an error
    category: {
        type: String,
        required: [true, "Category is required"],
        enum: [
        "Air Intake Systems",
        "Clutch Drive Lines",
        "Engine Parts",
        "Engine-Crate Engines",
        "Exhaust Systems",
        "Fuel and Ignition",
        "Suspension and Brakes", // matches CategoriesSection label exactly
        "Turbos and Components",   
        ]
    },

    price: {
        type: Number,
        required: [true, "Price is required"],
        min: [0, "Price cannot be negative"]
    },
    // Image URL stores a url string  - either cloudinary link or a local path
    // placeholder for now
    imageUrl:{
        type: String,
        default: null,
    },
    description: {
        type: String,
        default: "",
        trim: true,
    },
    // stock lets you show in stock or out of stock badges later
    stock: {
        type: Number,
        default: 0,
        min: 0
    },
    isActive: {
        type: Boolean,
        default: true,
    },

    /*
    variants — optional array of strings representing different sizes,
    specs, or measurements this product comes in.

    Examples:
    ["2.5 inch", "3 inch", "3.5 inch"]
    ["Stage 1 — 215whp", "Stage 2 — 260whp"]
    ["Small", "Medium", "Large"]

    Empty array means the product has no variants — customer just
    clicks Add to Cart directly without picking anything.

    No enum validation here because variants are completely freeform —
    every product has different specs so we can't predict them.
*/
    variants: {
        type: [String],  // array of strings
        default: [],     // empty array = no variants, product has one version
    },
      
    /*
    inStock is a mongoose "virtual" - computed field that is not stored, but calculated on the fly when teh document is read
    we use { virtuals: true } in toJSON below so it shows up in API responses so react can just read product.inStock instead
    of product.stock > 0 
    */
   weight: {
    type: Number,
    default: 0,
    min: 0 // weight in lbs
   },
   dimensions: {
    length: {type: Number, default: 0}, // in inches
    width: {type: Number, default: 0},
    height: {type: Number, default: 0},
   }

},
    {
        // timestamps: true tells mongoose to automatically add 2 fields:
            // createdAt & updatedAt
        timestamps: true,
        // toJSON controls what gets sent when you call res.json(product).
        // virtuals: true means virtual fields like inStock are included
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

/*
    Virtual field - 
    productSchema.virtual() defines a computed property, works like a getter: every time you read product.inStock 
    the function runs and returns true or false. Never stored in the database, only computed when read
*/
productSchema.virtual("inStock").get(function () {
    // "this" refers to the individual product document being read, returns true or false
    return this.stock > 0;
});
/*
    Index - 
    indexes speed up queries, often filter by category so we tell mongo to build an index on that field.
    without an index mongo scans every document (slow with 1000+ products).
    with an index it jumps straight to matching documents

    so category is the index for each product to get assigned to in A-Z order (1)
*/
productSchema.index( { category: 1 } ); //1 - ascending order index

/*  this:
    1. compiles the schema into a model class called "Product" (with virtuals and indexes already attached bc of order of code)
    2. Links it to a mongoDB Collection called "products" (auto lowercase & Plural)

    after this we can call:
    Product.find() -> get all products
    Product.findById(id) -> get one by id
    product.findByIdAndUpdate() -> update one
    new Product({...}).save() -> create one
*/
const Product = mongoose.model("Product", productSchema);

export default Product;