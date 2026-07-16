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
  deleteField,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


async function hashManualPassword(password) {
  if (!password) return '';
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

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

// Helper to check for active institution/festival scope.
export function getActiveScope() {
  if (window.meeladPulseGetActiveScope) {
    const scope = window.meeladPulseGetActiveScope();
    if (scope?.festivalId && scope?.institutionId) return scope;
  }
  const params = new URLSearchParams(window.location.search);
  const urlFestivalId = params.get('festival');
  const urlInstitutionId = params.get('institution');
  const festivalId = urlFestivalId || localStorage.getItem('meeladpulse_selected_fest_id') || urlInstitutionId;
  const institutionId = urlInstitutionId || localStorage.getItem('meeladpulse_selected_institution_id') || festivalId;
  if (!festivalId) {
    throw new Error("No active festival scope selected. Please select a festival first.");
  }
  return { institutionId, festivalId };
}

// Compatibility helper for older page code; it still resolves the active scoped festival id.
export function getActiveFestivalId() {
  return getActiveScope().festivalId;
}

export function getScopedFestivalPath(subPath = '') {
  const { institutionId, festivalId } = getActiveScope();
  const suffix = subPath ? `/${subPath.replace(/^\//, '')}` : '';
  return `institutions/${institutionId}/festivals/${festivalId}${suffix}`;
}

// Verification that user is an admin
export function assertAdminRole() {
  const profile = window.currentUserProfile;
  if (!profile || !['superAdmin', 'institutionAdmin', 'admin'].includes(profile.role)) {
    throw new Error("Unauthorized access. Admin role required.");
  }
}

// ==========================================
// DIVISIONS
// ==========================================
export async function getDivisions() {
  const festId = getActiveFestivalId();
  const path = window.meeladPulseScopedFestivalPath('divisions');
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
  const path = window.meeladPulseScopedFestivalPath(`divisions/${id}`);
  try {
    const docRef = doc(db, window.meeladPulseScopedFestivalPath('divisions'), id);
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
  const path = window.meeladPulseScopedFestivalPath(`divisions/${id}`);
  try {
    await deleteDoc(doc(db, window.meeladPulseScopedFestivalPath('divisions'), id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// SUBDIVISIONS
// ==========================================
export async function getSubdivisions() {
  const festId = getActiveFestivalId();
  const path = window.meeladPulseScopedFestivalPath('subdivisions');
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
  const path = window.meeladPulseScopedFestivalPath(`subdivisions/${id}`);
  try {
    const docRef = doc(db, window.meeladPulseScopedFestivalPath('subdivisions'), id);
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
  const path = window.meeladPulseScopedFestivalPath(`subdivisions/${id}`);
  try {
    await deleteDoc(doc(db, window.meeladPulseScopedFestivalPath('subdivisions'), id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// POINT RULES
// ==========================================
export async function getPointRules() {
  const festId = getActiveFestivalId();
  const path = window.meeladPulseScopedFestivalPath('pointRules');
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
  const path = window.meeladPulseScopedFestivalPath(`pointRules/${id}`);
  try {
    const docRef = doc(db, window.meeladPulseScopedFestivalPath('pointRules'), id);
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
      gradeRuleId: ruleData.gradeRuleId || '',
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
  const path = window.meeladPulseScopedFestivalPath(`pointRules/${id}`);
  try {
    await deleteDoc(doc(db, window.meeladPulseScopedFestivalPath('pointRules'), id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// GRADE RULES
// ==========================================
export async function getGradeRules() {
  const festId = getActiveFestivalId();
  const path = window.meeladPulseScopedFestivalPath('gradeRules');
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
  const path = window.meeladPulseScopedFestivalPath(`gradeRules/${id}`);
  try {
    const docRef = doc(db, window.meeladPulseScopedFestivalPath('gradeRules'), id);
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
  const path = window.meeladPulseScopedFestivalPath(`gradeRules/${id}`);
  try {
    await deleteDoc(doc(db, window.meeladPulseScopedFestivalPath('gradeRules'), id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// TIE-BREAK RULES
// ==========================================
export async function getTieBreakRules() {
  const festId = getActiveFestivalId();
  const path = window.meeladPulseScopedFestivalPath('tieBreakRules');
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
  const path = window.meeladPulseScopedFestivalPath(`tieBreakRules/${id}`);
  try {
    const docRef = doc(db, window.meeladPulseScopedFestivalPath('tieBreakRules'), id);
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
  const path = window.meeladPulseScopedFestivalPath(`tieBreakRules/${id}`);
  try {
    await deleteDoc(doc(db, window.meeladPulseScopedFestivalPath('tieBreakRules'), id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// COMPETITIONS (Rules and Config)
// ==========================================
export async function getCompetitions() {
  const festId = getActiveFestivalId();
  const path = window.meeladPulseScopedFestivalPath('competitions');
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getTeams() {
  const festId = getActiveFestivalId();
  const path = window.meeladPulseScopedFestivalPath('teams');
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
  const scope = getActiveScope();
  const id = (teamData.id || teamData.code || teamData.name || doc(collection(db, 'dummy')).id).toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || doc(collection(db, 'dummy')).id;
  const path = window.meeladPulseScopedFestivalPath(`teams/${id}`);
  const chestStartNumber = Math.max(1, Number(teamData.chestStartNumber) || 1);
  const nextChestNumber = Math.max(chestStartNumber, Number(teamData.nextChestNumber) || chestStartNumber);
  const chestStartNumbers = {
    common: chestStartNumber,
    boys: Math.max(1, Number(teamData.boysChestStartNumber) || chestStartNumber),
    girls: Math.max(1, Number(teamData.girlsChestStartNumber) || chestStartNumber)
  };
  const leaders = Array.isArray(teamData.leaders) ? teamData.leaders
    .map((leader, index) => ({
      id: leader.id || `${id}-leader-${index + 1}`,
      name: (leader.name || '').trim(),
      role: (leader.role || 'Team Leader').trim(),
      order: Math.max(1, Number(leader.order) || index + 1),
      photoUrl: (leader.photoUrl || '').trim(),
      username: (leader.username || '').trim(),
      usernameLower: (leader.username || '').trim().toLowerCase(),
      active: leader.active !== false
    }))
    .filter(leader => leader.name || leader.username)
    .sort((a, b) => a.order - b.order)
    : [];
  const primaryLeader = leaders[0] || {
    role: teamData.leaderRole || 'Team Leader',
    name: teamData.leaderName || '',
    username: teamData.leaderUsername || '',
    usernameLower: (teamData.leaderUsername || '').trim().toLowerCase(),
    photoUrl: teamData.leaderPhotoUrl || '',
    active: teamData.leaderActive !== false,
    order: 1
  };
  try {
    const payload = {
      id,
      name: teamData.name,
      code: teamData.code || id.toUpperCase(),
      logoUrl: teamData.logoUrl || '',
      colour: teamData.colour || teamData.color || '#10b981',
      color: teamData.colour || teamData.color || '#10b981',
      chestMode: teamData.chestMode || 'common',
      chestStartNumber,
      nextChestNumber,
      chestStartNumbers,
      categoryChestStartNumbers: teamData.categoryChestStartNumbers || {},
      nextChestByCategory: teamData.nextChestByCategory || {},
      leaders,
      leader: primaryLeader,
      active: teamData.active !== false,
      updatedAt: serverTimestamp()
    };
    await setDoc(doc(db, window.meeladPulseScopedFestivalPath('teams'), id), payload, { merge: true });

    const leadersWithPasswords = Array.isArray(teamData.leaders) ? teamData.leaders.filter(leader => leader.username && leader.password) : [];
    if (!leadersWithPasswords.length && teamData.leaderUsername && teamData.leaderPassword) {
      leadersWithPasswords.push({
        name: teamData.leaderName,
        role: teamData.leaderRole,
        username: teamData.leaderUsername,
        password: teamData.leaderPassword,
        photoUrl: teamData.leaderPhotoUrl,
        order: 1,
        active: teamData.leaderActive !== false
      });
    }

    for (const leader of leadersWithPasswords) {
      const leaderUsername = (leader.username || '').trim().toLowerCase();
      if (!leaderUsername) continue;
      const manualUserPayload = {
        uid: `manual_team_${id}_${leaderUsername.replace(/[^a-z0-9]+/g, '_')}`,
        role: 'teamLeader',
        teamRole: leader.role || 'Team Leader',
        institutionId: scope.institutionId,
        festivalId: festId,
        teamId: id,
        name: leader.name || teamData.name || leaderUsername,
        username: leader.username,
        usernameLower: leaderUsername,
        password: deleteField(),
        passwordHash: await hashManualPassword(leader.password),
        passwordUpdatedAt: serverTimestamp(),
        legacyPasswordMigrated: true,
        photoUrl: leader.photoUrl || '',
        order: Math.max(1, Number(leader.order) || 1),
        active: leader.active !== false,
        updatedAt: serverTimestamp()
      };
      await setDoc(doc(db, getScopedFestivalPath(`manualUsers/${leaderUsername}`)), manualUserPayload, { merge: true });
    }
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteTeam(id) {
  assertAdminRole();
  const festId = getActiveFestivalId();
  const path = window.meeladPulseScopedFestivalPath(`teams/${id}`);
  try {
    await deleteDoc(doc(db, window.meeladPulseScopedFestivalPath('teams'), id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function getCategories() {
  const festId = getActiveFestivalId();
  const path = window.meeladPulseScopedFestivalPath('categories');
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
  const path = window.meeladPulseScopedFestivalPath(`categories/${id}`);
  try {
    await setDoc(doc(db, window.meeladPulseScopedFestivalPath('categories'), id), {
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
  const path = window.meeladPulseScopedFestivalPath(`categories/${id}`);
  try {
    await deleteDoc(doc(db, window.meeladPulseScopedFestivalPath('categories'), id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveCompetition(compData) {
  assertAdminRole();
  const festId = getActiveFestivalId();
  const id = compData.id || doc(collection(db, 'dummy')).id;
  const path = window.meeladPulseScopedFestivalPath(`competitions/${id}`);
  try {
    const docRef = doc(db, window.meeladPulseScopedFestivalPath('competitions'), id);
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
      programmeType: compData.programmeType || '',
      sourceMode: compData.sourceMode || 'admin',
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
  const path = window.meeladPulseScopedFestivalPath('results');
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
  const path = window.meeladPulseScopedFestivalPath(`results/${id}`);
  try {
    const docRef = doc(db, window.meeladPulseScopedFestivalPath('results'), id);
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
  const path = window.meeladPulseScopedFestivalPath('teamTotals');
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
  const path = window.meeladPulseScopedFestivalPath('teamTotals');
  try {
    const batch = writeBatch(db);
    for (const tt of teamTotalsList) {
      // 1. Internal admin total
      const docRef = doc(db, window.meeladPulseScopedFestivalPath('teamTotals'), tt.teamId);
      const payload = {
        ...tt,
        festId,
        updatedAt: serverTimestamp()
      };
      batch.set(docRef, payload, { merge: true });

      // 2. Public safe overall total
      const pubDocRef = doc(db, window.meeladPulseScopedFestivalPath('publicData/teamTotals'), tt.teamId);
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
  const path = window.meeladPulseScopedFestivalPath('publicData/champions');
  try {
    const batch = writeBatch(db);
    for (const champ of championsList) {
      const id = champ.id || champ.studentId || champ.chestNumber;
      if (!id) continue;
      const docRef = doc(db, window.meeladPulseScopedFestivalPath('publicData/champions'), id);
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
  const path = window.meeladPulseScopedFestivalPath('bonusPoints');
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getPenalties() {
  const festId = getActiveFestivalId();
  const path = window.meeladPulseScopedFestivalPath('penalties');
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getJudgeMarks() {
  const festId = getActiveFestivalId();
  const path = window.meeladPulseScopedFestivalPath('judgeMarks');
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}


// ==========================================
// COMPETITION ENTRIES / PARTICIPANT REGISTRATION
// ==========================================
export async function getCompetitionEntries() {
  const path = window.meeladPulseScopedFestivalPath('entries');
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveCompetitionEntry(entryData) {
  assertOnline('Competition Entry Registration');
  const profile = window.currentUserProfile || {};
  const scope = getActiveScope();
  const festId = getActiveFestivalId();
  const competitionId = entryData.competitionId || '';
  const teamId = entryData.teamId || profile.teamId || '';
  if (!competitionId) throw new Error('Competition item is required.');
  if (!teamId) throw new Error('Team is required.');
  const competition = (await getDoc(doc(db, window.meeladPulseScopedFestivalPath('competitions'), competitionId))).data();
  if (!competition) throw new Error('Competition item was not found.');
  const studentIds = Array.isArray(entryData.studentIds) ? [...new Set(entryData.studentIds.filter(Boolean))] : [];
  const minMembers = Number(competition.minParticipantsPerEntry) || 1;
  const maxMembers = Number(competition.maxParticipantsPerEntry) || 1;
  if (studentIds.length < minMembers || studentIds.length > maxMembers) {
    throw new Error(`Select ${minMembers === maxMembers ? minMembers : `${minMembers}-${maxMembers}`} participant(s) for this item.`);
  }
  if (profile.role === 'teamLeader' && profile.teamId && profile.teamId !== teamId) {
    throw new Error('Team leaders can submit entries only for their assigned team.');
  }
  const existing = await getDocs(query(
    collection(db, window.meeladPulseScopedFestivalPath('entries')),
    where('competitionId', '==', competitionId),
    where('teamId', '==', teamId)
  ));
  const currentId = entryData.id || '';
  const duplicateStudent = existing.docs.some((docSnap) => {
    if (docSnap.id === currentId) return false;
    const data = docSnap.data();
    return (data.studentIds || []).some((id) => studentIds.includes(id));
  });
  if (duplicateStudent) {
    throw new Error('One or more selected students are already entered for this competition.');
  }
  const activeTeamEntryCount = existing.docs.filter((docSnap) => docSnap.id !== currentId && docSnap.data().status !== 'rejected').length;
  const maxEntriesPerTeam = Number(competition.maxEntriesPerTeam) || 1;
  if (!currentId && activeTeamEntryCount >= maxEntriesPerTeam) {
    throw new Error(`This team already reached the entry limit (${maxEntriesPerTeam}) for this item.`);
  }
  const role = profile.role || entryData.source || 'public';
  const needsApproval = role !== 'admin';
  const id = currentId || doc(collection(db, 'dummy')).id;
  const payload = {
    id,
    institutionId: scope.institutionId,
    festivalId: festId,
    competitionId,
    teamId,
    studentIds,
    entryName: entryData.entryName || '',
    source: entryData.source || role,
    status: entryData.status || (needsApproval ? 'pending_approval' : 'approved'),
    rejectionReason: entryData.rejectionReason || '',
    submittedBy: profile.uid || entryData.submittedBy || '',
    submittedByRole: role,
    audit: {
      createdBy: profile.uid || entryData.submittedBy || '',
      createdByRole: role,
      updatedBy: profile.uid || '',
      updatedAt: new Date().toISOString()
    },
    updatedAt: serverTimestamp(),
    createdAt: entryData.createdAt || serverTimestamp()
  };
  try {
    await setDoc(doc(db, window.meeladPulseScopedFestivalPath('entries'), id), payload, { merge: true });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, window.meeladPulseScopedFestivalPath(`entries/${id}`));
  }
}

export async function approveCompetitionEntry(entryId) {
  assertAdminRole();
  const profile = window.currentUserProfile || {};
  try {
    await updateDoc(doc(db, window.meeladPulseScopedFestivalPath('entries'), entryId), {
      status: 'approved',
      rejectionReason: '',
      approvedBy: profile.uid || '',
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, window.meeladPulseScopedFestivalPath(`entries/${entryId}`));
  }
}

export async function rejectCompetitionEntry(entryId, reason) {
  assertAdminRole();
  const profile = window.currentUserProfile || {};
  if (!reason || !reason.trim()) throw new Error('Rejection reason is required.');
  try {
    await updateDoc(doc(db, window.meeladPulseScopedFestivalPath('entries'), entryId), {
      status: 'rejected',
      rejectionReason: reason.trim(),
      rejectedBy: profile.uid || '',
      rejectedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, window.meeladPulseScopedFestivalPath(`entries/${entryId}`));
  }
}

export async function getEntries() {
  return getCompetitionEntries();
}

export async function getStudents() {
  const festId = getActiveFestivalId();
  const path = window.meeladPulseScopedFestivalPath('students');
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
  const path = window.meeladPulseScopedFestivalPath(`entries/${entryId}`);
  try {
    const docRef = doc(db, window.meeladPulseScopedFestivalPath('entries'), entryId);
    await updateDoc(docRef, { overrideApproved: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
