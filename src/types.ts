/**
 * MeeladPulse - Type Definitions
 */

export type UserRole = 'admin' | 'judge' | 'teamLeader';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  teamId: string | null;
  active: boolean;
  permissions: string[];
  createdAt: any;
  updatedAt: any;
}

export interface Festival {
  id: string;
  title: string;
  code: string;
  description: string;
  logoPath: string;
  bannerPath: string;
  venue: string;
  startDate: string;
  endDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
  directorName: string;
  convenerName: string;
  genderMode: 'boysOnly' | 'girlsOnly' | 'separate' | 'combined' | 'flexible';
  status: 'draft' | 'registrationOpen' | 'registrationClosed' | 'scheduled' | 'running' | 'judging' | 'provisional' | 'published' | 'completed' | 'archived';
  active: boolean;
  selectedAsCurrent: boolean;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
}

export interface Division {
  id: string;
  name: string;
  code: string;
  icon: string;
  colour: string;
  description: string;
  rankingEnabled: boolean;
  championEnabled: boolean;
  order: number;
  active: boolean;
}

export interface Subdivision {
  id: string;
  divisionId: string;
  name: string;
  code: string;
  description: string;
  rankingEnabled: boolean;
  championEnabled: boolean;
  order: number;
  active: boolean;
}

