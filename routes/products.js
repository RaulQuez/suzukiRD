/*
All product related api endpoints live here, mounted in server.js with: app.use("/api/products", productRoutes)

The /api/products prefix is already set in server.js, so inside routes/products.js (here) you only write what comes after it. 
So "/" becomes /api/products and "/:id" becomes /api/products/64abc123.
*/
import express from "express";
import mongoose from "mongoose";
// Product is the mongooose model, gives us access to write .find .findbyID ect
import Product from "../models/Product.js"
// product images
import { upload, cloudinary } from "../config/cloudinary.js";
// authentication
import authenticate from "../middleware/authenticate.js";
import optionalAuth from "../middleware/optionalAuth.js";

// creates a mini express app - same .get() , .post() ect. but isolated and mountable at a prefix.js
const router = express.Router();

// escapes regex special chars so user input is matched as literal text, not pattern - prevents ReDoS
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string

/*
    GET /api/products
    returns all prducts, supports optional ?category=filter.

    Shop page calls this on mount and when the user picks a category
    the categories section navigation passes the category as a url param

    Example calls: GET /api/products    -> all products
                   GET /api/products?category=Engine+Parts -> only engine parts
*/            // express objects res, req
router.get("/", optionalAuth, async (req, res) => {
    try {

        // req.query is a plain object of  URL query parameters
        // destructing to get category from the url hence { category }
        // /api/products?category=Engine+Parts -> req.query = { category: "engine parts"}
        const { category } = req.query;

        // build a filter object dynamically - Dynamic just means the code adapts to the situation instead of always doing the same thing.
        // if no category was passed, filter stays {} - which matches everything
        const filter = {};

        // customers only see active products; admins (with valid token) see all products
        if (!req.admin) {
            filter.isActive = true;
        }

        if (category){  // reads if its defined - true /undefined - false we skip

            const safe = escapeRegex(category.trim()).slice(0, 100);  // escape regex special chars so user input is matched as literal text, not pattern - prevents ReDoS
            // $regex -  tells MongoDB to match the field using a pattern instead of an exact value. So category: "engine parts" would still match "Engine Parts" in the DB
            // $options: "i" — the "i" means case-insensitive. Without it, "engine parts" would NOT match "Engine Parts"
            filter.category = { $regex: safe, $options: "i"};
        }

        /* 
            product.find(filter) returns all matching documents as an array
           .sort({ name: 1 }) sorts alphabetically ascending (1 = ASC, -1 = DESC).
           .lean() returns plain JS objects instead of full Mongoose documents.
        */
       const products = await Product.find(filter).sort({ name: 1});

        /*
            res.json() automatically:
            1. sets content-type: application/json header - tells http header (react frontend) the data taht is coming, JSON not html or plain text
            2. stringifies the array - rn the products variable is an array, this converts it as a string so it can actually travel to the frontend
            3. sends http 200 default - means OK everything worked hence 200
        */
       res.json(products);
       
    } catch (err) {
        // 500 - internal server error - our end 
        console.error("GET /products error:" , err);
        res.status(500).json({ error: "Failed to fetch products" });
    }
});
// GET search route, /api/products/search
router.get("/search", optionalAuth,  async (req, res) => {
    
    const { q } = req.query;    // { q } - destructuring, w/o this is the same thing=const q = req.query.q 
    
    
    // validate query
    if(!q || q.trim() === "") return res.status(400).json({ error: "Query is required" });

    const safe = escapeRegex(q.trim()).slice(0, 100);

    try {
        // build the query object first, then conditionally add the isActive filter
        const query = {
            $or: [
                { name: { $regex: safe, $options: "i" } },
                { description: { $regex: safe, $options: "i" } },
                { category: { $regex: safe, $options: "i" } },
            ],
        };

        if (!req.admin) {
            query.isActive = true;
        }

        const results = await Product.find(query);

        // results values given based on product.find above
        res.json(results);

    } catch (err) {
        console.error("Search error: ", err);
        // creating new object in json { "error": "Internal server error" }
        res.status(500).json({ error: "Internal server error"});
    }
});
/*
    POST /api/products/upload-image
    Uploads a single image to Cloudinary and returns the URL + publicId.

    WHY TWO MIDDLEWARE FUNCTIONS INSTEAD OF ONE:
    The naive approach would be:
    router.post("/upload-image", authenticate, upload.single("image"), async (req, res) => {...})

    But multer throws non-standard error objects — when they reach Express's
    global error handler, they arrive as undefined (which is why we kept seeing
    "Unhandled Error: undefined" in the terminal).

    The fix is to call upload.single("image") manually as a function and handle
    its errors ourselves in a callback before Express ever sees them.
*/
router.post("/upload-image", authenticate, (req, res, next) => {
    upload.single("image")(req, res, (err) => {
        if (err) {
            console.error("Multer error:", err);
            return res.status(400).json({ error: err.message || "File upload failed" });
        }
        next();
    });
}, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No image file provided" });
        }
        res.json({
            url: req.file.path,
            publicId: req.file.filename,
        });
    } catch (err) {
        console.error("Image upload error:", err);
        res.status(500).json({ error: "Image upload failed" });
    }
});
/*
    DELETE /api/products/image
    Deletes an image from cloudinary by its public_id. Called when the admin removes
    an image from a product or replaces it with a new one 

    Body: { "publicId": "suzukird/products/abc13"}
*/
router.delete("/delete", authenticate, async(req,res) => {
try {
    const { publicId } = req.body;
    if (!publicId) {
        return res.status(400).json({ error: "publicId is required"});
    }
    // cloundinary.uploader.destroy() permanently deletes the image & 
    // returns { result: ok} on success or not found if publicId doesnt exist
    const result = await cloudinary.uploader.destroy(publicId);
    // validate
    if (result.result != "ok") {
        return res.status(404).json({error: "Image not found on cloudinary"});
    }

    res.json({ message: "Image deleted successfully" });
}catch(err) {
console.error("Image delete error: ", err);
res.status(500).json({ error: "Failed to delete image" });
}
});
/*
    GET /api/products/:id
    returns ONE product by its MongoDB _id

    :id is a url parameter - dynamic segment of the URL path
    GET /api/products/64abc123 -> req.params.id = 64abc123

    :id is a placeholder for the actual id that gets passed
*/  
router.get("/:id", optionalAuth, async (req, res) => {
    try {
        // input validation, mongoDB objectIDs are 24 character hex strings
        if  (!mongoose.Types.ObjectId.isValid(req.params.id)){
            return res.status(400).json({ error: "Invalid Product ID"});
            // stop here 
        }
        // findbyID() is mongoose shorthand for findOne({ _id : Id })
        // here we actively look for the product by its id
        const product = await Product.findById(req.params.id);

        if (!product || (!req.admin && !product.isActive)) {
            return res.status(404).json({ error: "Product not found" });
        }

        // succcess response sends back 200
        res.json(product);
    } catch (err){
        // send 500 error instead of crashing whole server
        res.status(500).json({ error: "Failed to fetch product"});
    }
});
/*
    POST /api/products - creates a new product in the database from the admin page
    Called by the admin app when you fill out the "Add Product" form and hit submit.
    The form data travels in the request BODY (not the URL like GET requests).

    only authenticated admins can create products
*/
router.post("/", authenticate, async (req,res) => {
    try {
        /*
            destructure fields we expect from req.body, safer than passing req.body directly into databas
            it prevents someone from injecting unexpected fields like "isAdmin: true".
            ONLY 6 FIELDS WILL EVER BE WRITTEN INTO THE DB FROM THIS ROUTE  
        */
       const { name, category, price, stock, description, imageUrl, variants } = req.body;

       // validation - 400 means bad request meaning the client sent something wrong
       if (!name || !category || price === undefined) {
        return res.status(400).json({ error: "name, category, and price are required" });
       }

       const existing = await Product.findOne({ name });
       if (existing) {
        return res.status(409).json({ error: "A product with this name already exists"});   // 409 - conflict with existing data
       }
       // new product({}) creates a mongoose document instance in memory, it doesnt touch the database yet but builds the object and runs the shcema validators (required,enum,min,ect)
       const product = new Product({
        name,
        category,
        price,
        stock: stock ?? 0,  // ?? is nullish coalescing - if stock is null/undefined default to 0, we use ?? instead of || because || would also default if stock === 0 - valid
        description: description ?? "", // ^
        imageUrl: imageUrl ?? null,     // |
        variants: variants ?? [],
    }); 
        /*
        .save() is when it actually writes to mongoDB
        Mongoose runs schema validation one more time here (like enum checks).
        If anything fails, it throws a ValidationError which our catch block handles.

         await pauses here until MongoDB confirms the document was written.
            savedProduct comes back with _id, createdAt, updatedAt all filled in by MongoDB/Mongoose.
        */
        const savedProduct = await product.save();

        res.status(201).json(savedProduct); // 201 - something created & (OK) - send back the full saved product so admin ui can immediately add it to the list
        
    } catch (err) {
        // if mongoose throws a validationerror when schema rules are broken, err.name lets us identify the error type
        if (err.name === "ValidationError"){
            return res.status(400).json({ error: err.message });   // 400 - client sent invalid data - bad request
        }
        // second layer of protection if a duplicate name product seeps through mongoDB throws this error code, err.code 11000 is mongo's code for duplicate violations
        if (err.code === 11000) {
            return res.status(409).json({ error: " A product with this name already exists"});  // 409 - conflict
        }
        console.error("POST /products error: ", err);
        res.status(500).json({ error: "Failed to create product"}); // 500 - internal server error
    }
});
/*
    PATCH /api/producst/:id
    updates an existing product by its mongodb _id

    PATCH - only updates the fields used.

    Body: { "price": 29.99, "stock": 12} - only price and stock change

    only authenticated admins can edit products
*/
router.patch("/:id", authenticate, async (req,res) => {
    try {
        // validate id format first, mongodb id - 24 character hex string, protecting it from outside api calls - security++
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: "Invalid Product ID"});
        }
    /*
        whitelist fields that are accepted to be updated. 
        Object.keys() returns an array of all keys in an object:

        .reduce() builds a new object from that array & loops over each key and only includes it in "updates"
        if it exists in our allowedFields list.

        Example:
        req.body = { price: 299, stock: 12, _id: "hacked" }
        allowedFields = ["name", "category", "price", "stock", "description", "imageUrl"]
        result = { price: 299, stock: 12 }   <- _id was stripped out
    */
        
        const allowedFields = ["name", "category", "price", "stock", "description", "imageUrl", "variants", "weight", "dimensions.length", "dimensions.width", "dimensions", "isActive"];
        const updates = Object.keys(req.body).reduce((acc, key) => {
            /*
            acc is the accumulator - object being build each loop.
            key is the current field name being checked.

            includes() checks if key is in our allowedFields array above
            IF YES - ADD TO ACC
            NO - SKIP & SILENTLY DROPPED
            */
           if (allowedFields.includes(key)) {
            acc[key] = req.body[key];
           }
           return acc;
        }, {}); // {} is the starting value of acc - an empty object

        //if after filtering nothing valid was sent - reject early. empty update - somone sends { "_id": "hack" } — updates would be {}
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "No valid fields provided to update"});
        }

        /*
        findbyIdandUpdate() -> $set tells mongodb to only update the fields inside it.
                Without $set, MongoDB would REPLACE the whole document with just the updates object.
            
        Options object: new - true -> returns the updated document, without this you get back what it looked like before the update
                    runValidators - true -> run schema validation on the new values, without this you could patch price to -999 and mongoose wouldnt stop you
        */
       const updated = await Product.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, runValidators: true }
       );

       // validate if the product was found/updated
       if (!updated) {
        return res.status(404).json({ error: "Product not found"});
       }

       // 200 OK - return full updated object
       res.json(updated);

    } catch (err) {
        // same as post
        if (err.name === "ValidationError") {
            return res.status(400).json({ error: err.message });
        }

        console.error("PATCH /products/:id error: ", err);
        res.status(500).json({ error: "Failed to update product"});
    }
});
/*
    DELETE /api/products/:id
    Permanetly deletes a product from the database
    
    Called by the admin app when you click the delete button on a product.
    There is no undo — once deleted, it's gone from MongoDB.

    Example call: 
    DELETE /api/products/62ab1234
    
    only authenticated admins can delete products
*/
router.delete("/:id", authenticate, async (req,res) => {
    try{ 
        // same id validation as GET /:id and PATCH /:id
        if (!mongoose.Types.ObjectId.isValid(req.params.id)){
            return res.status(400).json({ error: "Invalid product ID"});
        }

        // findbyidanddelete() finds document by _id and removes it in one operation -             It returns the deleted document if it was found, or null if nothing matched.
        const deleted = await Product.findByIdAndDelete(req.params.id);

        // if null - id format was valid but no document with id exists 
        if (!deleted) {
            return res.status(404).json({ error: "Product not found"});
        }

        // return body - automatically returns 200 - ok status 
        res.json({
            message: "Product deleted successfully",
            deletedId: deleted._id
        });

    }catch (err){

        console.error("DELETE /products/:id error: ", err);
        res.status(500).json({error: "Failed to delete"});  // 500 = internal server error
    }
});

export default router;