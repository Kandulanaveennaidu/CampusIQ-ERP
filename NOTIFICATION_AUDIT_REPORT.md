# Notification Audit Report — CampusIQ API Routes

**Date:** February 25, 2026  
**Scope:** All 96 route files under `src/app/api/`  
**Libraries checked:** `@/lib/twilio-notifications` (multi-channel SMS+WhatsApp) and `@/lib/sms` (legacy SMS-only)

---

## 1. Routes WITH Notifications (Already Integrated) ✅

| #   | Route                                  | Function Used                                                          | Source                                     |
| --- | -------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------ |
| 1   | `api/attendance/route.ts`              | `notifyParentAbsence`                                                  | `@/lib/twilio-notifications`               |
| 2   | `api/bulk-messages/route.ts`           | `sendBulkSMS` + `sendBulkWhatsApp`                                     | `@/lib/sms` + `@/lib/twilio-notifications` |
| 3   | `api/circulars/route.ts`               | `notifyCircular`                                                       | `@/lib/twilio-notifications`               |
| 4   | `api/diary/route.ts`                   | `notifyDiaryEntry`                                                     | `@/lib/twilio-notifications`               |
| 5   | `api/emergency/route.ts`               | `broadcastEmergency`                                                   | `@/lib/twilio-notifications`               |
| 6   | `api/exams/route.ts`                   | `notifyStudentResults`                                                 | `@/lib/twilio-notifications`               |
| 7   | `api/fees/upi-payment/route.ts`        | `notifyFeePaymentConfirmation`                                         | `@/lib/twilio-notifications`               |
| 8   | `api/leaves/route.ts`                  | `notifyLeaveStatus`                                                    | `@/lib/twilio-notifications`               |
| 9   | `api/notifications/broadcast/route.ts` | `broadcastToRecipients`, `notifyTeacherUpdate`, `notifyStudentResults` | `@/lib/twilio-notifications`               |
| 10  | `api/salary/route.ts`                  | `notifySalaryProcessed`                                                | `@/lib/twilio-notifications`               |
| 11  | `api/students/route.ts`                | `notifyStudentRegistration`                                            | `@/lib/twilio-notifications`               |
| 12  | `api/subject-attendance/route.ts`      | `notifyLowAttendance`                                                  | `@/lib/twilio-notifications`               |
| 13  | `api/timetable/route.ts`               | `notifyTeacherUpdate`                                                  | `@/lib/twilio-notifications`               |
| 14  | `api/whatsapp-bot/route.ts`            | `sendWhatsApp`                                                         | `@/lib/sms`                                |
| 15  | `api/auth/forgot-password/route.ts`    | `notifyPasswordReset`                                                  | `@/lib/twilio-notifications`               |
| 16  | `api/fees/route.ts`                    | `sendFeeReminderAlert`                                                 | `@/lib/sms` (old pattern — see §4)         |

---

## 2. Routes MISSING Notifications That SHOULD Have Them ❌

### 2.1 — Events (`api/events/route.ts` + `api/events/[id]/route.ts`)

| Item                   | Detail                                                                            |
| ---------------------- | --------------------------------------------------------------------------------- |
| **Trigger**            | POST (create event), PUT (update event), DELETE (cancel event)                    |
| **Who to notify**      | Parents, Teachers, Students (based on `targetAudience`)                           |
| **Suggested function** | New: `notifyEvent(phone, eventTitle, eventDate)`                                  |
| **Suggested message**  | `CampusIQ: New event "{title}" on {date}. Check the CampusIQ portal for details.` |
| **Priority**           | **HIGH** — events like PTMs, sports days, etc. need SMS/WhatsApp reach            |

### 2.2 — Holidays (`api/holidays/route.ts`)

