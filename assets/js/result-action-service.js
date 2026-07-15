// MeeladPulse Result Action Service
import { db } from "./firebase-init.js";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  writeBatch, 
  serverTimestamp,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { compileTeamTotals } from "./calculations.js";
import { createAuditLog } from "./audit-service.js";
import { normalizeMachineValue, generatePrefixes } from "./public-data-normalizer.js";
import { assertOnline } from "./network-status.js";

/**
 * Publishes a single competition result.
 */
export async function publishResult(festId, compId, adminProfile) {
  assertOnline('Result Publication');
  try {
    // 1. Fetch private result
    const resRef = doc(db, window.meeladPulseScopedFestivalPath('results'), compId);
    const resSnap = await getDoc(resRef);
    if (!resSnap.exists()) {
      throw new Error(`Result for competition ${compId} does not exist.`);
    }
    const resData = resSnap.data();

    // Standardize status
    const currentStatus = (resData.status || '').toLowerCase();
    if (currentStatus !== 'approved' && currentStatus !== 'ready_to_publish') {
      throw new Error(`Only Approved or Ready to Publish results can be published. Current status is ${resData.status}`);
    }

    // 2. Fetch competition details
    const compRef = doc(db, window.meeladPulseScopedFestivalPath('competitions'), compId);
    const compSnap = await getDoc(compRef);
    if (!compSnap.exists()) {
      throw new Error(`Competition details for ${compId} not found.`);
    }
    const compData = compSnap.data();

    // Fetch festival config to check showFinalMarks
    const festRef = doc(db, window.meeladPulseScopedFestivalPath());
    const festSnap = await getDoc(festRef);
    const festData = festSnap.exists() ? festSnap.data() : {};
    const showFinalMarks = festData.showFinalMarks !== false;

    // 3. Filter winners for public-safe consumption
    const publicWinners = (resData.participants || [])
      .filter(p => p.position && p.position !== 'None')
      .map(p => ({
        position: p.position,
        displayName: p.displayName || 'Participant',
        displayNameNormalized: normalizeMachineValue(p.displayName),
        chestNumber: p.chestNumber || '',
        chestNumberNormalized: normalizeMachineValue(p.chestNumber),
        teamName: p.teamName || 'Unknown Team',
        teamId: p.teamId || normalizeMachineValue(p.teamName),
        grade: p.grade || 'None',
        finalMark: showFinalMarks ? (Number(p.finalScore) || Number(p.rawScore) || null) : null,
        publicParticipantCode: p.chestNumber || p.participantId || ''
      }));

    // Team points awarded list
    const teamPointsAwarded = (resData.participants || []).map(p => ({
      teamId: p.teamId || normalizeMachineValue(p.teamName),
      teamName: p.teamName,
      points: Number(p.teamPoints) || 0
    }));

    // 4. Create public-safe result document
    const pubResultId = compId;
    const pubResultRef = doc(db, window.meeladPulseScopedFestivalPath('publicData/results'), pubResultId);

    const normPerformanceType = normalizeMachineValue(compData.performanceType || 'stage');
    const performanceTypeCanonical = (normPerformanceType === 'onstage' || normPerformanceType === 'stage') ? 'stage' : 'nonStage';

    const pubPayload = {
      festId,
      resultId: pubResultId,
      competitionId: compId,
      competitionName: compData.name || 'Competition Event',
      competitionCode: compData.code || 'CODE',
      competitionCodeNormalized: normalizeMachineValue(compData.code),
      divisionId: compData.divisionId || '',
      divisionCode: compData.divisionCode || compData.divisionId || '',
      divisionName: compData.divisionName || compData.divisionId || '',
      subdivisionId: compData.subdivisionId || '',
      subdivisionName: compData.subdivisionName || compData.subdivisionId || '',
      categoryId: compData.categoryId || '',
      categoryName: compData.categoryName || compData.categoryId || '',
      resultGroup: `${compData.divisionId || ''}-${compData.categoryId || ''}`,
      competitionType: compData.competitionType || 'individual',
      performanceType: performanceTypeCanonical,
      winners: publicWinners,
      winnerChestNumbers: publicWinners.map(w => w.chestNumberNormalized).filter(Boolean),
      winnerNamesNormalized: publicWinners.map(w => w.displayNameNormalized).filter(Boolean),
      showFinalMarks,
      teamPoints: teamPointsAwarded,
      publicationVersion: Number(resData.publicationVersion || 1),
      status: 'published',
      publishedBy: adminProfile?.name || 'Administrator',
      publishedAt: serverTimestamp()
    };

    // 5. Commit as WriteBatch
    const batch = writeBatch(db);
    batch.set(pubResultRef, pubPayload);

    // Create search index documents for winners
    publicWinners.forEach(w => {
      const sId = `${pubResultId}_${w.chestNumberNormalized || w.displayNameNormalized}`;
      const searchIndexRef = doc(db, window.meeladPulseScopedFestivalPath('publicData/searchIndex'), sId);
      batch.set(searchIndexRef, {
        resultId: pubResultId,
        competitionId: compId,
        competitionCodeNormalized: normalizeMachineValue(compData.code),
        competitionName: compData.name || 'Competition Event',
        displayName: w.displayName,
        displayNameNormalized: w.displayNameNormalized,
        namePrefixes: generatePrefixes(w.displayName),
        chestNumberNormalized: w.chestNumberNormalized,
        teamId: w.teamId,
        categoryId: compData.categoryId || '',
        publishedAt: serverTimestamp(),
        active: true
      });
    });

    batch.update(resRef, { 
      status: 'published',
      publishedBy: adminProfile?.name || 'Administrator',
      publishedAt: serverTimestamp()
    });

    await batch.commit();

    // 6. Recalculate team standings and publish
    await recalculateAndPublishTeamStandings(festId);

    // 7. Create Public Notification / Announcement
    const notRef = collection(db, window.meeladPulseScopedFestivalPath('announcements'));
    const winnersSummaryText = publicWinners.map(w => `${w.position}: ${w.displayName} (${w.teamName})`).join(', ') || 'Standings officialised.';
    await setDoc(doc(notRef), {
      title: `Result Declared: ${compData.name} (${compData.code || 'CODE'})`,
      content: `Official standings for ${compData.name} have been published. ${winnersSummaryText}`,
      target: 'public',
      status: 'published',
      publishDate: serverTimestamp(),
      timestamp: serverTimestamp()
    });

    // 8. Write Audit Log
    await createAuditLog(
      festId, 
      'PUBLISH_RESULT', 
      compId, 
      `Published official standings for ${compData.name} with ${publicWinners.length} winners.`,
      adminProfile?.uid,
      adminProfile?.email
    );

    return true;
  } catch (err) {
    console.error("Failed to publish result:", err);
    throw err;
  }
}

