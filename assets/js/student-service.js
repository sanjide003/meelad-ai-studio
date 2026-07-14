import { db, auth } from "./firebase-init.js";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getActiveFestivalId, handleFirestoreError, OperationType } from "./firestore-service.js";
import { logAuditEvent } from "./audit-service.js";
import { assertOnline } from "./network-status.js";

/**
 * Retrieves the current Festival settings.
 */
export async function getFestivalSettings(festId) {
  const fId = festId || getActiveFestivalId();
  const path = `festivals/${fId}`;
  try {
    const docRef = doc(db, 'festivals', fId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        id: snap.id,
        studentRegistrationMode: data.studentRegistrationMode || 'adminOnly',
        studentRegistrationOpen: data.studentRegistrationOpen !== false,
        teamLeaderStudentApprovalRequired: data.teamLeaderStudentApprovalRequired === true,
        championshipTieBreakers: data.championshipTieBreakers || [
          'totalPoints',
          'firstPlaceCount',
          'secondPlaceCount',
          'thirdPlaceCount',
          'aGradeCount',
          'averagePercentage',
          'adminDecision'
        ],
        ...data
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Updates Festival Settings (Admin-only).
 */
export async function updateFestivalSettings(settings) {
  assertOnline('Registration Mode / Settings Change');
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}`;
  try {
    const docRef = doc(db, 'festivals', festId);
    const oldSettings = await getFestivalSettings(festId);
    
    const payload = {
      studentRegistrationMode: settings.studentRegistrationMode || 'adminOnly',
      studentRegistrationOpen: settings.studentRegistrationOpen !== false,
      teamLeaderStudentApprovalRequired: settings.teamLeaderStudentApprovalRequired === true,
      madrasaName: settings.madrasaName || '',
      festivalTitle: settings.festivalTitle || '',
      venueLocation: settings.venueLocation || '',
      championshipTieBreakers: settings.championshipTieBreakers || [
        'totalPoints',
        'firstPlaceCount',
        'secondPlaceCount',
        'thirdPlaceCount',
        'aGradeCount',
        'averagePercentage',
        'adminDecision'
      ],
      updatedAt: serverTimestamp()
    };
    
    await setDoc(docRef, payload, { merge: true });

    // Audit logs for settings changes
    const changes = [];
    if (oldSettings.studentRegistrationMode !== payload.studentRegistrationMode) {
      changes.push(`mode: ${oldSettings.studentRegistrationMode} -> ${payload.studentRegistrationMode}`);
    }
    if (oldSettings.studentRegistrationOpen !== payload.studentRegistrationOpen) {
      changes.push(`open: ${oldSettings.studentRegistrationOpen} -> ${payload.studentRegistrationOpen}`);
    }
    if (oldSettings.teamLeaderStudentApprovalRequired !== payload.teamLeaderStudentApprovalRequired) {
      changes.push(`approvalRequired: ${oldSettings.teamLeaderStudentApprovalRequired} -> ${payload.teamLeaderStudentApprovalRequired}`);
    }

    if (changes.length > 0) {
      await logAuditEvent(
        'festival_settings_update', 
        festId, 
        `Updated student registration settings: ${changes.join(', ')}`, 
        { settings: payload }
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Checks if the current user profile can create a student.
 */
export async function canCurrentUserCreateStudent() {
  const festId = getActiveFestivalId();
  const settings = await getFestivalSettings(festId);
  const profile = window.currentUserProfile;

  if (!profile) return false;
  if (!settings.studentRegistrationOpen) return false;

  if (profile.role === 'admin') {
    return settings.studentRegistrationMode === 'adminOnly';
  }

  if (profile.role === 'teamLeader') {
    return settings.studentRegistrationMode === 'teamLeadersOnly';
  }

  return false;
}

/**
 * Checks if the current user profile can edit a student profile directly (no emergency override).
 */
export async function canCurrentUserEditStudent(student) {
  const festId = getActiveFestivalId();
  const settings = await getFestivalSettings(festId);
  const profile = window.currentUserProfile;

  if (!profile) return false;
  if (!settings.studentRegistrationOpen) return false;

  if (profile.role === 'admin') {
    return settings.studentRegistrationMode === 'adminOnly';
  }

  if (profile.role === 'teamLeader') {
    // Team Leader can edit if mode is teamLeadersOnly, and student belongs to their team, 
    // and is not already approved if approval is required.
    if (settings.studentRegistrationMode !== 'teamLeadersOnly') return false;
    if (student.teamId !== profile.teamId) return false;
    return true;
  }

  return false;
}

/**
 * Creates a new Festival Student.
 */
export async function createFestivalStudent(studentData) {
  const festId = getActiveFestivalId();
  const settings = await getFestivalSettings(festId);
  const profile = window.currentUserProfile;

  if (!profile) {
    throw new Error("Authentication required.");
  }

  // Ensure registration is open
  if (!settings.studentRegistrationOpen) {
    throw new Error("Student registration is currently closed.");
  }

  // Validate permission by mode
  if (profile.role === 'admin' && settings.studentRegistrationMode !== 'adminOnly') {
    throw new Error("Student registration mode is set to Team Leaders Only. Admins cannot normally register students.");
  }
  if (profile.role === 'teamLeader' && settings.studentRegistrationMode !== 'teamLeadersOnly') {
    throw new Error("Student registration mode is set to Admin Only. Team Leaders cannot register students.");
  }

  if (!studentData.teamId) {
    throw new Error("Team group selection is required before adding students.");
  }
  if (!studentData.categoryId) {
    throw new Error("Category selection is required before adding students.");
  }

  let chestNumber = (studentData.chestNumber || '').toString().trim();
  if (!chestNumber) {
    const teamRef = doc(db, `festivals/${festId}/teams`, studentData.teamId);
    const teamSnap = await getDoc(teamRef);
    if (!teamSnap.exists()) {
      throw new Error("Selected team group was not found.");
    }
    const team = teamSnap.data();
    const nextNumber = Number(team.nextChestNumber || team.chestStartNumber || 1);
    chestNumber = String(nextNumber).padStart(3, '0');
    await updateDoc(teamRef, { nextChestNumber: nextNumber + 1, updatedAt: serverTimestamp() });
  }

  // Check if chest number is unique in this festival
  const festStudentsCol = collection(db, `festivals/${festId}/festStudents`);
  const qChest = query(festStudentsCol, where('chestNumber', '==', chestNumber));
  const snapChest = await getDocs(qChest);
  if (!snapChest.empty) {
    throw new Error(`Chest number ${chestNumber} is already assigned to another student in this festival.`);
  }

  const studentId = `stud_${studentData.teamId}_${chestNumber}`;
  const path = `festivals/${festId}/festStudents/${studentId}`;

  // Determine initial status based on role and settings
  let status = 'active';
  if (profile.role === 'teamLeader' && settings.teamLeaderStudentApprovalRequired) {
    status = 'pending_approval';
  }

  const payload = {
    id: studentId,
    studentId,
    festId,
    teamId: studentData.teamId,
    categoryId: studentData.categoryId,
    subdivisionId: studentData.subdivisionId || '',
    name: studentData.name.trim(),
    chestNumber,
    status,
    createdBy: profile.uid,
    createdByRole: profile.role,
    registrationSource: profile.role,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(doc(db, `festivals/${festId}/festStudents`, studentId), payload);
    
    await logAuditEvent(
      'student_created', 
      studentId, 
      `Registered student ${payload.name} (Chest: ${chestNumber}) for team ${payload.teamId} with status ${status}.`, 
      { student: payload }
    );
    
    return studentId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Updates a Festival Student.
 */
export async function updateFestivalStudent(studentId, studentData) {
  const festId = getActiveFestivalId();
  const settings = await getFestivalSettings(festId);
  const profile = window.currentUserProfile;

  if (!profile) {
    throw new Error("Authentication required.");
  }

  // Ensure registration is open
  if (!settings.studentRegistrationOpen) {
    throw new Error("Student registration is currently closed.");
  }

  const path = `festivals/${festId}/festStudents/${studentId}`;
  
  try {
    const docRef = doc(db, `festivals/${festId}/festStudents`, studentId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error("Student not found.");
    }
    const currentStudent = snap.data();

    // Validate edit permissions
    const canEdit = await canCurrentUserEditStudent(currentStudent);
    if (!canEdit) {
      throw new Error("You do not have permission to edit this student in the current mode.");
    }

    // Verify chest number uniqueness if it is being changed
    const newChest = studentData.chestNumber.trim();
    if (newChest !== currentStudent.chestNumber) {
      const qChest = query(collection(db, `festivals/${festId}/festStudents`), where('chestNumber', '==', newChest));
      const snapChest = await getDocs(qChest);
      if (!snapChest.empty) {
        throw new Error(`Chest number ${newChest} is already assigned to another student.`);
      }
    }

    const payload = {
      name: studentData.name.trim(),
      chestNumber: newChest,
      categoryId: studentData.categoryId,
      updatedAt: serverTimestamp()
    };

    // If team leader edits a previously rejected student, change status back to pending_approval or active
    if (profile.role === 'teamLeader' && currentStudent.status === 'rejected') {
      payload.status = settings.teamLeaderStudentApprovalRequired ? 'pending_approval' : 'active';
      payload.rejectionReason = '';
    }

    await updateDoc(docRef, payload);

    await logAuditEvent(
      'student_updated', 
      studentId, 
      `Updated student ${payload.name} (Chest: ${payload.chestNumber}) profile details.`, 
      { original: currentStudent, updated: payload }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Admins can approve a student registered by a Team Leader.
 */
export async function approveStudent(studentId) {
  assertOnline('Student Approval');
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/festStudents/${studentId}`;
  const profile = window.currentUserProfile;

  if (!profile || profile.role !== 'admin') {
    throw new Error("Unauthorized access. Admin role required.");
  }

  try {
    const docRef = doc(db, `festivals/${festId}/festStudents`, studentId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error("Student not found.");
    }

    await updateDoc(docRef, {
      status: 'active',
      approvedBy: profile.uid,
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await logAuditEvent(
      'student_approved', 
      studentId, 
      `Approved student registration for ${snap.data().name} (Chest: ${snap.data().chestNumber}).`, 
      { studentId }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Admins can reject a student registered by a Team Leader with a reason.
 */
export async function rejectStudent(studentId, reason) {
  assertOnline('Student Rejection');
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/festStudents/${studentId}`;
  const profile = window.currentUserProfile;

  if (!profile || profile.role !== 'admin') {
    throw new Error("Unauthorized access. Admin role required.");
  }

  if (!reason || !reason.trim()) {
    throw new Error("Rejection reason is required.");
  }

  try {
    const docRef = doc(db, `festivals/${festId}/festStudents`, studentId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error("Student not found.");
    }

    await updateDoc(docRef, {
      status: 'rejected',
      rejectionReason: reason.trim(),
      rejectedBy: profile.uid,
      rejectedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await logAuditEvent(
      'student_rejected', 
      studentId, 
      `Rejected student registration for ${snap.data().name} (Chest: ${snap.data().chestNumber}). Reason: ${reason}`, 
      { studentId, reason }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Admins can perform an emergency correction override under teamLeadersOnly mode.
 */
export async function performEmergencyStudentOverride(studentId, studentData, reason) {
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/festStudents/${studentId}`;
  const profile = window.currentUserProfile;

  if (!profile || profile.role !== 'admin') {
    throw new Error("Unauthorized access. Admin role required for emergency override.");
  }

  if (!reason || !reason.trim()) {
    throw new Error("Override justification/reason is required for auditing.");
  }

  try {
    const docRef = doc(db, `festivals/${festId}/festStudents`, studentId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error("Student not found.");
    }
    const currentStudent = snap.data();

    // Check chest number uniqueness if changed
    const newChest = studentData.chestNumber.trim();
    if (newChest !== currentStudent.chestNumber) {
      const qChest = query(collection(db, `festivals/${festId}/festStudents`), where('chestNumber', '==', newChest));
      const snapChest = await getDocs(qChest);
      if (!snapChest.empty) {
        throw new Error(`Chest number ${newChest} is already assigned to another student.`);
      }
    }

    const payload = {
      name: studentData.name.trim(),
      chestNumber: newChest,
      categoryId: studentData.categoryId,
      emergencyOverride: true,
      emergencyOverrideReason: reason.trim(),
      emergencyOverrideBy: profile.uid,
      emergencyOverrideAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await updateDoc(docRef, payload);

    await logAuditEvent(
      'emergency_student_override', 
      studentId, 
      `Emergency Override: Admin corrected student ${currentStudent.name} (Chest: ${currentStudent.chestNumber}) to ${payload.name} (Chest: ${payload.chestNumber}). Reason: ${reason}`, 
      { original: currentStudent, updated: payload, reason }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Fetches all students for a given festival.
 */
export async function getAllFestivalStudents() {
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/festStudents`;
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
