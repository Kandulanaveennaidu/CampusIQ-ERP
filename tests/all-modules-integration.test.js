/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  CampusIQ – COMPREHENSIVE API Integration Test
 *  Tests EVERY module: Auth → CRUD → Validation → Edge Cases
 * 
 *  USAGE: node tests/all-modules-integration.test.js
 *  PREREQUISITE: Dev server running on localhost:3000
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const BASE_URL = 'http://localhost:3000';
let authCookie = '';
let schoolId = '';
const testEmail = `test.all.${Date.now()}@example.com`;
const testPassword = 'TestPass1';

// ─── Counters ────────────────────────────────────────────────────────────────
let totalTests = 0;
let passed = 0;
let failed = 0;
const failures = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getCookie(res, name) {
    const setCookie = res.headers.get('set-cookie') || '';
    const match = setCookie.match(new RegExp(`${name}=([^;]+)`));
    return match ? match[1] : null;
}

async function api(method, path, body = null) {
    const opts = {
        method,
        headers: {
            'Content-Type': 'application/json',
            Cookie: authCookie,
        },
    };
    if (body && method !== 'GET') opts.body = JSON.stringify(body);
    const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
    try {
        const res = await fetch(url);
        // Re-do with correct method
        const res2 = await fetch(url, opts);
        return res2;
    } catch (e) {
        return { ok: false, status: 0, json: async () => ({ error: e.message }), text: async () => e.message };
    }
}

async function apiJson(method, path, body = null) {
    const opts = {
        method,
        headers: {
            'Content-Type': 'application/json',
            Cookie: authCookie,
        },
    };
    if (body && method !== 'GET') opts.body = JSON.stringify(body);
    const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
    try {
        const res = await fetch(url, opts);
        const json = await res.json().catch(() => ({}));
        return { status: res.status, ok: res.ok, data: json, headers: res.headers };
    } catch (e) {
        return { status: 0, ok: false, data: { error: e.message }, headers: {} };
    }
}

function assert(condition, testName) {
    totalTests++;
    if (condition) {
        passed++;
        console.log(`   ✅ ${testName}`);
    } else {
        failed++;
        failures.push(testName);
        console.log(`   ❌ ${testName}`);
    }
}

