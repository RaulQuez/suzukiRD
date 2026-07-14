/*
    Admin model - stores one admin accounts for sukukird amin panel
*/
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const adminSchema = new mongoose.Schema({

    username: {
        type: String,
        required: [true, "Username is required"],
        unique: true,   // mongodb creates unique index - no 2 admins can share a username
        trim: true,     // empty spaces are ignored
        lowercase: true, // stores lowercase so Admin and admin so both are the same
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minLength: [8, "Password must be at least 8 characters"],
    },
 },
 {timestamps: true});

/*
    pre("save") is a Mongoose middleware hook — it runs automatically
    BEFORE the document is saved to MongoDB.

    passwrods are hashed & never stored as plain text
    "this" refers to the admin document being saved

*/
adminSchema.pre("save", async function() {
     /*
        Only hash if the password field was actually changed.
        Without this check, every time you save the admin document
        (even just updating username), it would hash the already-hashed
        password again — making it impossible to log in.
    */
   if (!this.isModified("password")) return;

   /*
        bcrypt.genSalt(10) generates a random "salt" — extra random data
        mixed into the hash so two identical passwords produce different hashes.
        10 is the "cost factor" — how many rounds of hashing to run.
        Higher = more secure but slower. 10 is the industry standard.
    */
   const salt = await bcrypt.genSalt(10);

   /*
        bcrypt.hash() takes the plain text password + salt and produces
        a fixed length hashed string. This replaces the plain text password
        on the document before it gets written to MongoDB. 
   */
  this.password = await bcrypt.hash(this.password, salt);
});
    /*
        Instance method — a function you can call on any admin document.
        admin.comparePassword("mypassword") returns true or false.

        bcrypt.compare() hashes the candidate and compares it to the stored hash.
        You cant "unhash" — bcrypt just hashes the input the same way and checks
        if the result matches. This is why hashing is safe.
    */
    adminSchema.methods.comparePassword = async function (candidatePassword) {
        return bcrypt.compare(candidatePassword, this.password);
    };

    const Admin = mongoose.model("Admin", adminSchema);


export default Admin;