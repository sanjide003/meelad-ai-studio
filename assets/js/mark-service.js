// MeeladPulse Criteria-Based Mark Entry, Submission & Reopening Workflow Service
import { db } from "./firebase-init.js";
import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc, 
  writeBatch,
  query, 
  where, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getActiveFestivalId, handleFirestoreError, OperationType } from "./firestore-service.js";
import { logAuditEvent } from "./audit-service.js";
import { assertOnline } from "./network-status.js";

/**
 * Fetch all marks for a specific competition.
 */
export async function getJudgeMarksForCompetition(competitionId) {
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/judgeMarks`;
  try {
    const q = query(collection(db, path), where("competitionId", "==", competitionId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Fetch a specific judge's marks for a competition.
 */
export async function getJudgeMarksForCompetitionAndJudge(competitionId, judgeUserId) {
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/judgeMarks`;
  try {
    const q = query(
      collection(db, path), 
      where("competitionId", "==", competitionId), 
      where("judgeUserId", "==", judgeUserId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Load a specific single mark document.
 */
export async function loadJudgeMarkForEntry(competitionId, entryId, judgeUserId) {
  const festId = getActiveFestivalId();
  const docId = `${competitionId}_${entryId}_${judgeUserId}`;
  const path = `festivals/${festId}/judgeMarks/${docId}`;
  try {
    const docSnap = await getDoc(doc(db, `festivals/${festId}/judgeMarks`, docId));
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Saves a single participant's mark sheet as 'draft'.
 */
export async function saveSingleMarkDraft({
  competitionId,
  entryId,
  judgeUserId,
  judgeName,
  participantStatus = 'participated',
  criteria = {},
  rawTotal = 0,
  penaltySuggested = 0,
  notes = ''
}) {
  const festId = getActiveFestivalId();
  const docId = `${competitionId}_${entryId}_${judgeUserId}`;
  const path = `festivals/${festId}/judgeMarks/${docId}`;
  
  try {
    // Check if the current document is already finalized
    const existing = await loadJudgeMarkForEntry(competitionId, entryId, judgeUserId);
    if (existing && existing.submissionStatus === 'final') {
      throw new Error("This mark sheet has already been finalized and cannot be modified.");
    }

    const payload = {
      id: docId,
      competitionId,
      entryId,
      judgeUserId,
      judgeName,
      submissionStatus: 'draft',
      participantStatus,
      criteria, // e.g. { crit_1: 10, ... }
      rawTotal: Number(rawTotal) || 0,
      penaltySuggested: Number(penaltySuggested) || 0,
      notes: notes || '',
      updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, `festivals/${festId}/judgeMarks`, docId), payload, { merge: true });
    return docId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Saves a batch of mark sheets as 'draft'.
 */
export async function saveMarksDraft(competitionId, marksArray, judgeUserId, judgeName) {
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/judgeMarks`;
  try {
    const batch = writeBatch(db);
    for (const m of marksArray) {
      const docId = `${competitionId}_${m.entryId}_${judgeUserId}`;
      const docRef = doc(db, `festivals/${festId}/judgeMarks`, docId);
      const payload = {
        id: docId,
        competitionId,
        entryId: m.entryId,
        judgeUserId,
        judgeName,
        submissionStatus: 'draft',
        participantStatus: m.participantStatus || 'participated',
        criteria: m.criteria || {},
        rawTotal: Number(m.rawTotal) || 0,
        penaltySuggested: Number(m.penaltySuggested) || 0,
        notes: m.notes || '',
        updatedAt: serverTimestamp()
      };
      batch.set(docRef, payload, { merge: true });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Submits a single participant's mark sheet as 'final' (locked).
 */
export async function submitSingleMarkFinal({
  competitionId,
  entryId,
  judgeUserId,
  judgeName,
  participantStatus = 'participated',
  criteria = {},
  rawTotal = 0,
  penaltySuggested = 0,
  notes = ''
}) {
  assertOnline('Judge Final Submission');
  const festId = getActiveFestivalId();
  const docId = `${competitionId}_${entryId}_${judgeUserId}`;
  const path = `festivals/${festId}/judgeMarks/${docId}`;

  try {
    let finalStatus = 'final';
    const existing = await loadJudgeMarkForEntry(competitionId, entryId, judgeUserId);
    if (existing) {
      const current = normalizeJudgeMarkStatus(existing.submissionStatus);
      if (current === 'reopened' || current === 'correction_required') {
        finalStatus = 'resubmitted';
      }
    }

    const payload = {
      id: docId,
      competitionId,
      entryId,
      judgeUserId,
      judgeName,
      submissionStatus: finalStatus,
      participantStatus,
      criteria,
      rawTotal: Number(rawTotal) || 0,
      penaltySuggested: Number(penaltySuggested) || 0,
      notes: notes || '',
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, `festivals/${festId}/judgeMarks`, docId), payload, { merge: true });
    
    // Log the audit event for final submission
    await logAuditEvent(
      'final_submission', 
      competitionId, 
      `Judge ${judgeName} completed final mark submission for entry ${entryId} with status ${finalStatus}`, 
      { entryId, judgeUserId, rawTotal, status: finalStatus }
    );

    return docId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Submits a batch of mark sheets as 'final' (locked).
 */
export async function submitMarksFinal(competitionId, marksArray, judgeUserId, judgeName) {
  assertOnline('Judge Final Submission');
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/judgeMarks`;
  try {
    const existingMarks = await getJudgeMarksForCompetitionAndJudge(competitionId, judgeUserId);
    const existingMap = {};
    existingMarks.forEach(m => {
      existingMap[m.entryId] = normalizeJudgeMarkStatus(m.submissionStatus);
    });

    const batch = writeBatch(db);
    for (const m of marksArray) {
      const docId = `${competitionId}_${m.entryId}_${judgeUserId}`;
      const docRef = doc(db, `festivals/${festId}/judgeMarks`, docId);

      const current = existingMap[m.entryId] || 'draft';
      const finalStatus = (current === 'reopened' || current === 'correction_required') ? 'resubmitted' : 'final';

      const payload = {
        id: docId,
        competitionId,
        entryId: m.entryId,
        judgeUserId,
        judgeName,
        submissionStatus: finalStatus,
        participantStatus: m.participantStatus || 'participated',
        criteria: m.criteria || {},
        rawTotal: Number(m.rawTotal) || 0,
        penaltySuggested: Number(m.penaltySuggested) || 0,
        notes: m.notes || '',
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      batch.set(docRef, payload, { merge: true });
    }
    await batch.commit();

    await logAuditEvent(
      'final_submission',
      competitionId,
      `Judge ${judgeName} performed bulk final mark submission for competition ${competitionId}`,
      { judgeUserId, count: marksArray.length }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Admin Action: Reopen a judge's mark sheet for editing, changing status to 'reopened'.
 * Preserves the previous final score in historical logs and history array.
 */
export async function reopenMarkSheet(competitionId, judgeUserId, adminUserEmail = 'Admin', reason = '') {
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/judgeMarks`;
  try {
    const marks = await getJudgeMarksForCompetitionAndJudge(competitionId, judgeUserId);
    if (marks.length === 0) {
      throw new Error("No marks found to reopen for this judge and competition.");
    }
    const batch = writeBatch(db);
    for (const m of marks) {
      const docRef = doc(db, `festivals/${festId}/judgeMarks`, m.id);
      
      const history = m.history || [];
      history.push({
        action: 'reopened',
        timestamp: new Date().toISOString(),
        updatedBy: adminUserEmail,
        reason: reason,
        previousStatus: m.submissionStatus,
        previousRawTotal: m.rawTotal
      });

      batch.update(docRef, { 
        submissionStatus: 'reopened', 
        history,
        reopenedAt: serverTimestamp(),
        reopenedBy: adminUserEmail,
        reopenReason: reason
      });
    }
    await batch.commit();

    await logAuditEvent(
      'reopening',
      competitionId,
      `Administrator reopened mark sheets for judge ${judgeUserId}. Reason: ${reason}`,
      { judgeUserId, adminUserEmail, reason }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Admin Action: Returns a judge's sheet for correction.
 */
export async function returnMarkSheetForCorrection(competitionId, judgeUserId, adminUserEmail = 'Admin', reason = '') {
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/judgeMarks`;
  try {
    const marks = await getJudgeMarksForCompetitionAndJudge(competitionId, judgeUserId);
    if (marks.length === 0) {
      throw new Error("No marks found to return for correction.");
    }
    const batch = writeBatch(db);
    for (const m of marks) {
      const docRef = doc(db, `festivals/${festId}/judgeMarks`, m.id);
      
      const history = m.history || [];
      history.push({
        action: 'returned_for_correction',
        timestamp: new Date().toISOString(),
        updatedBy: adminUserEmail,
        reason: reason,
        previousStatus: m.submissionStatus,
        previousRawTotal: m.rawTotal
      });

      batch.update(docRef, { 
        submissionStatus: 'correction_required', 
        history,
        returnedAt: serverTimestamp(),
        returnedBy: adminUserEmail,
        correctionReason: reason
      });
    }
    await batch.commit();

    await logAuditEvent(
      'correction',
      competitionId,
      `Returned mark sheets for judge ${judgeUserId} for correction. Reason: ${reason}`,
      { judgeUserId, adminUserEmail, reason }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Loads progress data for an active judge.
 * Returns count of drafts and count of final entries.
 */
export async function loadSubmissionProgress(competitionId, judgeUserId, totalEntriesCount) {
  const marks = await getJudgeMarksForCompetitionAndJudge(competitionId, judgeUserId);
  const drafts = marks.filter(m => {
    const status = normalizeJudgeMarkStatus(m.submissionStatus);
    return status === 'draft' || status === 'reopened' || status === 'correction_required';
  }).length;
  const finals = marks.filter(m => {
    const status = normalizeJudgeMarkStatus(m.submissionStatus);
    return status === 'final' || status === 'resubmitted' || status === 'verified';
  }).length;
  return {
    drafts,
    finals,
    total: totalEntriesCount,
    percentage: totalEntriesCount > 0 ? Math.round((finals / totalEntriesCount) * 100) : 0
  };
}

/**
 * Normalizes any legacy or variant judge mark status to the standard model.
 */
export function normalizeJudgeMarkStatus(status) {
  if (!status) return 'draft';
  const s = status.toLowerCase();
  if (s === 'draft') return 'draft';
  if (s === 'final' || s === 'submitted') return 'final';
  if (s === 'reopened') return 'reopened';
  if (s === 'correction_required' || s === 'returned_for_correction') return 'correction_required';
  if (s === 'resubmitted') return 'resubmitted';
  if (s === 'verified' || s === 'approved') return 'verified';
  return 'draft';
}