| Item                   | Detail                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------- |
| **Trigger**            | POST (new holiday declared), PUT (holiday date changed), DELETE (holiday cancelled) |
| **Who to notify**      | Parents, Teachers                                                                   |
| **Suggested function** | New: `notifyHoliday(phone, holidayName, date)`                                      |
| **Suggested message**  | `CampusIQ: {name} holiday declared on {date}. School will remain closed.`           |
| **Priority**           | **HIGH** — parents need to know about schedule changes                              |

### 2.3 — Assignments (`api/assignments/route.ts`)

| Item                   | Detail                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Trigger**            | POST (new assignment created)                                                                                   |
| **Who to notify**      | Parents, Students (via parent phone)                                                                            |
| **Suggested function** | New: `notifyAssignment(phone, className, subject, title, dueDate)`                                              |
| **Suggested message**  | `CampusIQ: New assignment "{title}" ({subject}) for Class {class}. Due: {dueDate}. Check CampusIQ for details.` |
| **Priority**           | **MEDIUM** — useful alongside diary entries                                                                     |

### 2.4 — Assignment Submission Grading (`api/assignments/[id]/route.ts` PUT — when grade is set)

| Item                   | Detail                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| **Trigger**            | PUT (teacher grades a submission)                                                             |
| **Who to notify**      | Parent                                                                                        |
| **Suggested function** | Reuse: `notifyStudentResults(parentPhone, studentName, assignmentTitle)`                      |
| **Suggested message**  | `CampusIQ: {studentName}'s assignment "{title}" has been graded. Check CampusIQ for results.` |
| **Priority**           | **LOW** — nice to have                                                                        |

### 2.5 — Online Exams Published (`api/online-exams/route.ts` POST + `api/online-exams/[id]/route.ts` PUT status→published)

| Item                   | Detail                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| **Trigger**            | POST (create), PUT (status changed to "published" or "active")                                            |
| **Who to notify**      | Parents, Students (via parent phone)                                                                      |
| **Suggested function** | New: `notifyOnlineExam(phone, examTitle, startTime, className)`                                           |
| **Suggested message**  | `CampusIQ: Online exam "{title}" for Class {class} starts on {startTime}. Ensure your child is prepared.` |
| **Priority**           | **HIGH** — time-sensitive, parents must ensure students are ready                                         |

### 2.6 — Online Exam Results (`api/online-exams/[id]/attempt/route.ts` PUT — on auto-grade)

| Item                   | Detail                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| **Trigger**            | PUT (submit attempt — when exam is auto-graded)                                                  |
| **Who to notify**      | Parent                                                                                           |
| **Suggested function** | Reuse: `notifyStudentResults(parentPhone, studentName, examTitle)`                               |
| **Suggested message**  | `CampusIQ: {studentName}'s online exam "{title}" results are available. Score: {score}/{total}.` |
| **Priority**           | **MEDIUM**                                                                                       |

### 2.7 — Transport Route Changes (`api/transport/route.ts`)

| Item                   | Detail                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| **Trigger**            | PUT (route/schedule changed), POST (student assigned to route)                             |
| **Who to notify**      | Parents of assigned students                                                               |
| **Suggested function** | New: `notifyTransportUpdate(phone, routeName, vehicleNumber, changeDetails)`               |
| **Suggested message**  | `CampusIQ: Transport update for route "{route}". {details}. Contact office for questions.` |
| **Priority**           | **HIGH** — parents need to know bus route/timing changes                                   |

### 2.8 — Hostel Allocation (`api/hostel/route.ts`)

| Item                   | Detail                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Trigger**            | POST (type=allocation — student allocated to hostel room)                                                     |
| **Who to notify**      | Parent                                                                                                        |
| **Suggested function** | New: `notifyHostelAllocation(phone, studentName, hostelName, roomNumber)`                                     |
| **Suggested message**  | `CampusIQ: {studentName} has been allocated to {hostel}, Room {room}. Contact the hostel warden for details.` |
| **Priority**           | **MEDIUM**                                                                                                    |

### 2.9 — Library Book Overdue / Issue (`api/library/route.ts`)

