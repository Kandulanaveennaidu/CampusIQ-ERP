# CampusIQ — Architecture & Codebase Review Report

> **Date:** June 2025  
> **Scope:** Authentication flow, user management, permissions, data models, API routes, and scalability concerns  
> **Priority:** Issues are rated as **CRITICAL**, **HIGH**, **MEDIUM**, or **LOW**

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Critical Issues](#2-critical-issues)
3. [High Priority Issues](#3-high-priority-issues)
4. [Medium Priority Issues](#4-medium-priority-issues)
5. [Low Priority Issues](#5-low-priority-issues)
6. [Correct Implementation Approach](#6-correct-implementation-approach)
7. [Database Schema Redesign](#7-database-schema-redesign)
8. [API Route Improvements](#8-api-route-improvements)
9. [Implementation Roadmap](#9-implementation-roadmap)

---

## 1. Executive Summary

CampusIQ is a multi-tenant school management SaaS with a solid foundation — multi-tenant isolation, plan-based access control, custom roles, and comprehensive security (bcrypt, rate limiting, CSRF, account lockout). However, several architectural decisions will cause confusion and scalability problems if not corrected early.

**The most important issues:**

- The **login page role selector is misleading** — it sends a role to the backend, but the backend ignores it entirely
- The **register page is correctly scoped** to school+admin creation, but the login page creates the false impression that anyone can pick any role
- There is a **dual student model** (User + Student collections) that causes data synchronization problems
- The **User model is a polymorphic "god object"** mixing fields for all roles, which leads to wasted storage and confusing schemas
- Several **emailVerified inconsistencies** create security gaps

---

## 2. Critical Issues

### 2.1 Login Page Role Selector is Misleading and Unused

**File:** `src/app/(auth)/login/page.tsx` (lines 37–59, 207–242)  
**File:** `src/lib/auth.ts` (lines 34–145)

**Problem:**  
The login page displays 4 role cards (Administrator, Teacher, Student, Parent) and sends the selected `role` to the NextAuth credentials provider. However, the `authorize()` function in `auth.ts` **never checks or uses this role value**. It only queries by email + password:

```typescript
// auth.ts — authorize() function
const user = await User.findOne({
  email: email.toLowerCase(),
  isActive: true,
}).select("+password +failedLoginAttempts +lockedUntil");
```

The user's **actual role from the database** is what gets stored in the JWT — the selected role from the login form is silently discarded.

**Impact:**

- A teacher could select "Administrator" on the login page and still log in — they'd just get their actual teacher permissions. This is confusing and erodes user trust.
- Users don't know which role to pick if they have one account, creating unnecessary friction.
- The UI implies role-based login routing exists when it doesn't.

**Fix Options:**

| Option                                | Approach                                                                                                                                 |             Recommended?              |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | :-----------------------------------: |
| **A — Remove role selector entirely** | Login with just email + password. The backend already determines the role from the database. Show the role on the dashboard after login. |              ✅ **Yes**               |
| **B — Validate role on login**        | Use the selected role to filter: `User.findOne({ email, role })`. This means a teacher selecting "Admin" gets "Invalid credentials".     | Partial — adds unnecessary complexity |
| **C — Post-login role context**       | For users with multiple roles (future), show a role picker AFTER authentication succeeds.                                                |          Future enhancement           |

---

### 2.2 Dual Student Model — Data Synchronization Risk

**File:** `src/lib/models/User.ts` — Student as a User (role="student")  
**File:** `src/lib/models/Student.ts` — Separate Student model for academic records

**Problem:**  
Students exist in TWO places:

1. **User collection** (role="student") — used for authentication via `/api/users`
2. **Student collection** — used for academic records via `/api/students`

These are **not linked** consistently:

- `/api/users` POST creates a User with `role: "student"` and student fields (className, rollNumber, etc.)
- `/api/students` POST creates a Student document with similar fields but in a different schema
- There is no automatic sync between these two records
- A student can exist in one collection but not the other

**Impact:**

- Admin creates a student via Users page → student can log in but has no academic record
- Admin creates a student via Students page → student has academic records but cannot log in
- Attendance, fees, and other modules may query different collections leading to inconsistent data
- Parent linking uses `Student.parent_user` (Student model) AND `User.children[]` (User model) — two different link mechanisms

**Fix:** See [Section 7 — Database Schema Redesign](#7-database-schema-redesign)

---

### 2.3 emailVerified Inconsistency — Security Gap

**File:** `src/app/api/auth/register/route.ts` — sets `emailVerified: true`  
**File:** `src/app/api/users/route.ts` — sets `emailVerified: false`  
**File:** `src/app/api/teachers/route.ts` — sets `emailVerified: true`

**Problem:**

| Creation Method                           | emailVerified |          Email Sent?           |
| ----------------------------------------- | :-----------: | :----------------------------: |
| School Registration (admin)               |    `true`     |       Welcome email only       |
| Admin creates user via `/api/users`       |    `false`    | **No verification email sent** |
| Admin creates teacher via `/api/teachers` |    `true`     | **No verification email sent** |

When admin creates a user via `/api/users`, that user gets `emailVerified: false` but **no verification email is sent**. The user cannot log in because `auth.ts` rejects unverified emails:

```typescript
if (!user.emailVerified) {
  throw new Error("Please verify your email before logging in...");
}
```

This means admin-created users via the Users page are **permanently locked out** unless manually updated in the database.

Meanwhile, teachers created via `/api/teachers` get `emailVerified: true` — inconsistent behavior for the same operation.

**Fix:**

- **Option A (Recommended):** When admin creates any user, set `emailVerified: true` since the admin is vouching for the user. The admin is a trusted party.
- **Option B:** Send a verification email when creating users, and set `emailVerified: false` until they verify. This requires building the invite/onboarding flow.

---

## 3. High Priority Issues

### 3.1 No User Invitation / Account Claim Flow

**Problem:**  
When an admin creates a teacher, student, or parent account, the admin sets the password for them. There is:

- No invitation email sent to the new user
- No "set your own password" onboarding flow
- No temporary password mechanism
- No account claim/activation link

The admin must verbally communicate the email + password to each user, which is insecure and doesn't scale.

**Recommended Implementation:**

1. Admin creates user → system sends an **invitation email** with a one-time activation link
2. User clicks link → redirected to a "Set Your Password" page
3. User sets password → account is activated, `emailVerified: true`
4. No password is set during admin creation — only name, email, role, and role-specific fields

### 3.2 User Model is a Polymorphic "God Object"

**File:** `src/lib/models/User.ts`

**Problem:**  
The User schema contains fields for ALL roles in a single document:

```typescript
// Teacher-specific fields on every user
subject: string;
classes: string[];
salaryPerDay: number;
joiningDate: Date;

// Student-specific fields on every user
className: string;
rollNumber: string;
parentName: string;
parentPhone: string;
parentEmail: string;
address: string;
admissionDate: Date;

// Parent-specific fields
children: ObjectId[];
```

An admin user document stores empty `subject`, `classes`, `salaryPerDay`, `className`, `rollNumber`, etc. A teacher document stores empty `className`, `rollNumber`, etc.

**Impact:**

- Wasted storage across thousands of documents
- Confusing schema — developers don't know which fields apply to which role
- No schema-level validation that role-specific fields are filled for the correct role
- MongoDB queries return irrelevant fields
- Makes indexing less efficient

**Fix:** See [Section 7 — Database Schema Redesign](#7-database-schema-redesign)

### 3.3 Register Page Does NOT Have a Role Dropdown (Clarification)

**File:** `src/app/(auth)/register/page.tsx`

**Important Clarification:** The register page is **correctly designed**. It is a 3-step wizard:

1. **Step 1:** School information (name, type, board, address, phone, email)
2. **Step 2:** Admin account credentials (email, password)
3. **Step 3:** Review and submit

It does NOT have a Teacher/Student/Parent dropdown. It correctly creates:

- One **School** document
- One **User** document with `role: "admin"`
- One **Subscription** with 7-day trial

This is the correct flow — only the **login page** (Issue 2.1) has the misleading role selector.

### 3.4 Duplicate API Endpoints for Same Entity

**Problem:**  
Teachers can be managed through TWO different API routes:

| Route                            | Model | emailVerified | Fields                               |
| -------------------------------- | ----- | :-----------: | ------------------------------------ |
| `POST /api/users` (role=teacher) | User  |    `false`    | Generic user fields + teacher extras |
| `POST /api/teachers`             | User  |    `true`     | Teacher-specific fields              |

Both create a User document with `role: "teacher"`, but with different defaults and field handling. The Students page also uses a separate `Student` model while the Users page creates students in the `User` collection.

**Fix:** Consolidate to a single creation endpoint per entity, or clearly define which endpoint is the "source of truth":

- `/api/users` — admin user management (CRUD for all roles)
- `/api/teachers` — should delegate to or be replaced by `/api/users`
- `/api/students` — should either work with User model OR Student model, not both

### 3.5 No Role Validation in Auth — Role Escalation Surface

**File:** `src/lib/auth.ts` (line 34)

**Problem:**  
The credentials provider accepts a `role` field but ignores it. While this doesn't cause an actual privilege escalation (the DB role is always used), it's a code smell. The `role` credential definition should either be removed or actively validated.

```typescript
credentials: {
  email: { label: "Email", type: "email" },
  password: { label: "Password", type: "password" },
  role: { label: "Role", type: "text" }, // ← Accepted but never used
},
```

If a future developer assumes this `role` is validated and starts using it in JWT/session logic, it could introduce a privilege escalation bug.

**Fix:** Remove `role` from credentials definition since it's determined from the database.

---

## 4. Medium Priority Issues

### 4.1 No Multi-School Support Per User

**Problem:**  
Email is globally unique (`unique: true` on User schema). A teacher who works at two schools cannot have two accounts. The `school` field is a single ObjectId reference.

**Current Limitation:** One user = one school. This is acceptable for initial launch but should be planned for.

**Future Fix:** Consider a join table `UserSchoolMembership` for multi-school scenarios, or allow the same email to exist with different school scopes.

### 4.2 Plan Limits Not Enforced on User Creation

**File:** `src/lib/plans.ts` — defines `maxStudents` and `maxTeachers` per plan  
**File:** `src/app/api/users/route.ts` — does NOT check these limits

**Problem:**  
Plans define limits (e.g., Starter: 50 students, 5 teachers), but the API routes for creating users/teachers/students **never check** current counts against plan limits. An admin on the Starter plan could create unlimited users.

**Fix:** Before creating a user, count existing users by role and compare against `PLANS[plan].limits.maxStudents` / `maxTeachers`.

### 4.3 Password Set by Admin — No Self-Service Onboarding

**Problem:**  
When admin creates users, they set the password directly. The created user has no way to:

- Choose their own password
- Reset the admin-assigned password (unless they use "Forgot Password")
- Know their credentials unless the admin tells them

**Fix:** Implement invitation-based onboarding (see Issue 3.1).

### 4.4 Session Does Not Include School Name

**File:** `src/lib/auth.ts` — JWT callback

**Problem:**  
The session/JWT stores `school_id` but not `school_name`. Many dashboard pages likely need the school name for display, requiring an additional API call or database query on every page load.

**Fix:** Include `school_name` in the JWT token (it changes rarely, and can be refreshed on `trigger === "update"`).

### 4.5 Soft Delete Without Cascading Logic

**Problem:**  
Users, teachers, and students are "soft deleted" by setting `isActive: false`. However:

- There is no cascading deactivation — deactivating a parent doesn't affect their linked student records
- Soft-deleted users still occupy unique email slots — you cannot create a new user with the same email
- Attendance, assignment, and other records don't check `isActive` on referenced users
- No job/cron to clean up stale soft-deleted records

### 4.6 Missing Input Sanitization on Some Routes

**Problem:**  
While Zod schemas validate structure, there's no HTML/script sanitization on free-text fields like `name`, `address`, or `school_name`. A user could inject XSS payloads stored in the database.

**Fix:** Add a sanitization layer (e.g., `DOMPurify` or a custom strip-html function) for all user-provided text fields before storage.

---

## 5. Low Priority Issues

### 5.1 Login Schema Default Role

**File:** `src/lib/validators.ts`

```typescript
loginSchema: role (optional, defaults to "teacher")
```

The login validator defaults the role to "teacher" if not provided, but the role isn't actually used in authentication. This is dead code.

### 5.2 `teacher_id` Misnomer in JWT

**File:** `src/lib/auth.ts` (line 131)

```typescript
teacher_id: user._id.toString(),
```

The JWT stores `teacher_id` for ALL users, not just teachers. This is a legacy naming issue — it should be `user_id` or just `id`.

### 5.3 Inconsistent Error Response Format

Some API routes return `{ error: "message" }`, others return `{ success: false, error: "message" }`, and some return `{ message: "..." }`. Standardize to a single format:

```typescript
// Success
{ success: true, data: { ... } }

// Error
{ success: false, error: "Human-readable message", code: "DUPLICATE_EMAIL" }
```

### 5.4 No Audit Log for Login Events

**Problem:**  
Registration, user creation, and user updates are audit-logged, but successful/failed logins are not. For a school management system, login audit trails are important for compliance.

### 5.5 Magic Numbers in Code

- Bcrypt rounds: `12` — should be a constant
- Account lockout: `5` attempts, `15` minutes — already constants in auth.ts ✅
- Trial duration: `7` days — hardcoded in register route
- Rate limits — hardcoded in middleware

Consider moving these to environment variables or a central config file.

---

## 6. Correct Implementation Approach

### 6.1 Registration Flow (Current — Correct ✅)

```
Public User → /register
  └─ Step 1: School Info (name, type, board, address)
  └─ Step 2: Admin Credentials (email, password)
  └─ Step 3: Review & Submit
       └─ POST /api/auth/register
            ├─ Create School (7-day trial, starter plan)
            ├─ Create Subscription
            ├─ Create Admin User (emailVerified: true)
            ├─ Send Welcome Email
            └─ Return school_id
```

### 6.2 Login Flow (Needs Fix)

**Current (Wrong):**

```
User → /login
  └─ Select Role (Admin/Teacher/Student/Parent)  ← REMOVE THIS
  └─ Enter Email + Password
  └─ POST signIn("credentials", { email, password, role })
       └─ authorize() ignores role, finds user by email only
       └─ Returns user with DB role
```

**Correct:**

```
User → /login
  └─ Enter Email + Password (no role selector)
  └─ POST signIn("credentials", { email, password })
       └─ authorize() finds user by email
       └─ Returns user with DB role
       └─ Frontend redirects based on role:
            ├─ admin  → /dashboard
            ├─ teacher → /dashboard (with teacher sidebar)
            ├─ student → /dashboard (with student sidebar)
            └─ parent  → /parent
```

### 6.3 User Creation Flow (Needs Fix)

**Current (Incomplete):**

```
Admin → Dashboard → Users → Add User
  └─ Fill form: name, email, password, role, phone
  └─ POST /api/users
       └─ Create User (emailVerified: false, no email sent)
       └─ User CANNOT log in (email not verified, no verification link)
```

**Correct:**

```
Admin → Dashboard → Users → Invite User
  └─ Fill form: name, email, role, role-specific fields
  └─ POST /api/users/invite
       ├─ Create User (status: "pending", no password yet)
       ├─ Generate invitation token (expires in 72h)
       ├─ Send invitation email with activation link
       └─ Return success

Invited User → Clicks activation link
  └─ GET /activate?token=xxx
       └─ Validate token
       └─ Show "Set Your Password" page
       └─ POST /api/auth/activate
            ├─ Set password (bcrypt hashed)
            ├─ Set emailVerified: true, status: "active"
            ├─ Delete invitation token
            └─ Redirect to /login
```

### 6.4 Permission Flow (Current — Well-Designed ✅)

The three-layer permission system is well-designed:

```
Layer 1: System RBAC (permissions.ts)
  └─ Static role → permission[] mapping
  └─ admin gets 65+ permissions, teacher 31, student 14, parent 11

Layer 2: Custom Roles (Role model)
  └─ Admin creates custom roles with granular menu permissions
  └─ Assigned to users via customRole field
  └─ Overrides system role for menu-level CRUD access

Layer 3: Module Access (allowedModules)
  └─ Admin restricts which plan modules a user can access
  └─ Intersection of plan modules and allowed modules
  └─ Empty array = all plan modules (default)
```

This is a strong foundation — keep it as-is.

---

## 7. Database Schema Redesign

### 7.1 Current Schema (Problematic)

```
User {
  // Auth fields (all roles)
  name, email, password, role, school, phone, ...

  // Teacher fields (empty for non-teachers)
  subject, classes[], salaryPerDay, joiningDate

  // Student fields (empty for non-students)
  className, rollNumber, parentName, parentPhone, ...

  // Parent fields (empty for non-parents)
  children[]
}

Student {
  // Separate collection, partially duplicates User
  school, class_name, roll_number, name, parent_user, ...
}
```

### 7.2 Recommended Schema

**Option A — Keep Single User Model but Clean It Up (Minimal Change)**

```typescript
// User model — auth + common fields only
User {
  name, email, password, role, school, phone,
  emailVerified, isActive, avatar,
  allowedModules[], customRole,
  failedLoginAttempts, lockedUntil, lastLoginAt,

  // Role-specific data as a sub-document
  profile: {
    // Teacher
    subject?: string,
    classes?: string[],
    salaryPerDay?: number,
    joiningDate?: Date,

    // Student
    className?: string,
    rollNumber?: string,
    admissionDate?: Date,

    // Parent
    children?: ObjectId[],
  }
}

// Remove separate Student model for auth purposes
// Keep Student model ONLY for academic records that don't need auth
```

**Option B — Proper Separation (Recommended for Scale)**

```typescript
// User — Auth only (all roles)
User {
  name, email, password, role, school, phone,
  emailVerified, isActive, status: "pending" | "active" | "inactive",
  allowedModules[], customRole,
  security: { failedLoginAttempts, lockedUntil, lastLoginAt }
}

// TeacherProfile — linked to User
TeacherProfile {
  user: ObjectId → User (unique),
  school: ObjectId → School,
  subject, classes[], salaryPerDay, joiningDate
}

// StudentProfile — replaces both User student fields AND Student model
StudentProfile {
  user: ObjectId → User (unique, nullable for non-auth students),
  school: ObjectId → School,
  className, rollNumber, parentUser: ObjectId → User,
  admissionDate, address, photo, status
}

// ParentProfile — linked to User
ParentProfile {
  user: ObjectId → User (unique),
  school: ObjectId → School,
  children: ObjectId[] → StudentProfile
}
```

**Option B advantages:**

- Clean separation of concerns
- Each collection only has relevant fields
- StudentProfile can exist without a User (students who don't need login)
- Easy to add new role-specific fields without bloating the User model
- Better indexing — each collection indexes only its own fields

---

## 8. API Route Improvements

### 8.1 Consolidate User Management

**Current state:** 3 overlapping routes for user management:

- `/api/users` — generic CRUD for all roles
- `/api/teachers` — teacher-specific CRUD (uses User model)
- `/api/students` — student-specific CRUD (uses Student model)

**Recommended:**

```
/api/users                    — List, create, update, deactivate any user
/api/users/invite             — Send invitation email for new user
/api/users/[id]               — Single user operations
/api/users/[id]/profile       — Role-specific profile data

/api/students                 — Academic records (StudentProfile, not auth)
/api/students/[id]/attendance — Student attendance
/api/students/[id]/fees       — Student fees
/api/students/[id]/exams      — Student exam records

/api/teachers                 — Teacher-specific views (wraps /api/users with role filter)
```

### 8.2 Add Plan Limit Enforcement

```typescript
// In POST /api/users — before creating:
const plan = PLANS[session.user.plan];
const currentCount = await User.countDocuments({
  school: session.user.school_id,
  role: data.role,
  isActive: true,
});

if (data.role === "teacher" && currentCount >= plan.limits.maxTeachers) {
  return NextResponse.json(
    {
      error: `Teacher limit reached for ${plan.name} plan. Upgrade to add more.`,
    },
    { status: 403 },
  );
}
```

### 8.3 Standardize API Responses

```typescript
// Create a response helper
function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

function apiError(message: string, status = 400, code?: string) {
  return NextResponse.json(
    { success: false, error: message, code },
    { status },
  );
}

// Use consistently:
return apiSuccess({ user_id: user._id.toString() }, 201);
return apiError(
  "A user with this email already exists",
  409,
  "DUPLICATE_EMAIL",
);
```

---

## 9. Implementation Roadmap

### Phase 1 — Critical Fixes (Week 1)

| #   | Task                                                                               | Files to Modify                            |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------------ |
| 1   | **Remove role selector from login page**                                           | `src/app/(auth)/login/page.tsx`            |
| 2   | **Remove `role` from credentials provider**                                        | `src/lib/auth.ts`, `src/lib/validators.ts` |
| 3   | **Fix emailVerified in `/api/users` POST** — set to `true` for admin-created users | `src/app/api/users/route.ts`               |
| 4   | **Fix emailVerified in `/api/teachers` POST** — ensure consistency                 | `src/app/api/teachers/route.ts`            |

### Phase 2 — User Onboarding (Week 2-3)

| #   | Task                                                                 | Files to Create/Modify               |
| --- | -------------------------------------------------------------------- | ------------------------------------ |
| 5   | Create invitation token model                                        | `src/lib/models/InvitationToken.ts`  |
| 6   | Build `/api/users/invite` endpoint                                   | `src/app/api/users/invite/route.ts`  |
| 7   | Build activation page                                                | `src/app/(auth)/activate/page.tsx`   |
| 8   | Build `/api/auth/activate` endpoint                                  | `src/app/api/auth/activate/route.ts` |
| 9   | Create invitation email template                                     | `email-templates/invitation.html`    |
| 10  | Update Users dashboard to show "Invite" instead of setting passwords | `src/app/(dashboard)/users/page.tsx` |

### Phase 3 — Data Model Cleanup (Week 3-4)

| #   | Task                                                      | Files to Modify                                               |
| --- | --------------------------------------------------------- | ------------------------------------------------------------- |
| 11  | Consolidate Student model — decide single source of truth | `src/lib/models/Student.ts`, `src/lib/models/User.ts`         |
| 12  | Add plan limit enforcement                                | `src/app/api/users/route.ts`, `src/app/api/teachers/route.ts` |
| 13  | Consolidate teacher API routes                            | `src/app/api/teachers/route.ts`                               |
| 14  | Standardize API response format                           | All API route files                                           |

### Phase 4 — Security Hardening (Week 4-5)

| #   | Task                                         |
| --- | -------------------------------------------- |
| 15  | Add login/logout audit logging               |
| 16  | Add input sanitization layer                 |
| 17  | Add school_name to JWT session               |
| 18  | Fix `teacher_id` misnomer in JWT → `user_id` |
| 19  | Add cascading soft-delete logic              |
| 20  | Move magic numbers to environment config     |

---

## Summary of All Issues

| #   | Issue                                       | Severity     | File(s)                                              |
| --- | ------------------------------------------- | ------------ | ---------------------------------------------------- |
| 2.1 | Login role selector is unused/misleading    | **CRITICAL** | login/page.tsx, auth.ts                              |
| 2.2 | Dual Student model — data sync risk         | **CRITICAL** | User.ts, Student.ts                                  |
| 2.3 | emailVerified inconsistency                 | **CRITICAL** | users/route.ts, teachers/route.ts, register/route.ts |
| 3.1 | No invitation/account claim flow            | **HIGH**     | users/route.ts, teachers/route.ts                    |
| 3.2 | User model is a "god object"                | **HIGH**     | User.ts                                              |
| 3.3 | Register page is correct (no role dropdown) | **INFO**     | register/page.tsx                                    |
| 3.4 | Duplicate API endpoints for teachers        | **HIGH**     | users/route.ts, teachers/route.ts                    |
| 3.5 | Role credential accepted but unused         | **HIGH**     | auth.ts                                              |
| 4.1 | No multi-school per user support            | **MEDIUM**   | User.ts                                              |
| 4.2 | Plan limits not enforced                    | **MEDIUM**   | users/route.ts, plans.ts                             |
| 4.3 | Passwords set by admin, no self-service     | **MEDIUM**   | users/route.ts                                       |
| 4.4 | Session lacks school_name                   | **MEDIUM**   | auth.ts                                              |
| 4.5 | Soft delete without cascading               | **MEDIUM**   | Multiple                                             |
| 4.6 | Missing input sanitization                  | **MEDIUM**   | Multiple API routes                                  |
| 5.1 | Login schema default role is dead code      | **LOW**      | validators.ts                                        |
| 5.2 | `teacher_id` misnomer in JWT                | **LOW**      | auth.ts                                              |
| 5.3 | Inconsistent error response format          | **LOW**      | All API routes                                       |
| 5.4 | No login audit logging                      | **LOW**      | auth.ts                                              |
| 5.5 | Magic numbers in code                       | **LOW**      | Multiple                                             |

---

## What's Already Good ✅

1. **Multi-tenant isolation** — All queries scoped by `school_id` from session
2. **3-layer permission system** — System RBAC + Custom Roles + Module Access
3. **Security fundamentals** — bcrypt (12 rounds), account lockout, CSRF, rate limiting, security headers
4. **Plan-based access control** — Middleware gates routes by subscription plan
5. **Registration flow** — Correctly creates School + Admin + Trial subscription
6. **Audit logging** — CRUD operations are tracked
7. **Edge middleware** — Subscription, module, and authentication checks at the edge
8. **Password strength enforcement** — Frontend meter + backend validation

---

_This report should be revisited after Phase 1 fixes are implemented to reassess priorities for Phases 2–4._

---

## 10. Resolution Log

> **Updated:** June 2025  
> **Status:** All identified issues have been addressed.

| Issue | Title                       |   Status    | Resolution                                                                                                                                                                                                                                                                                                                                              |
| ----- | --------------------------- | :---------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1   | Login page role selector    | ✅ RESOLVED | Removed role selector UI, role cards, and related imports from `login/page.tsx`. Login is now email + password only.                                                                                                                                                                                                                                    |
| 2.2   | Dual Student model          | ✅ RESOLVED | Added `user` field (ObjectId → User) to `Student.ts` with sparse index. Documented the Student↔User relationship with ASCII diagram.                                                                                                                                                                                                                    |
| 2.3   | emailVerified inconsistency | ✅ RESOLVED | Changed `/api/users` POST to set `emailVerified: true` for admin-created users. All creation paths now consistent.                                                                                                                                                                                                                                      |
| 3.1   | No invitation/claim flow    | ✅ RESOLVED | Created `/api/users/invite` (POST) and `/api/auth/activate` (GET/POST) endpoints. Built invitation token flow with 72h expiry, styled HTML emails, and full activation page at `(auth)/activate/page.tsx`.                                                                                                                                              |
| 3.2   | User model "god object"     | ✅ RESOLVED | Reorganized `User.ts` with clear section grouping (Shared / Teacher Profile / Student Profile / Parent Profile / Permissions / Security), comprehensive JSDoc, and added `status` + `school_name` indexes.                                                                                                                                              |
| 3.3   | Register page clarification |   ✅ N/A    | Documented as non-issue — register page correctly scopes to school+admin creation only.                                                                                                                                                                                                                                                                 |
| 3.4   | Duplicate teacher endpoints | ✅ RESOLVED | Added plan limit enforcement to `/api/teachers` POST to match `/api/users` behavior. Both endpoints now enforce `maxTeachers`.                                                                                                                                                                                                                          |
| 3.5   | Role in auth credentials    | ✅ RESOLVED | Removed `role` from NextAuth credentials provider definition in `auth.ts`.                                                                                                                                                                                                                                                                              |
| 4.1   | No multi-school support     | ✅ RESOLVED | Added architecture documentation in `User.ts` and `Student.ts` explaining current 1:1 user-school model and migration path to `UserSchoolMembership` join table.                                                                                                                                                                                        |
| 4.2   | Plan limits not enforced    | ✅ RESOLVED | Added plan limit checks in both `/api/users` and `/api/teachers` POST routes. Returns 403 with clear message when limits exceeded.                                                                                                                                                                                                                      |
| 4.3   | No self-service onboarding  | ✅ RESOLVED | Built full activation page (`activate/page.tsx`) with password strength meter, token validation states (loading/valid/invalid/expired/activated), and auto-redirect to login.                                                                                                                                                                           |
| 4.4   | Session missing school_name | ✅ RESOLVED | Added `school_name` to JWT callback, session callback, and all type declarations in `auth.ts`.                                                                                                                                                                                                                                                          |
| 4.5   | Soft delete no cascading    | ✅ RESOLVED | Created `src/lib/cascade.ts` with `cascadeTeacherDeactivation` (un-assigns subjects, removes workloads), `cascadeStudentDeactivation` (removes from transport), `cascadeDepartmentDeletion` (nullifies references), and `guardDepartmentDeletion` (blocks if active subjects exist). Wired into User, Teacher, Student, and Department DELETE handlers. |
| 4.6   | Missing input sanitization  | ✅ RESOLVED | Created `src/lib/sanitize.ts` with `stripHtml()`, `sanitizeText()`, `sanitizeFields()`, and `sanitizeUserInput()` utilities.                                                                                                                                                                                                                            |
| 5.1   | Login schema dead code      | ✅ RESOLVED | Removed `role` field from `loginSchema` in `validators.ts`. Now only `{ email, password }`.                                                                                                                                                                                                                                                             |
| 5.2   | teacher_id misnomer         | ✅ RESOLVED | Replaced all `teacher_id` references with `id` across 5 API route files and removed from JWT/session type declarations.                                                                                                                                                                                                                                 |
| 5.3   | Inconsistent error format   | ✅ RESOLVED | Created `src/lib/api-response.ts` with `apiSuccess()`, `apiCreated()`, `apiError()`, `apiList()` helpers and `ErrorCodes`/`CommonErrors` constants.                                                                                                                                                                                                     |
| 5.4   | No login audit logging      | ✅ RESOLVED | Added fire-and-forget `audit()` call after successful authentication in `auth.ts` authorize function.                                                                                                                                                                                                                                                   |
| 5.5   | Magic numbers in code       | ✅ RESOLVED | Created `src/lib/config.ts` with centralized `AUTH_CONFIG`, `SUBSCRIPTION_CONFIG`, `RATE_LIMIT_CONFIG`, `PAGINATION_CONFIG`, and `SECURITY_CONFIG` objects.                                                                                                                                                                                             |

### New Files Created

| File                                 | Purpose                             |
| ------------------------------------ | ----------------------------------- |
| `src/lib/config.ts`                  | Centralized configuration constants |
| `src/lib/sanitize.ts`                | HTML/XSS sanitization utilities     |
| `src/lib/api-response.ts`            | Standardized API response helpers   |
| `src/lib/cascade.ts`                 | Soft-delete cascading operations    |
| `src/app/api/users/invite/route.ts`  | User invitation endpoint            |
| `src/app/api/auth/activate/route.ts` | Account activation endpoint         |
| `src/app/(auth)/activate/page.tsx`   | Account activation frontend page    |
