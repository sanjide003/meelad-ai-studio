// MeeladPulse Calculations Engine
// Implements core client-side scoring, grading, position sorting with ties, and team total tabulations.

export function calculateAggregatedScore(marks, method, maxMark) {
  if (!marks || marks.length === 0) return { rawScore: 0, percentage: 0 };
  
  const scores = marks.map(m => Number(m.rawTotal) || 0);
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

  const divisor = method === 'sumOfJudges' ? maxMark * scores.length : maxMark;
  const percentage = divisor > 0 ? (rawScore / divisor) * 100 : 0;

  return { 
    rawScore: Number(rawScore.toFixed(2)), 
    percentage: Number(percentage.toFixed(2)) 
  };
}

export function determineGrade(percentage, gradeRule) {
  if (!gradeRule || !gradeRule.ranges) {
    return { grade: 'None', gradePoint: 0, teamPoint: 0, displayClass: '' };
  }
  const match = gradeRule.ranges.find(
    r => percentage >= r.minPercentage && percentage <= r.maxPercentage
  );
  if (match) {
    return {
      grade: match.grade,
      gradePoint: Number(match.gradePoint) || 0,
      teamPoint: Number(match.teamPoint) || 0,
      displayClass: match.displayClass || ''
    };
  }
  return { grade: 'None', gradePoint: 0, teamPoint: 0, displayClass: '' };
}

export function determinePositionPoints(position, pointRule) {
  if (!pointRule) return 0;
  if (pointRule.calculationMode === 'gradeOnly') return 0;
  
  if (position === '1st') return Number(pointRule.firstPlacePoints) || 0;
  if (position === '2nd') return Number(pointRule.secondPlacePoints) || 0;
  if (position === '3rd') return Number(pointRule.thirdPlacePoints) || 0;
  if (position === '4th') return Number(pointRule.fourthPlacePoints) || 0;
  if (position === '5th') return Number(pointRule.fifthPlacePoints) || 0;
  
  return 0;
}

// Compile participant lists and assign positions, resolving ties
export function compilePositions(participants, pointRule, gradeRule, tieBreakRule) {
  // Sort by rawScore or finalScore descending
  let sorted = [...participants];
  
  // Apply sorting with tie-breaker priority
  sorted.sort((a, b) => {
    if (b.finalScore !== a.finalScore) {
      return b.finalScore - a.finalScore;
    }
    // If scores are equal, apply tie break rule sequence
    if (tieBreakRule && tieBreakRule.prioritySequence) {
      for (const priority of tieBreakRule.prioritySequence) {
        if (priority === 'highestRawMark') {
          const rawDiff = (b.rawScore || 0) - (a.rawScore || 0);
          if (rawDiff !== 0) return rawDiff;
        }
        // Other rules can be added here
      }
    }
    return 0;
  });

  let currentPos = 1;
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    if (current.status === 'absent' || current.status === 'disqualified') {
      current.position = 'None';
      current.grade = 'None';
      current.teamPoints = 0;
      continue;
    }

    const gradeInfo = determineGrade(current.percentage, gradeRule);
    current.grade = gradeInfo.grade;

    // Detect joint rank
    if (i > 0 && sorted[i - 1].finalScore === current.finalScore) {
      current.position = sorted[i - 1].position;
    } else {
      currentPos = i + 1;
      if (currentPos === 1) current.position = '1st';
      else if (currentPos === 2) current.position = '2nd';
      else if (currentPos === 3) current.position = '3rd';
      else current.position = 'None';
    }

    const posPts = determinePositionPoints(current.position, pointRule);
    const grdPts = pointRule.calculationMode === 'positionOnly' ? 0 : gradeInfo.teamPoint;

    if (pointRule.calculationMode === 'positionAndGrade') {
      current.teamPoints = posPts + grdPts;
    } else if (pointRule.calculationMode === 'positionOnly') {
      current.teamPoints = posPts;
    } else if (pointRule.calculationMode === 'gradeOnly') {
      current.teamPoints = grdPts;
    } else {
      current.teamPoints = posPts + grdPts;
    }

    if (current.teamPoints === 0 && current.status === 'participated') {
      current.teamPoints = Number(pointRule.participationPoints) || 0;
    }
  }

  return sorted;
}

// Compile complete Team Totals across divisions, stages, bonuses, and penalties
export function compileTeamTotals(teams, results, competitions, divisions, bonuses, penalties) {
  const totals = {};

  // Initialize totals for all teams
  for (const team of teams) {
    totals[team.id] = {
      id: team.id,
      teamId: team.id,
      teamName: team.name,
      teamCode: team.code,
      teamColour: team.colour || '#10b981',
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
    const stat = (res.status || '').toLowerCase();
    if (stat !== 'published' && stat !== 'approved') continue;
    
    const comp = competitions.find(c => c.id === res.competitionId);
    if (!comp) continue;

    for (const part of res.participants) {
      const teamId = part.teamId;
      if (!totals[teamId]) continue;

      const pts = Number(part.teamPoints) || 0;
      
      // Division totals
      const divId = comp.divisionId;
      if (divId) {
        totals[teamId].divisionTotals[divId] = (totals[teamId].divisionTotals[divId] || 0) + pts;
      }

      // Subdivision totals
      const subId = comp.subdivisionId;
      if (subId) {
        totals[teamId].subdivisionTotals[subId] = (totals[teamId].subdivisionTotals[subId] || 0) + pts;
      }

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
  if (bonuses) {
    for (const bon of bonuses) {
      if (totals[bon.teamId]) {
        totals[bon.teamId].bonusPoints += Number(bon.value) || 0;
      }
    }
  }

  // Integrate approved penalties
  if (penalties) {
    for (const pen of penalties) {
      if (pen.status === 'approved' && pen.penaltyType === 'teamPointDeduction' && totals[pen.targetId]) {
        totals[pen.targetId].penaltyPoints += Number(pen.value) || 0;
      }
    }
  }

  // Calculate final overall points
  const totalsList = Object.values(totals);
  for (const tt of totalsList) {
    const divSum = Object.values(tt.divisionTotals).reduce((a, b) => a + b, 0);
    tt.overallPoints = divSum + tt.bonusPoints - tt.penaltyPoints;
  }

  // Sort overall to assign rank
  totalsList.sort((a, b) => b.overallPoints - a.overallPoints);
  for (let i = 0; i < totalsList.length; i++) {
    totalsList[i].rank = i + 1;
  }

  return totalsList;
}
