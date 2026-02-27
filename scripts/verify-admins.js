
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("MONGODB_URI is not defined");
    process.exit(1);
}

const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) return;
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("MongoDB Connected");
    } catch (err) {
        console.error("MongoDB Connection Failed", err);
        process.exit(1);
    }
};

const UserSchema = new mongoose.Schema({
    email: String,
    role: String,
    emailVerified: Boolean,
}, { strict: false });

const User = mongoose.models.User || mongoose.model("User", UserSchema);

async function verifyAdmins() {
    await connectDB();

    console.log("Verifying all admin users...");
    try {
        const result = await User.updateMany(
            { role: "admin", emailVerified: false },
            { $set: { emailVerified: true, isActive: true } }
        );

        console.log(`Updated ${result.modifiedCount} admin users to verified.`);
    } catch (err) {
        console.error("Error updating users:", err);
    }

    process.exit(0);
}

verifyAdmins().catch(console.error);