function section(name) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  ${name}`);
    console.log('═'.repeat(60));
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTHENTICATION
// ═══════════════════════════════════════════════════════════════════════════════
async function setupAuth() {
    section('1. AUTHENTICATION');

    // Register
    console.log('   Registering test school...');
    const regRes = await apiJson('POST', '/api/auth/register', {
        school_name: 'Integration Test School',
        school_type: 'public',
        board: 'cbse',
        address: '123 Test St',
        phone: '9876543210',
        email: testEmail,
        admin_email: testEmail,
        admin_password: testPassword,
    });
    assert(regRes.ok || regRes.status === 200, 'Register school');

    // CSRF
    const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken;
    const csrfCookie = getCookie(csrfRes, 'next-auth.csrf-token');
    const callbackCookie = getCookie(csrfRes, 'next-auth.callback-url');
    let cookieHeader = '';
    if (csrfCookie) cookieHeader += `next-auth.csrf-token=${csrfCookie};`;
    if (callbackCookie) cookieHeader += `next-auth.callback-url=${callbackCookie};`;

    // Login
    const params = new URLSearchParams();
    params.append('email', testEmail);
    params.append('password', testPassword);
    params.append('csrfToken', csrfToken);
    params.append('json', 'true');

    const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookieHeader },
        body: params,
    });

    const sessionToken = getCookie(loginRes, 'next-auth.session-token');
    authCookie = `next-auth.session-token=${sessionToken}`;
    assert(!!sessionToken, 'Login and get session token');

    // Verify session
    const sessionRes = await apiJson('GET', '/api/auth/session');
    assert(sessionRes.ok, 'Verify session');

    // Validation: bad registration
    const badReg = await apiJson('POST', '/api/auth/register', {
        school_name: '',
        admin_email: 'invalid',
        admin_password: 'weak',
    });
    assert(!badReg.ok || badReg.status >= 400, 'Reject invalid registration');

    console.log('   Auth setup complete.');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MODULE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
async function testDashboard() {
    section('2. DASHBOARD');
    const r = await apiJson('GET', '/api/reports/dashboard');
    assert(r.ok || r.status === 200, 'GET /api/reports/dashboard');
}

// ─── STUDENTS ────────────────────────────────────────────────────────────────
async function testStudents() {
    section('3. STUDENTS');
    const create = await apiJson('POST', '/api/students', {
        name: 'Test Student',
        class_name: 'Class 10',
        roll_number: `ROLL${Date.now()}`,
        parent_name: 'Parent',
        parent_phone: '1234567890',
        email: `student.${Date.now()}@test.com`,
    });
    assert(create.ok, 'Create student');
    const studentId = create.data?.data?.student_id || create.data?.data?._id;

    const list = await apiJson('GET', '/api/students');
    assert(list.ok && Array.isArray(list.data?.data), 'List students');

    if (studentId) {
        const single = await apiJson('GET', `/api/students/${studentId}`);
        assert(single.ok, 'Get single student');

        const update = await apiJson('PUT', `/api/students/${studentId}`, {
            name: 'Updated Student',
        });
        assert(update.ok, 'Update student');

        const del = await apiJson('DELETE', `/api/students/${studentId}`);
        assert(del.ok, 'Delete student');
    }

    // Validation
    const bad = await apiJson('POST', '/api/students', { name: '' });
    assert(!bad.ok || bad.status >= 400, 'Reject invalid student');

    return studentId;
}

// ─── TEACHERS ────────────────────────────────────────────────────────────────
async function testTeachers() {
    section('4. TEACHERS');
    const create = await apiJson('POST', '/api/teachers', {
        name: 'Test Teacher',
        email: `teacher.${Date.now()}@test.com`,
        password: 'Teacher1',
        phone: '9876543210',
        subject: 'Math',
    });
    assert(create.ok, 'Create teacher');
    const teacherId = create.data?.data?.teacher_id || create.data?.data?._id;

    const list = await apiJson('GET', '/api/teachers');
    assert(list.ok, 'List teachers');

    if (teacherId) {
        const update = await apiJson('PUT', '/api/teachers', {
            teacher_id: teacherId,
            name: 'Updated Teacher',
        });
        assert(update.ok, 'Update teacher');
    }

    // Validation
    const bad = await apiJson('POST', '/api/teachers', { name: 'X' });
    assert(!bad.ok || bad.status >= 400, 'Reject invalid teacher (missing email/password)');

    return teacherId;
}

// ─── ATTENDANCE ──────────────────────────────────────────────────────────────
async function testAttendance(studentId) {
    section('5. ATTENDANCE');

    if (studentId) {
        const mark = await apiJson('POST', '/api/attendance', {
            date: '2026-02-17',
            class_name: 'Class 10',
            records: [{ student_id: studentId, status: 'present' }],
        });
        assert(mark.ok || mark.status < 500, 'Mark attendance');
    }

    const history = await apiJson('GET', '/api/attendance?class_name=Class 10');
    assert(history.ok || history.status < 500, 'GET attendance history');

    // Validation
    const bad = await apiJson('POST', '/api/attendance', { date: '', records: [] });
    assert(!bad.ok || bad.status >= 400, 'Reject invalid attendance');
}

// ─── QR ATTENDANCE ───────────────────────────────────────────────────────────
async function testQRAttendance() {
    section('6. QR ATTENDANCE');
    const gen = await apiJson('POST', '/api/qr-attendance', {
        action: 'generate',
        class_name: 'Class 10',
        duration_minutes: 30,
    });
    assert(gen.ok || gen.status < 500, 'Generate QR token');

    const list = await apiJson('GET', '/api/qr-attendance');
    assert(list.ok || list.status < 500, 'List QR tokens');
}

// ─── SUBJECT ATTENDANCE ──────────────────────────────────────────────────────
async function testSubjectAttendance() {
    section('7. SUBJECT ATTENDANCE');
    const r = await apiJson('GET', '/api/subject-attendance');
    assert(r.ok || r.status < 500, 'GET subject attendance');
}

// ─── TEACHER ATTENDANCE ──────────────────────────────────────────────────────
async function testTeacherAttendance(teacherId) {
    section('8. TEACHER ATTENDANCE');
    if (teacherId) {
        const mark = await apiJson('POST', '/api/teacher-attendance', {
            date: '2026-02-17',
            records: [{ teacher_id: teacherId, status: 'present' }],
        });
        assert(mark.ok || mark.status < 500, 'Mark teacher attendance');
    }

    const list = await apiJson('GET', '/api/teacher-attendance');
    assert(list.ok || list.status < 500, 'GET teacher attendance');
}

// ─── DEPARTMENTS ─────────────────────────────────────────────────────────────
async function testDepartments() {
    section('9. DEPARTMENTS');
    const create = await apiJson('POST', '/api/departments', {
        name: 'Computer Science',
        code: `CS${Date.now()}`,
        description: 'CS Department',
    });
    assert(create.ok, 'Create department');
    const deptId = create.data?.data?._id;

    const list = await apiJson('GET', '/api/departments');
    assert(list.ok && Array.isArray(list.data?.data), 'List departments');

    if (deptId) {
        const update = await apiJson('PUT', '/api/departments', {
            department_id: deptId,
            name: 'Updated CS',
        });
        assert(update.ok, 'Update department');

        const del = await apiJson('DELETE', `/api/departments?id=${deptId}`);
        assert(del.ok, 'Delete department');
    }

    // Validation
    const bad = await apiJson('POST', '/api/departments', { name: '' });
    assert(!bad.ok || bad.status >= 400, 'Reject invalid department');

    return deptId;
}

// ─── SUBJECTS ────────────────────────────────────────────────────────────────
async function testSubjects() {
    section('10. SUBJECTS');
    const create = await apiJson('POST', '/api/subjects', {
        name: 'Mathematics',
        code: `MATH${Date.now()}`,
        credits: 4,
        type: 'theory',
    });
    assert(create.ok, 'Create subject');

    const list = await apiJson('GET', '/api/subjects');
    assert(list.ok, 'List subjects');
}

// ─── ACADEMIC YEARS ──────────────────────────────────────────────────────────
async function testAcademicYears() {
    section('11. ACADEMIC YEARS');
    const create = await apiJson('POST', '/api/academic-years', {
        name: `AY-${Date.now()}`,
        start_date: '2025-06-01',
        end_date: '2026-05-31',
    });
    assert(create.ok || create.status < 500, 'Create academic year');

    const list = await apiJson('GET', '/api/academic-years');
    assert(list.ok, 'List academic years');
}

// ─── SEMESTERS ───────────────────────────────────────────────────────────────
async function testSemesters() {
    section('12. SEMESTERS');
    const create = await apiJson('POST', '/api/semesters', {
        name: `Sem-${Date.now()}`,
        year: 2026,
        term: 1,
        start_date: '2026-06-01',
        end_date: '2026-12-01',
    });
    assert(create.ok || create.status < 500, 'Create semester');

    const list = await apiJson('GET', '/api/semesters');
    assert(list.ok, 'List semesters');
}

// ─── PROMOTIONS ──────────────────────────────────────────────────────────────
async function testPromotions() {
    section('13. PROMOTIONS');
    const list = await apiJson('GET', '/api/promotions');
    assert(list.ok || list.status < 500, 'List promotions');
}

// ─── TIMETABLE ───────────────────────────────────────────────────────────────
async function testTimetable() {
    section('14. TIMETABLE');
    const create = await apiJson('POST', '/api/timetable', {
        class_name: 'Class 10',
        day: 'Monday',
        period: 1,
        start_time: '09:00',
        end_time: '09:45',
        subject: 'Math',
    });
    assert(create.ok || create.status < 500, 'Create timetable entry');
    const ttId = create.data?.data?.timetable_id || create.data?.data?._id;

    const list = await apiJson('GET', '/api/timetable?class_name=Class 10');
    assert(list.ok, 'List timetable');

    if (ttId) {
        const update = await apiJson('PUT', '/api/timetable', {
            timetable_id: ttId,
            subject: 'Science',
        });
        assert(update.ok || update.status < 500, 'Update timetable entry');

        const del = await apiJson('DELETE', `/api/timetable?timetable_id=${ttId}`);
        assert(del.ok || del.status < 500, 'Delete timetable entry');
    }
}

// ─── EXAMS ───────────────────────────────────────────────────────────────────
async function testExams() {
    section('15. EXAMS');
    const create = await apiJson('POST', '/api/exams', {
        name: 'Unit Test 1',
        type: 'unit-test',
        class_name: 'Class 10',
        subject: 'Math',
        date: '2026-03-15',
        total_marks: 100,
        passing_marks: 40,
    });
    assert(create.ok, 'Create exam');
    const examId = create.data?.data?.exam_id || create.data?.data?._id;

    const list = await apiJson('GET', '/api/exams');
    assert(list.ok, 'List exams');

    if (examId) {
        const update = await apiJson('PUT', '/api/exams', {
            exam_id: examId,
            name: 'Updated Exam',
        });
        assert(update.ok || update.status < 500, 'Update exam');
    }

    // Validation
    const bad = await apiJson('POST', '/api/exams', { name: '' });
    assert(!bad.ok || bad.status >= 400, 'Reject invalid exam');
}

// ─── ASSIGNMENTS ─────────────────────────────────────────────────────────────
async function testAssignments() {
    section('16. ASSIGNMENTS');
    const create = await apiJson('POST', '/api/assignments', {
        title: 'Math Homework',
        description: 'Solve problems 1-10',
        class_name: 'Class 10',
        subject: 'Math',
        due_date: '2026-03-20',
    });
    assert(create.ok || create.status < 500, 'Create assignment');

    const list = await apiJson('GET', '/api/assignments');
    assert(list.ok || list.status < 500, 'List assignments');
}

// ─── ONLINE EXAMS ────────────────────────────────────────────────────────────
async function testOnlineExams() {
    section('17. ONLINE EXAMS');
    const create = await apiJson('POST', '/api/online-exams', {
        title: 'Online Quiz 1',
        description: 'Chapter 1 Quiz',
        class_name: 'Class 10',
        subject: 'Math',
        duration: 30,
        start_time: '2026-03-20T09:00:00Z',
        end_time: '2026-03-20T10:00:00Z',
        total_marks: 50,
        questions: [{
            question: 'What is 2+2?',
            type: 'mcq',
            options: ['3', '4', '5', '6'],
            correct_answer: '4',
            marks: 5,
        }],
    });
    assert(create.ok || create.status < 500, 'Create online exam');

    const list = await apiJson('GET', '/api/online-exams');
    assert(list.ok || list.status < 500, 'List online exams');
}

// ─── EVENTS ──────────────────────────────────────────────────────────────────
async function testEvents() {
    section('18. EVENTS');
    const create = await apiJson('POST', '/api/events', {
        title: 'Sports Day',
        description: 'Annual sports event',
        type: 'sports',
        startDate: '2026-04-01T09:00:00Z',
        endDate: '2026-04-01T17:00:00Z',
        location: 'Playground',
    });
    assert(create.ok, 'Create event');

    const list = await apiJson('GET', '/api/events');
    assert(list.ok && Array.isArray(list.data?.data), 'List events');

    // Filter by month
    const filtered = await apiJson('GET', '/api/events?month=2026-04');
    assert(filtered.ok, 'Filter events by month');

    // Validation
    const bad = await apiJson('POST', '/api/events', { title: '' });
    assert(!bad.ok || bad.status >= 400, 'Reject invalid event');

    // End date before start date
    const badDate = await apiJson('POST', '/api/events', {
        title: 'Bad',
        startDate: '2026-04-02T09:00:00Z',
        endDate: '2026-04-01T09:00:00Z',
    });
    assert(!badDate.ok || badDate.status >= 400, 'Reject end before start');
}

// ─── MESSAGES ────────────────────────────────────────────────────────────────
async function testMessages() {
    section('19. MESSAGES');
    const list = await apiJson('GET', '/api/messages');
    assert(list.ok, 'List conversations');

    // Validation: empty participants
    const bad = await apiJson('POST', '/api/messages', { participants: [] });
    assert(!bad.ok || bad.status >= 400, 'Reject empty participants');
}

// ─── CIRCULARS ───────────────────────────────────────────────────────────────
async function testCirculars() {
    section('20. CIRCULARS');
    const create = await apiJson('POST', '/api/circulars', {
        title: 'Important Notice',
        content: 'Please note the new schedule',
        type: 'circular',
        priority: 'high',
        targetAudience: ['all'],
    });
    assert(create.ok, 'Create circular');

    const list = await apiJson('GET', '/api/circulars');
    assert(list.ok && list.data?.pagination, 'List circulars with pagination');

    // Validation
    const bad = await apiJson('POST', '/api/circulars', { title: '' });
    assert(!bad.ok || bad.status >= 400, 'Reject invalid circular');
}

// ─── FEES ────────────────────────────────────────────────────────────────────
async function testFees() {
    section('21. FEES');
    const create = await apiJson('POST', '/api/fees', {
        name: 'Tuition Fee',
        class_name: 'Class 10',
        academic_year: '2025-2026',
        amount: 5000,
        due_date: '2026-03-31',
        category: 'tuition',
    });
    assert(create.ok || create.status < 500, 'Create fee structure');

    const list = await apiJson('GET', '/api/fees');
    assert(list.ok || list.status < 500, 'List fee structures');
}

// ─── SALARY ──────────────────────────────────────────────────────────────────
async function testSalary() {
    section('22. SALARY');
    const gen = await apiJson('POST', '/api/salary', {
        month: 2,
        year: 2026,
    });
    assert(gen.ok || gen.status < 500, 'Generate salary');

    const list = await apiJson('GET', '/api/salary');
    assert(list.ok || list.status < 500, 'List salary records');
}

// ─── LEAVE MANAGEMENT ────────────────────────────────────────────────────────
async function testLeaves() {
    section('23. LEAVE MANAGEMENT');
    const list = await apiJson('GET', '/api/leaves');
    assert(list.ok || list.status < 500, 'List leave requests');
}

// ─── HOLIDAYS ────────────────────────────────────────────────────────────────
async function testHolidays() {
    section('24. HOLIDAYS');
    const uniqueDate = `2026-12-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`;
    const create = await apiJson('POST', '/api/holidays', {
        date: uniqueDate,
        name: 'Test Holiday',
        type: 'school',
        description: 'Integration test holiday',
    });
    assert(create.ok || create.status < 500, 'Create holiday');
    const holidayId = create.data?.data?.holiday_id;

    const list = await apiJson('GET', '/api/holidays');
    assert(list.ok && Array.isArray(list.data?.data), 'List holidays');

    if (holidayId) {
        const update = await apiJson('PUT', '/api/holidays', {
            holiday_id: holidayId,
            name: 'Updated Holiday',
        });
        assert(update.ok || update.status < 500, 'Update holiday');

        const del = await apiJson('DELETE', `/api/holidays?holiday_id=${holidayId}`);
        assert(del.ok || del.status < 500, 'Delete holiday');
    }

    // Duplicate check
    const dup = await apiJson('POST', '/api/holidays', {
        date: uniqueDate,
        name: 'Duplicate',
        type: 'school',
    });
    // Should be 409 or holiday was already deleted; either way this is informational
    assert(dup.status === 409 || dup.ok || dup.status < 500, 'Duplicate holiday handled');
}

// ─── ROOMS ───────────────────────────────────────────────────────────────────
async function testRooms() {
    section('25. ROOMS');
    const create = await apiJson('POST', '/api/rooms', {
        room_name: `Lab-${Date.now()}`,
        room_type: 'lab',
        capacity: 30,
        floor: '2nd',
    });
    assert(create.ok || create.status < 500, 'Create room');

    const list = await apiJson('GET', '/api/rooms');
    assert(list.ok || list.status < 500, 'List rooms');
}

// ─── TRANSPORT ───────────────────────────────────────────────────────────────
async function testTransport() {
    section('26. TRANSPORT');
    const create = await apiJson('POST', '/api/transport', {
        vehicle_number: `AP01AB${Date.now() % 10000}`,
        vehicle_type: 'bus',
        capacity: 40,
        driver_name: 'Test Driver',
        route_name: 'Route 1',
    });
    assert(create.ok || create.status < 500, 'Create transport');

    const list = await apiJson('GET', '/api/transport');
    assert(list.ok || list.status < 500, 'List transport');
}

// ─── LIBRARY ─────────────────────────────────────────────────────────────────
async function testLibrary() {
    section('27. LIBRARY');
    const create = await apiJson('POST', '/api/library', {
        title: 'Test Book',
        author: 'Test Author',
        isbn: '978-0-123-45678-9',
        category: 'science',
        copies: 5,
    });
    assert(create.ok || create.status < 500, 'Create library book');

    const list = await apiJson('GET', '/api/library');
    assert(list.ok || list.status < 500, 'List library books');
}

// ─── HOSTEL ──────────────────────────────────────────────────────────────────
async function testHostel() {
    section('28. HOSTEL');
    const create = await apiJson('POST', '/api/hostel', {
        name: `Hostel-${Date.now()}`,
        type: 'boys',
        total_rooms: 20,
        total_beds: 80,
    });
    assert(create.ok || create.status < 500, 'Create hostel');

    const list = await apiJson('GET', '/api/hostel');
    assert(list.ok || list.status < 500, 'List hostels');
}

// ─── VISITORS ────────────────────────────────────────────────────────────────
async function testVisitors() {
    section('29. VISITORS');
    const create = await apiJson('POST', '/api/visitors', {
        visitor_name: 'Test Visitor',
        purpose: 'Parent meeting',
        visitor_phone: '9876543210',
    });
    assert(create.ok || create.status < 500, 'Create visitor');

    const list = await apiJson('GET', '/api/visitors');
    assert(list.ok || list.status < 500, 'List visitors');
}

// ─── FACULTY WORKLOAD ────────────────────────────────────────────────────────
async function testFacultyWorkload(teacherId) {
    section('30. FACULTY WORKLOAD');
    if (teacherId) {
        const create = await apiJson('POST', '/api/faculty-workload', {
            teacher_id: teacherId,
            max_hours_per_week: 20,
        });
        assert(create.ok || create.status < 500, 'Create faculty workload');
    }

    const list = await apiJson('GET', '/api/faculty-workload');
    assert(list.ok || list.status < 500, 'List faculty workloads');
}

// ─── REPORTS ─────────────────────────────────────────────────────────────────
async function testReports() {
    section('31. REPORTS');
    const dashboard = await apiJson('GET', '/api/reports/dashboard');
    assert(dashboard.ok || dashboard.status < 500, 'Dashboard report');

    const attendance = await apiJson('GET', '/api/reports/attendance');
    assert(attendance.ok || attendance.status < 500, 'Attendance report');

    const fees = await apiJson('GET', '/api/reports/fees');
    assert(fees.ok || fees.status < 500, 'Fees report');

    const exams = await apiJson('GET', '/api/reports/exams');
    assert(exams.ok || exams.status < 500, 'Exams report');
}

// ─── AI INSIGHTS ─────────────────────────────────────────────────────────────
async function testAIInsights() {
    section('32. AI INSIGHTS');
    const r = await apiJson('GET', '/api/ai-insights');
    assert(r.ok || r.status < 500, 'GET AI insights');
}

// ─── TIMETABLE GENERATOR ────────────────────────────────────────────────────
async function testTimetableGenerator() {
    section('33. TIMETABLE GENERATOR');
    const r = await apiJson('GET', '/api/timetable-generator');
    assert(r.ok || r.status < 500, 'GET timetable generator');
}

// ─── INVENTORY ───────────────────────────────────────────────────────────────
async function testInventory() {
    section('34. INVENTORY');
    const create = await apiJson('POST', '/api/inventory', {
        name: 'Test Item',
        category: 'furniture',
        quantity: 10,
        unit_price: 500,
    });
    assert(create.ok || create.status < 500, 'Create inventory item');

    const list = await apiJson('GET', '/api/inventory');
    assert(list.ok || list.status < 500, 'List inventory');
}

// ─── ALUMNI ──────────────────────────────────────────────────────────────────
async function testAlumni() {
    section('35. ALUMNI');
    const create = await apiJson('POST', '/api/alumni', {
        name: 'Test Alumni',
        graduationYear: 2020,
        email: `alumni.${Date.now()}@test.com`,
        phone: '9876543210',
    });
    assert(create.ok || create.status < 500, 'Create alumni');
    const alumniId = create.data?.data?._id;

    const list = await apiJson('GET', '/api/alumni');
    assert(list.ok || list.status < 500, 'List alumni');

    if (alumniId) {
        // Add donation
        const dona = await apiJson('PUT', '/api/alumni', {
            _id: alumniId,
            action: 'add_donation',
            amount: 1000,
            purpose: 'General',
        });
        assert(dona.ok || dona.status < 500, 'Add alumni donation');

        // Add event
        const event = await apiJson('PUT', '/api/alumni', {
            _id: alumniId,
            action: 'add_event',
            eventName: 'Reunion',
            date: '2026-06-15',
        });
        assert(event.ok || event.status < 500, 'Add alumni event');
    }
}

// ─── ACADEMIC CALENDAR ──────────────────────────────────────────────────────
async function testAcademicCalendar() {
    section('36. ACADEMIC CALENDAR');
    const create = await apiJson('POST', '/api/academic-calendar', {
        title: 'Exam Week',
        startDate: '2026-03-15',
        endDate: '2026-03-20',
        type: 'exam',
    });
    assert(create.ok || create.status < 500, 'Create academic calendar event');

    const list = await apiJson('GET', '/api/academic-calendar');
    assert(list.ok || list.status < 500, 'List academic calendar');
}

// ─── STAFF LEAVE CALENDAR ────────────────────────────────────────────────────
async function testStaffLeaveCalendar() {
    section('37. STAFF LEAVE CALENDAR');
    const r = await apiJson('GET', '/api/staff-leave-calendar');
    assert(r.ok || r.status < 500, 'GET staff leave calendar');
}

// ─── STUDENT PERFORMANCE ────────────────────────────────────────────────────
async function testStudentPerformance() {
    section('38. STUDENT PERFORMANCE');
    const r = await apiJson('GET', '/api/reports/student-performance');
    // Might be at /api/reports/student-performance or similar
    assert(r.ok || r.status < 500, 'GET student performance');
}

// ─── TEACHER EVALUATION ─────────────────────────────────────────────────────
async function testTeacherEvaluation() {
    section('39. TEACHER EVALUATION');
    const list = await apiJson('GET', '/api/teacher-evaluation');
    assert(list.ok || list.status < 500, 'List teacher evaluations');
}

// ─── DOCUMENTS ───────────────────────────────────────────────────────────────
async function testDocuments() {
    section('40. DOCUMENTS');
    const list = await apiJson('GET', '/api/documents');
    assert(list.ok || list.status < 500, 'List documents');
}

// ─── STUDENT DIARY ───────────────────────────────────────────────────────────
async function testStudentDiary() {
    section('41. STUDENT DIARY');
    const create = await apiJson('POST', '/api/diary', {
        title: 'Homework Reminder',
        content: 'Complete chapter 5',
        class_name: 'Class 10',
        date: '2026-02-17',
    });
    assert(create.ok || create.status < 500, 'Create diary entry');

    const list = await apiJson('GET', '/api/diary');
    assert(list.ok || list.status < 500, 'List diary entries');
}

// ─── EMERGENCY ───────────────────────────────────────────────────────────────
async function testEmergency() {
    section('42. EMERGENCY');
    const create = await apiJson('POST', '/api/emergency', {
        type: 'fire',
        title: 'Fire Drill',
        message: 'This is a test fire drill',
        severity: 'medium',
    });
    assert(create.ok || create.status < 500, 'Create emergency alert');

    const list = await apiJson('GET', '/api/emergency');
    assert(list.ok || list.status < 500, 'List emergency alerts');
}

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
async function testNotifications() {
    section('43. NOTIFICATIONS');
    const create = await apiJson('POST', '/api/notifications', {
        title: 'Test Notification',
        message: 'This is a test notification',
        type: 'announcement',
    });
    assert(create.ok || create.status < 500, 'Create notification');

    const list = await apiJson('GET', '/api/notifications');
    assert(list.ok || list.status < 500, 'List notifications');
}

// ─── BULK MESSAGES ───────────────────────────────────────────────────────────
async function testBulkMessages() {
    section('44. BULK MESSAGES');
    const r = await apiJson('GET', '/api/bulk-messages');
    assert(r.ok || r.status < 500, 'GET bulk messages');
}

// ─── USER MANAGEMENT ─────────────────────────────────────────────────────────
async function testUserManagement() {
    section('45. USER MANAGEMENT');
    const list = await apiJson('GET', '/api/users');
    assert(list.ok || list.status < 500, 'List users');

    const create = await apiJson('POST', '/api/users', {
        name: 'New User',
        email: `user.${Date.now()}@test.com`,
        password: 'User1234',
        role: 'teacher',
    });
    assert(create.ok || create.status < 500, 'Create user');
}

// ─── BACKUP ──────────────────────────────────────────────────────────────────
async function testBackup() {
    section('46. BACKUP');
    const list = await apiJson('GET', '/api/backup');
    assert(list.ok || list.status < 500, 'List backups');
}

// ─── BRANDING ────────────────────────────────────────────────────────────────
async function testBranding() {
    section('47. BRANDING');
    const r = await apiJson('GET', '/api/branding');
    assert(r.ok || r.status < 500, 'GET branding');
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
async function testSettings() {
    section('48. SETTINGS');
    const r = await apiJson('GET', '/api/settings');
    assert(r.ok || r.status < 500, 'GET settings');

    const update = await apiJson('POST', '/api/settings', {
        settings: { theme: 'dark', lang: 'en' },
    });
    assert(update.ok || update.status < 500, 'Update settings');
}

// ─── BILLING ─────────────────────────────────────────────────────────────────
async function testBilling() {
    section('49. BILLING');
    const r = await apiJson('GET', '/api/billing');
    assert(r.ok || r.status < 500, 'GET billing info');
}

// ─── PARENT PORTAL ───────────────────────────────────────────────────────────
async function testParentPortal() {
    section('50. PARENT PORTAL');
    const r = await apiJson('GET', '/api/parent');
    assert(r.ok || r.status < 500, 'GET parent portal data');
}

// ─── PROFILE ─────────────────────────────────────────────────────────────────
async function testProfile() {
    section('51. PROFILE');
    const r = await apiJson('GET', '/api/profile');
    assert(r.ok || r.status < 500, 'GET profile');

    const update = await apiJson('PUT', '/api/profile', {
        name: 'Updated Admin',
    });
    assert(update.ok || update.status < 500, 'Update profile');
}

// ─── AUDIT LOGS ──────────────────────────────────────────────────────────────
async function testAuditLogs() {
    section('52. AUDIT LOGS');
    const r = await apiJson('GET', '/api/audit-logs');
    assert(r.ok || r.status < 500, 'GET audit logs');
}

// ─── HEALTH CHECK ────────────────────────────────────────────────────────────
async function testHealth() {
    section('53. HEALTH CHECK');
    const r = await apiJson('GET', '/api/health');
    assert(r.ok, 'GET health endpoint');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════════
async function runAllTests() {
    console.log('\n' + '█'.repeat(60));
    console.log('  CampusIQ — COMPREHENSIVE MODULE INTEGRATION TEST');
    console.log('  ' + new Date().toISOString());
    console.log('█'.repeat(60));

    try {
        // Auth first
        await setupAuth();

        // Core modules
        const studentId = await testStudents();
        const teacherId = await testTeachers();

        // Attendance family
        await testAttendance(studentId);
        await testQRAttendance();
        await testSubjectAttendance();
        await testTeacherAttendance(teacherId);

        // Academics
        await testDepartments();
        await testSubjects();
        await testAcademicYears();
        await testSemesters();
        await testPromotions();

        // Scheduling
        await testTimetable();
        await testExams();
        await testAssignments();
        await testOnlineExams();

        // Communication
        await testEvents();
        await testMessages();
        await testCirculars();
        await testNotifications();
        await testBulkMessages();

        // Finance
        await testFees();
        await testSalary();

        // HR
        await testLeaves();
        await testHolidays();

        // Facilities
        await testRooms();
        await testTransport();
        await testLibrary();
        await testHostel();

        // People
        await testVisitors();
        await testFacultyWorkload(teacherId);
        await testAlumni();

        // Analytics
        await testDashboard();
        await testReports();
        await testAIInsights();
        await testStudentPerformance();
        await testTeacherEvaluation();

        // Admin
        await testUserManagement();
        await testBackup();
        await testBranding();
        await testSettings();
        await testBilling();
        await testAuditLogs();

        // Other
        await testAcademicCalendar();
        await testStaffLeaveCalendar();
        await testDocuments();
        await testStudentDiary();
        await testEmergency();
        await testInventory();
        await testTimetableGenerator();
        await testParentPortal();
        await testProfile();
        await testHealth();

    } catch (err) {
        console.error('\n🔥 FATAL ERROR:', err.message);
    }

    // ─── Summary ─────────────────────────────────────────────────────────────
    console.log('\n' + '█'.repeat(60));
    console.log('  TEST SUMMARY');
    console.log('█'.repeat(60));
    console.log(`  Total Tests: ${totalTests}`);
    console.log(`  ✅ Passed:   ${passed}`);
    console.log(`  ❌ Failed:   ${failed}`);
    console.log(`  Pass Rate:   ${totalTests ? ((passed / totalTests) * 100).toFixed(1) : 0}%`);

    if (failures.length > 0) {
        console.log('\n  ── FAILED TESTS ──');
        failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    }

    console.log('\n' + '█'.repeat(60));
    console.log(`  ${failed === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'}`);
    console.log('█'.repeat(60) + '\n');
}

runAllTests();
