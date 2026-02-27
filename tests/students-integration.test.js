
const fs = require('fs');

// Helper to parse cookies
function getCookie(res, name) {
    const setCookie = res.headers.get('set-cookie');
    if (!setCookie) return null;
    const match = setCookie.match(new RegExp(`${name}=([^;]+)`));
    return match ? match[1] : null;
}

async function testStudents() {
    const BASE_URL = 'http://localhost:3000';
    const email = `test.stud.${Date.now()}@example.com`;
    const password = 'Password123!';

    console.log('--- STARTING STUDENTS MODULE TEST ---');

    // 1. Auth Setup
    console.log(`1. Registering/Logging in as: ${email}`);
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            school_name: 'Stud Test School',
            school_type: 'public',
            board: 'cbse',
            address: '123 Test St',
            phone: '9876543210',
            email: email,
            admin_email: email,
            admin_password: password
        })
    });

    if (!regRes.ok) {
        console.error('Registration failed:', await regRes.text());
        process.exit(1);
    }

    // csrf
    const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken;
    const csrfCookie = getCookie(csrfRes, 'next-auth.csrf-token');
    const callbackCookie = getCookie(csrfRes, 'next-auth.callback-url');
    let cookieHeader = '';
    if (csrfCookie) cookieHeader += `next-auth.csrf-token=${csrfCookie};`;
    if (callbackCookie) cookieHeader += `next-auth.callback-url=${callbackCookie};`;

    // login
    const params = new URLSearchParams();
    params.append('email', email);
    params.append('password', password);
    params.append('csrfToken', csrfToken);
    params.append('json', 'true');

    const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookieHeader
        },
        body: params
    });

    if (!loginRes.ok) throw new Error('Login failed');
    const sessionToken = getCookie(loginRes, 'next-auth.session-token');
    const authCookie = `next-auth.session-token=${sessionToken}`;
    console.log('   Login successful.');

    // 2. CREATE Student
    console.log('2. Creating Student...');
    const newStudent = {
        name: 'Alice Smith',
        class_name: 'Class 12',
        roll_number: 'ROLL001',
        parent_name: 'Bob Smith',
        parent_phone: '1234567890',
        email: `alice.${Date.now()}@example.com`,
        address: '456 Student Ln'
    };

    const createRes = await fetch(`${BASE_URL}/api/students`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': authCookie
        },
        body: JSON.stringify(newStudent)
    });

    if (createRes.status !== 200) {
        console.error('Create failed:', await createRes.text());
        process.exit(1);
    }

    const createData = await createRes.json();
    const studentId = createData.data.student_id;
    console.log(`   Created Student ID: ${studentId}`);

    // 3. READ Students List
    console.log('3. Reading Students List...');
    const readRes = await fetch(`${BASE_URL}/api/students`, {
        headers: { 'Cookie': authCookie }
    });
    const readData = await readRes.json();
    const createdStudent = readData.data.find(s => s.student_id === studentId);
    if (createdStudent) {
        console.log('   ✅ New student found in list.');
    } else {
        console.error('   ❌ New student NOT found in list.');
    }

    // 4. READ Single Student
    console.log('4. Reading Single Student...');
    const singleRes = await fetch(`${BASE_URL}/api/students/${studentId}`, {
        headers: { 'Cookie': authCookie }
    });
    const singleData = await singleRes.json();
    if (singleData.data.name === 'Alice Smith') {
        console.log('   ✅ verified detail view.');
    } else {
        console.error('   ❌ failed detail view verification.');
    }

    // 5. UPDATE Student
    console.log('5. Updating Student...');
    const updateRes = await fetch(`${BASE_URL}/api/students/${studentId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': authCookie
        },
        body: JSON.stringify({
            name: 'Alice Smith-Jones'
        })
    });

    if (updateRes.ok) {
        const updateData = await updateRes.json();
        if (updateData.data.name === 'Alice Smith-Jones') {
            console.log('   ✅ Update successful.');
        } else {
            console.error('   ❌ Update failed verification.');
        }
    } else {
        console.error('   ❌ Update request failed.');
    }

    // 6. DELETE Student (Soft Delete)
    console.log('6. Deleting Student...');
    const deleteRes = await fetch(`${BASE_URL}/api/students/${studentId}`, {
        method: 'DELETE',
        headers: { 'Cookie': authCookie }
    });

    if (deleteRes.ok) {
        console.log('   ✅ Delete request successful.');
    } else {
        console.error('   ❌ Delete request failed.');
    }

    // 7. VERIFY Deletion
    const verifyRes = await fetch(`${BASE_URL}/api/students`, {
        headers: { 'Cookie': authCookie }
    });
    const verifyData = await verifyRes.json();
    // Default GET query uses status: "active"
    if (!verifyData.data.some(s => s.student_id === studentId)) {
        console.log('   ✅ Verified: Student is gone from active list.');
    } else {
        console.error('   ❌ Verified: Student still exists in active list!');
    }

    console.log('--- STUDENTS TEST COMPLETE ---');
}

testStudents().catch(console.error);
