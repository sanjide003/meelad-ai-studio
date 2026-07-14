/**
 * MeeladPulse - High Fidelity Calculations Engine
 * Handles judge mark aggregates, ties, point assignments, and championship ranks
 */

import { 
  Competition, 
  JudgeMark, 
  Entry, 
  GradeRule, 
  PointRule, 
  CompetitionResult, 
  ResultParticipant, 
  TeamTotal, 
  Penalty, 
  BonusPoint, 
  Team, 
  FestivalStudent, 
  MasterStudent,
  Category
} from './types';

// Calculate score from multiple judge marks
export function calculateAggregatedScore(
  marks: JudgeMark[], 
  method: string, 
  maxMark: number
): { rawScore: number; percentage: number } {
  if (marks.length === 0) return { rawScore: 0, percentage: 0 };
  
  const scores = marks.map(m => m.rawTotal);
  let rawScore = 0;

  switch (method) {
    case 'averageOfJudges': {
      const sum = scores.reduce((a, b) => a + b, 0);
      rawScore = sum / scores.length;
      break;
    }
    case 'removeHighestAndLowestThenAverage': {
      if (scores.length <= 2) {
        const sum = scores.reduce((a, b) => a + b, 0);
        rawScore = sum / scores.length;
      } else {
        const sorted = [...scores].sort((a, b) => a - b);
        sorted.pop(); // remove highest
        sorted.shift(); // remove lowest
        const sum = sorted.reduce((a, b) => a + b, 0);
        rawScore = sum / sorted.length;
      }
      break;
    }
    case 'sumOfJudges':
    default: {
      rawScore = scores.reduce((a, b) => a + b, 0);
      break;
    }
  }

  // Calculate percentage based on theoretical maximum
  const divisor = method === 'sumOfJudges' ? maxMark * scores.length : maxMark;
  const percentage = divisor > 0 ? (rawScore / divisor) * 100 : 0;

  return { 
    rawScore: Number(rawScore.toFixed(2)), 
    percentage: Number(percentage.toFixed(2)) 
  };
}

// Find grade based on rules
export function determineGrade(
  percentage: number, 
  gradeRule: GradeRule
): { grade: string; gradePoint: number; teamPoint: number; displayClass: string } {
  const match = gradeRule.ranges.find(
    r => percentage >= r.minPercentage && percentage <= r.maxPercentage
  );
  if (match) {
    return {
      grade: match.grade,
      gradePoint: match.gradePoint,
      teamPoint: match.teamPoint,
      displayClass: match.displayClass
    };
  }
  return { grade: 'None', gradePoint: 0, teamPoint: 0, displayClass: '' };
}

// Map position string (1st, 2nd, 3rd) to team points
export function determinePositionPoints(
  position: string, 
  pointRule: PointRule
): number {
  if (pointRule.calculationMode === 'gradeOnly') return 0;
  
  if (position === '1st') return pointRule.firstPlacePoints;
  if (position === '2nd') return pointRule.secondPlacePoints;
  if (position === '3rd') return pointRule.thirdPlacePoints;
  if (position === '4th') return pointRule.fourthPlacePoints || 0;
  if (position === '5th') return pointRule.fifthPlacePoints || 0;
  
  return 0;
}

// Compile participant lists and assign positions resolving ties
export function compilePositions(
  participants: ResultParticipant[],
  pointRule: PointRule,
  gradeRule: GradeRule
): ResultParticipant[] {
  // Sort by finalScore descending
  const sorted = [...participants].sort((a, b) => b.finalScore - a.finalScore);
  
  // Assign simple rank / positions resolving joint ranks
  let currentPos = 1;
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    if (current.status === 'absent' || current.status === 'disqualified') {
      current.position = 'None';
      current.grade = 'None';
      current.teamPoints = 0;
      continue;
    }

    // Assign grades
    const gradeInfo = determineGrade(current.percentage, gradeRule);
    current.grade = gradeInfo.grade;

    // Detect joint rank
    if (i > 0 && sorted[i - 1].finalScore === current.finalScore) {
      // Joint position
      sorted[i].position = sorted[i - 1].position;
    } else {
      currentPos = i + 1;
      if (currentPos === 1) sorted[i].position = '1st';
      else if (currentPos === 2) sorted[i].position = '2nd';
      else if (currentPos === 3) sorted[i].position = '3rd';
      else sorted[i].position = 'None';
    }

    // Determine points (Position points + Grade points, or based on mode)
    let posPts = determinePositionPoints(sorted[i].position, pointRule);
    let grdPts = pointRule.calculationMode === 'positionOnly' ? 0 : gradeInfo.teamPoint;

    if (pointRule.calculationMode === 'positionAndGrade') {
      sorted[i].teamPoints = posPts + grdPts;
    } else if (pointRule.calculationMode === 'positionOnly') {
      sorted[i].teamPoints = posPts;
    } else if (pointRule.calculationMode === 'gradeOnly') {
      sorted[i].teamPoints = grdPts;
    } else {
      sorted[i].teamPoints = posPts + grdPts;
    }

    // Add participation point if registered and participated but got no grades/positions
    if (sorted[i].teamPoints === 0 && current.status === 'participated') {
      sorted[i].teamPoints = pointRule.participationPoints;
    }
  }

  return sorted;
}