| Item                   | Detail                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| **Trigger**            | POST (type=issue — book issued to student), POST (type=return with overdue fine)                 |
| **Who to notify**      | Parent (for student borrowers), Teacher (if teacher borrower)                                    |
| **Suggested function** | New: `notifyLibraryIssue(phone, borrowerName, bookTitle, dueDate)`                               |
| **Suggested message**  | `CampusIQ: "{bookTitle}" has been issued to {name}. Due date: {dueDate}. Please return on time.` |
| **Priority**           | **LOW**                                                                                          |

### 2.10 — Teacher Attendance Absent (`api/teacher-attendance/route.ts`)

| Item                   | Detail                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| **Trigger**            | POST (teacher marked absent)                                                                  |
| **Who to notify**      | Admin (notify of teacher absence), Teacher (confirmation)                                     |
| **Suggested function** | New: `notifyTeacherAbsence(adminPhone, teacherName, date)`                                    |
| **Suggested message**  | `CampusIQ: {teacherName} was marked Absent on {date}. Substitute arrangements may be needed.` |
| **Priority**           | **MEDIUM** — admin needs to arrange substitutes                                               |

### 2.11 — Student Promotion (`api/promotions/route.ts`)

| Item                   | Detail                                                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Trigger**            | POST (students promoted to next class)                                                                                  |
| **Who to notify**      | Parent                                                                                                                  |
| **Suggested function** | New: `notifyPromotion(phone, studentName, fromClass, toClass)`                                                          |
| **Suggested message**  | `CampusIQ: {studentName} has been promoted from Class {from} to Class {to} for the new academic year. Congratulations!` |
| **Priority**           | **MEDIUM**                                                                                                              |

### 2.12 — Teacher Evaluation (`api/teacher-evaluation/route.ts`)

| Item                   | Detail                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| **Trigger**            | POST (new evaluation submitted)                                                                   |
| **Who to notify**      | Teacher (their evaluation is done)                                                                |
| **Suggested function** | Reuse: `notifyTeacherUpdate(teacherPhone, teacherName)` or new dedicated function                 |
| **Suggested message**  | `CampusIQ: A new performance evaluation has been submitted for you. Login to view your feedback.` |
| **Priority**           | **LOW**                                                                                           |

### 2.13 — Visitors (`api/visitors/route.ts`)

| Item                   | Detail                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| **Trigger**            | POST (visitor check-in for meeting a teacher/parent)                                                 |
| **Who to notify**      | Teacher being visited                                                                                |
| **Suggested function** | New: `notifyVisitorArrival(phone, visitorName, purpose)`                                             |
| **Suggested message**  | `CampusIQ: Visitor {name} has arrived to meet you. Purpose: {purpose}. Please check the front desk.` |
| **Priority**           | **MEDIUM** — improves security & communication                                                       |

### 2.14 — Fee Payment via Razorpay (`api/payment/verify/route.ts`) and Authorize.net (`api/payment/authorize-net/route.ts`)

| Item                   | Detail                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| **Trigger**            | POST (payment verified/charged successfully)                                                  |
| **Who to notify**      | Admin (payment confirmation)                                                                  |
| **Suggested function** | Reuse: `sendMultiChannelNotification(phone, message)`                                         |
| **Suggested message**  | `CampusIQ: Subscription payment of {amount} processed successfully. Plan: {plan}. Thank you!` |
| **Priority**           | **LOW** — admin-facing, email already sent for Authorize.net                                  |

### 2.15 — Teachers (Add/Update/Deactivate) (`api/teachers/route.ts`)

| Item                   | Detail                                                                                                                 |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Trigger**            | POST (new teacher added), PUT (teacher updated), DELETE (teacher deactivated)                                          |
| **Who to notify**      | Teacher (welcome message on creation), Teacher (deactivation notice)                                                   |
| **Suggested function** | New: `notifyTeacherWelcome(phone, name, schoolName)`                                                                   |
| **Suggested message**  | `CampusIQ: Welcome {name}! You've been added as a teacher at {school}. Login to your CampusIQ account to get started.` |
| **Priority**           | **MEDIUM**                                                                                                             |

