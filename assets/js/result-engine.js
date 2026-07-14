// MeeladPulse Result Tabulation, Approval, and Publication Engine
import { db } from "./firebase-init.js";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  where, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { 
  getJudgeMarks, 
  getEntries, 
  getCompetitions, 
  getPointRules, 
  getGradeRules, 
  getTieBreakRules, 
  getTeams,
  saveResult,
  getActiveFestivalId,
  handleFirestoreError,
  OperationType
} from "./firestore-service.js";
import { 
  calculateAggregatedScore, 
  compilePositions 
} from "./calculations.js";
import { recalculateChampionshipTotals } from "./championship-engine.js";
import { logAuditEvent } from "./audit-service.js";
import { assertOnline } from "./network-status.js";
import { normalizeJudgeMarkStatus } from "./mark-service.js";

/**
 * Tabulates raw marks from final submissions.
 */
export async function tabulateCompetitionResult(competitionId) {
  try {
    // 1. Fetch all required datasets
    const [marks, entries, competitions, pointRules, gradeRules, tieBreakRules, teams] = await Promise.all([
      getJudgeMarks(),
      getEntries(),
      getCompetitions(),
      getPointRules(),
      getGradeRules(),
      getTieBreakRules(),
      getTeams()
    ]);

    // 2. Filter relevant datasets
    const comp = competitions.find(c => c.id === competitionId);
    if (!comp) throw new Error("Competition not found.");

    // Load judge assignments to check required judge count
    const festId = getActiveFestivalId();
    const assignSnap = await getDocs(collection(db, `festivals/${festId}/judgeAssignments`));
    const compAssigns = assignSnap.docs
      .map(d => d.data())
      .filter(a => a.competitionId === competitionId && a.active === true);

    const requiredJudges = comp.judgeCountRequired || 3;
    
    // Only count final/reopened/correction/resubmitted/verified sheets from authorized judges
    const compMarks = marks.filter(m => m.competitionId === competitionId);
    const finalMarks = compMarks.filter(m => {
      const status = normalizeJudgeMarkStatus(m.submissionStatus);
      return status === 'final' || status === 'resubmitted' || status === 'verified';
    });

    const compEntries = entries.filter(e => e.competitionId === competitionId);
    
    const pointRule = pointRules.find(r => r.id === comp.pointRuleId);
    const gradeRule = gradeRules.find(r => r.id === comp.gradeRuleId);
    const tieBreakRule = tieBreakRules.find(r => r.id === comp.tieBreakRuleId);

    if (!pointRule) throw new Error("Point rule configuration missing.");
    if (!gradeRule) throw new Error("Grade rule configuration missing.");

    // Diagnostics / Validation checks
    const diagnostics = {
      totalEntries: compEntries.length,
      judgingProgress: `${compAssigns.filter(a => compMarks.some(m => m.judgeUserId === a.judgeId && (normalizeJudgeMarkStatus(m.submissionStatus) === 'final' || normalizeJudgeMarkStatus(m.submissionStatus) === 'resubmitted' || normalizeJudgeMarkStatus(m.submissionStatus) === 'verified'))).length}/${requiredJudges}`,
      missingJudges: false,
      incompleteCriteria: false,
      calculationErrors: false,
      unresolvedTies: false,
      warnings: []
    };

    // If final submissions are fewer than assigned or required, flag it
    const activeEvaluators = compAssigns.map(a => a.judgeId);
    const uniqueEvaluatorsWhoSubmitted = [...new Set(finalMarks.map(m => m.judgeUserId))];
    if (uniqueEvaluatorsWhoSubmitted.length < requiredJudges) {
      diagnostics.missingJudges = true;
      diagnostics.warnings.push(`Awaiting final submissions from all required judges (Only ${uniqueEvaluatorsWhoSubmitted.length} of ${requiredJudges} submitted).`);
    }

    // 3. Compile participant scoring
    const participantsList = [];

    for (const entry of compEntries) {
      const entryMarks = finalMarks.filter(m => m.entryId === entry.id);
      const team = teams.find(t => t.id === entry.teamId);
      const teamName = team ? team.name : "Unknown Team";

      if (entryMarks.length === 0) {
        participantsList.push({
          entryId: entry.id,
          memberStudentIds: entry.memberStudentIds || [],
          displayName: entry.groupName || entry.displayName || "Individual Participant",
          teamName,
          teamId: entry.teamId,
          rawScore: 0,
          penalty: 0,
          finalScore: 0,
          percentage: 0,
          grade: 'None',
          position: 'None',
          teamPoints: 0,
          status: 'absent'
        });
        continue;
      }

      // Check for status anomalies (e.g., if one judge marks absent and another present)
      const statuses = entryMarks.map(m => m.participantStatus || 'participated');
      const uniqueStatuses = [...new Set(statuses)];
      if (uniqueStatuses.length > 1) {
        diagnostics.warnings.push(`Conflict in participant status for Chest ${entry.chestNumber}: [${uniqueStatuses.join(', ')}]`);
      }

      const isAbsent = statuses.some(s => s === 'absent');
      const isWithdrawn = statuses.some(s => s === 'withdrawn');
      const isDisqualified = statuses.some(s => s === 'disqualified');
      const status = isDisqualified ? 'disqualified' : (isWithdrawn ? 'withdrawn' : (isAbsent ? 'absent' : 'participated'));

      // Check if criteria are incomplete
      for (const m of entryMarks) {
        if (!m.criteria || Object.keys(m.criteria).length === 0) {
          diagnostics.incompleteCriteria = true;
        }
      }

      // Aggregate score
      const scoreInfo = calculateAggregatedScore(entryMarks, 'averageOfJudges', comp.maxMark || 100);
      const penalty = entryMarks.reduce((acc, m) => acc + (Number(m.penaltySuggested) || 0), 0);
      const finalScore = Math.max(0, scoreInfo.rawScore - penalty);

      participantsList.push({
        entryId: entry.id,
        memberStudentIds: entry.memberStudentIds || [],
        chestNumber: entry.chestNumber || '',
        participantCode: entry.participantCode || '',
        displayName: entry.groupName || entry.displayName || "Individual Participant",
        teamName,
        teamId: entry.teamId,
        rawScore: scoreInfo.rawScore,
        penalty,
        finalScore: Number(finalScore.toFixed(2)),
        percentage: scoreInfo.percentage,
        grade: 'None', 
        position: 'None', 
        teamPoints: 0, 
        status
      });
    }

    // 4. Resolve positions & points
    const resolvedParticipants = compilePositions(participantsList, pointRule, gradeRule, tieBreakRule);

    // Check for ties in top 3 positions
    const posCounts = {};
    resolvedParticipants.forEach(p => {
      if (p.position && p.position !== 'None') {
        posCounts[p.position] = (posCounts[p.position] || 0) + 1;
      }
    });
    if (posCounts['1st'] > 1 || posCounts['2nd'] > 1 || posCounts['3rd'] > 1) {
      diagnostics.unresolvedTies = true;
      diagnostics.warnings.push("Ties detected in podium positions (1st, 2nd, or 3rd). Resolve them via tie-break overrides.");
    }

    // 5. Structure official competition result (starts as calculated)
    const resultPayload = {
      id: competitionId, 
      competitionId,
      calculationMethod: 'averageOfJudges',
      participants: resolvedParticipants,
      status: 'calculated',
      diagnostics,
      createdAt: new Date().toISOString()
    };

    await saveResult(resultPayload);
    return resultPayload;
  } catch (error) {
    console.error("Result tabulation error:", error);
    throw error;
  }
}