// Compile complete Team Totals across divisions, stages, bonuses, and penalties
export function compileTeamTotals(
  teams: Team[],
  results: CompetitionResult[],
  competitions: Competition[],
  bonuses: BonusPoint[],
  penalties: Penalty[]
): TeamTotal[] {
  const totals: { [teamId: string]: TeamTotal } = {};

  // Initialize totals for all teams
  for (const team of teams) {
    totals[team.id] = {
      id: team.id,
      teamId: team.id,
      festId: '', // set externally
      divisionTotals: {},
      subdivisionTotals: {},
      stagePoints: 0,
      nonStagePoints: 0,
      bonusPoints: 0,
      penaltyPoints: 0,
      overallPoints: 0,
      firstCount: 0,
      secondCount: 0,
      thirdCount: 0,
      gradeCounts: {},
      rank: 0,
      updatedAt: new Date()
    };
  }

  // Aggregate points from published results
  for (const res of results) {
    if (res.status !== 'Published') continue;
    
    const comp = competitions.find(c => c.id === res.competitionId);
    if (!comp) continue;

    for (const part of res.participants) {
      const teamId = part.teamId;
      if (!totals[teamId]) continue;

      const pts = part.teamPoints;
      
      // Division totals
      const divId = comp.divisionId;
      totals[teamId].divisionTotals[divId] = (totals[teamId].divisionTotals[divId] || 0) + pts;

      // Subdivision totals
      const subId = comp.subdivisionId;
      totals[teamId].subdivisionTotals[subId] = (totals[teamId].subdivisionTotals[subId] || 0) + pts;

      // Stage / Non-Stage aggregates
      if (comp.performanceType === 'stage') {
        totals[teamId].stagePoints += pts;
      } else {
        totals[teamId].nonStagePoints += pts;
      }

      // Rank positions counts
      if (part.position === '1st') totals[teamId].firstCount++;
      else if (part.position === '2nd') totals[teamId].secondCount++;
      else if (part.position === '3rd') totals[teamId].thirdCount++;

      // Grades counts
      if (part.grade && part.grade !== 'None') {
        totals[teamId].gradeCounts[part.grade] = (totals[teamId].gradeCounts[part.grade] || 0) + 1;
      }
    }
  }

  // Integrate bonuses
  for (const bon of bonuses) {
    if (totals[bon.teamId]) {
      totals[bon.teamId].bonusPoints += bon.value;
    }
  }

  // Integrate approved penalties
  for (const pen of penalties) {
    if (pen.status === 'approved' && pen.penaltyType === 'teamPointDeduction' && totals[pen.targetId]) {
      totals[pen.targetId].penaltyPoints += pen.value;
    }
  }

  // Calculate final overall points
  const totalsList = Object.values(totals);
  for (const tt of totalsList) {
    const divSum = Object.values(tt.divisionTotals).reduce((a, b) => a + b, 0);
    tt.overallPoints = divSum + tt.bonusPoints - tt.penaltyPoints;
  }

  // Sort overall to assign rank
  const ranked = [...totalsList].sort((a, b) => b.overallPoints - a.overallPoints);
  for (let i = 0; i < ranked.length; i++) {
    ranked[i].rank = i + 1;
  }

  return ranked;
}

// Compile Individual Champions
export interface IndividualChampion {
  studentId: string;
  fullName: string;
  gender: string;
  teamName: string;
  categoryName: string;
  totalPoints: number;
  firstCount: number;
  secondCount: number;
  thirdCount: number;
  gradeCounts: { [grade: string]: number };
}

export function compileIndividualChampions(
  results: CompetitionResult[],
  competitions: Competition[],
  festStudents: FestivalStudent[],
  masterStudents: MasterStudent[],
  teams: Team[],
  categories: Category[]
): IndividualChampion[] {
  const studs: { [stdId: string]: any } = {};

  for (const res of results) {
    if (res.status !== 'Published') continue;
    const comp = competitions.find(c => c.id === res.competitionId);
    if (!comp || comp.competitionType !== 'individual') continue; // only individual counts for personal championship

    for (const part of res.participants) {
      if (!part.studentId) continue;
      const stdId = part.studentId;

      if (!studs[stdId]) {
        const festStudent = festStudents.find(fs => fs.studentId === stdId);
        const master = masterStudents.find(m => m.id === stdId);
        const team = teams.find(t => t.id === part.teamId);
        const cat = categories.find(c => c.id === festStudent?.categoryId);

        studs[stdId] = {
          studentId: stdId,
          fullName: master?.fullName || part.displayName,
          gender: master?.gender || 'male',
          teamName: team?.name || part.teamName,
          categoryName: cat?.name || 'General',
          totalPoints: 0,
          firstCount: 0,
          secondCount: 0,
          thirdCount: 0,
          gradeCounts: {}
        };
      }

      // Individual points logic (e.g. 5 for First, 3 for Second, 1 for Third, plus Grade points)
      // Standard personal champion allocation: Position pts + Grade pts
      let personalPts = 0;
      if (part.position === '1st') {
        personalPts += 5;
        studs[stdId].firstCount++;
      } else if (part.position === '2nd') {
        personalPts += 3;
        studs[stdId].secondCount++;
      } else if (part.position === '3rd') {
        personalPts += 1;
        studs[stdId].thirdCount++;
      }

      // Add grade points
      if (part.grade === 'A+') personalPts += 5;
      else if (part.grade === 'A') personalPts += 5;
      else if (part.grade === 'B') personalPts += 3;
      else if (part.grade === 'C') personalPts += 1;

      studs[stdId].totalPoints += personalPts;
      
      if (part.grade && part.grade !== 'None') {
        studs[stdId].gradeCounts[part.grade] = (studs[stdId].gradeCounts[part.grade] || 0) + 1;
      }
    }
  }

  return Object.values(studs).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.firstCount !== a.firstCount) return b.firstCount - a.firstCount;
    if (b.secondCount !== a.secondCount) return b.secondCount - a.secondCount;
    return b.thirdCount - a.thirdCount;
  }) as IndividualChampion[];
}
