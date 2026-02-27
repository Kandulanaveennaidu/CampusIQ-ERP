
const fs = require('fs');

// Helper to parse cookies
function getCookie(res, name) {
    const setCookie = res.headers.get('set-cookie');
    if (!setCookie) return null;
    const match = setCookie.match(new RegExp(`${name}=([^;]+)`));
    return match ? match[1] : null;
}

async function testTeachers() {
    const BASE_URL = 'http://localhost:3000';
    const email = `test.teach.${Date.now()}@example.com`;
    const password = 'Password123!';

    console.log('--- STARTING TEACHERS MODULE TEST ---');

    // 1. Auth Setup
    console.log(`1. Registering/Logging in as: ${email}`);
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            school_name: 'Teach Test School',
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

    // 2. CREATE Teacher
    console.log('2. Creating Teacher...');
    const newTeacher = {
        name: 'John Doe',
        email: `john.doe.${Date.now()}@example.com`,
        password: 'TeacherPass123!',
        phone: '1234567890',
        subject: 'Math',
        classes: 'Class 10, Class 11',
        salary_per_day: 500
    };

    const createRes = await fetch(`${BASE_URL}/api/teachers`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': authCookie
        },
        body: JSON.stringify(newTeacher)
    });

    if (createRes.status !== 200) { // Note: endpoint returns 200 via manual json response, not 201? code says 200. No wait, lines 80 says 201?
        // Actually implementation lines 138-140 returns default JSON which implies 200 unless param status provided.
        // Wait, let's check code again.
        // return NextResponse.json({...}) defaults to 200.
        console.error('Create failed:', await createRes.text());
        process.exit(1);
    }

    const createData = await createRes.json();
    const teacherId = createData.data.teacher_id;
    console.log(`   Created Teacher ID: ${teacherId}`);

    // 3. READ Teachers
    console.log('3. Reading Teachers...');
    const readRes = await fetch(`${BASE_URL}/api/teachers`, {
        headers: { 'Cookie': authCookie }
    });
    const readData = await readRes.json();
    const createdTeacher = readData.data.find(t => t.teacher_id === teacherId);
    if (createdTeacher) {
        console.log('   ✅ New teacher found in list.');
    } else {
        console.error('   ❌ New teacher NOT found in list.');
    }

    // 4. UPDATE Teacher
    console.log('4. Updating Teacher...');
    const updateRes = await fetch(`${BASE_URL}/api/teachers`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': authCookie
        },
        body: JSON.stringify({
            teacher_id: teacherId,
            name: 'John Doe Updated',
            salary_per_day: 600
        })
    });

    if (updateRes.ok) {
        const updateData = await updateRes.json();
        if (updateData.data.name === 'John Doe Updated' && Number(updateData.data.salary_per_day) === 600) {
            console.log('   ✅ Update successful.');
        } else {
            console.error('   ❌ Update failed verification.');
        }
    } else {
        console.error('   ❌ Update request failed.');
    }

    // 5. DELETE Teacher (Soft Delete)
    console.log('5. Deleting Teacher...');
    const deleteRes = await fetch(`${BASE_URL}/api/teachers?teacher_id=${teacherId}`, {
        method: 'DELETE',
        headers: { 'Cookie': authCookie }
    });

    if (deleteRes.ok) {
        console.log('   ✅ Delete request successful.');
    } else {
        console.error('   ❌ Delete request failed.');
    }

    // 6. VERIFY Deletion (Should be inactive)
    const verifyRes = await fetch(`${BASE_URL}/api/teachers?limit=100`, {
        headers: { 'Cookie': authCookie }
    });
    const verifyData = await verifyRes.json();
    // The GET /api/teachers endpoint returns all teachers matching filter {role: 'teacher'}.
    // It maps status to "active" or "inactive".
    // So the teacher should still be there, but status should be "inactive".

    const deletedTeacher = verifyData.data.find(t => t.teacher_id === teacherId);
    if (deletedTeacher && deletedTeacher.status === 'inactive') {
        console.log('   ✅ Verified: Teacher is marked inactive.');
    } else {
        console.error('   ❌ Verified: Teacher status is NOT inactive:', deletedTeacher);
    }

    console.log('--- TEACHERS TEST COMPLETE ---');
}

testTeachers().catch(console.error);
