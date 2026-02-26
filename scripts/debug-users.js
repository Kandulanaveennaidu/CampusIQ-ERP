
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

console.log("SCRIPT STARTING...");

try {
    require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });
    console.log("DOTENV LOADED");
} catch (e) {
    console.error("DOTENV ERROR", e);
}

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
    name: String,
    email: String,
    role: String,
    isActive: Boolean,
    emailVerified: Boolean,
    failedLoginAttempts: Number,
    lockedUntil: Date,
    school: mongoose.Schema.Types.ObjectId,
}, { strict: false });

const User = mongoose.models.User || mongoose.model("User", UserSchema);

async function checkUsers() {
    await connectDB();

    console.log("Checking last 5 users...");
    try {
        const users = await User.find().sort({ createdAt: -1 }).limit(5).lean();

        const dump = users.map(u => ({
            email: u.email,
            role: u.role,
            isActive: u.isActive,
            emailVerified: u.emailVerified,
            failedLoginAttempts: u.failedLoginAttempts || 0,
            lockedUntil: u.lockedUntil ? new Date(u.lockedUntil).toISOString() : null,
            school: u.school ? u.school.toString() : null
        }));

        fs.writeFileSync("user-dump.json", JSON.stringify(dump, null, 2));
        console.log("DUMP WRITTEN TO user-dump.json");
    } catch (err) {
        console.error("Error querying users:", err);
    }

    process.exit(0);
}

checkUsers().catch(console.error);