export interface Category {
  id: string;
  name: string;
  code: string;
  minAge: number | null;
  maxAge: number | null;
  allowedClasses: string[];
  genderMode: 'boys' | 'girls' | 'separate' | 'combined' | 'mixed' | 'flexible';
  maxIndividualItems: number | null;
  maxGroupItems: number | null;
  maxTotalItems: number | null;
  championEnabled: boolean;
  active: boolean;
  order: number;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  code: string;
  logoPath: string;
  colour: string;
  slogan: string;
  leaderUserIds: string[];
  active: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface MasterStudent {
  id: string;
  admissionNumber: string;
  fullName: string;
  gender: 'male' | 'female';
  dateOfBirth: string;
  currentClass: string;
  division: string;
  parentName: string;
  phone: string;
  photoPath: string;
  active: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface FestivalStudent {
  id: string; // usually compound or random
  studentId: string;
  festId: string;
  teamId: string;
  categoryId: string;
  chestNumber: string;
  participantCode: string;
  status: 'active' | 'inactive' | 'withdrawn';
  notes: string;
  createdAt: any;
  updatedAt: any;
}

export interface Competition {
  id: string;
  name: string;
  code: string;
  divisionId: string;
  subdivisionId: string;
  categoryId: string;
  genderMode: 'boys' | 'girls' | 'separate' | 'combined' | 'mixed' | 'flexible';
  resultMode: 'boysResultOnly' | 'girlsResultOnly' | 'separateBoysAndGirlsResults' | 'combinedResult' | 'teamResult' | 'gradeOnly' | 'positionOnly' | 'gradeAndPosition' | 'qualificationOnly' | 'participationOnly';
  competitionType: 'individual' | 'group' | 'pair' | 'team' | 'mixedGroup';
  performanceType: 'stage' | 'nonStage' | 'track' | 'field' | 'indoor' | 'outdoor' | 'written' | 'oral';
  roundType: 'directFinal' | 'preliminary' | 'semiFinal' | 'final';
  minParticipantsPerEntry: number;
  maxParticipantsPerEntry: number;
  maxEntriesPerTeam: number;
  substituteLimit: number;
  maxMark: number;
  judgeCountRequired: number;
  stageId: string;
  eventDate: string;
  startTime: string;
  reportingTime: string;
  durationMinutes: number | null;
  rules: string;
  gradeRuleId: string;
  pointRuleId: string;
  tieBreakRuleId: string;
  blindJudgingMode: 'none' | 'hideName' | 'hideTeam' | 'hideNameAndTeam' | 'participantCodeOnly';
  status: 'draft' | 'registrationOpen' | 'registrationClosed' | 'scheduled' | 'running' | 'judging' | 'resultPending' | 'published' | 'completed';
  active: boolean;
}

export interface Entry {
  id: string;
  competitionId: string;
  teamId: string;
  groupName?: string; // only for group/pair entries
  memberStudentIds: string[]; // for individual, length = 1
  captainStudentId?: string;
  substituteStudentIds?: string[];
  entryStatus: 'draft' | 'submitted' | 'approved' | 'rejected' | 'correctionRequired' | 'locked';
  submittedBy: string;
  submittedAt: any;
  approvedBy?: string;
  approvedAt?: any;
}

export interface JudgeAssignment {
  id: string;
  judgeUserId: string;
  competitionId: string;
  isHeadJudge: boolean;
  active: boolean;
  assignedAt: any;
}

export interface CriterionMark {
  [criterionId: string]: number;
}

export interface JudgeMark {
  id: string;
  competitionId: string;
  entryId: string;
  judgeUserId: string;
  criterionMarks: CriterionMark;
  rawTotal: number;
  penaltySuggested: number;
  notes: string;
  participantStatus: 'participated' | 'absent' | 'withdrawn' | 'disqualified';
  submissionStatus: 'draft' | 'final';
  submittedAt: any;
  updatedAt: any;
}

export interface CompetitionCriterion {
  id: string;
  name: string;
  maxMark: number;
  weight: number;
  minimumRequiredMark: number | null;
  decimalAllowed: boolean;
  required: boolean;
  order: number;
}

export interface GradeRange {
  grade: string;
  minPercentage: number;
  maxPercentage: number;
  gradePoint: number;
  teamPoint: number;
  certificateEligible: boolean;
  displayClass: string;
}

export interface GradeRule {
  id: string;
  name: string;
  ranges: GradeRange[];
  active: boolean;
}

export interface PointRule {
  id: string;
  name: string;
  firstPlacePoints: number;
  secondPlacePoints: number;
  thirdPlacePoints: number;
  fourthPlacePoints?: number;
  fifthPlacePoints?: number;
  aGradePoints: number;
  bGradePoints: number;
  cGradePoints: number;
  participationPoints: number;
  calculationMode: 'positionOnly' | 'gradeOnly' | 'positionAndGrade' | 'participationOnly' | 'custom';
}

export interface Penalty {
  id: string;
  targetType: 'entry' | 'student' | 'team';
  targetId: string;
  competitionId?: string;
  penaltyType: 'fixedMarkDeduction' | 'percentageDeduction' | 'gradeReduction' | 'teamPointDeduction' | 'warning' | 'disqualification';
  value: number;
  reason: string;
  status: 'proposed' | 'approved' | 'rejected';
  createdBy: string;
  approvedBy?: string;
  createdAt: any;
}

export interface BonusPoint {
  id: string;
  teamId: string;
  divisionId: string;
  value: number;
  reason: string;
  createdBy: string;
  createdAt: any;
}

export interface ResultParticipant {
  studentId?: string; // null if group entry
  chestNumber: string;
  participantCode: string;
  displayName: string;
  teamName: string;
  teamId: string;
  rawScore: number;
  penalty: number;
  finalScore: number;
  percentage: number;
  grade: string;
  position: string; // e.g. "1st", "2nd", "3rd", "None"
  teamPoints: number;
  status: 'participated' | 'absent' | 'withdrawn' | 'disqualified';
}

export interface CompetitionResult {
  id: string;
  competitionId: string;
  festId: string;
  calculationMethod: string;
  participants: ResultParticipant[];
  status: 'Calculated' | 'Provisional' | 'Held' | 'Approved' | 'Published' | 'Unpublished' | 'Corrected';
  publishedAt?: any;
  updatedAt: any;
}

export interface TeamTotal {
  id: string; // usually teamId
  teamId: string;
  festId: string;
  divisionTotals: { [divisionId: string]: number };
  subdivisionTotals: { [subdivisionId: string]: number };
  stagePoints: number;
  nonStagePoints: number;
  bonusPoints: number;
  penaltyPoints: number;
  overallPoints: number;
  firstCount: number;
  secondCount: number;
  thirdCount: number;
  gradeCounts: { [grade: string]: number };
  rank: number;
  updatedAt: any;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'General' | 'Registration' | 'Schedule Change' | 'Reporting Alert' | 'Competition Delay' | 'Correction Required' | 'Result Published' | 'Emergency';
  targetRoles: UserRole[];
  targetTeamIds: string[]; // empty means all teams
  publishedToPublic: boolean;
  publishedToScoreboard: boolean;
  createdBy: string;
  createdAt: any;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  festId: string;
  userId: string;
  userName: string;
  oldValue: any | null;
  newValue: any | null;
  reason: string;
  createdAt: any;
}

export interface CorrectionRequest {
  id: string;
  teamId: string;
  entryId?: string;
  studentId?: string;
  competitionId?: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdBy: string;
  createdAt: any;
  resolvedBy?: string;
  resolvedAt?: any;
}

export interface Stage {
  id: string;
  name: string;
  code: string;
  location: string;
  type: 'stage' | 'hall' | 'ground' | 'room' | 'nonStage';
  active: boolean;
}
