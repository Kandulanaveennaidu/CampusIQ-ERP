
const fs = require('fs');

// Helper to parse cookies
function getCookie(res, name) {
    const setCookie = res.headers.get('set-cookie');
    if (!setCookie) return null;
    const match = setCookie.match(new RegExp(`${name}=([^;]+)`));
    return match ? match[1] : null;
}

async function testSubjects() {
    const BASE_URL = 'http://localhost:3000';
    const email = `test.sub.${Date.now()}@example.com`;
    const password = 'Password123!';

    console.log('--- STARTING SUBJECTS MODULE TEST ---');

    // 1. Auth Setup
    console.log(`1. Registering/Logging in as: ${email}`);
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            school_name: 'Sub Test School',
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

    // 2. CREATE Subject
    console.log('2. Creating Subject...');
    const newSub = {
        name: 'Mathematics',
        code: 'MAT101',
        credits: 4,
        type: 'theory',
        semester: 1,
        class_name: 'Class 10',
        max_students: 40
    };

    const createRes = await fetch(`${BASE_URL}/api/subjects`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': authCookie
        },
        body: JSON.stringify(newSub)
    });

    if (createRes.status !== 201) {
        console.error('Create failed:', await createRes.text());
        process.exit(1);
    }

    const createData = await createRes.json();
    const subId = createData.data._id;
    console.log(`   Created Subject ID: ${subId}`);

    // 3. READ Subjects
    console.log('3. Reading Subjects...');
    const readRes = await fetch(`${BASE_URL}/api/subjects`, {
        headers: { 'Cookie': authCookie }
    });
    const readData = await readRes.json();
    const createdSub = readData.data.find(s => s._id === subId);
    if (createdSub) {
        console.log('   ✅ New subject found in list.');
    } else {
        console.error('   ❌ New subject NOT found in list.');
    }

    // 4. UPDATE Subject
    console.log('4. Updating Subject...');
    const updateRes = await fetch(`${BASE_URL}/api/subjects`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': authCookie
        },
        body: JSON.stringify({
            subject_id: subId,
            name: 'Advanced Mathematics',
            credits: 5
        })
    });

    if (updateRes.ok) {
        const updateData = await updateRes.json();
        if (updateData.data.name === 'Advanced Mathematics' && updateData.data.credits === 5) {
            console.log('   ✅ Update successful.');
        } else {
            console.error('   ❌ Update failed verification.');
        }
    } else {
        console.error('   ❌ Update request failed.');
    }

    // 5. DELETE Subject (Soft Delete)
    console.log('5. Deleting Subject...');
    const deleteRes = await fetch(`${BASE_URL}/api/subjects?subject_id=${subId}`, {
        method: 'DELETE',
        headers: { 'Cookie': authCookie }
    });

    if (deleteRes.ok) {
        console.log('   ✅ Delete request successful.');
    } else {
        console.error('   ❌ Delete request failed.');
    }

    // 6. VERIFY Deletion (Should be inactive)
    const verifyRes = await fetch(`${BASE_URL}/api/subjects`, {
        headers: { 'Cookie': authCookie }
    });
    const verifyData = await verifyRes.json();
    // Default GET query uses status: "active", so it should NOT be in the list
    if (!verifyData.data.some(s => s._id === subId)) {
        console.log('   ✅ Verified: Subject is gone from active list.');
    } else {
        console.error('   ❌ Verified: Subject still exists in active list!');
    }

    console.log('--- SUBJECTS TEST COMPLETE ---');
}

testSubjects().catch(console.error);
