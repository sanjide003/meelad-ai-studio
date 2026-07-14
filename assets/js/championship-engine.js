// MeeladPulse Championship Aggregator and Scoreboard Engine
import { 
  getTeams, 
  getResults, 
  getCompetitions, 
  getDivisions, 
  getBonuses, 
  getPenalties, 
  saveTeamTotalsBatch,
  getActiveFestivalId,
  saveChampionsBatch,
  getPointRules,
  getGradeRules,
  getCategories
} from "./firestore-service.js";
import { getFestivalSettings } from "./student-service.js";
import { db } from "./firebase-init.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { normalizeResultStatus } from "./result-engine.js";

export async function recalculateChampionshipTotals() {
  const festId = getActiveFestivalId();
  try {
    // 1. Load active datasets including rules and categories for champion calculations
    const [teams, results, competitions, divisions, bonuses, penalties, pointRules, gradeRules, categories, festSettings] = await Promise.all([
      getTeams(),
      getResults(),
      getCompetitions(),
      getDivisions(),
      getBonuses(),
      getPenalties(),
      getPointRules(),
      getGradeRules(),
      getCategories(),
      getFestivalSettings(festId)
    ]);

    if (teams.length === 0) {
      console.warn("No teams found to calculate totals.");
      return [];
    }

    // 2. Initialize aggregate state for each team
    const teamTotals = {};
    for (const team of teams) {
      teamTotals[team.id] = {
        id: team.id,
        teamId: team.id,
        teamName: team.name,
        teamCode: team.code,
        teamColour: team.colour || '#10b981',
        festId,
        // Division wise summary
        divisionTotals: {},
        subdivisionTotals: {},
        
        // Arts Metrics
        stagePoints: 0,
        nonStagePoints: 0,
        artsTotal: 0,

        // Sports Metrics
        trackPoints: 0,
        fieldPoints: 0,
        teamEventPoints: 0,
        indoorPoints: 0,
        outdoorPoints: 0,
        sportsTotal: 0,

        // Overall Metrics
        otherDivisionTotals: 0,
        bonusPoints: 0,
        penaltyPoints: 0,
        overallPoints: 0,
        
        // Place counts
        firstCount: 0,
        secondCount: 0,
        thirdCount: 0,
        gradeCounts: {},
        rank: 0
      };
    }

    // 3. Aggregate points from published/approved results
    const competitorScores = {};

    for (const res of results) {
      const normalizedStatus = normalizeResultStatus(res.status);
      if (normalizedStatus !== 'published' && normalizedStatus !== 'approved') continue;

      const comp = competitions.find(c => c.id === res.competitionId);
      if (!comp) continue;

      const division = divisions.find(d => d.id === comp.divisionId);
      const isSportsDiv = division && (division.code?.toLowerCase().includes('sport') || division.name?.toLowerCase().includes('sport') || division.name?.toLowerCase().includes('കായിക'));

      const isIndividual = comp.competitionType === 'individual';
      const category = categories.find(c => c.id === comp.categoryId);

      for (const part of res.participants) {
        const teamId = part.teamId;
        if (!teamTotals[teamId]) continue;

        const pts = Number(part.teamPoints) || 0;

        // General division-wise mappings
        if (comp.divisionId) {
          teamTotals[teamId].divisionTotals[comp.divisionId] = (teamTotals[teamId].divisionTotals[comp.divisionId] || 0) + pts;
        }
        if (comp.subdivisionId) {
          teamTotals[teamId].subdivisionTotals[comp.subdivisionId] = (teamTotals[teamId].subdivisionTotals[comp.subdivisionId] || 0) + pts;
        }

        // Segment classification: Sports vs Arts
        if (isSportsDiv) {
          if (comp.performanceType === 'track') {
            teamTotals[teamId].trackPoints += pts;
          } else if (comp.performanceType === 'field') {
            teamTotals[teamId].fieldPoints += pts;
          } else if (comp.performanceType === 'indoor') {
            teamTotals[teamId].indoorPoints += pts;
          } else if (comp.performanceType === 'outdoor') {
            teamTotals[teamId].outdoorPoints += pts;
          }

          if (comp.competitionType === 'team' || comp.competitionType === 'group') {
            teamTotals[teamId].teamEventPoints += pts;
          }
        } else {
          // Arts Classification
          if (comp.performanceType === 'stage') {
            teamTotals[teamId].stagePoints += pts;
          } else {
            // nonStage, written, oral, etc.
            teamTotals[teamId].nonStagePoints += pts;
          }
        }

        // Rank counts
        if (part.position === '1st') teamTotals[teamId].firstCount++;
        else if (part.position === '2nd') teamTotals[teamId].secondCount++;
        else if (part.position === '3rd') teamTotals[teamId].thirdCount++;

        // Grade counts
        if (part.grade && part.grade !== 'None') {
          teamTotals[teamId].gradeCounts[part.grade] = (teamTotals[teamId].gradeCounts[part.grade] || 0) + 1;
        }

        // Aggregate individual performers for champions page
        if (isIndividual && part.status !== 'absent' && part.status !== 'disqualified') {
          const compKey = part.studentId || part.chestNumber;
          if (compKey) {
            if (!competitorScores[compKey]) {
              competitorScores[compKey] = {
                id: compKey,
                studentId: part.studentId || '',
                displayName: part.displayName || '',
                chestNumber: part.chestNumber || '',
                teamId: part.teamId || '',
                teamName: part.teamName || '',
                categoryId: comp.categoryId || '',
                categoryName: category ? category.name : '',
                divisionId: comp.divisionId || '',
                divisionName: division ? division.name : '',
                totalPoints: 0,
                stagePoints: 0,
                firstCount: 0,
                secondCount: 0,
                thirdCount: 0,
                aGradeCount: 0,
                percentageSum: 0,
                rawScoreSum: 0,
                percentageCount: 0
              };
            }

            const scoreRec = competitorScores[compKey];
            scoreRec.totalPoints += pts;

            if (comp.performanceType === 'stage') {
              scoreRec.stagePoints += pts;
            }

            if (part.position === '1st') scoreRec.firstCount++;
            else if (part.position === '2nd') scoreRec.secondCount++;
            else if (part.position === '3rd') scoreRec.thirdCount++;

            if (part.grade && part.grade.toUpperCase().startsWith('A')) {
              scoreRec.aGradeCount++;
            }

            if (part.percentage) {
              scoreRec.percentageSum += Number(part.percentage) || 0;
              scoreRec.percentageCount++;
            }

            scoreRec.rawScoreSum += Number(part.rawScore) || 0;
          }
        }
      }
    }

    // 4. Incorporate active bonuses
    for (const bon of bonuses) {
      if (teamTotals[bon.teamId]) {
        teamTotals[bon.teamId].bonusPoints += Number(bon.value) || 0;
      }
    }

    // 5. Incorporate approved penalties
    for (const pen of penalties) {
      if (pen.status === 'approved' && pen.penaltyType === 'teamPointDeduction' && teamTotals[pen.targetId]) {
        teamTotals[pen.targetId].penaltyPoints += Number(pen.value) || 0;
      }
    }

    // 6. Final sum compilation
    const totalsList = Object.values(teamTotals);
    for (const tt of totalsList) {
      // Totals calculations
      tt.artsTotal = tt.stagePoints + tt.nonStagePoints;
      tt.sportsTotal = tt.trackPoints + tt.fieldPoints + tt.teamEventPoints + tt.indoorPoints + tt.outdoorPoints;

      // Other totals (divisions not classified as primary arts or sports)
      const allDivPoints = Object.values(tt.divisionTotals).reduce((a, b) => a + b, 0);
      
      // Overall Total = Sum of all divisions + Bonus - Penalties
      tt.overallPoints = allDivPoints + tt.bonusPoints - tt.penaltyPoints;
      
      // Calculate other division totals as leftover points
      tt.otherDivisionTotals = Math.max(0, allDivPoints - (tt.artsTotal + tt.sportsTotal));
    }

    // 7. Sort to determine rank
    totalsList.sort((a, b) => {
      if (b.overallPoints !== a.overallPoints) return b.overallPoints - a.overallPoints;
      if (b.firstCount !== a.firstCount) return b.firstCount - a.firstCount;
      if (b.secondCount !== a.secondCount) return b.secondCount - a.secondCount;
      return b.thirdCount - a.thirdCount;
    });

    for (let i = 0; i < totalsList.length; i++) {
      totalsList[i].rank = i + 1;
    }

    // 8. Load existing champions to check for admin overrides
    let existingChamps = [];
    try {
      const snap = await getDocs(collection(db, window.meeladPulseScopedFestivalPath('publicData/champions')));
      existingChamps = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.log("Existing champions snapshot could not be loaded:", e);
    }

    // Load active festival student profiles to retrieve DOB details for age-based tie-breakers
    let studentsMap = {};
    try {
      const studSnap = await getDocs(collection(db, window.meeladPulseScopedFestivalPath('festStudents')));
      studSnap.forEach(d => {
        studentsMap[d.id] = d.data();
      });
    } catch (e) {
      console.log("Students map could not be loaded for DOB tie-breaker:", e);
    }

    // Determine configured tie-break sequence from festival settings
    const tieBreakers = festSettings?.championshipTieBreakers || [
      'totalPoints',
      'firstPlaceCount',
      'secondPlaceCount',
      'thirdPlaceCount',
      'aGradeCount',
      'averagePercentage',
      'adminDecision'
    ];

    // Helper to evaluate tie-break comparisons between two competitor scores
    const compareCompetitorsBySequence = (a, b) => {
      for (const rule of tieBreakers) {
        if (rule === 'totalPoints') {
          if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        } else if (rule === 'firstPlaceCount') {
          if (b.firstCount !== a.firstCount) return b.firstCount - a.firstCount;
        } else if (rule === 'secondPlaceCount') {
          if (b.secondCount !== a.secondCount) return b.secondCount - a.secondCount;
        } else if (rule === 'thirdPlaceCount') {
          if (b.thirdCount !== a.thirdCount) return b.thirdCount - a.thirdCount;
        } else if (rule === 'aGradeCount') {
          if (b.aGradeCount !== a.aGradeCount) return b.aGradeCount - a.aGradeCount;
        } else if (rule === 'averagePercentage') {
          if (b.averagePercentage !== a.averagePercentage) return b.averagePercentage - a.averagePercentage;
        } else if (rule === 'rawScoreSum') {
          if (b.rawScoreSum !== a.rawScoreSum) return b.rawScoreSum - a.rawScoreSum;
        } else if (rule === 'stagePoints') {
          if (b.stagePoints !== a.stagePoints) return b.stagePoints - a.stagePoints;
        } else if (rule === 'youngerAge') {
          const dobA = studentsMap[a.studentId]?.dateOfBirth || studentsMap[a.studentId]?.dob || '';
          const dobB = studentsMap[b.studentId]?.dateOfBirth || studentsMap[b.studentId]?.dob || '';
          if (dobA && dobB) {
            const diff = new Date(dobB) - new Date(dobA); // younger student wins
            if (diff !== 0) return diff;
          }
        } else if (rule === 'olderAge') {
          const dobA = studentsMap[a.studentId]?.dateOfBirth || studentsMap[a.studentId]?.dob || '';
          const dobB = studentsMap[b.studentId]?.dateOfBirth || studentsMap[b.studentId]?.dob || '';
          if (dobA && dobB) {
            const diff = new Date(dobA) - new Date(dobB); // older student wins
            if (diff !== 0) return diff;
          }
        }
      }
      return 0; // Truly tied according to the configured sequence
    };

    // 9. Process Individual Champions with strict tie-breaking priority sequence
    const championsList = Object.values(competitorScores).map(comp => {
      const averagePercentage = comp.percentageCount > 0 ? Number((comp.percentageSum / comp.percentageCount).toFixed(2)) : 0;
      return {
        id: comp.id,
        studentId: comp.studentId,
        displayName: comp.displayName,
        chestNumber: comp.chestNumber,
        teamId: comp.teamId,
        teamName: comp.teamName,
        categoryId: comp.categoryId,
        categoryName: comp.categoryName,
        divisionId: comp.divisionId,
        divisionName: comp.divisionName,
        totalPoints: comp.totalPoints,
        stagePoints: comp.stagePoints || 0,
        // We do NOT attach dateOfBirth to this returned object to prevent DOB leaking to public documents!
        firstCount: comp.firstCount,
        secondCount: comp.secondCount,
        thirdCount: comp.thirdCount,
        aGradeCount: comp.aGradeCount,
        averagePercentage,
        rawScoreSum: Number(comp.rawScoreSum.toFixed(2)),
        rank: 999,
        tieBrokenByAdmin: false,
        tieStatus: 'resolved', // default
        active: true
      };
    });

    const groupedByCat = {};
    championsList.forEach(champ => {
      const catId = champ.categoryId || 'general';
      if (!groupedByCat[catId]) groupedByCat[catId] = [];
      groupedByCat[catId].push(champ);
    });

    const finalChampionsToSave = [];

    for (const catId in groupedByCat) {
      const list = groupedByCat[catId];
      
      // Sort using the custom comparison sequence
      list.sort(compareCompetitorsBySequence);

      for (let i = 0; i < list.length; i++) {
        list[i].rank = i + 1;
        list[i].tieStatus = 'resolved';
      }

      // Identify ties & mark status as joint or unresolved
      for (let i = 0; i < list.length; i++) {
        let isTied = false;
        if (i > 0 && compareCompetitorsBySequence(list[i], list[i-1]) === 0) {
          isTied = true;
        }
        if (i < list.length - 1 && compareCompetitorsBySequence(list[i], list[i+1]) === 0) {
          isTied = true;
        }

        if (isTied) {
          const hasJointRule = tieBreakers.includes('jointChampion') || tieBreakers.includes('joint');
          list[i].tieStatus = hasJointRule ? 'joint' : 'unresolved';
          
          if (i > 0 && compareCompetitorsBySequence(list[i], list[i-1]) === 0) {
            list[i].rank = list[i-1].rank;
          }
        }
      }

      for (let i = 0; i < list.length; i++) {
        const champ = list[i];

        // Apply admin override check from existing snapshot
        const match = existingChamps.find(ec => ec.id === champ.id);
        if (match) {
          if (match.tieBrokenByAdmin === true) {
            champ.tieBrokenByAdmin = true;
            if (match.rank !== undefined) {
              champ.rank = match.rank;
            }
            if (match.tieStatus) {
              champ.tieStatus = match.tieStatus;
            }
          }
        }
        finalChampionsToSave.push(champ);
      }
    }

    // 10. Commit tabulated team totals and individual champions to Firestore
    await saveTeamTotalsBatch(totalsList);
    if (finalChampionsToSave.length > 0) {
      await saveChampionsBatch(finalChampionsToSave);
    }

    return totalsList;
  } catch (error) {
    console.error("Failed to compile championship totals:", error);
    throw error;
  }
}
