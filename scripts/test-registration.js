
// using global fetch
// const fetch = require("node-fetch-native");

async function testRegister() {
    const email = `test.admin.${Date.now()}@example.com`;
    const password = "Password123!";

    console.log(`Registering user: ${email} ...`);

    const response = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            school_name: "Test School",
            school_type: "public",
            board: "cbse",
            address: "123 Test St",
            phone: "1234567890",
            email: email,
            admin_email: email,
            admin_password: password
        })
    });

    const result = await response.json();
    console.log("Response status:", response.status);
    console.log("Result:", result);

    if (response.ok) {
        console.log("Registration successful.");
        // Now verify via DB
        const mongoose = require("mongoose");
        const path = require("path");
        require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

        await mongoose.connect(process.env.MONGODB_URI);
        const UserSchema = new mongoose.Schema({ email: String, emailVerified: Boolean }, { strict: false });
        const User = mongoose.models.User || mongoose.model("User", UserSchema);

        const user = await User.findOne({ email }).lean();
        console.log("DB User:", {
            email: user.email,
            emailVerified: user.emailVerified
        });

        if (user.emailVerified) {
            console.log("SUCCESS: User is verified automatically.");
        } else {
            console.error("FAILURE: User is NOT verified automatically.");
        }
    } else {
        console.error("Registration failed.");
    }
}

testRegister().catch(console.error);
