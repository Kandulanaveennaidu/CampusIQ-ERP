// seed-mongodb.js — Seeds the MongoDB database with initial school, admin, teachers, and students
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const MONGODB_URI =
    "mongodb+srv://kandulanaveennaidu017_db_user:7N23VcszfcYIrgh6@cluster0.n1lphe1.mongodb.net/edutrack?appName=Cluster0";

async function seed() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✅ Connected to MongoDB");

        const db = mongoose.connection.db;

        // ──── 1. Create School ────
        const existingSchool = await db.collection("schools").findOne({});
        if (existingSchool) {
            console.log("⚠️  School already exists:", existingSchool.school_name);
            console.log("   School ID:", existingSchool._id.toString());

            // Check if admin exists
            const admin = await db
                .collection("users")
                .findOne({ school: existingSchool._id, role: "admin" });
            if (admin) {
                console.log("   Admin email:", admin.email);
            }

            console.log("\n📌 Use these credentials to log in.");
            await mongoose.disconnect();
            return;
        }

        const schoolResult = await db.collection("schools").insertOne({
            school_name: "CampusIQ Demo School",
            address: "123 Education Lane, Knowledge City",
            phone: "9876543210",
            email: "demo@campusiq.school",
            plan: "premium",
            status: "active",
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        const schoolId = schoolResult.insertedId;
        console.log("✅ School created:", schoolId.toString());

        // ──── 2. Create Admin User ────
        const adminPassword = await bcrypt.hash("admin123", 12);
        await db.collection("users").insertOne({
            name: "Admin User",
            email: "admin@campusiq.school",
            password: adminPassword,
            role: "admin",
            school: schoolId,
            phone: "9876543210",
            emailVerified: true,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        console.log('✅ Admin created: admin@campusiq.school / admin123');

        // ──── 3. Create Teacher Users ────
        const teacherPassword = await bcrypt.hash("teacher123", 12);

        const teachers = [
            {
                name: "Rajesh Kumar",
                email: "rajesh@campusiq.school",
                subject: "Mathematics",
                classes: ["10-A", "10-B", "9-A"],
                phone: "9876543211",
            },
            {
                name: "Priya Sharma",
                email: "priya@campusiq.school",
                subject: "Science",
                classes: ["10-A", "9-A", "9-B"],
                phone: "9876543212",
            },
            {
                name: "Anil Verma",
                email: "anil@campusiq.school",
                subject: "English",
                classes: ["10-B", "9-A", "9-B"],
                phone: "9876543213",
            },
        ];

        for (const t of teachers) {
            await db.collection("users").insertOne({
                ...t,
                password: teacherPassword,
                role: "teacher",
                school: schoolId,
                emailVerified: true,
                isActive: true,
                salaryPerDay: 1500,
                joiningDate: "2024-06-01",
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }
        console.log(`✅ ${teachers.length} teachers created (password: teacher123)`);

        // ──── 4. Create Students ────
        const classes = ["10-A", "10-B", "9-A", "9-B"];
        const firstNames = [
            "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun",
            "Sai", "Reyansh", "Krishna", "Ishaan", "Shaurya",
            "Ananya", "Diya", "Myra", "Sara", "Aadhya",
            "Kavya", "Riya", "Neha", "Pooja", "Shreya",
        ];
        const lastNames = [
            "Patel", "Sharma", "Reddy", "Kumar", "Singh",
            "Nair", "Gupta", "Joshi", "Rao", "Verma",
        ];

        let studentCount = 0;
        for (const cls of classes) {
            const studentsInClass = 10 + Math.floor(Math.random() * 6); // 10-15 students per class
            for (let i = 1; i <= studentsInClass; i++) {
                const firstName =
                    firstNames[Math.floor(Math.random() * firstNames.length)];
                const lastName =
                    lastNames[Math.floor(Math.random() * lastNames.length)];
                await db.collection("students").insertOne({
                    school: schoolId,
                    class_name: cls,
                    roll_number: String(i).padStart(2, "0"),
                    name: `${firstName} ${lastName}`,
                    parent_name: `Mr. ${lastName}`,
                    parent_phone: `98765${String(43000 + studentCount).padStart(5, "0")}`,
                    parent_email: `${lastName.toLowerCase()}${studentCount}@parent.com`,
                    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${studentCount}@student.com`,
                    address: `House ${i}, Street ${Math.ceil(i / 5)}, City`,
                    admission_date: "2024-06-15",
                    status: "active",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
                studentCount++;
            }
        }
        console.log(`✅ ${studentCount} students created across ${classes.length} classes`);

        // ──── 5. Create some Rooms ────
        const rooms = [
            { room_name: "Room 101", room_type: "classroom", capacity: "40", floor: "1st", facilities: "Projector, Whiteboard", status: "available" },
            { room_name: "Room 102", room_type: "classroom", capacity: "40", floor: "1st", facilities: "Whiteboard", status: "available" },
            { room_name: "Computer Lab", room_type: "lab", capacity: "30", floor: "2nd", facilities: "30 PCs, Projector, AC", status: "available" },
            { room_name: "Science Lab", room_type: "lab", capacity: "25", floor: "2nd", facilities: "Lab Equipment, Projector", status: "available" },
            { room_name: "Auditorium", room_type: "auditorium", capacity: "200", floor: "Ground", facilities: "Sound System, Projector, AC", status: "available" },
            { room_name: "Library", room_type: "library", capacity: "50", floor: "1st", facilities: "Books, Study Tables, WiFi", status: "available" },
        ];

        for (const room of rooms) {
            await db.collection("rooms").insertOne({
                school: schoolId,
                ...room,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }
        console.log(`✅ ${rooms.length} rooms created`);

        // ──── 6. Create Holidays ────
        const holidays = [
            { date: "2026-01-26", name: "Republic Day", holiday_type: "national", type: "national", description: "National holiday" },
            { date: "2026-03-14", name: "Holi", holiday_type: "national", type: "national", description: "Festival of Colors" },
            { date: "2026-08-15", name: "Independence Day", holiday_type: "national", type: "national", description: "National holiday" },
            { date: "2026-10-02", name: "Gandhi Jayanti", holiday_type: "national", type: "national", description: "National holiday" },
            { date: "2026-10-20", name: "Dussehra", holiday_type: "regional", type: "regional", description: "Festival" },
            { date: "2026-11-09", name: "Diwali", holiday_type: "regional", type: "regional", description: "Festival of Lights" },
            { date: "2026-02-15", name: "Annual Day", holiday_type: "school", type: "school", description: "School Annual Day celebration" },
        ];

        for (const h of holidays) {
            await db.collection("holidays").insertOne({
                school: schoolId,
                ...h,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }
        console.log(`✅ ${holidays.length} holidays created`);

        // ──── Summary ────
        console.log("\n🎉 Database seeded successfully!\n");
        console.log("═══════════════════════════════════════");
        console.log("  LOGIN CREDENTIALS");
        console.log("═══════════════════════════════════════");
        console.log("  Admin:   admin@campusiq.school / admin123");
        console.log("  Teacher: rajesh@campusiq.school / teacher123");
        console.log("  Teacher: priya@campusiq.school / teacher123");
        console.log("  Teacher: anil@campusiq.school / teacher123");
        console.log("═══════════════════════════════════════\n");

        await mongoose.disconnect();
        console.log("✅ Done!");
    } catch (error) {
        console.error("❌ Seed failed:", error);
        process.exit(1);
    }
}

seed();
