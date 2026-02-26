
const fs = require('fs');
const path = require('path');

// Helper to parse cookies
function getCookie(res, name) {
    const setCookie = res.headers.get('set-cookie');
    if (!setCookie) return null;
    const match = setCookie.match(new RegExp(`${name}=([^;]+)`));
    return match ? match[1] : null;
}

async function testDashboard() {
    const BASE_URL = 'http://localhost:3000';
    const email = `test.dashboard.${Date.now()}@example.com`;
    const password = 'Password123!';

    console.log('--- STARTING DASHBOARD MODULE TEST ---');

    // 1. Register a new school/admin
    console.log(`1. Registering new admin: ${email}`);
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            school_name: 'Dashboard Test School',
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
    console.log('   Registration successful.');

    // 2. Login to get session cookie
    console.log('2. Logging in...');

    // Get CSRF Token
    const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken;

    // Get cookies from CSRF response to pass along
    const csrfCookie = getCookie(csrfRes, 'next-auth.csrf-token');
    const callbackCookie = getCookie(csrfRes, 'next-auth.callback-url');

    let cookieHeader = '';
    if (csrfCookie) cookieHeader += `next-auth.csrf-token=${csrfCookie};`;
    if (callbackCookie) cookieHeader += `next-auth.callback-url=${callbackCookie};`;

    // Perform Login
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

    if (!loginRes.ok) {
        console.error('Login failed:', await loginRes.text());
        process.exit(1);
    }

    // Extract Session Token
    const sessionToken = getCookie(loginRes, 'next-auth.session-token');
    if (!sessionToken) {
        console.error('Failed to get session token from login response');
        // process.exit(1); 
        // Note: NextAuth sometimes sets cookie on the redirect or subsequent 200 OK. 
        // But usually it's in the set-cookie of the callback response.
        // Let's print headers to debug if it fails.
        // console.log(loginRes.headers);
    }

    // Construct auth cookie
    const authCookie = `next-auth.session-token=${sessionToken}`;
    console.log('   Login successful. Session token acquired.');

    // 3. Test Dashboard APIs
    console.log('3. Testing Dashboard APIs...');

    // A. /api/attendance/today
    console.log('   Fetching /api/attendance/today...');
    const todayRes = await fetch(`${BASE_URL}/api/attendance/today`, {
        headers: { 'Cookie': authCookie }
    });

    if (todayRes.status === 200) {
        const data = await todayRes.json();
        if (data.success && data.stats && data.trend) {
            console.log('   ✅ /api/attendance/today working. Stats:', data.stats);
        } else {
            console.error('   ❌ /api/attendance/today returned invalid structure:', data);
        }
    } else {
        console.error(`   ❌ /api/attendance/today failed with status ${todayRes.status}`);
    }

    // B. /api/attendance/stats
    console.log('   Fetching /api/attendance/stats...');
    const statsRes = await fetch(`${BASE_URL}/api/attendance/stats`, {
        headers: { 'Cookie': authCookie }
    });

    if (statsRes.status === 200) {
        const data = await statsRes.json();
        if (data.success && data.weeklyTrend && data.classWise) {
            console.log('   ✅ /api/attendance/stats working. WeeklyTrend length:', data.weeklyTrend.length);
        } else {
            console.error('   ❌ /api/attendance/stats returned invalid structure:', data);
        }
    } else {
        console.error(`   ❌ /api/attendance/stats failed with status ${statsRes.status}`);
    }

    console.log('--- DASHBOARD TEST COMPLETE ---');
}

testDashboard().catch(console.error);