/**
 * Retracts/Unpublishes a competition result.
 */
export async function unpublishResult(festId, compId, adminProfile, reason = '') {
  assertOnline('Result Unpublication');
  try {
    const resRef = doc(db, window.meeladPulseScopedFestivalPath('results'), compId);
    const pubResultRef = doc(db, window.meeladPulseScopedFestivalPath('publicData/results'), compId);
    const compRef = doc(db, window.meeladPulseScopedFestivalPath('competitions'), compId);

    const compSnap = await getDoc(compRef);
    const compName = compSnap.exists() ? compSnap.data().name : compId;

    // Fetch and delete search index documents
    const searchIndexCol = collection(db, window.meeladPulseScopedFestivalPath('publicData/searchIndex'));
    const searchSnap = await getDocs(query(searchIndexCol, where("resultId", "==", compId)));

    // Batch retraction
    const batch = writeBatch(db);
    batch.delete(pubResultRef);
    searchSnap.forEach(d => {
      batch.delete(d.ref);
    });
    batch.update(resRef, { 
      status: 'unpublished',
      retractedReason: reason,
      retractedBy: adminProfile?.name || 'Administrator',
      retractedAt: serverTimestamp()
    });

    await batch.commit();

    // Recalculate standings
    await recalculateAndPublishTeamStandings(festId);

    // Create public announcement for retraction
    const notRef = collection(db, window.meeladPulseScopedFestivalPath('announcements'));
    await setDoc(doc(notRef), {
      title: `Result Standings Retracted: ${compName}`,
      content: `Official standings for ${compName} have been retracted for verification or correction. New standings will be published soon.`,
      target: 'public',
      status: 'published',
      publishDate: serverTimestamp(),
      timestamp: serverTimestamp()
    });

    // Audit Log
    await createAuditLog(
      festId,
      'UNPUBLISH_RESULT',
      compId,
      `Retracted result publication for ${compName}. Reason: ${reason || 'Unspecified'}`,
      adminProfile?.uid,
      adminProfile?.email
    );

    return true;
  } catch (err) {
    console.error("Retraction failed:", err);
    throw err;
  }
}

