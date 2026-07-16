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
  const path = window.meeladPulseScopedFestivalPath();
  try {
    const docRef = doc(db, window.meeladPulseScopedFestivalPath());
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
  const path = window.meeladPulseScopedFestivalPath();
  try {
    const docRef = doc(db, window.meeladPulseScopedFestivalPath());
    const oldSettings = await getFestivalSettings(festId);
    
    const payload = {
      studentRegistrationMode: settings.studentRegistrationMode || 'adminOnly',
      studentRegistrationOpen: settings.studentRegistrationOpen !== false,
      teamLeaderStudentApprovalRequired: settings.teamLeaderStudentApprovalRequired === true,
      madrasaName: settings.madrasaName || '',
      festivalTitle: settings.festivalTitle || '',
      venueLocation: settings.venueLocation || '',
      festivalType: settings.festivalType || 'boysAndGirls',
      genderCompetitionMode: settings.genderCompetitionMode || 'separate',
      programmeScope: settings.programmeScope || 'artsAndSports',
      competitionSections: Array.isArray(settings.competitionSections) ? settings.competitionSections : [],
      customCompetitionSections: Array.isArray(settings.customCompetitionSections) ? settings.customCompetitionSections : [],
      setupBlueprintCompleted: settings.setupBlueprintCompleted === true,
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
    if ((oldSettings?.studentRegistrationMode || 'adminOnly') !== payload.studentRegistrationMode) {
      changes.push(`mode: ${oldSettings?.studentRegistrationMode || 'adminOnly'} -> ${payload.studentRegistrationMode}`);
    }
    if ((oldSettings?.studentRegistrationOpen !== false) !== payload.studentRegistrationOpen) {
      changes.push(`open: ${oldSettings?.studentRegistrationOpen !== false} -> ${payload.studentRegistrationOpen}`);
    }
    if ((oldSettings?.teamLeaderStudentApprovalRequired === true) !== payload.teamLeaderStudentApprovalRequired) {
      changes.push(`approvalRequired: ${oldSettings?.teamLeaderStudentApprovalRequired === true} -> ${payload.teamLeaderStudentApprovalRequired}`);
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
    return isAdminStudentMode(settings.studentRegistrationMode || 'adminOnly');
  }

  if (profile.role === 'teamLeader') {
    return isTeamLeaderStudentMode(settings.studentRegistrationMode || 'adminOnly');
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
    return isAdminStudentMode(settings.studentRegistrationMode || 'adminOnly');
  }

  if (profile.role === 'teamLeader') {
    // Team Leader can edit if mode is teamLeadersOnly, and student belongs to their team, 
    // and is not already approved if approval is required.
    if (!isTeamLeaderStudentMode(settings.studentRegistrationMode || 'adminOnly')) return false;
    if (student.teamId !== profile.teamId) return false;
    return true;
  }

  return false;
}


export function normalizeStudentName(name = '') {
  const clean = name.trim().replace(/\s+/g, ' ');
  return /^[A-Za-z .'-]+$/.test(clean) ? clean.toUpperCase() : clean;
}

function isAdminStudentMode(mode = 'adminOnly') {
  return ['adminOnly', 'all'].includes(mode);
}

function isTeamLeaderStudentMode(mode = 'adminOnly') {
  return ['teamLeadersOnly', 'all'].includes(mode);
}

function isPublicStudentMode(mode = 'adminOnly') {
  return ['publicRegistrationOnly', 'registration', 'all'].includes(mode);
}

async function allocateChestNumberForStudent(studentData) {
  if (!studentData.teamId) throw new Error('Team group selection is required before assigning a chest number.');
  if (!studentData.categoryId) throw new Error('Category selection is required before assigning a chest number.');
  const teamRef = doc(db, window.meeladPulseScopedFestivalPath('teams'), studentData.teamId);
  const teamSnap = await getDoc(teamRef);
  if (!teamSnap.exists()) throw new Error('Selected team group was not found.');
  const team = teamSnap.data();
  const gender = (studentData.gender || '').toLowerCase();
  const categoryKey = team.chestMode === 'gender' && gender ? `${studentData.categoryId}_${gender}` : studentData.categoryId;
  const fallbackStart = team.chestMode === 'gender'
    ? Number(team.categoryChestStartNumbers?.[studentData.categoryId]?.[gender] || team.chestStartNumbers?.[gender] || team.chestStartNumber || 1)
    : Number(team.categoryChestStartNumbers?.[studentData.categoryId]?.common || team.chestStartNumber || 1);
  const nextNumber = Number(team.nextChestByCategory?.[categoryKey] || fallbackStart || 1);
  const chestNumber = String(nextNumber).padStart(3, '0');
  const qChest = query(collection(db, window.meeladPulseScopedFestivalPath('festStudents')), where('chestNumber', '==', chestNumber));
  const snapChest = await getDocs(qChest);
  if (!snapChest.empty) {
    throw new Error(`Chest number ${chestNumber} is already assigned to another student in this festival.`);
  }
  await updateDoc(teamRef, { [`nextChestByCategory.${categoryKey}`]: nextNumber + 1, updatedAt: serverTimestamp() });
  return chestNumber;
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
  const mode = settings.studentRegistrationMode || 'adminOnly';
  if (profile.role === 'admin' && !isAdminStudentMode(mode)) {
    throw new Error("Student registration mode does not allow admin-added students.");
  }
  if (profile.role === 'teamLeader' && !isTeamLeaderStudentMode(mode)) {
    throw new Error("Student registration mode does not allow team-leader-added students.");
  }

  if (!studentData.teamId) {
    throw new Error("Team group selection is required before adding students.");
  }
  if (!studentData.categoryId) {
    throw new Error("Category selection is required before adding students.");
  }

  const duplicates = await findDuplicateFestivalStudents({
    name: studentData.name,
    teamId: studentData.teamId,
    categoryId: studentData.categoryId,
    gender: studentData.gender
  });
  if (duplicates?.length && !studentData.allowDuplicate) {
    throw new Error("A matching student already exists in this team/category. Review duplicates before saving.");
  }

  let chestNumber = (studentData.chestNumber || '').toString().trim();
  if (!chestNumber) {
    chestNumber = await allocateChestNumberForStudent(studentData);
  } else {
    const festStudentsCol = collection(db, window.meeladPulseScopedFestivalPath('festStudents'));
    const qChest = query(festStudentsCol, where('chestNumber', '==', chestNumber));
    const snapChest = await getDocs(qChest);
    if (!snapChest.empty) {
      throw new Error(`Chest number ${chestNumber} is already assigned to another student in this festival.`);
    }
  }

  const studentId = `stud_${studentData.teamId}_${chestNumber}`;
  const path = window.meeladPulseScopedFestivalPath(`festStudents/${studentId}`);

  // Determine initial status based on role and settings
  let status = 'active';
  if (profile.role !== 'admin') {
    status = settings.teamLeaderStudentApprovalRequired ? 'pending_approval' : 'active';
  }

  const payload = {
    id: studentId,
    studentId,
    festId,
    teamId: studentData.teamId,
    categoryId: studentData.categoryId,
    subdivisionId: studentData.subdivisionId || '',
    name: normalizeStudentName(studentData.name),
    gender: studentData.gender || '',
    orderNumber: Number(studentData.orderNumber) || 0,
    phone: studentData.phone || '',
    chestNumber,
    status,
    createdBy: profile.uid,
    createdByRole: profile.role,
    registrationSource: studentData.registrationSource || profile.role,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(doc(db, window.meeladPulseScopedFestivalPath('festStudents'), studentId), payload);
    
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


export function normalizeStudentStatus(status = 'active') {
  if (status === 'pending') return 'pending_approval';
  if (!status || status === 'active') return 'approved';
  if (status === 'pending_approval') return 'pending';
  return status;
}

export async function findDuplicateFestivalStudents({ name, teamId, categoryId, gender, excludeId = '' }) {
  const cleanName = normalizeStudentName(name || '');
  const path = window.meeladPulseScopedFestivalPath('festStudents');
  try {
    const snap = await getDocs(query(
      collection(db, path),
      where('teamId', '==', teamId || ''),
      where('categoryId', '==', categoryId || '')
    ));
    return snap.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .filter((student) => student.id !== excludeId)
      .filter((student) => normalizeStudentName(student.name || '') === cleanName)
      .filter((student) => !gender || !student.gender || String(student.gender).toLowerCase() === String(gender).toLowerCase());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createPublicStudentRegistration(studentData, { institutionId, festivalId } = {}) {
  assertOnline('Public Student Registration');
  const currentScope = getActiveFestivalId ? null : null;
  const scopedPath = institutionId && festivalId
    ? `institutions/${institutionId}/festivals/${festivalId}`
    : window.meeladPulseScopedFestivalPath();
  const settingsRef = doc(db, scopedPath);
  const settingsSnap = await getDoc(settingsRef);
  const settings = settingsSnap.exists() ? settingsSnap.data() : {};
  if (settings.studentRegistrationOpen === false) {
    throw new Error('Public registration is currently closed.');
  }
  const mode = settings.studentRegistrationMode || 'adminOnly';
  if (!isPublicStudentMode(mode)) {
    throw new Error('Public registration is not enabled for this festival.');
  }
  if (!studentData.phone || !studentData.name || !studentData.teamId || !studentData.categoryId) {
    throw new Error('Name, phone, team, and category are required.');
  }
  const duplicateSnap = await getDocs(query(
    collection(db, `${scopedPath}/festStudents`),
    where('phone', '==', studentData.phone.trim())
  ));
  const cleanName = normalizeStudentName(studentData.name);
  const hasDuplicate = duplicateSnap.docs.some((docSnap) => {
    const data = docSnap.data();
    return normalizeStudentName(data.name || '') === cleanName && data.teamId === studentData.teamId && data.categoryId === studentData.categoryId;
  });
  if (hasDuplicate) {
    throw new Error('A matching registration already exists for this phone number.');
  }
  const newRef = doc(collection(db, `${scopedPath}/festStudents`));
  const payload = {
    id: newRef.id,
    studentId: newRef.id,
    institutionId: institutionId || '',
    festivalId: festivalId || '',
    festId: festivalId || '',
    teamId: studentData.teamId,
    categoryId: studentData.categoryId,
    gender: studentData.gender || '',
    name: cleanName,
    phone: studentData.phone.trim(),
    guardianName: studentData.guardianName || '',
    notes: studentData.notes || '',
    chestNumber: '',
    status: 'pending_approval',
    registrationSource: 'public',
    createdByRole: 'public',
    rejectionReason: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  await setDoc(newRef, payload);
  return newRef.id;
}

export async function getPublicStudentRegistrationsByPhone(phone, { institutionId, festivalId } = {}) {
  const scopedPath = institutionId && festivalId
    ? `institutions/${institutionId}/festivals/${festivalId}`
    : window.meeladPulseScopedFestivalPath();
  const cleanPhone = (phone || '').trim();
  if (!cleanPhone) return [];
  const snap = await getDocs(query(collection(db, `${scopedPath}/festStudents`), where('phone', '==', cleanPhone)));
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
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

  const path = window.meeladPulseScopedFestivalPath(`festStudents/${studentId}`);
  
  try {
    const docRef = doc(db, window.meeladPulseScopedFestivalPath('festStudents'), studentId);
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
      const qChest = query(collection(db, window.meeladPulseScopedFestivalPath('festStudents')), where('chestNumber', '==', newChest));
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
  const path = window.meeladPulseScopedFestivalPath(`festStudents/${studentId}`);
  const profile = window.currentUserProfile;

  if (!profile || profile.role !== 'admin') {
    throw new Error("Unauthorized access. Admin role required.");
  }

  try {
    const docRef = doc(db, window.meeladPulseScopedFestivalPath('festStudents'), studentId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error("Student not found.");
    }

    const current = snap.data();
    const approvalPayload = {
      status: 'active',
      approvedBy: profile.uid,
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    if (!current.chestNumber) {
      approvalPayload.chestNumber = await allocateChestNumberForStudent(current);
    }
    await updateDoc(docRef, approvalPayload);

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
  const path = window.meeladPulseScopedFestivalPath(`festStudents/${studentId}`);
  const profile = window.currentUserProfile;

  if (!profile || profile.role !== 'admin') {
    throw new Error("Unauthorized access. Admin role required.");
  }

  if (!reason || !reason.trim()) {
    throw new Error("Rejection reason is required.");
  }

  try {
    const docRef = doc(db, window.meeladPulseScopedFestivalPath('festStudents'), studentId);
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
  const path = window.meeladPulseScopedFestivalPath(`festStudents/${studentId}`);
  const profile = window.currentUserProfile;

  if (!profile || profile.role !== 'admin') {
    throw new Error("Unauthorized access. Admin role required for emergency override.");
  }

  if (!reason || !reason.trim()) {
    throw new Error("Override justification/reason is required for auditing.");
  }

  try {
    const docRef = doc(db, window.meeladPulseScopedFestivalPath('festStudents'), studentId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error("Student not found.");
    }
    const currentStudent = snap.data();

    // Check chest number uniqueness if changed
    const newChest = studentData.chestNumber.trim();
    if (newChest !== currentStudent.chestNumber) {
      const qChest = query(collection(db, window.meeladPulseScopedFestivalPath('festStudents')), where('chestNumber', '==', newChest));
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
  const path = window.meeladPulseScopedFestivalPath('festStudents');
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
