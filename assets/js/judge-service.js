// MeeladPulse Judge Management, Assignment & Blind Security Service
import { db, auth } from "./firebase-init.js";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getActiveFestivalId, assertAdminRole, handleFirestoreError, OperationType } from "./firestore-service.js";
import { createSecureInvitation } from "./invitation-service.js";

/**
 * Fetch all registered users with the 'judge' role.
 */
export async function getJudges() {
  const path = "users";
  try {
    const q = query(collection(db, "users"), where("role", "==", "judge"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Create a secure activation invitation specifically for a new judge.
 */
export async function inviteJudge(name, email) {
  assertAdminRole();
  try {
    return await createSecureInvitation(name, email, "judge", null);
  } catch (error) {
    console.error("Invite judge error:", error);
    throw error;
  }
}

/**
 * Fetch all judge assignments for the current festival scope.
 */
export async function getJudgeAssignments() {
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/judgeAssignments`;
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Fetch assignments specifically for a logged-in judge.
 */
export async function getAssignmentsForJudge(judgeUserId) {
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/judgeAssignments`;
  try {
    const q = query(collection(db, path), where("judgeUserId", "==", judgeUserId), where("active", "==", true));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Verify if a judge assignment is valid and active.
 */
export async function verifyJudgeAssignment(judgeUserId, competitionId) {
  const assignments = await getAssignmentsForJudge(judgeUserId);
  return assignments.some(a => a.competitionId === competitionId);
}

/**
 * Checks if the current or specified judge is marked as the Head Judge for a competition.
 */
export async function checkHeadJudgeStatus(judgeUserId, competitionId) {
  const assignments = await getAssignmentsForJudge(judgeUserId);
  const match = assignments.find(a => a.competitionId === competitionId);
  return match ? (match.isHeadJudge === true) : false;
}

/**
 * Detects schedule conflicts for a judge.
 */
export async function detectJudgeScheduleConflicts(judgeUserId, compDate, compTime, excludeCompId = null) {
  const festId = getActiveFestivalId();
  const assigns = await getAssignmentsForJudge(judgeUserId);
  const conflicts = [];

  for (const a of assigns) {
    if (a.competitionId === excludeCompId) continue;
    
    // Get assigned competition details
    const compDoc = await getDoc(doc(db, `festivals/${festId}/competitions`, a.competitionId));
    if (compDoc.exists()) {
      const c = compDoc.data();
      if (c.eventDate === compDate && c.startTime === compTime) {
        conflicts.push({
          competitionId: a.competitionId,
          name: c.name,
          code: c.code
        });
      }
    }
  }
  return conflicts;
}

/**
 * Load judge-safe competition data.
 */
export async function getJudgeSafeCompetition(competitionId) {
  const festId = getActiveFestivalId();
  const docRef = doc(db, `festivals/${festId}/competitions`, competitionId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error("Competition not found.");
  }
  const comp = snap.data();
  // Safe returned fields - remove any unpublished metadata or parameters if any
  return {
    id: snap.id,
    name: comp.name,
    code: comp.code,
    divisionId: comp.divisionId,
    subdivisionId: comp.subdivisionId,
    categoryId: comp.categoryId,
    genderMode: comp.genderMode,
    performanceType: comp.performanceType,
    competitionType: comp.competitionType,
    eventDate: comp.eventDate,
    startTime: comp.startTime,
    rules: comp.rules,
    maxMark: comp.maxMark || 100,
    blindJudgingMode: comp.blindJudgingMode || 'none',
    status: comp.status,
    judgeCountRequired: comp.judgeCountRequired || 3
  };
}

/**
 * Load judge-safe participants with dynamic redacting for blind judging.
 */
export async function getJudgeSafeParticipants(competitionId, blindMode = 'none') {
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/entries`;
  try {
    const q = query(collection(db, path), where("competitionId", "==", competitionId));
    const snap = await getDocs(q);
    const rawEntries = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return rawEntries.map(entry => {
      // Create a redacted object according to the blind judging mode
      const redacted = {
        id: entry.id,
        competitionId: entry.competitionId,
        entryStatus: entry.entryStatus || 'approved',
        chestNumber: entry.chestNumber || '',
        participantCode: entry.participantCode || `PC-${entry.id.slice(0, 4)}`,
        // Redacted fields initialized based on mode
        displayName: 'Participant',
        teamName: 'Confidential Team',
        teamId: entry.teamId
      };

      if (blindMode === 'none') {
        redacted.displayName = entry.groupName || entry.displayName || 'Individual Participant';
        redacted.teamName = entry.teamName || 'Active Team';
      } else if (blindMode === 'hideName') {
        redacted.displayName = `Participant [Chest: ${entry.chestNumber || ''}]`;
        redacted.teamName = entry.teamName || 'Active Team';
      } else if (blindMode === 'hideTeam') {
        redacted.displayName = entry.groupName || entry.displayName || 'Individual Participant';
        redacted.teamName = 'Redacted Team';
      } else if (blindMode === 'hideNameAndTeam') {
        redacted.displayName = `Participant [Chest: ${entry.chestNumber || ''}]`;
        redacted.teamName = 'Redacted Team';
      } else if (blindMode === 'participantCodeOnly') {
        redacted.displayName = `Participant [Code: ${redacted.participantCode}]`;
        redacted.teamName = 'Redacted Team';
        redacted.chestNumber = 'REDACTED'; // Completely hidden
      }

      return redacted;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Creates/saves a judge competition assignment.
 * Keys the assignment by `${judgeId}_${competitionId}` to natively prevent duplicates.
 */
export async function saveJudgeAssignment(judgeId, judgeName, competitionId, competitionName, isHeadJudge = false) {
  assertAdminRole();
  const festId = getActiveFestivalId();
  const id = `${judgeId}_${competitionId}`;
  const path = `festivals/${festId}/judgeAssignments/${id}`;
  try {
    const docRef = doc(db, `festivals/${festId}/judgeAssignments`, id);
    const payload = {
      id,
      judgeUserId: judgeId, // Align with dashboard.html's query structure
      judgeId,
      judgeName,
      competitionId,
      competitionName,
      isHeadJudge: isHeadJudge === true,
      assignedBy: auth.currentUser?.uid || 'admin',
      assignedAt: serverTimestamp(),
      active: true
    };
    await setDoc(docRef, payload, { merge: true });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Removes a judge's assignment from a competition.
 */
export async function deleteJudgeAssignment(assignmentId) {
  assertAdminRole();
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/judgeAssignments/${assignmentId}`;
  try {
    await deleteDoc(doc(db, `festivals/${festId}/judgeAssignments`, assignmentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