/**
 * Correct and Republish a competition result.
 */
export async function republishResult(festId, compId, adminProfile, reason = '') {
  assertOnline('Result Publication');
  try {
    const resRef = doc(db, window.meeladPulseScopedFestivalPath('results'), compId);
    const resSnap = await getDoc(resRef);
    if (!resSnap.exists()) {
      throw new Error("Private result record does not exist.");
    }
    const currentVer = Number(resSnap.data().publicationVersion || 1);

    // Update publication version inside private result first
    await setDoc(resRef, { 
      publicationVersion: currentVer + 1,
      status: 'ready_to_publish'
    }, { merge: true });

    // Publish with new parameters
    await publishResult(festId, compId, adminProfile);

    // Audit Log for republishing
    await createAuditLog(
      festId,
      'REPUBLISH_RESULT',
      compId,
      `Republished corrected result for competition ${compId} to Version ${currentVer + 1}. Reason: ${reason || 'Correction'}`,
      adminProfile?.uid,
      adminProfile?.email
    );

    return true;
  } catch (err) {
    console.error("Republish failed:", err);
    throw err;
  }
}

/**
 * Archives an unpublished result into historical storage.
 */
export async function archiveResult(festId, compId, adminProfile, reason = '') {
  try {
    const resRef = doc(db, window.meeladPulseScopedFestivalPath('results'), compId);
    const pubResultRef = doc(db, window.meeladPulseScopedFestivalPath('publicData/results'), compId);

    // Fetch and delete search index documents
    const searchIndexCol = collection(db, window.meeladPulseScopedFestivalPath('publicData/searchIndex'));
    const searchSnap = await getDocs(query(searchIndexCol, where("resultId", "==", compId)));

    const batch = writeBatch(db);
    batch.delete(pubResultRef);
    searchSnap.forEach(d => {
      batch.delete(d.ref);
    });
    batch.update(resRef, {
      status: 'archived',
      archivedReason: reason,
      archivedBy: adminProfile?.name || 'Administrator',
      archivedAt: serverTimestamp()
    });

    await batch.commit();

    await recalculateAndPublishTeamStandings(festId);

    // Audit Log
    await createAuditLog(
      festId,
      'ARCHIVE_RESULT',
      compId,
      `Archived results standing for ${compId}. Reason: ${reason || 'Moved to archive'}`,
      adminProfile?.uid,
      adminProfile?.email
    );

    return true;
  } catch (err) {
    console.error("Archiving failed:", err);
    throw err;
  }
}

/**
 * Pulls all necessary data, computes overall rankings, and writes to teamTotals and publicData collections.
 */
