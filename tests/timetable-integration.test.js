
const fs = require('fs');

// Helper to parse cookies
function getCookie(res, name) {
    const setCookie = res.headers.get('set-cookie');
    if (!setCookie) return null;
    const match = setCookie.match(new RegExp(`${name}=([^;]+)`));
    return match ? match[1] : null;
}

async function testTimetable() {
    const BASE_URL = 'http://localhost:3000';
    const email = `test.time.${Date.now()}@example.com`;
    const password = 'Password123!';

    console.log('--- STARTING TIMETABLE MODULE TEST ---');

    // 1. Auth Setup
    console.log(`1. Registering/Logging in as: ${email}`);
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            school_name: 'Time Test School',
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

    // 2. CREATE TIMETABLE ENTRY
    console.log('2. Creating Timetable Entry (Mon P1)...');
    const entry1 = {
        class_name: 'Class 10',
        day: 'Monday',
        period: 1,
        subject: 'Math',
        teacher_name: 'Mr. Smith',
        start_time: '09:00',
        end_time: '10:00',
        room: '101'
    };

    const createRes = await fetch(`${BASE_URL}/api/timetable`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': authCookie
        },
        body: JSON.stringify(entry1)
    });

    if (createRes.status !== 200) {
        console.error('Create Entry failed:', await createRes.text());
        process.exit(1);
    }

    const createData = await createRes.json();
    const timetableId = createData.data.timetable_id;
    console.log(`   Created Timetable ID: ${timetableId}`);

    // 3. VERIFY ENTRY
    console.log('3. Verifying Entry...');
    const listRes = await fetch(`${BASE_URL}/api/timetable?class=Class 10`, {
        headers: { 'Cookie': authCookie }
    });
    const listData = await listRes.json();
    const entry = listData.data.find(e => e.timetable_id === timetableId);
    if (entry && entry.subject === 'Math') {
        console.log('   ✅ Entry verified.');
    } else {
        console.error('   ❌ Entry not found.');
    }

    // 4. TEST CONFLICT (Same Slot)
    console.log('4. Testing Slot Conflict...');
    const conflictRes = await fetch(`${BASE_URL}/api/timetable`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': authCookie
        },
        body: JSON.stringify(entry1)
    });

    if (conflictRes.status === 409) {
        console.log('   ✅ Conflict detected correctly (409).');
    } else {
        console.error(`   ❌ Conflict check failed. Status: ${conflictRes.status}`);
    }

    // 5. UPDATE ENTRY
    console.log('5. Updating Entry (Subject -> Physics)...');
    const updateRes = await fetch(`${BASE_URL}/api/timetable`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': authCookie
        },
        body: JSON.stringify({
            timetable_id: timetableId,
            subject: 'Physics'
        })
    });

    if (updateRes.ok) {
        console.log('   ✅ Update successful.');
    } else {
        console.error('   ❌ Update failed.');
    }

    // 6. DELETE ENTRY
    console.log('6. Deleting Entry...');
    const deleteRes = await fetch(`${BASE_URL}/api/timetable?timetable_id=${timetableId}`, {
        method: 'DELETE',
        headers: { 'Cookie': authCookie }
    });

    if (deleteRes.ok) {
        console.log('   ✅ Delete successful.');
    } else {
        console.error('   ❌ Delete failed.');
    }

    // 7. VERIFY DELETION
    const verifyRes = await fetch(`${BASE_URL}/api/timetable?class=Class 10`, {
        headers: { 'Cookie': authCookie }
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.data.some(e => e.timetable_id === timetableId)) {
        console.log('   ✅ Verified: Entry deleted.');
    } else {
        console.error('   ❌ Verified: Entry still exists!');
    }

    console.log('--- TIMETABLE TEST COMPLETE ---');
}

testTimetable().catch(console.error);
