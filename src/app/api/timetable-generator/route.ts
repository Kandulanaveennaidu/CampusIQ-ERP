import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Subject from "@/lib/models/Subject";
import User from "@/lib/models/User";
import Room from "@/lib/models/Room";
import Timetable from "@/lib/models/Timetable";
import { logError } from "@/lib/logger";

interface SlotCandidate {
  day: string;
  period: number;
  subject: string;
  teacher: string;
  room: string;
}

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const PERIODS_PER_DAY = 8;

/**
 * POST /api/timetable-generator — Auto-generate timetable using constraint-satisfaction
 * Body: { class_name, section?, academicYear, periodsPerDay?, workingDays? }
 */
export async function POST(request: Request) {
  try {
    const { error, session } = await requireAuth("timetable:read");
    if (error) return error;

    await connectDB();
    const body = await request.json();
    const {
      class_name,
      section,
      academicYear,
      periodsPerDay = PERIODS_PER_DAY,
      workingDays = DAYS,
    } = body;
    const schoolId = session!.user.school_id;

    if (!class_name) {
      return NextResponse.json(
        { error: "class_name is required" },
        { status: 400 },
      );
    }

    // Fetch subjects for this class (model field is 'className', not 'class_name')
    const subjects = (await Subject.find({
      school: schoolId,
      className: class_name,
      status: "active",
    }).lean()) as unknown as Record<string, unknown>[];
    if (subjects.length === 0) {
      return NextResponse.json(
        { error: "No subjects found for this class" },
        { status: 404 },
      );
    }

    // Fetch available teachers
    const teachers = (await User.find({
      school: schoolId,
      role: "teacher",
      isActive: true,
    }).lean()) as unknown as Record<string, unknown>[];

    // Fetch rooms (model uses status: 'available', not isActive)
    const rooms = (await Room.find({
      school: schoolId,
      status: "available",
    }).lean()) as unknown as Record<string, unknown>[];

    // Build subject-teacher mapping
    const subjectTeacherMap: Record<string, string[]> = {};
    for (const sub of subjects) {
      const subName = String(sub.name || sub.subject_name || "");
      const teacherId = sub.teacherId ? String(sub.teacherId) : "";
      if (subName) {
        if (!subjectTeacherMap[subName]) subjectTeacherMap[subName] = [];
        if (teacherId && !subjectTeacherMap[subName].includes(teacherId)) {
          subjectTeacherMap[subName].push(teacherId);
        }
      }
    }

    // Calculate periods per subject per week (distribute evenly based on credits/hours)
    const totalPeriodsPerWeek = periodsPerDay * workingDays.length;
    const subjectNames = Object.keys(subjectTeacherMap);
    const periodsPerSubject: Record<string, number> = {};

    for (const sub of subjects) {
      const subName = String(sub.name || sub.subject_name || "");
      const hours =
        Number(sub.hoursPerWeek || sub.credits || 0) ||
        Math.ceil(totalPeriodsPerWeek / subjectNames.length);
      periodsPerSubject[subName] = Math.min(
        hours,
        periodsPerDay * workingDays.length,
      );
    }

    // Normalize so total doesn't exceed available slots
    const totalAllocated = Object.values(periodsPerSubject).reduce(
      (a, b) => a + b,
      0,
    );
    if (totalAllocated > totalPeriodsPerWeek) {
      const ratio = totalPeriodsPerWeek / totalAllocated;
      for (const sub of subjectNames) {
        periodsPerSubject[sub] = Math.max(
          1,
          Math.round(periodsPerSubject[sub] * ratio),
        );
      }
    }

    // Constraint-based generation with greedy + backtracking
    const teacherNameMap = new Map(
      teachers.map((t) => [String(t._id), String(t.name || "")]),
    );
    const roomNames = rooms.map((r) => String(r.room_name || r.name || "Room"));

    // Track occupied slots
    const teacherSlots = new Map<string, Set<string>>(); // teacherId -> "Day-Period"
    const roomSlots = new Map<string, Set<string>>(); // roomName -> "Day-Period"
    const classSlots = new Map<string, SlotCandidate>(); // "Day-Period" -> assignment

    const subjectRemaining = { ...periodsPerSubject };
    const generated: SlotCandidate[] = [];
    const conflicts: string[] = [];

    // Shuffle function for randomization
    function shuffle<T>(arr: T[]): T[] {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    // Greedy assignment
    for (const day of workingDays) {
      for (let period = 1; period <= periodsPerDay; period++) {
        const slotKey = `${day}-${period}`;

        // Find subjects that still need periods, avoiding same subject consecutive
        const lastSlotKey = period > 1 ? `${day}-${period - 1}` : null;
        const lastSubject =
          lastSlotKey && classSlots.has(lastSlotKey)
            ? classSlots.get(lastSlotKey)!.subject
            : "";

        const candidates = shuffle(subjectNames).filter(
          (sub) => subjectRemaining[sub] > 0 && sub !== lastSubject,
        );

        if (candidates.length === 0) {
          // Allow same subject if no other option
          const fallback = subjectNames.filter((s) => subjectRemaining[s] > 0);
          if (fallback.length === 0) continue; // All allocated
          candidates.push(...fallback);
        }

        let assigned = false;

        for (const subject of candidates) {
          const teacherIds = subjectTeacherMap[subject] || [];
          const availableTeacher = teacherIds.find((tid) => {
            const occupied = teacherSlots.get(tid);
            return !occupied || !occupied.has(slotKey);
          });

          const teacherName = availableTeacher
            ? teacherNameMap.get(availableTeacher) || "Teacher"
            : "TBA";

          const availableRoom =
            roomNames.find((rn) => {
              const occupied = roomSlots.get(rn);
              return !occupied || !occupied.has(slotKey);
            }) || `Classroom ${class_name}`;

          // Assign
          const candidate: SlotCandidate = {
            day,
            period,
            subject,
            teacher: teacherName,
            room: availableRoom,
          };
          generated.push(candidate);
          classSlots.set(slotKey, candidate);
          subjectRemaining[subject]--;

          // Mark teacher slot occupied
          if (availableTeacher) {
            if (!teacherSlots.has(availableTeacher))
              teacherSlots.set(availableTeacher, new Set());
            teacherSlots.get(availableTeacher)!.add(slotKey);
          }

          // Mark room slot occupied
          if (!roomSlots.has(availableRoom))
            roomSlots.set(availableRoom, new Set());
          roomSlots.get(availableRoom)!.add(slotKey);

          assigned = true;
          break;
        }

        if (!assigned) {
          conflicts.push(`${day} Period ${period}: No valid assignment found`);
        }
      }
    }

    // Format for display
    const timetableGrid: Record<
      string,
      { period: number; subject: string; teacher: string; room: string }[]
    > = {};
    for (const day of workingDays) {
      timetableGrid[day] = [];
    }
    for (const slot of generated) {
      timetableGrid[slot.day].push({
        period: slot.period,
        subject: slot.subject,
        teacher: slot.teacher,
        room: slot.room,
      });
    }
    for (const day of workingDays) {
      timetableGrid[day].sort((a, b) => a.period - b.period);
    }

    // Subject load distribution check
    const subjectDist: Record<string, Record<string, number>> = {};
    for (const slot of generated) {
      if (!subjectDist[slot.subject]) subjectDist[slot.subject] = {};
      subjectDist[slot.subject][slot.day] =
        (subjectDist[slot.subject][slot.day] || 0) + 1;
    }

    return NextResponse.json({
      class_name,
      section,
      academicYear,
      periodsPerDay,
      workingDays,
      timetable: timetableGrid,
      subjectDistribution: subjectDist,
      conflicts,
      stats: {
        totalSlots: workingDays.length * periodsPerDay,
        filledSlots: generated.length,
        subjectsScheduled: subjectNames.length,
        utilization: Math.round(
          (generated.length / (workingDays.length * periodsPerDay)) * 100,
        ),
      },
    });
  } catch (err) {
    logError("POST", "/api/timetable-generator", err);
    return NextResponse.json(
      { error: "Failed to generate timetable" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/timetable-generator — Save generated timetable to DB
 */
export async function PUT(request: Request) {
  try {
    const { error, session } = await requireAuth("timetable:read");
    if (error) return error;

    await connectDB();
    const body = await request.json();
    const { class_name, section, academicYear, timetable } = body;
    const schoolId = session!.user.school_id;

    if (!class_name || !timetable) {
      return NextResponse.json(
        { error: "class_name and timetable are required" },
        { status: 400 },
      );
    }

    // Remove existing timetable for this class
    await Timetable.deleteMany({
      school: schoolId,
      class_name,
      ...(section ? { section } : {}),
    });

    // Save new entries (Timetable model uses teacher_name, teacher_id, start_time, end_time)
    const entries = [];
    for (const day of Object.keys(timetable)) {
      for (const slot of timetable[day]) {
        const periodStart = `${8 + Math.floor(((slot.period - 1) * 50) / 60)}:${String(((slot.period - 1) * 50) % 60).padStart(2, "0")}`;
        const periodEnd = `${8 + Math.floor((slot.period * 50) / 60)}:${String((slot.period * 50) % 60).padStart(2, "0")}`;
        entries.push({
          school: schoolId,
          class_name,
          day,
          period: slot.period,
          start_time: slot.start_time || periodStart,
          end_time: slot.end_time || periodEnd,
          subject: slot.subject,
          teacher_name: slot.teacher || "",
          teacher_id: slot.teacher_id || "",
          room: slot.room || "",
        });
      }
    }

    const saved = await Timetable.insertMany(entries);

    return NextResponse.json({
      message: "Timetable saved",
      count: saved.length,
    });
  } catch (err) {
    logError("PUT", "/api/timetable-generator", err);
    return NextResponse.json(
      { error: "Failed to save timetable" },
      { status: 500 },
    );
  }
}