export async function recalculateAndPublishTeamStandings(festId) {
  try {
    // 1. Fetch raw datasets
    const [teamsSnap, resultsSnap, compsSnap, divSnap, bonusSnap, penaltySnap] = await Promise.all([
      getDocs(collection(db, window.meeladPulseScopedFestivalPath('teams'))),
      getDocs(collection(db, window.meeladPulseScopedFestivalPath('results'))),
      getDocs(collection(db, window.meeladPulseScopedFestivalPath('competitions'))),
      getDocs(collection(db, window.meeladPulseScopedFestivalPath('divisions'))),
      getDocs(collection(db, window.meeladPulseScopedFestivalPath('bonusPoints'))),
      getDocs(collection(db, window.meeladPulseScopedFestivalPath('penalties')))
    ]);

    const teams = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const results = resultsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const competitions = compsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const divisions = divSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const bonuses = bonusSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const penalties = penaltySnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 2. Compute Standings
    const totalsList = compileTeamTotals(teams, results, competitions, divisions, bonuses, penalties);

    // 3. Save to private teamTotals and publicData/rankings in a batch
    const batch = writeBatch(db);

    for (const tt of totalsList) {
      // Private Totals
      const ttRef = doc(db, window.meeladPulseScopedFestivalPath('teamTotals'), tt.teamId);
      batch.set(ttRef, {
        ...tt,
        festId,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Public Safe Standings Summary
      const pubRankRef = doc(db, window.meeladPulseScopedFestivalPath('publicData/rankings/teams'), tt.teamId);
      const pubSummary = {
        teamId: tt.teamId,
        teamName: tt.teamName,
        teamCode: tt.teamCode || tt.teamId,
        teamColour: tt.teamColour || '#10b981',
        overallTotal: Number(tt.overallPoints) || 0,
        artsTotal: Number(tt.artsPoints || tt.divisionTotals['arts'] || tt.divisionTotals['Arts'] || tt.stagePoints || 0), // fallback
        sportsTotal: Number(tt.sportsPoints || tt.divisionTotals['sports'] || tt.divisionTotals['Sports'] || tt.nonStagePoints || 0),
        bonusTotal: Number(tt.bonusPoints) || 0,
        penaltyTotal: Number(tt.penaltyPoints) || 0,
        firstCount: Number(tt.firstCount) || 0,
        secondCount: Number(tt.secondCount) || 0,
        thirdCount: Number(tt.thirdCount) || 0,
        rank: Number(tt.rank) || 1,
        updatedAt: serverTimestamp()
      };
      
      // Let's refine division-specific points if arts/sports divisions are properly named
      const artsDiv = divisions.find(d => (d.name || '').toLowerCase() === 'arts');
      const sportsDiv = divisions.find(d => (d.name || '').toLowerCase() === 'sports');
      
      if (artsDiv) pubSummary.artsTotal = Number(tt.divisionTotals[artsDiv.id]) || 0;
      if (sportsDiv) pubSummary.sportsTotal = Number(tt.divisionTotals[sportsDiv.id]) || 0;

      batch.set(pubRankRef, pubSummary);
    }

    await batch.commit();
    console.log("[Recalculation] Successfully computed and published team standings.");

    // Recalculate and publish public individual champions in tandem
    try {
      await recalculateAndPublishIndividualChampions(festId);
    } catch (chErr) {
      console.warn("Failed to publish individual champions concurrently:", chErr);
    }

    return totalsList;
  } catch (err) {
    console.error("Standings calculation or publishing failed:", err);
    throw err;
  }
}

/**
 * Compiles individual competitor points from published results using configured Point & Grade Rules,
 * applies the strict tie-breaker priority sequence, and publishes public-safe champion summaries.
 */
export async function recalculateAndPublishIndividualChampions(festId) {
  try {
    // 1. Load published results and configuration datasets
    const [
      resultsSnap,
      compsSnap,
      pointRulesSnap,
      gradeRulesSnap,
      festStudentsSnap
    ] = await Promise.all([
      getDocs(collection(db, window.meeladPulseScopedFestivalPath('publicData/results'))),
      getDocs(collection(db, window.meeladPulseScopedFestivalPath('competitions'))),
      getDocs(collection(db, window.meeladPulseScopedFestivalPath('pointRules'))),
      getDocs(collection(db, window.meeladPulseScopedFestivalPath('gradeRules'))),
      getDocs(collection(db, window.meeladPulseScopedFestivalPath('festStudents')))
    ]);

    const results = resultsSnap.docs.map(d => d.data());
    const competitions = compsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const pointRules = pointRulesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const gradeRules = gradeRulesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const festStudents = festStudentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Map builders
    const compsMap = {};
    competitions.forEach(c => { compsMap[c.id] = c; });

    const pRulesMap = {};
    pointRules.forEach(r => { pRulesMap[r.id] = r; });

    const gRulesMap = {};
    gradeRules.forEach(r => { gRulesMap[r.id] = r; });

    const festStudsMap = {};
    festStudents.forEach(s => {
      if (s.chestNumber) {
        festStudsMap[s.chestNumber] = s;
      }
    });

    const studsMap = {};
    festStudents.forEach(s => { if (s.studentId) studsMap[s.studentId] = s; });

    // 2. Map rules point calculators dynamically
    const calculateIndividualPoints = (position, grade, pRule, gRule) => {
      if (!pRule) return 0;
      
      let posPts = 0;
      if (pRule.calculationMode !== 'gradeOnly') {
        if (position === '1st') posPts = Number(pRule.firstPlacePoints) || 0;
        else if (position === '2nd') posPts = Number(pRule.secondPlacePoints) || 0;
        else if (position === '3rd') posPts = Number(pRule.thirdPlacePoints) || 0;
        else if (position === '4th') posPts = Number(pRule.fourthPlacePoints) || 0;
        else if (position === '5th') posPts = Number(pRule.fifthPlacePoints) || 0;
      }
      
      let grdPts = 0;
      if (pRule.calculationMode !== 'positionOnly' && grade && grade !== 'None' && gRule && gRule.ranges) {
        const match = gRule.ranges.find(r => r.grade === grade);
        if (match) {
          grdPts = Number(match.gradePoint) || Number(match.teamPoint) || 0;
        }
      }
      
      return posPts + grdPts;
    };

    // 3. Collate points per individual
    const competitorPoints = {};

    results.forEach(res => {
      if (res.competitionType !== 'individual') return;

      const comp = compsMap[res.competitionId];
      if (!comp) return;

      const pRule = pRulesMap[comp.pointRuleId];
      const gRule = gRulesMap[comp.gradeRuleId];

      const winners = res.winners || [];
      winners.forEach(w => {
        const chest = w.chestNumber;
        if (!chest) return;

        const festStud = festStudsMap[chest];
        const studentId = festStud?.studentId;
        const masterStud = studentId ? studsMap[studentId] : null;

        const gender = masterStud?.gender || festStud?.gender || 'male';
        const categoryId = festStud?.categoryId || res.categoryId || 'general';
        const categoryName = res.categoryName || 'General';
        const divisionId = res.divisionId || 'general';
        const divisionName = res.divisionName || 'General';

        if (!competitorPoints[chest]) {
          competitorPoints[chest] = {
            chestNumber: chest,
            displayName: w.displayName,
            teamName: w.teamName,
            teamId: festStud?.teamId || '',
            gender,
            categoryId,
            categoryName,
            divisionId,
            divisionName,
            firstCount: 0,
            secondCount: 0,
            thirdCount: 0,
            gradeCounts: {},
            totalPoints: 0,
            eventScores: []
          };
        }

        const pts = calculateIndividualPoints(w.position, w.grade, pRule, gRule);
        competitorPoints[chest].totalPoints += pts;

        if (w.position === '1st') competitorPoints[chest].firstCount++;
        else if (w.position === '2nd') competitorPoints[chest].secondCount++;
        else if (w.position === '3rd') competitorPoints[chest].thirdCount++;

        if (w.grade && w.grade !== 'None') {
          competitorPoints[chest].gradeCounts[w.grade] = (competitorPoints[chest].gradeCounts[w.grade] || 0) + 1;
        }

        if (w.finalMark !== null && w.finalMark !== undefined) {
          competitorPoints[chest].eventScores.push(Number(w.finalMark));
        }
      });
    });

    const list = Object.values(competitorPoints);

    // Calculate individual average score for fine-grained ties
    list.forEach(c => {
      const sum = c.eventScores.reduce((a, b) => a + b, 0);
      c.averageMark = c.eventScores.length > 0 ? (sum / c.eventScores.length) : 0;
    });

    // 4. Implement exact tie-break resolution sequence
    const sortCompetitors = (arr) => {
      return [...arr].sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.firstCount !== a.firstCount) return b.firstCount - a.firstCount;
        if (b.secondCount !== a.secondCount) return b.secondCount - a.secondCount;
        if (b.thirdCount !== a.thirdCount) return b.thirdCount - a.thirdCount;
        
        const gradesA = (a.gradeCounts['A+'] || 0) + (a.gradeCounts['A'] || 0);
        const gradesB = (b.gradeCounts['A+'] || 0) + (b.gradeCounts['A'] || 0);
        if (gradesB !== gradesA) return gradesB - gradesA;

        if (b.averageMark !== a.averageMark) return b.averageMark - a.averageMark;
        return 0;
      });
    };

    const batch = writeBatch(db);

    const publishGroup = (id, type, title, titleMl, subList) => {
      const sorted = sortCompetitors(subList);
      
      const winners = sorted.map((c, idx) => ({
        rank: idx + 1,
        displayName: c.displayName,
        chestNumber: c.chestNumber,
        teamName: c.teamName,
        teamId: c.teamId,
        points: c.totalPoints,
        firstCount: c.firstCount,
        secondCount: c.secondCount,
        thirdCount: c.thirdCount,
        gradeCounts: c.gradeCounts,
        averageMark: Number(c.averageMark.toFixed(2))
      }));

      batch.set(doc(db, window.meeladPulseScopedFestivalPath('publicData/champions'), id), {
        id,
        type,
        title,
        titleMl,
        winners,
        updatedAt: serverTimestamp()
      });
    };

    // 1. Overall
    publishGroup('overall', 'overall', 'Overall Individual Champion', 'പൊതു വ്യക്തിഗത ചാമ്പ്യൻ', list);

    // 2. Boys Champion
    const boys = list.filter(c => c.gender === 'male');
    publishGroup('boys', 'gender_boys', 'Boys Individual Champion', 'ആൺകുട്ടികളുടെ വിഭാഗം വ്യക്തിഗത ചാമ്പ്യൻ', boys);

    // 3. Girls Champion
    const girls = list.filter(c => c.gender === 'female');
    publishGroup('girls', 'gender_girls', 'Girls Individual Champion', 'പെൺകുട്ടികളുടെ വിഭാഗം വ്യക്തിഗത ചാമ്പ്യൻ', girls);

    // 4. Category-wise Champions
    const catGroups = {};
    list.forEach(c => {
      if (c.categoryId) {
        if (!catGroups[c.categoryId]) catGroups[c.categoryId] = { name: c.categoryName, items: [] };
        catGroups[c.categoryId].items.push(c);
      }
    });

    Object.keys(catGroups).forEach(catId => {
      publishGroup(`category_${catId}`, `category_${catId}`, `${catGroups[catId].name} Individual Champion`, `${catGroups[catId].name} വിഭാഗം വ്യക്തിഗത ചാമ്പ്യൻ`, catGroups[catId].items);
    });

    // 5. Division-wise Champions
    const divGroups = {};
    list.forEach(c => {
      if (c.divisionId) {
        if (!divGroups[c.divisionId]) divGroups[c.divisionId] = { name: c.divisionName, items: [] };
        divGroups[c.divisionId].items.push(c);
      }
    });

    Object.keys(divGroups).forEach(divId => {
      publishGroup(`division_${divId}`, `division_${divId}`, `${divGroups[divId].name} Champion`, `${divGroups[divId].name} ചാമ്പ്യൻ`, divGroups[divId].items);
    });

    // 6. Most First Places
    const sortedFirsts = [...list].sort((a, b) => b.firstCount - a.firstCount || b.totalPoints - a.totalPoints);
    batch.set(doc(db, window.meeladPulseScopedFestivalPath('publicData/champions'), 'most_firsts'), {
      id: 'most_firsts',
      type: 'metric_firsts',
      title: 'Most First Places',
      titleMl: 'ഏറ്റവും കൂടുതൽ ഒന്നാം സ്ഥാനം',
      winners: sortedFirsts.slice(0, 15).map((c, i) => ({
        rank: i + 1,
        displayName: c.displayName,
        chestNumber: c.chestNumber,
        teamName: c.teamName,
        teamId: c.teamId,
        points: c.totalPoints,
        firstCount: c.firstCount,
        secondCount: c.secondCount,
        thirdCount: c.thirdCount,
        gradeCounts: c.gradeCounts
      })),
      updatedAt: serverTimestamp()
    });

    // 7. Most A Grades
    const sortedAGrades = [...list].sort((a, b) => {
      const gA = (a.gradeCounts['A+'] || 0) + (a.gradeCounts['A'] || 0);
      const gB = (b.gradeCounts['A+'] || 0) + (b.gradeCounts['A'] || 0);
      return gB - gA || b.totalPoints - a.totalPoints;
    });
    batch.set(doc(db, window.meeladPulseScopedFestivalPath('publicData/champions'), 'most_a_grades'), {
      id: 'most_a_grades',
      type: 'metric_a_grades',
      title: 'Most A Grades',
      titleMl: 'ഏറ്റവും കൂടുതൽ എ ഗ്രേഡ്',
      winners: sortedAGrades.slice(0, 15).map((c, i) => ({
        rank: i + 1,
        displayName: c.displayName,
        chestNumber: c.chestNumber,
        teamName: c.teamName,
        teamId: c.teamId,
        points: c.totalPoints,
        firstCount: c.firstCount,
        secondCount: c.secondCount,
        thirdCount: c.thirdCount,
        gradeCounts: c.gradeCounts
      })),
      updatedAt: serverTimestamp()
    });

    await batch.commit();
    console.log("[Champions] Re-compiled and published all public individual champion rosters successfully.");
  } catch (err) {
    console.error("[Champions] Failed to recalculate individual champions list:", err);
  }
}