### 2.16 — Student Import (`api/students/import/route.ts`) and Teacher Import (`api/teachers/import/route.ts`)

| Item                   | Detail                                                                    |
| ---------------------- | ------------------------------------------------------------------------- |
| **Trigger**            | POST (bulk import of students/teachers)                                   |
| **Who to notify**      | Parents (for each student imported), Teachers (welcome)                   |
| **Suggested function** | Reuse: `notifyStudentRegistration` / new `notifyTeacherWelcome`           |
| **Suggested message**  | Same as registration messages                                             |
| **Priority**           | **MEDIUM** — many parents won't know their child is enrolled without this |

### 2.17 — Student Update/Delete (`api/students/[id]/route.ts`)

| Item                   | Detail                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| **Trigger**            | PUT (student info updated — e.g., class change), DELETE (student deactivated/removed)          |
| **Who to notify**      | Parent                                                                                         |
| **Suggested function** | New: `notifyStudentUpdate(phone, studentName, changeDetails)`                                  |
| **Suggested message**  | `CampusIQ: {studentName}'s record has been updated. {details}. Login to CampusIQ for details.` |
| **Priority**           | **LOW**                                                                                        |

---

## 3. Routes That DON'T Need Notifications ⏭️

These routes are administrative, config-only, read-only, or infrastructure endpoints:

