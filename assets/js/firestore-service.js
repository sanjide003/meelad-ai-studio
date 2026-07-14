// MeeladPulse central Firestore Service Layer
import { auth, db } from "./firebase-init.js";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firestore Error Information conforming to strict security skill specification
export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Service Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper to check for active festival scope
export function getActiveFestivalId() {
  const festId = localStorage.getItem('meeladpulse_selected_fest_id');
  if (!festId) {
    throw new Error("No active festival scope selected. Please select a festival first.");
  }
  return festId;
}

// Verification that user is an admin
export function assertAdminRole() {
  const profile = window.currentUserProfile;
  if (!profile || profile.role !== 'admin') {
    throw new Error("Unauthorized access. Admin role required.");
  }
}

// ==========================================
// DIVISIONS
// ==========================================
export async function getDivisions() {
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/divisions`;
  try {
    const q = query(collection(db, path), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveDivision(divisionData) {
  assertAdminRole();
  const festId = getActiveFestivalId();
  const id = divisionData.id || doc(collection(db, 'dummy')).id;
  const path = `festivals/${festId}/divisions/${id}`;
  try {
    const docRef = doc(db, `festivals/${festId}/divisions`, id);
    const payload = {
      id,
      name: divisionData.name,
      code: divisionData.code,
      icon: divisionData.icon || 'award',
      colour: divisionData.colour || '#10b981',
      description: divisionData.description || '',
      rankingEnabled: divisionData.rankingEnabled !== false,
      championEnabled: divisionData.championEnabled !== false,
      order: Number(divisionData.order) || 0,
      active: divisionData.active !== false,
      updatedAt: serverTimestamp()
    };
    await setDoc(docRef, payload, { merge: true });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteDivision(id) {
  assertAdminRole();
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/divisions/${id}`;
  try {
    await deleteDoc(doc(db, `festivals/${festId}/divisions`, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// SUBDIVISIONS
// ==========================================
export async function getSubdivisions() {
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/subdivisions`;
  try {
    const q = query(collection(db, path), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveSubdivision(subdivData) {
  assertAdminRole();
  const festId = getActiveFestivalId();
  const id = subdivData.id || doc(collection(db, 'dummy')).id;
  const path = `festivals/${festId}/subdivisions/${id}`;
  try {
    const docRef = doc(db, `festivals/${festId}/subdivisions`, id);
    const payload = {
      id,
      divisionId: subdivData.divisionId,
      name: subdivData.name,
      code: subdivData.code,
      description: subdivData.description || '',
      rankingEnabled: subdivData.rankingEnabled !== false,
      championEnabled: subdivData.championEnabled !== false,
      order: Number(subdivData.order) || 0,
      active: subdivData.active !== false,
      updatedAt: serverTimestamp()
    };
    await setDoc(docRef, payload, { merge: true });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSubdivision(id) {
  assertAdminRole();
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/subdivisions/${id}`;
  try {
    await deleteDoc(doc(db, `festivals/${festId}/subdivisions`, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// POINT RULES
// ==========================================
export async function getPointRules() {
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/pointRules`;
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function savePointRule(ruleData) {
  assertAdminRole();
  const festId = getActiveFestivalId();
  const id = ruleData.id || doc(collection(db, 'dummy')).id;
  const path = `festivals/${festId}/pointRules/${id}`;
  try {
    const docRef = doc(db, `festivals/${festId}/pointRules`, id);
    const payload = {
      id,
      name: ruleData.name,
      firstPlacePoints: Number(ruleData.firstPlacePoints) || 0,
      secondPlacePoints: Number(ruleData.secondPlacePoints) || 0,
      thirdPlacePoints: Number(ruleData.thirdPlacePoints) || 0,
      fourthPlacePoints: Number(ruleData.fourthPlacePoints) || 0,
      fifthPlacePoints: Number(ruleData.fifthPlacePoints) || 0,
      aGradePoints: Number(ruleData.aGradePoints) || 0,
      bGradePoints: Number(ruleData.bGradePoints) || 0,
      cGradePoints: Number(ruleData.cGradePoints) || 0,
      participationPoints: Number(ruleData.participationPoints) || 0,
      calculationMode: ruleData.calculationMode || 'positionAndGrade',
      active: ruleData.active !== false,
      updatedAt: serverTimestamp()
    };
    await setDoc(docRef, payload, { merge: true });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePointRule(id) {
  assertAdminRole();
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/pointRules/${id}`;
  try {
    await deleteDoc(doc(db, `festivals/${festId}/pointRules`, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// GRADE RULES
// ==========================================
export async function getGradeRules() {
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/gradeRules`;
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveGradeRule(ruleData) {
  assertAdminRole();
  const festId = getActiveFestivalId();
  const id = ruleData.id || doc(collection(db, 'dummy')).id;
  const path = `festivals/${festId}/gradeRules/${id}`;
  try {
    const docRef = doc(db, `festivals/${festId}/gradeRules`, id);
    const payload = {
      id,
      name: ruleData.name,
      ranges: ruleData.ranges || [],
      active: ruleData.active !== false,
      updatedAt: serverTimestamp()
    };
    await setDoc(docRef, payload, { merge: true });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteGradeRule(id) {
  assertAdminRole();
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/gradeRules/${id}`;
  try {
    await deleteDoc(doc(db, `festivals/${festId}/gradeRules`, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// TIE-BREAK RULES
// ==========================================
export async function getTieBreakRules() {
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/tieBreakRules`;
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveTieBreakRule(ruleData) {
  assertAdminRole();
  const festId = getActiveFestivalId();
  const id = ruleData.id || doc(collection(db, 'dummy')).id;
  const path = `festivals/${festId}/tieBreakRules/${id}`;
  try {
    const docRef = doc(db, `festivals/${festId}/tieBreakRules`, id);
    const payload = {
      id,
      name: ruleData.name,
      // Sequence of priorities, e.g. ["highestRawMark", "highestGradeCount", "splitPoints"]
      prioritySequence: ruleData.prioritySequence || ["highestRawMark", "highestGradeCount", "splitPoints"],
      active: ruleData.active !== false,
      updatedAt: serverTimestamp()
    };
    await setDoc(docRef, payload, { merge: true });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteTieBreakRule(id) {
  assertAdminRole();
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/tieBreakRules/${id}`;
  try {
    await deleteDoc(doc(db, `festivals/${festId}/tieBreakRules`, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// COMPETITIONS (Rules and Config)
// ==========================================
export async function getCompetitions() {
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/competitions`;
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getTeams() {
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/teams`;
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}


export async function saveTeam(teamData) {
  assertAdminRole();
  const festId = getActiveFestivalId();
  const id = (teamData.id || teamData.code || doc(collection(db, 'dummy')).id).toString().trim().toLowerCase();
  const path = `festivals/${festId}/teams/${id}`;
  try {
    await setDoc(doc(db, `festivals/${festId}/teams`, id), {
      id,
      name: teamData.name,
      code: teamData.code || id.toUpperCase(),
      colour: teamData.colour || '#10b981',
      active: teamData.active !== false,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteTeam(id) {
  assertAdminRole();
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/teams/${id}`;
  try {
    await deleteDoc(doc(db, `festivals/${festId}/teams`, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function getCategories() {
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/categories`;
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}


export async function saveCategory(categoryData) {
  assertAdminRole();
  const festId = getActiveFestivalId();
  const id = (categoryData.id || categoryData.code || doc(collection(db, 'dummy')).id).toString().trim().toLowerCase();
  const path = `festivals/${festId}/categories/${id}`;
  try {
    await setDoc(doc(db, `festivals/${festId}/categories`, id), {
      id,
      name: categoryData.name,
      code: categoryData.code || id.toUpperCase(),
      colour: categoryData.colour || '#10b981',
      order: Number(categoryData.order) || 0,
      active: categoryData.active !== false,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCategory(id) {
  assertAdminRole();
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/categories/${id}`;
  try {
    await deleteDoc(doc(db, `festivals/${festId}/categories`, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveCompetition(compData) {
  assertAdminRole();
  const festId = getActiveFestivalId();
  const id = compData.id || doc(collection(db, 'dummy')).id;
  const path = `festivals/${festId}/competitions/${id}`;
  try {
    const docRef = doc(db, `festivals/${festId}/competitions`, id);
    const payload = {
      id,
      name: compData.name,
      code: compData.code,
      divisionId: compData.divisionId,
      subdivisionId: compData.subdivisionId || '',
      categoryId: compData.categoryId || '',
      genderMode: compData.genderMode || 'flexible',
      resultMode: compData.resultMode || 'combinedResult',
      competitionType: compData.competitionType || 'individual',
      performanceType: compData.performanceType || 'stage',
      roundType: compData.roundType || 'directFinal',
      minParticipantsPerEntry: Number(compData.minParticipantsPerEntry) || 1,
      maxParticipantsPerEntry: Number(compData.maxParticipantsPerEntry) || 1,
      maxEntriesPerTeam: Number(compData.maxEntriesPerTeam) || 1,
      substituteLimit: Number(compData.substituteLimit) || 0,
      maxMark: Number(compData.maxMark) || 100,
      judgeCountRequired: Number(compData.judgeCountRequired) || 3,
      stageId: compData.stageId || '',
      eventDate: compData.eventDate || '',
      startTime: compData.startTime || '',
      reportingTime: compData.reportingTime || '',
      durationMinutes: compData.durationMinutes ? Number(compData.durationMinutes) : null,
      rules: compData.rules || '',
      gradeRuleId: compData.gradeRuleId || '',
      pointRuleId: compData.pointRuleId || '',
      tieBreakRuleId: compData.tieBreakRuleId || '',
      blindJudgingMode: compData.blindJudgingMode || 'none',
      status: compData.status || 'draft',
      active: compData.active !== false,
      updatedAt: serverTimestamp()
    };
    await setDoc(docRef, payload, { merge: true });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==========================================
// RESULTS & TEAM TOTALS (CHAMPIONSHIP)
// ==========================================
export async function getResults() {
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/results`;
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveResult(resultData) {
  assertAdminRole();
  const festId = getActiveFestivalId();
  const id = resultData.id || doc(collection(db, 'dummy')).id;
  const path = `festivals/${festId}/results/${id}`;
  try {
    const docRef = doc(db, `festivals/${festId}/results`, id);
    const payload = {
      ...resultData,
      id,
      festId,
      updatedAt: serverTimestamp()
    };
    await setDoc(docRef, payload, { merge: true });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getTeamTotals() {
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/teamTotals`;
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveTeamTotalsBatch(teamTotalsList) {
  assertAdminRole();
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/teamTotals`;
  try {
    const batch = writeBatch(db);
    for (const tt of teamTotalsList) {
      // 1. Internal admin total
      const docRef = doc(db, `festivals/${festId}/teamTotals`, tt.teamId);
      const payload = {
        ...tt,
        festId,
        updatedAt: serverTimestamp()
      };
      batch.set(docRef, payload, { merge: true });

      // 2. Public safe overall total
      const pubDocRef = doc(db, `festivals/${festId}/publicData/teamTotals`, tt.teamId);
      const pubPayload = {
        teamId: tt.teamId,
        teamName: tt.teamName,
        teamCode: tt.teamCode,
        teamColour: tt.teamColour,
        festId,
        artsTotal: tt.artsTotal || 0,
        sportsTotal: tt.sportsTotal || 0,
        stagePoints: tt.stagePoints || 0,
        nonStagePoints: tt.nonStagePoints || 0,
        trackPoints: tt.trackPoints || 0,
        fieldPoints: tt.fieldPoints || 0,
        teamEventPoints: tt.teamEventPoints || 0,
        indoorPoints: tt.indoorPoints || 0,
        outdoorPoints: tt.outdoorPoints || 0,
        bonusPoints: tt.bonusPoints || 0,
        penaltyPoints: tt.penaltyPoints || 0,
        overallPoints: tt.overallPoints || 0,
        firstCount: tt.firstCount || 0,
        secondCount: tt.secondCount || 0,
        thirdCount: tt.thirdCount || 0,
        gradeCounts: tt.gradeCounts || {},
        rank: tt.rank || 0,
        updatedAt: serverTimestamp()
      };
      batch.set(pubDocRef, pubPayload, { merge: true });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveChampionsBatch(championsList) {
  assertAdminRole();
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/publicData/champions`;
  try {
    const batch = writeBatch(db);
    for (const champ of championsList) {
      const id = champ.id || champ.studentId || champ.chestNumber;
      if (!id) continue;
      const docRef = doc(db, `festivals/${festId}/publicData/champions`, id);
      const payload = {
        ...champ,
        updatedAt: serverTimestamp()
      };
      batch.set(docRef, payload, { merge: true });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getBonuses() {
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/bonusPoints`;
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getPenalties() {
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/penalties`;
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getJudgeMarks() {
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/judgeMarks`;
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getEntries() {
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/entries`;
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getStudents() {
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/students`;
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function bypassAuditOverride(entryId) {
  assertAdminRole();
  const festId = getActiveFestivalId();
  const path = `festivals/${festId}/entries/${entryId}`;
  try {
    const docRef = doc(db, `festivals/${festId}/entries`, entryId);
    await updateDoc(docRef, { overrideApproved: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