/**
 * Runs a simulated/sandbox calculation of points if specified competitions are published.
 */
export async function simulatePublication(festId, selectedCompIds) {
  try {
    // 1. Fetch datasets
    const [teamsSnap, resultsSnap, compsSnap, divSnap, bonusSnap, penaltySnap] = await Promise.all([
      getDocs(collection(db, window.meeladPulseScopedFestivalPath('teams'))),
      getDocs(collection(db, window.meeladPulseScopedFestivalPath('results'))),
      getDocs(collection(db, window.meeladPulseScopedFestivalPath('competitions'))),
      getDocs(collection(db, window.meeladPulseScopedFestivalPath('divisions'))),
      getDocs(collection(db, window.meeladPulseScopedFestivalPath('bonusPoints'))),
      getDocs(collection(db, window.meeladPulseScopedFestivalPath('penalties')))
    ]);

    const teams = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const results = resultsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const competitions = compsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const divisions = divSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const bonuses = bonusSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const penalties = penaltySnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Find divisions
    const artsDiv = divisions.find(d => (d.name || '').toLowerCase() === 'arts');
    const sportsDiv = divisions.find(d => (d.name || '').toLowerCase() === 'sports');

    // Helper to calculate totals from a list of results
    const getStandingsForResults = (resList) => {
      const computed = compileTeamTotals(teams, resList, competitions, divisions, bonuses, penalties);
      const mapped = {};
      computed.forEach(item => {
        mapped[item.teamId] = {
          overallTotal: item.overallPoints,
          rank: item.rank,
          artsTotal: artsDiv ? (item.divisionTotals[artsDiv.id] || 0) : item.stagePoints,
          sportsTotal: sportsDiv ? (item.divisionTotals[sportsDiv.id] || 0) : item.nonStagePoints,
          stageTotal: item.stagePoints,
          nonStageTotal: item.nonStagePoints
        };
      });
      return mapped;
    };

    // 2. Current active standings (only officially published or approved ones)
    const currentStandings = getStandingsForResults(results);

    // 3. Projected standings (official results + results in selectedCompIds, cloned with Published status)
    const projectedResults = results.map(r => {
      if (selectedCompIds.includes(r.id)) {
        return { ...r, status: 'Published' }; // make it active for calculation
      }
      return r;
    });

    const projectedStandings = getStandingsForResults(projectedResults);

    // 4. Compare current vs projected
    const simulationReport = teams.map(t => {
      const curr = currentStandings[t.id] || { overallTotal: 0, rank: 1, artsTotal: 0, sportsTotal: 0, stageTotal: 0, nonStageTotal: 0 };
      const proj = projectedStandings[t.id] || { overallTotal: 0, rank: 1, artsTotal: 0, sportsTotal: 0, stageTotal: 0, nonStageTotal: 0 };

      return {
        teamId: t.id,
        teamName: t.name,
        teamCode: t.code || t.id,
        teamColour: t.colour || '#10b981',
        
        currentTotal: curr.overallTotal,
        projectedTotal: proj.overallTotal,
        diff: proj.overallTotal - curr.currentTotal, // total points diff

        currentRank: curr.rank,
        projectedRank: proj.rank,

        artsDiff: proj.artsTotal - curr.artsTotal,
        sportsDiff: proj.sportsTotal - curr.sportsTotal,
        stageDiff: proj.stageTotal - curr.stageTotal,
        nonStageDiff: proj.nonStageTotal - curr.nonStageTotal
      };
    });

    // Sort by projected total descending
    simulationReport.sort((a, b) => b.projectedTotal - a.projectedTotal);

    return simulationReport;
  } catch (err) {
    console.error("Simulation failed:", err);
    throw err;
  }
}

/**
 * Public Data Migration: Re-publishes all active/approved results into the public-safe database.
 * Useful for recovering or rebuilding the public index.
 */
export async function migratePublicData(festId, adminProfile) {
  assertOnline('Public Data Migration');
  try {
    const resultsSnap = await getDocs(collection(db, window.meeladPulseScopedFestivalPath('results')));
    let count = 0;
    for (const d of resultsSnap.docs) {
      const res = d.data();
      const status = (res.status || '').toLowerCase();
      if (status === 'published' || status === 'approved') {
        await publishResult(festId, d.id, adminProfile);
        count++;
      }
    }
    
    await createAuditLog(
      festId,
      'PUBLIC_DATA_MIGRATION',
      'all',
      `Completed public data migration/re-index for ${count} results.`,
      adminProfile?.uid,
      adminProfile?.email
    );
    return count;
  } catch (err) {
    console.error("Public data migration failed:", err);
    throw err;
  }
}

