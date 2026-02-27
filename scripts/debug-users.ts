
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Connect to DB
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

// Define minimal Schema to read users (avoiding imports if possible, or just define it here)
// Better to define it here to avoid dependency issues with complex User model imports
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
  isActive: Boolean,
  emailVerified: Boolean,
  failedLoginAttempts: Number,
  lockedUntil: Date,
  school: mongoose.Schema.Types.ObjectId,
}, { strict: false }); // strict: false allows reading fields even if schema is incomplete

const User = mongoose.models.User || mongoose.model("User", UserSchema);

async function checkUsers() {
  await connectDB();

  console.log("Checking last 5 users...");
  const users = await User.find().sort({ createdAt: -1 }).limit(5).lean();

  if (users.length === 0) {
    console.log("No users found.");
  } else {
    console.table(users.map(u => ({
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      emailVerified: u.emailVerified,
      failedLoginAttempts: u.failedLoginAttempts || 0,
      lockedUntil: u.lockedUntil ? new Date(u.lockedUntil).toISOString() : 'null',
      school: u.school ? u.school.toString() : 'null'
    })));
  }

  process.exit(0);
}

checkUsers().catch(console.error);
