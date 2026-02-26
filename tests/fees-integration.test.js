
const fs = require('fs');

// Helper to parse cookies
function getCookie(res, name) {
    const setCookie = res.headers.get('set-cookie');
    if (!setCookie) return null;
    const match = setCookie.match(new RegExp(`${name}=([^;]+)`));
    return match ? match[1] : null;
}

async function testFees() {
    const BASE_URL = 'http://localhost:3000';
    const email = `test.fee.${Date.now()}@example.com`;
    const password = 'Password123!';

    console.log('--- STARTING FEES MODULE TEST ---');

    // 1. Auth Setup
    console.log(`1. Registering/Logging in as: ${email}`);
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            school_name: 'Fee Test School',
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

    // 2. CREATE Student (Eligible for fee)
    console.log('2. Creating Student in Class 10...');
    const newStudent = {
        name: 'Fee Student',
        class_name: 'Class 10',
        roll_number: 'FEE001',
        parent_name: 'Payer',
        parent_phone: '1234567890',
        email: `fee.stud.${Date.now()}@example.com`,
        address: '789 Rich St'
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

    // 3. CREATE FEE STRUCTURE
    console.log('3. Creating Fee Structure for Class 10...');
    const feeStructure = {
        action: 'create_structure',
        name: 'Term 1 Fee',
        class_name: 'Class 10',
        academic_year: '2024-2025',
        amount: 1000,
        due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        category: 'tuition',
        description: 'First Term',
        is_recurring: false,
        late_fee_per_day: 50
    };

    const structRes = await fetch(`${BASE_URL}/api/fees`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': authCookie
        },
        body: JSON.stringify(feeStructure)
    });

    if (structRes.status !== 201) {
        console.error('Create Fee Structure failed:', await structRes.text());
        process.exit(1);
    }

    const structData = await structRes.json();
    const structureId = structData.data._id;
    console.log(`   Created Fee Structure ID: ${structureId}`);

    // 4. RECORD PAYMENT (Partial)
    console.log('4. Recording Partial Payment (500)...');
    const payment1 = {
        action: 'record_payment',
        student_id: studentId,
        fee_structure_id: structureId,
        amount: 500,
        payment_method: 'cash',
        paid_by: 'Parent',
        discount: 0,
        notes: 'Partial payment'
    };

    const pay1Res = await fetch(`${BASE_URL}/api/fees`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': authCookie
        },
        body: JSON.stringify(payment1)
    });

    if (pay1Res.status === 201) {
        const pay1Data = await pay1Res.json();
        if (pay1Data.data.status === 'partial' && pay1Data.data.balanceDue === 500) {
            console.log(`   ✅ Partial payment successful. Receipt: ${pay1Data.receipt_number}`);
        } else {
            console.error('   ❌ Partial payment status mismatch:', pay1Data);
        }
    } else {
        console.error('   ❌ Partial Payment failed:', await pay1Res.text());
    }

    // 5. VERIFY PAYMENT RECORD
    console.log('5. Verifying Payment Record...');
    const listRes = await fetch(`${BASE_URL}/api/fees?type=payments&student_id=${studentId}`, {
        headers: { 'Cookie': authCookie }
    });
    const listData = await listRes.json();
    if (listData.data.length > 0) {
        console.log(`   ✅ Found ${listData.data.length} payment records.`);
    } else {
        console.error('   ❌ No payment records found.');
    }

    // 6. COMPLETE PAYMENT
    console.log('6. Completing Payment (Remaining 500)...');
    const payment2 = {
        action: 'record_payment',
        student_id: studentId,
        fee_structure_id: structureId,
        amount: 500,
        payment_method: 'upi',
        paid_by: 'Parent',
        discount: 0,
        notes: 'Final payment'
    };

    const pay2Res = await fetch(`${BASE_URL}/api/fees`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': authCookie
        },
        body: JSON.stringify(payment2)
    });

    if (pay2Res.status === 201) {
        const pay2Data = await pay2Res.json();
        // Logic note: A second payment is a NEW record. It doesn't update the old one.
        // However, the backend calculates 'balanceDue' based on (Total Amount - Current Payment). 
        // Wait, let's re-read the code.
        // Line 246: const balanceDue = totalAmount - parsed.data.amount;
        // It does NOT seem to sum up previous payments for the same structure! 
        // This looks like a logical bug in the backend unless I missed something.
        // Let's verify this behavior. If it's a bug, I should report it.
        // Code check:
        // const totalAmount = feeStructure.amount + lateFee - parsed.data.discount;
        // const balanceDue = totalAmount - parsed.data.amount;
        // YES, it ignores previous payments! 
        // So if fee is 1000, and I pay 500. Balance is 500.
        // If I pay another 500. Balance is calculated as (1000 - 500) = 500 again!
        // It should be (Total - (Sum of all payments including this one)).

        // I will proceed with the test to CONFIRM this bug.
        console.log('   --- INSPECTING BALANCE LOGIC ---');
        console.log(`   Payment 2 Balance Due Recieved: ${pay2Data.data.balanceDue}`);
        if (pay2Data.data.balanceDue === 0) {
            console.log('   ✅ Balance logic seems correct (maybe I misread code).');
        } else {
            console.log('   ⚠️ POTENTIAL BUG: Balance does not account for previous payments.');
        }
    } else {
        console.error('   ❌ Payment 2 failed.');
    }

    console.log('--- FEES TEST COMPLETE ---');
}

testFees().catch(console.error);