| #   | Route                                             | Reason                                                             |
| --- | ------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | `api/auth/[...nextauth]/route.ts`                 | NextAuth handler — session management                              |
| 2   | `api/auth/register/route.ts`                      | School registration — email already sent                           |
| 3   | `api/auth/activate/route.ts`                      | Account activation — user is already on the page                   |
| 4   | `api/auth/verify-email/route.ts`                  | Email verification redirect — GET only                             |
| 5   | `api/auth/resend-verification/route.ts`           | Resends email — email is the channel here                          |
| 6   | `api/auth/reset-password/route.ts`                | Password change action — user is already authenticated             |
| 7   | `api/academic-years/route.ts`                     | Admin config — internal academic year setup                        |
| 8   | `api/academic-calendar/route.ts`                  | Admin config — calendar generation                                 |
| 9   | `api/ai-insights/route.ts`                        | GET-only analytics — no state change                               |
| 10  | `api/audit-logs/route.ts`                         | GET-only — admin log viewer                                        |
| 11  | `api/attendance/today/route.ts`                   | GET-only — dashboard data                                          |
| 12  | `api/attendance/stats/route.ts`                   | GET-only — statistics                                              |
| 13  | `api/backup/route.ts`                             | Admin infrastructure — backup management                           |
| 14  | `api/billing/route.ts`                            | GET-only — billing info display                                    |
| 15  | `api/branding/route.ts`                           | Admin config — UI theming                                          |
| 16  | `api/classes/route.ts`                            | GET-only — class list lookup                                       |
| 17  | `api/cron/route.ts`                               | Internal scheduler (cron already sends fee reminders)              |
| 18  | `api/departments/route.ts`                        | Admin config — department CRUD (internal organizational)           |
| 19  | `api/documents/route.ts`                          | Document upload/management — internal                              |
| 20  | `api/export/[entity]/route.ts`                    | GET-only — data export                                             |
| 21  | `api/faculty-workload/route.ts`                   | Admin config — workload assignment                                 |
| 22  | `api/health/route.ts`                             | GET-only — health check                                            |
| 23  | `api/i18n/route.ts`                               | GET-only — translations                                            |
| 24  | `api/inventory/route.ts`                          | Admin internal — asset management                                  |
| 25  | `api/messages/route.ts`                           | In-app messaging — has its own notification system                 |
| 26  | `api/messages/[conversationId]/route.ts`          | In-app messaging — has its own notification system                 |
| 27  | `api/notifications/route.ts`                      | In-app notification CRUD — it IS the notification system           |
| 28  | `api/notifications/stream/route.ts`               | SSE stream — real-time push                                        |
| 29  | `api/parent/route.ts`                             | GET-only — parent dashboard data                                   |
| 30  | `api/parent/attendance/route.ts`                  | GET-only — parent views child attendance                           |
| 31  | `api/parent/grades/route.ts`                      | GET-only — parent views child grades                               |
| 32  | `api/parent/fees/route.ts`                        | GET-only — parent views fee status                                 |
| 33  | `api/payment/create-order/route.ts`               | Creates Razorpay order — notification should be on verify          |
| 34  | `api/payment/authorize-net/client-token/route.ts` | GET-only — config check                                            |
| 35  | `api/profile/route.ts`                            | Self-service profile edit — user is already logged in              |
| 36  | `api/push-subscription/route.ts`                  | Browser push subscription management                               |
| 37  | `api/qr-attendance/route.ts`                      | QR code generation/scan — attendance handler already notifies      |
| 38  | `api/roles/route.ts`                              | Admin config — role/permission management                          |
| 39  | `api/rooms/route.ts`                              | Admin config — room/booking management                             |
| 40  | `api/semesters/route.ts`                          | Admin config — semester setup                                      |
| 41  | `api/settings/route.ts`                           | Admin config — school settings                                     |
| 42  | `api/socketio/route.ts`                           | WebSocket handshake stub                                           |
| 43  | `api/subjects/route.ts`                           | Admin config — subject CRUD                                        |
| 44  | `api/subscriptions/route.ts`                      | Admin — subscription plan management                               |
| 45  | `api/timetable-generator/route.ts`                | Admin config — auto-generate timetable                             |
| 46  | `api/upload/route.ts`                             | File upload utility                                                |
| 47  | `api/users/route.ts`                              | Admin user management (covered by dedicated invite/teacher routes) |
| 48  | `api/users/actions/route.ts`                      | Admin bulk actions (password reset, lock/unlock)                   |
| 49  | `api/users/invite/route.ts`                       | Sends invitation email — email is the channel                      |
| 50  | `api/staff-leave-calendar/route.ts`               | GET-only — calendar view                                           |
| 51  | `api/reports/*/route.ts` (5 routes)               | GET-only — report generation / PDF / HTML                          |
| 52  | `api/circulars/[id]/route.ts`                     | Update/delete circular — initial create already notifies           |
| 53  | `api/alumni/route.ts`                             | Alumni management — not active students                            |

---

## 4. Dead Imports & Old Pattern Issues ⚠️

### 4.1 — Dead Import: `sendLeaveStatusAlert` in `api/leaves/route.ts`

- **Line 15:** `import { sendLeaveStatusAlert } from "@/lib/sms";`
- **Status:** Imported but **NEVER USED** in the file body
- **Replaced by:** `notifyLeaveStatus` from `@/lib/twilio-notifications` (used at line 193)
- **Action:** Remove the dead import

### 4.2 — Dead Import: `sendLowAttendanceWarning` in `api/subject-attendance/route.ts`

- **Line 9:** `import { sendLowAttendanceWarning } from "@/lib/sms";`
- **Status:** Imported but **NEVER USED** in the file body
- **Replaced by:** `notifyLowAttendance` from `@/lib/twilio-notifications` (used at line 251)
- **Action:** Remove the dead import

### 4.3 — Old SMS-Only Pattern: `sendFeeReminderAlert` in `api/fees/route.ts`

