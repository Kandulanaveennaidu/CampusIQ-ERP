/**
 * Cascade operations for soft-delete / deactivation.
 *
 * When a parent entity is deactivated or removed, related entities must be
 * cleaned up to avoid orphaned references and inconsistent state.
 *
 * All functions are fire-and-forget safe — they catch their own errors
 * so that a cascade failure never blocks the primary operation.
 */

import { logError } from "./logger";
import Subject from "@/lib/models/Subject";
import FacultyWorkload from "@/lib/models/FacultyWorkload";
import Transport from "@/lib/models/Transport";

/**
 * Cascade when a Teacher (User with role=teacher) is deactivated.
 * - Un-assigns teacher from subjects
 * - Removes faculty workload for the teacher
 */

export async function cascadeTeacherDeactivation(
  teacherId: string,
  schoolId: string,
): Promise<{ unassignedSubjects: number; removedWorkloads: number }> {
  const result = { unassignedSubjects: 0, removedWorkloads: 0 };
  try {
    // Un-assign teacher from all active subjects
    const subjectResult = await Subject.updateMany(
      { school: schoolId, teacherId, status: "active" },
      { $set: { teacherId: null, teacherName: "" } },
    );
    result.unassignedSubjects = subjectResult.modifiedCount;
  } catch (err) {
    logError("cascade", "cascadeTeacherDeactivation:subjects", err);
  }

  try {
    // Remove workload records for the deactivated teacher
    const workloadResult = await FacultyWorkload.deleteMany({
      school: schoolId,
      teacher: teacherId,
    });
    result.removedWorkloads = workloadResult.deletedCount;
  } catch (err) {
    logError("cascade", "cascadeTeacherDeactivation:workloads", err);
  }

  return result;
}

/**
 * Cascade when a Student is deactivated (status → "inactive").
 * - Removes student from transport assignedStudents arrays
 */
export async function cascadeStudentDeactivation(
  studentId: string,
  schoolId: string,
): Promise<{ removedFromTransport: number }> {
  const result = { removedFromTransport: 0 };
  try {
    // Remove from all transport vehicle assignments
    const transportResult = await Transport.updateMany(
      { school: schoolId, assignedStudents: studentId },
      { $pull: { assignedStudents: studentId } },
    );
    result.removedFromTransport = transportResult.modifiedCount;
  } catch (err) {
    logError("cascade", "cascadeStudentDeactivation:transport", err);
  }

  return result;
}

/**
 * Cascade when a Department is deleted.
 * - Nullifies department reference on subjects
 * - Nullifies department reference on faculty workloads
 */
export async function cascadeDepartmentDeletion(
  departmentId: string,
  schoolId: string,
): Promise<{ updatedSubjects: number; updatedWorkloads: number }> {
  const result = { updatedSubjects: 0, updatedWorkloads: 0 };
  try {
    const subjectResult = await Subject.updateMany(
      { school: schoolId, department: departmentId },
      { $set: { department: null } },
    );
    result.updatedSubjects = subjectResult.modifiedCount;
  } catch (err) {
    logError("cascade", "cascadeDepartmentDeletion:subjects", err);
  }

  try {
    const workloadResult = await FacultyWorkload.updateMany(
      { school: schoolId, department: departmentId },
      { $set: { department: null } },
    );
    result.updatedWorkloads = workloadResult.modifiedCount;
  } catch (err) {
    logError("cascade", "cascadeDepartmentDeletion:workloads", err);
  }

  return result;
}

/**
 * Pre-delete guard — checks if entities reference the target before deletion.
 * Returns an error message if references exist, null if safe to delete.
 */
export async function guardDepartmentDeletion(
  departmentId: string,
  schoolId: string,
): Promise<string | null> {
  try {
    const activeSubjects = await Subject.countDocuments({
      school: schoolId,
      department: departmentId,
      status: "active",
    });

    if (activeSubjects > 0) {
      return `Cannot delete department: ${activeSubjects} active subject(s) are assigned to it. Reassign or deactivate them first.`;
    }
  } catch (err) {
    logError("cascade", "guardDepartmentDeletion", err);
  }

  return null;
}