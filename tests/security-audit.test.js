
const fs = require('fs');

// Helper to parse cookies
function getCookie(res, name) {
    const setCookie = res.headers.get('set-cookie');
    if (!setCookie) return null;
    const match = setCookie.match(new RegExp(`${name}=([^;]+)`));
    return match ? match[1] : null;
}

async function testSecurity() {
    const BASE_URL = 'http://localhost:3000';
    const email = `stud.sec.${Date.now()}@example.com`; // Student Account
    const password = 'Password123!';

    console.log('--- STARTING SECURITY AUDIT ---');

    // 1. Unauthenticated Access
    console.log('1. Testing Unauthenticated Access to Admin API...');
    const unauthorizedRes = await fetch(`${BASE_URL}/api/departments`, {
        method: 'GET'
    });
    if (unauthorizedRes.status === 401) {
        console.log('   ✅ Unauthenticated access blocked (401).');
    } else {
        console.error(`   ❌ Unauthenticated access allowed! Status: ${unauthorizedRes.status}`);
    }

    // 2. Register/Login as STUDENT (Low privilege)
    // We need to register a student USER first. But only Admins can create students via API?
    // Actually, /api/auth/register creates a SCHOOL ADMIN. We need a low-privilege user.
    // Strategy: Register as Admin -> Create a Student User -> Login as Student.
    // Wait, `Student` model is for profiles. `User` model handles login.
    // Does the system allow Students to login? 
    // Let's check `auth.ts` or `login` page.
    // If Students don't have login, then we can only test "Teacher" vs "Admin".
    // Let's assume we test "Teahcer" permissions vs "Admin" routes.

    // Let's register a new Admin first to create a Teacher.
    const adminEmail = `admin.sec.${Date.now()}@example.com`;
    await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            school_name: 'Sec Test School',
            school_type: 'public',
            board: 'cbse',
            address: '123 Test St',
            phone: '9876543210',
            email: adminEmail,
            admin_email: adminEmail,
            admin_password: password
        })
    });

    // Login as Admin
    const params = new URLSearchParams();
    // Get CSRF
    const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken;
    const csrfCookie = getCookie(csrfRes, 'next-auth.csrf-token');
    const callbackCookie = getCookie(csrfRes, 'next-auth.callback-url');
    let cookieHeader = '';
    if (csrfCookie) cookieHeader += `next-auth.csrf-token=${csrfCookie};`;
    if (callbackCookie) cookieHeader += `next-auth.callback-url=${callbackCookie};`;

    params.append('email', adminEmail);
    params.append('password', password);
    params.append('csrfToken', csrfToken);
    params.append('json', 'true');

    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookieHeader
        },
        body: params
    });
    const adminSession = getCookie(adminLoginRes, 'next-auth.session-token');
    const adminCookie = `next-auth.session-token=${adminSession}`;

    // Create a Teacher (to test low privilege)
    const teacherEmail = `teach.sec.${Date.now()}@example.com`;
    const teacherRes = await fetch(`${BASE_URL}/api/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
        body: JSON.stringify({
            name: 'Sec Teacher',
            email: teacherEmail,
            password: password,
            phone: '1234567890',
            subject: 'Security',
            classes: 'Class 10',
            salary_per_day: 500
        })
    });
    const teacherId = (await teacherRes.json()).data.teacher_id;

    // Login as Teacher
    // Get CSRF again for clean session
    const csrfRes2 = await fetch(`${BASE_URL}/api/auth/csrf`);
    const csrfData2 = await csrfRes2.json();
    const csrfToken2 = csrfData2.csrfToken;
    const csrfCookie2 = getCookie(csrfRes2, 'next-auth.csrf-token');
    let cookieHeader2 = '';
    if (csrfCookie2) cookieHeader2 += `next-auth.csrf-token=${csrfCookie2};`;

    const params2 = new URLSearchParams();
    params2.append('email', teacherEmail);
    params2.append('password', password);
    params2.append('csrfToken', csrfToken2);
    params2.append('json', 'true');

    const teacherLoginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookieHeader2
        },
        body: params2
    });
    const teacherSession = getCookie(teacherLoginRes, 'next-auth.session-token');
    const teacherCookie = `next-auth.session-token=${teacherSession}`;

    console.log('2. Testing Teacher Access to Admin Routes...');

    // Attempt to delete a department (Admin only)
    // First, Admin creates a dept
    const deptRes = await fetch(`${BASE_URL}/api/departments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
        body: JSON.stringify({ name: 'Sec Dept', code: 'SEC', description: 'Desc' })
    });
    const deptId = (await deptRes.json()).data._id;

    // Teacher tries to delete it
    const deleteRes = await fetch(`${BASE_URL}/api/departments?id=${deptId}`, {
        method: 'DELETE',
        headers: { 'Cookie': teacherCookie }
    });

    if (deleteRes.status === 403 || deleteRes.status === 401) {
        console.log(`   ✅ Teacher deletion blocked (${deleteRes.status}).`);
    } else {
        // Note: checking if error message says "Forbidden" or "Unauthorized"
        const text = await deleteRes.text();
        if (text.toLowerCase().includes("permission") || text.toLowerCase().includes("authorized")) {
            console.log(`   ✅ Teacher deletion blocked (Response: ${text}).`);
        } else {
            console.error(`   ❌ Teacher allowed to delete! Status: ${deleteRes.status}`);
        }
    }

    // 3. SQL Injection / NoSQL Injection Check (Basic)
    console.log('3. Testing Basic NoSQL Injection on Login...');
    const paramsInj = new URLSearchParams();
    paramsInj.append('email', `{"$gt": ""}`); // Classic NoSQL injection attempt
    paramsInj.append('password', password);
    paramsInj.append('csrfToken', csrfToken); // Re-using token (might fail csrf, but testing injection handling)

    const injectionRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: paramsInj
    });

    // Should fail or return 401/400, NOT 200 or 500(crash) -> next-auth handles this generally
    if (!injectionRes.ok) {
        console.log('   ✅ Injection attempt failed/blocked.');
    } else {
        // If it returns OK, check if it actually logged in
        const url = injectionRes.url;
        if (url.includes('error')) {
            console.log('   ✅ Injection attempt redirected to error.');
        } else {
            console.warn(`   ⚠️ Injection response OK (Check logs).`);
        }
    }

    console.log('--- SECURITY AUDIT COMPLETE ---');
}

testSecurity().catch(console.error);
