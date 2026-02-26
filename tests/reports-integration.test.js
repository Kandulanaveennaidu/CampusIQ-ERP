
const fs = require('fs');

// Helper to parse cookies
function getCookie(res, name) {
    const setCookie = res.headers.get('set-cookie');
    if (!setCookie) return null;
    const match = setCookie.match(new RegExp(`${name}=([^;]+)`));
    return match ? match[1] : null;
}

async function testReports() {
    const BASE_URL = 'http://localhost:3000';
    const email = `test.rep.${Date.now()}@example.com`;
    const password = 'Password123!';

    console.log('--- STARTING REPORTS MODULE TEST ---');

    // 1. Auth Setup
    console.log(`1. Registering/Logging in as: ${email}`);
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            school_name: 'Report Test School',
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

    // 2. Setup Data (Student + Attendance + Fee Payment)
    console.log('2. Setting up data for reports...');

    // Create Student
    const newStudent = {
        name: 'Report Student',
        class_name: 'Class 8',
        roll_number: 'REP001',
        parent_name: 'Parent',
        parent_phone: '1234567890',
        email: `rep.stud.${Date.now()}@example.com`,
        address: '123 Lane'
    };
    const createRes = await fetch(`${BASE_URL}/api/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': authCookie },
        body: JSON.stringify(newStudent)
    });
    const studId = (await createRes.json()).data.student_id;

    // Mark Attendance
    const today = new Date().toISOString().split('T')[0];
    await fetch(`${BASE_URL}/api/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': authCookie },
        body: JSON.stringify({
            date: today,
            class_name: 'Class 8',
            records: [{ student_id: studId, status: 'present' }]
        })
    });

    // Create Fee & Pay
    const feeRes = await fetch(`${BASE_URL}/api/fees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': authCookie },
        body: JSON.stringify({
            action: 'create_structure',
            name: 'Report Fee',
            class_name: 'Class 8',
            academic_year: '2024-2025',
            amount: 500,
            due_date: new Date().toISOString(),
            category: 'tuition',
            description: 'Desc',
            is_recurring: false,
            late_fee_per_day: 0
        })
    });
    const feeId = (await feeRes.json()).data._id;

    const payRes = await fetch(`${BASE_URL}/api/fees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': authCookie },
        body: JSON.stringify({
            action: 'record_payment',
            student_id: studId,
            fee_structure_id: feeId,
            amount: 500,
            payment_method: 'cash',
            paid_by: 'Self',
            discount: 0
        })
    });
    const payId = (await payRes.json()).data._id;

    // 3. TEST MONTHLY REPORT
    console.log('3. Testing Monthly Attendance Report...');
    const monthRes = await fetch(`${BASE_URL}/api/reports/monthly?month=${new Date().getMonth() + 1}&year=${new Date().getFullYear()}&class_name=Class 8`, {
        headers: { 'Cookie': authCookie }
    });

    if (monthRes.ok) {
        const monthData = await monthRes.json();
        if (monthData.data.summary.total_present >= 1) {
            console.log('   ✅ Monthly Data Verified.');
        } else {
            console.error('   ❌ Monthly Data Empty/Incorrect:', monthData);
        }
    } else {
        console.error('   ❌ Monthly Report Failed.');
    }

    // 4. TEST FEE RECEIPT
    console.log('4. Testing Fee Receipt Generation...');
    const receiptRes = await fetch(`${BASE_URL}/api/reports/fee-receipt?payment_id=${payId}`, {
        headers: { 'Cookie': authCookie }
    });

    if (receiptRes.ok) {
        const htmlText = await receiptRes.text();
        if (htmlText.includes('Fee Receipt') && htmlText.includes('Report Student')) {
            console.log('   ✅ Receipt HTML Verified.');
        } else {
            console.error('   ❌ Receipt HTML missing content.');
        }
    } else {
        console.error('   ❌ Receipt Generation Failed.');
    }

    console.log('--- REPORTS TEST COMPLETE ---');
}

testReports().catch(console.error);