- **Line 16:** `import { sendFeeReminderAlert } from "@/lib/sms";`
- **Line 179:** `sendFeeReminderAlert(s.parent_phone, s.name, parsed.data.amount, parsed.data.due_date);`
- **Status:** `sendFeeReminderAlert` in `sms.ts` (line 213) does send both SMS and WhatsApp via `sendSMS` + `sendWhatsApp`, but it uses the OLD legacy pattern (separate `sendSMS`/`sendWhatsApp` calls) instead of the unified `sendMultiChannelNotification`
- **Action:** Migrate to a new `notifyFeeReminder` function in `twilio-notifications.ts` using the standard `sendMultiChannelNotification` pattern for consistency and proper logging

### 4.4 — Old SMS-Only Pattern: `sendBulkSMS` in `api/bulk-messages/route.ts`

- **Line 8:** `import { sendBulkSMS } from "@/lib/sms";`
- **Line 154:** `const smsResults = await sendBulkSMS(smsRecipients);`
- **Status:** `sendBulkSMS` in `sms.ts` (line 146) uses legacy `sendSMS` function only (no WhatsApp)
- **Note:** The route also imports `sendBulkWhatsApp` from `twilio-notifications` and calls it at line 160, so WhatsApp IS sent — but the SMS path uses the old pattern
- **Action:** Consider using a unified `sendMultiChannelNotification` loop instead of separate SMS and WhatsApp calls

---

## 5. Summary / Priority Matrix

| Priority  | Route                                                | Missing Notification                                             |
| --------- | ---------------------------------------------------- | ---------------------------------------------------------------- |
| 🔴 HIGH   | `api/events/`                                        | Event creation/update → Parents, Teachers                        |
| 🔴 HIGH   | `api/holidays/`                                      | Holiday declaration → Parents, Teachers                          |
| 🔴 HIGH   | `api/online-exams/`                                  | Exam published → Parents (time-sensitive)                        |
| 🔴 HIGH   | `api/transport/`                                     | Route changes → Parents of assigned students                     |
| 🟡 MEDIUM | `api/assignments/`                                   | New assignment → Parents                                         |
| 🟡 MEDIUM | `api/hostel/`                                        | Room allocation → Parent                                         |
| 🟡 MEDIUM | `api/teacher-attendance/`                            | Teacher absent → Admin                                           |
| 🟡 MEDIUM | `api/promotions/`                                    | Student promoted → Parent                                        |
| 🟡 MEDIUM | `api/visitors/`                                      | Visitor check-in → Teacher being visited                         |
| 🟡 MEDIUM | `api/teachers/`                                      | Teacher added/deactivated → Teacher                              |
| 🟡 MEDIUM | `api/students/import/`                               | Bulk import → Parents (registration)                             |
| 🟡 MEDIUM | `api/teachers/import/`                               | Bulk import → Teachers (welcome)                                 |
| 🟢 LOW    | `api/assignments/[id]/`                              | Assignment graded → Parent                                       |
| 🟢 LOW    | `api/online-exams/[id]/attempt/`                     | Auto-graded result → Parent                                      |
| 🟢 LOW    | `api/library/`                                       | Book issued/overdue → Parent/Teacher                             |
| 🟢 LOW    | `api/students/[id]/`                                 | Student record updated → Parent                                  |
| 🟢 LOW    | `api/teacher-evaluation/`                            | Evaluation submitted → Teacher                                   |
| 🟢 LOW    | `api/payment/verify/` + `api/payment/authorize-net/` | Payment confirmed → Admin                                        |
| ⚠️ FIX    | `api/leaves/`                                        | Remove dead `sendLeaveStatusAlert` import                        |
| ⚠️ FIX    | `api/subject-attendance/`                            | Remove dead `sendLowAttendanceWarning` import                    |
| ⚠️ FIX    | `api/fees/`                                          | Migrate `sendFeeReminderAlert` to `twilio-notifications` pattern |
| ⚠️ FIX    | `api/bulk-messages/`                                 | Migrate `sendBulkSMS` to unified multi-channel pattern           |

---

**Total routes scanned:** 96  
**Routes with notifications:** 16  
**Routes needing notifications:** 17  
**Routes not needing notifications:** 53  
**Dead imports / old patterns found:** 4
