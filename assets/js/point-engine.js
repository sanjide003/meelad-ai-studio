// MeeladPulse Point Mapping Engine
import { determineGrade, determinePositionPoints } from "./calculations.js";

export function getEligibleGradePoints(percentage, gradeRule) {
  const gradeInfo = determineGrade(percentage, gradeRule);
  return gradeInfo.teamPoint;
}

export function getEligiblePositionPoints(position, pointRule) {
  return determinePositionPoints(position, pointRule);
}

// Format grade range definitions
export function formatGradeRange(range) {
  return `${range.grade}: ${range.minPercentage}% - ${range.maxPercentage}% (${range.teamPoint} Pts)`;
}

// Generate default grade ranges
export function generateDefaultGradeRanges() {
  return [
    { grade: 'A+', minPercentage: 80, maxPercentage: 100, gradePoint: 5, teamPoint: 5, certificateEligible: true, displayClass: 'bg-emerald-100 text-emerald-800' },
    { grade: 'A', minPercentage: 70, maxPercentage: 79.99, gradePoint: 4, teamPoint: 5, certificateEligible: true, displayClass: 'bg-emerald-50 text-emerald-700' },
    { grade: 'B', minPercentage: 50, maxPercentage: 69.99, gradePoint: 3, teamPoint: 3, certificateEligible: true, displayClass: 'bg-blue-100 text-blue-800' },
    { grade: 'C', minPercentage: 35, maxPercentage: 49.99, gradePoint: 2, teamPoint: 1, certificateEligible: true, displayClass: 'bg-amber-100 text-amber-800' }
  ];
}
