/*
    Configures the cloudinary SDK and creates a multer upload middleware that sends files 
    straight to Cloundinary


    exports two things:
    1. cloudinary — the configured SDK instance (used if we ever need
       to delete images directly by public_id)
    2. upload — the multer middleware that handles file uploads.
       Drop it into any route as a second argument and req.file
       will contain the uploaded file's info including the Cloudinary URL.
*/
import { v2 as cloudinary } from "cloudinary"
import { CloudinaryStorage } from "multer-storage-cloudinary-v2"
import multer from "multer";

// couldinary.config() authenticates app with cloudinary. 3 values come from the dotenv file for that authentication
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
});

// CloudinaryStorage tells multer where to send files (cloudinary) and how to store them (folder, format, filename).
// params is a function that runs per upload and receives the request and file so you can dynamically set storage options per upload if needed.
const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        // folder organizes uploads inside cloud account. All images go into suzukird/products
    folder: "suzukird/products",
        // allowed_formats is a whitelist of file types we accept and rejects anything not listed
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
        /* transformation automatically resizes and compresses image on cloud servers before sorting,
   
            width: 800, height: 800 — max dimensions. Cloudinary won't
            stretch smaller images, only shrink larger ones.
            crop: "limit" — maintains aspect ratio, never crops content.
            quality: "auto" — Cloudinary picks the best quality/size balance.
            fetch_format: "auto" — serves webp to browsers that support it,
            falls back to jpg/png for older browsers. Free performance boost.
        */
    transformation: [
        {
            width: 800,
            height: 800,
            crop: "limit",
            quality: "auto",
            fetch_format: "auto",
        },
    ],
    },
});
/*
    multer(storage) creates the upload middleware using Cloudinary storage.

    limits.fileSize caps uploads at 5MB. Without this, someone could upload
    a 500MB file and either crash  server or rack up Cloudinary bandwidth.
    5 * 1024 * 1024 = 5,242,880 bytes = 5MB.
*/
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024},
    /* fileFilter runs before file is uploaded - second layer of validation on top of allowed_formats - we check mimeType(what os says the file is)
     rather than just the extension (can be faked by renaming) - 
        cb is the callback:
        cb(null, true)  — accept the file
        cb(error, false) — reject the file with an error
    */
   fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only jpg, png, and webp images are allowed"), false);
    }
   },
});

export {cloudinary, upload};