/**
 * Approve Tabulated Result. Sets status to Approved. Does not publish.
 */
export async function approveCompetitionResult(competitionId, manualOverrides = {}, resolvedTies = {}, appliedPenalties = {}) {
  assertOnline('Result Approval');
  
  if (Object.keys(manualOverrides).length > 0 || Object.keys(resolvedTies).length > 0 || Object.keys(appliedPenalties).length > 0) {
    assertOnline('Manual Override');
  }

  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/results/${competitionId}`;
  try {
    // 1. Fetch current calculated result
    const docRef = doc(db, `festivals/${festId}/results`, competitionId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error("No calculated result found. Tabulate the marks first.");
    }

    const result = snap.data();

    // Check diagnostics blocks before approving
    if (result.diagnostics?.missingJudges) {
      throw new Error("Approval Blocked: Required Judge submissions are missing.");
    }
    if (result.diagnostics?.incompleteCriteria) {
      throw new Error("Approval Blocked: Criteria evaluation is incomplete.");
    }

    // Apply manual overrides, penalties, and tie resolutions if provided
    const updatedParticipants = result.participants.map(p => {
      const override = manualOverrides[p.entryId];
      const tiePos = resolvedTies[p.entryId];
      const penVal = appliedPenalties[p.entryId];

      const copy = { ...p };
      if (override !== undefined) {
        copy.teamPoints = Number(override);
        copy.isOverridden = true;
      }
      if (tiePos !== undefined) {
        copy.position = tiePos;
        copy.isTieResolved = true;
      }
      if (penVal !== undefined) {
        copy.penalty = Number(penVal);
        copy.finalScore = Math.max(0, copy.rawScore - copy.penalty);
      }
      return copy;
    });

    // 2. Set result status to approved
    result.participants = updatedParticipants;
    result.status = 'approved';
    result.approvedAt = new Date().toISOString();
    result.approvedBy = auth.currentUser?.email || 'admin';

    await saveResult(result);

    // 3. Update related competition status
    const compRef = doc(db, `festivals/${festId}/competitions`, competitionId);
    await updateDoc(compRef, { status: 'approved' });

    // 4. Recalculate Championship scoreboard live
    await recalculateChampionshipTotals();

    await logAuditEvent(
      'approval',
      competitionId,
      `Approved tabulated results for competition ${competitionId}`,
      { approvedBy: result.approvedBy }
    );

    return result;
  } catch (error) {
    console.error("Result approval error:", error);
    throw error;
  }
}

/**
 * Publishes an approved result. Generates public-safe results.
 */
export async function publishCompetitionResult(competitionId, options = {}) {
  assertOnline('Result Publication');
  const festId = getActiveFestivalId();
  try {
    // 1. Fetch approved result
    const resDocRef = doc(db, `festivals/${festId}/results`, competitionId);
    const snap = await getDoc(resDocRef);
    if (!snap.exists()) {
      throw new Error("Result document not found.");
    }

    const result = snap.data();
    if (result.status !== 'Approved' && result.status !== 'Published') {
      throw new Error("Only approved results can be published.");
    }

    // 2. Update status to Published
    result.status = 'Published';
    result.publishedAt = new Date().toISOString();
    result.publishedBy = auth.currentUser?.email || 'admin';
    result.publishOptions = options; // e.g. { showMarks: true, showTeamPoints: true }

    await saveResult(result);

    // 3. Update competition status
    const compRef = doc(db, `festivals/${festId}/competitions`, competitionId);
    await updateDoc(compRef, { status: 'Published' });

    // 4. Create public-safe result documents under festivals/{festId}/publicData/results/{resultId}
    const publicSafeParticipants = result.participants.map(p => {
      // Build a strictly public safe participant card
      return {
        entryId: p.entryId,
        displayName: p.displayName,
        chestNumber: p.chestNumber,
        participantCode: p.participantCode,
        teamId: p.teamId,
        teamName: p.teamName,
        grade: p.grade,
        position: p.position,
        teamPoints: options.showTeamPoints !== false ? p.teamPoints : 0,
        finalScore: options.showMarks === true ? p.finalScore : null,
        status: p.status
      };
    });

    const publicPayload = {
      id: competitionId,
      competitionId,
      publishedAt: result.publishedAt,
      participants: publicSafeParticipants,
      showMarks: options.showMarks === true,
      showTeamPoints: options.showTeamPoints !== false
    };

    const publicDocRef = doc(db, `festivals/${festId}/publicData/results`, competitionId);
    await setDoc(publicDocRef, publicPayload);

    // 5. Sync live scoreboard totals
    await recalculateChampionshipTotals();

    await logAuditEvent(
      'publish',
      competitionId,
      `Published competition results for ${competitionId} to the public dashboard`,
      { publishedBy: result.publishedBy, options }
    );

    return result;
  } catch (error) {
    console.error("Result publication error:", error);
    throw error;
  }
}

/**
 * Unpublishes a result. Removes public-safe documents and updates team totals.
 */
export async function unpublishCompetitionResult(competitionId) {
  const festId = getActiveFestivalId();
  try {
    // 1. Revert result status to approved
    const resRef = doc(db, `festivals/${festId}/results`, competitionId);
    await updateDoc(resRef, { status: 'approved', unpublishedAt: new Date().toISOString() });

    // 2. Revert competition status
    const compRef = doc(db, `festivals/${festId}/competitions`, competitionId);
    await updateDoc(compRef, { status: 'approved' });

    // 3. Delete the public-safe result document
    const publicDocRef = doc(db, `festivals/${festId}/publicData/results`, competitionId);
    await deleteDoc(publicDocRef);

    // 4. Sync live scoreboard totals
    await recalculateChampionshipTotals();

    await logAuditEvent(
      'unpublish',
      competitionId,
      `Unpublished results for competition ${competitionId} (removed public visibility)`,
      {}
    );
  } catch (error) {
    console.error("Unpublish error:", error);
    throw error;
  }
}

/**
 * Normalizes any legacy or variant result status to the standard model.
 */
export function normalizeResultStatus(status) {
  if (!status) return 'calculated';
  const s = status.toLowerCase();
  if (s === 'calculated') return 'calculated';
  if (s === 'provisional') return 'provisional';
  if (s === 'held') return 'held';
  if (s === 'approved') return 'approved';
  if (s === 'ready_to_publish') return 'ready_to_publish';
  if (s === 'published') return 'published';
  if (s === 'unpublished') return 'unpublished';
  if (s === 'retracted' || s === 'retracted_from_public') return 'retracted';
  if (s === 'archived') return 'archived';
  if (s === 'corrected') return 'corrected';
  return 'calculated';
}
