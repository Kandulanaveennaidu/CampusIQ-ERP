
const fs = require('fs');

// Helper to parse cookies
function getCookie(res, name) {
    const setCookie = res.headers.get('set-cookie');
    if (!setCookie) return null;
    const match = setCookie.match(new RegExp(`${name}=([^;]+)`));
    return match ? match[1] : null;
}

async function testAttendance() {
    const BASE_URL = 'http://localhost:3000';
    const email = `test.att.${Date.now()}@example.com`;
    const password = 'Password123!';

    console.log('--- STARTING ATTENDANCE MODULE TEST ---');

    // 1. Auth Setup
    console.log(`1. Registering/Logging in as: ${email}`);
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            school_name: 'Att Test School',
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

    // 2. CREATE Student (Needed for attendance)
    console.log('2. Creating Student for Attendance...');
    const newStudent = {
        name: 'Att Student',
        class_name: 'Class 5',
        roll_number: 'ATT001',
        parent_name: 'Parent',
        parent_phone: '1234567890',
        email: `att.stud.${Date.now()}@example.com`,
        address: '456 Lane'
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
        console.error('Create Student failed:', await createRes.text());
        process.exit(1);
    }

    const createData = await createRes.json();
    const studentId = createData.data.student_id;
    console.log(`   Created Student ID: ${studentId}`);

    // 3. MARK ATTENDANCE (POST)
    console.log('3. Marking Attendance...');
    const today = new Date().toISOString().split('T')[0];
    const payload = {
        date: today,
        class_name: 'Class 5',
        records: [
            {
                student_id: studentId,
                status: 'present',
                notes: 'On time'
            }
        ]
    };

    const markRes = await fetch(`${BASE_URL}/api/attendance`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': authCookie
        },
        body: JSON.stringify(payload)
    });

    if (markRes.ok) {
        const markData = await markRes.json();
        if (markData.stats.present === 1) {
            console.log('   ✅ Attendance marked successfully.');
        } else {
            console.error('   ❌ Attendance stats mismatch:', markData);
        }
    } else {
        console.error('   ❌ Mark Attendance failed:', await markRes.text());
    }

    // 4. VERIFY ATTENDANCE (GET)
    console.log('4. Verifying Attendance...');
    const getRes = await fetch(`${BASE_URL}/api/attendance?date=${today}&class_name=Class 5`, {
        headers: { 'Cookie': authCookie }
    });

    if (getRes.ok) {
        const getData = await getRes.json();
        const record = getData.data.find(r => r.student_id === studentId);
        if (record && record.status === 'present') {
            console.log('   ✅ Verified: Student is present.');
        } else {
            console.error('   ❌ Verify failed: Record not found or status mismatch', record);
        }
    } else {
        console.error('   ❌ GET Attendance failed:', await getRes.text());
    }

    // 5. UPDATE ATTENDANCE (POST - Upsert)
    console.log('5. Updating Attendance to Absent...');
    const updatePayload = {
        date: today,
        class_name: 'Class 5',
        records: [
            {
                student_id: studentId,
                status: 'absent',
                notes: 'Sick'
            }
        ]
    };

    const updateRes = await fetch(`${BASE_URL}/api/attendance`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': authCookie
        },
        body: JSON.stringify(updatePayload)
    });

    if (updateRes.ok) {
        console.log('   ✅ Update request successful.');
    } else {
        console.error('   ❌ Update request failed.');
    }

    // 6. VERIFY UPDATE
    console.log('6. Verifying Update...');
    const verifyRes = await fetch(`${BASE_URL}/api/attendance?date=${today}&class_name=Class 5`, {
        headers: { 'Cookie': authCookie }
    });

    if (verifyRes.ok) {
        const verifyData = await verifyRes.json();
        const record = verifyData.data.find(r => r.student_id === studentId);
        if (record && record.status === 'absent') {
            console.log('   ✅ Verified: Student is now absent.');
        } else {
            console.error('   ❌ Verify Update failed:', record);
        }
    }

    console.log('--- ATTENDANCE TEST COMPLETE ---');
}

testAttendance().catch(console.error);
