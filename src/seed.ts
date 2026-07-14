/**
 * Rich seed data for MeeladPulse
 * Allows quick-starting the system with fully configured festivals, divisions, categories, teams, and sample scores.
 */

import { Division, Subdivision, Category, Team, MasterStudent, Competition, GradeRule, PointRule, Stage } from './types';

export const DEFAULT_DIVISIONS: Division[] = [
  {
    id: 'div-arts',
    name: 'കലാമേള (Arts)',
    code: 'ARTS',
    icon: 'palette',
    colour: 'emerald',
    description: 'Arts and cultural competitions including oral, written, and stage items.',
    rankingEnabled: true,
    championEnabled: true,
    order: 1,
    active: true
  },
  {
    id: 'div-sports',
    name: 'കായികമേള (Sports)',
    code: 'SPORTS',
    icon: 'trophy',
    colour: 'amber',
    description: 'Track and field athletic meets, outdoor and indoor games.',
    rankingEnabled: true,
    championEnabled: true,
    order: 2,
    active: true
  },
  {
    id: 'div-academic',
    name: 'അക്കാദമിക്സ് (Academic)',
    code: 'ACAD',
    icon: 'book-open',
    colour: 'sky',
    description: 'General knowledge, quizzes, debating, and scholastic events.',
    rankingEnabled: true,
    championEnabled: true,
    order: 3,
    active: true
  }
];

export const DEFAULT_SUBDIVISIONS: Subdivision[] = [
  {
    id: 'sub-stage',
    divisionId: 'div-arts',
    name: 'സ്റ്റേജ് ഇനങ്ങൾ (Stage)',
    code: 'STAGE',
    description: 'Performed live in front of judges on stage.',
    rankingEnabled: true,
    championEnabled: true,
    order: 1,
    active: true
  },
  {
    id: 'sub-nonstage',
    divisionId: 'div-arts',
    name: 'നോൺ-സ്റ്റേജ് (Non-Stage)',
    code: 'NONSTAGE',
    description: 'Off-stage, classroom, or pre-submitted written items.',
    rankingEnabled: true,
    championEnabled: true,
    order: 2,
    active: true
  },
  {
    id: 'sub-track',
    divisionId: 'div-sports',
    name: 'ട്രാക്ക് (Track)',
    code: 'TRACK',
    description: 'Running events (100m, 200m, relay, etc.)',
    rankingEnabled: true,
    championEnabled: true,
    order: 1,
    active: true
  },
  {
    id: 'sub-field',
    divisionId: 'div-sports',
    name: 'ഫീൽഡ് (Field)',
    code: 'FIELD',
    description: 'Jumping and throwing events (long jump, shot put, etc.)',
    rankingEnabled: true,
    championEnabled: true,
    order: 2,
    active: true
  }
];

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'cat-junior',
    name: 'ജൂനിയർ (Junior)',
    code: 'JNR',
    minAge: 10,
    maxAge: 12,
    allowedClasses: ['5', '6', '7'],
    genderMode: 'flexible',
    maxIndividualItems: 3,
    maxGroupItems: 2,
    maxTotalItems: 5,
    championEnabled: true,
    active: true,
    order: 1
  },
  {
    id: 'cat-senior',
    name: 'സീനിയർ (Senior)',
    code: 'SNR',
    minAge: 13,
    maxAge: 15,
    allowedClasses: ['8', '9', '10'],
    genderMode: 'flexible',
    maxIndividualItems: 3,
    maxGroupItems: 2,
    maxTotalItems: 5,
    championEnabled: true,
    active: true,
    order: 2
  },
  {
    id: 'cat-supersenior',
    name: 'സൂപ്പർ സീനിയർ (Super Senior)',
    code: 'SSR',
    minAge: 16,
    maxAge: 18,
    allowedClasses: ['11', '12'],
    genderMode: 'flexible',
    maxIndividualItems: 4,
    maxGroupItems: 2,
    maxTotalItems: 6,
    championEnabled: true,
    active: true,
    order: 3
  }
];

export const DEFAULT_TEAMS: Team[] = [
  {
    id: 'team-emerald',
    name: 'എമറാൾഡ് ഗ്രീൻ (Emerald Green)',
    shortName: 'Emerald',
    code: 'EMR',
    logoPath: '',
    colour: 'emerald',
    slogan: 'വിജയം നമ്മുടെ ലക്ഷ്യം (Victory is our destiny)',
    leaderUserIds: [],
    active: true,
    createdAt: null,
    updatedAt: null
  },
  {
    id: 'team-ruby',
    name: 'റൂബി റെഡ് (Ruby Red)',
    shortName: 'Ruby',
    code: 'RUB',
    logoPath: '',
    colour: 'rose',
    slogan: 'ധീരതയുടെ ചുവടുമായി (With steps of courage)',
    leaderUserIds: [],
    active: true,
    createdAt: null,
    updatedAt: null
  },
  {
    id: 'team-sapphire',
    name: 'സഫയർ ബ്ലൂ (Sapphire Blue)',
    shortName: 'Sapphire',
    code: 'SAP',
    logoPath: '',
    colour: 'blue',
    slogan: 'ഉയരങ്ങളിലേക്ക് പറക്കുക (Fly to the heights)',
    leaderUserIds: [],
    active: true,
    createdAt: null,
    updatedAt: null
  }
];

export const DEFAULT_STAGES: Stage[] = [
  { id: 'stg-main', name: 'പ്രധാന വേദി (Main Stage - Stage A)', code: 'STGA', location: 'പ്രധാന ഓഡിറ്റോറിയം', type: 'stage', active: true },
  { id: 'stg-hall2', name: 'ഹാൾ ബി (Hall B)', code: 'HALLB', location: 'രണ്ടാം നില കോൺഫറൻസ് ഹാൾ', type: 'hall', active: true },
  { id: 'stg-ground', name: 'ഗ്രൗണ്ട് (Main Ground)', code: 'GRND', location: 'കായിക മണ്ഡലം', type: 'ground', active: true }
];

export const DEFAULT_GRADE_RULES: GradeRule[] = [
  {
    id: 'grd-default',
    name: 'Standard Grade System',
    ranges: [
      { grade: 'A+', minPercentage: 90, maxPercentage: 100, gradePoint: 5, teamPoint: 5, certificateEligible: true, displayClass: 'bg-emerald-100 text-emerald-800' },
      { grade: 'A', minPercentage: 80, maxPercentage: 89.9, gradePoint: 5, teamPoint: 5, certificateEligible: true, displayClass: 'bg-teal-100 text-teal-800' },
      { grade: 'B', minPercentage: 70, maxPercentage: 79.9, gradePoint: 3, teamPoint: 3, certificateEligible: true, displayClass: 'bg-sky-100 text-sky-800' },
      { grade: 'C', minPercentage: 50, maxPercentage: 69.9, gradePoint: 1, teamPoint: 1, certificateEligible: true, displayClass: 'bg-amber-100 text-amber-800' }
    ],
    active: true
  }
];

export const DEFAULT_POINT_RULES: PointRule[] = [
  {
    id: 'ptr-default',
    name: 'Default Points Distribution',
    firstPlacePoints: 10,
    secondPlacePoints: 7,
    thirdPlacePoints: 5,
    aGradePoints: 5,
    bGradePoints: 3,
    cGradePoints: 1,
    participationPoints: 1,
    calculationMode: 'positionAndGrade'
  }
];

export const SAMPLE_MASTER_STUDENTS: MasterStudent[] = [
  { id: 'std-1', admissionNumber: '1001', fullName: 'അഹ്‌മദ്‌ ഫായിസ് (Ahamed Faiz)', gender: 'male', dateOfBirth: '2012-05-14', currentClass: '6', division: 'A', parentName: 'അബൂബക്കർ', phone: '9876543210', photoPath: '', active: true, createdAt: null, updatedAt: null },
  { id: 'std-2', admissionNumber: '1002', fullName: 'മുഹമ്മദ് യാസീൻ (Muhamed Yaseen)', gender: 'male', dateOfBirth: '2013-08-20', currentClass: '5', division: 'B', parentName: 'അബ്ദുല്ല', phone: '9876543211', photoPath: '', active: true, createdAt: null, updatedAt: null },
  { id: 'std-3', admissionNumber: '1003', fullName: 'ഫാത്തിമ നസ്‌റിൻ (Fathima Nasrin)', gender: 'female', dateOfBirth: '2011-03-12', currentClass: '7', division: 'A', parentName: 'മുസ്തഫ', phone: '9876543212', photoPath: '', active: true, createdAt: null, updatedAt: null },
  { id: 'std-4', admissionNumber: '1004', fullName: 'അബ്ദുൽ ഹാദി (Abdul Hadi)', gender: 'male', dateOfBirth: '2010-02-15', currentClass: '9', division: 'C', parentName: 'ഹംസ', phone: '9876543213', photoPath: '', active: true, createdAt: null, updatedAt: null },
  { id: 'std-5', admissionNumber: '1005', fullName: 'ആയിഷ റിദ (Ayisha Rida)', gender: 'female', dateOfBirth: '2010-11-22', currentClass: '8', division: 'B', parentName: 'സക്കരിയ്യ', phone: '9876543214', photoPath: '', active: true, createdAt: null, updatedAt: null },
  { id: 'std-6', admissionNumber: '1006', fullName: 'സൈനബ് മറിയം (Zainab Mariyam)', gender: 'female', dateOfBirth: '2008-07-30', currentClass: '11', division: 'A', parentName: 'ഉസ്മാൻ', phone: '9876543215', photoPath: '', active: true, createdAt: null, updatedAt: null }
];

export const SAMPLE_COMPETITIONS: Competition[] = [
  {
    id: 'comp-1',
    name: 'ഖുർആൻ പാരായണം (Quran Qira\'ath)',
    code: 'QIRA-JNR',
    divisionId: 'div-arts',
    subdivisionId: 'sub-stage',
    categoryId: 'cat-junior',
    genderMode: 'flexible',
    resultMode: 'combinedResult',
    competitionType: 'individual',
    performanceType: 'stage',
    roundType: 'directFinal',
    minParticipantsPerEntry: 1,
    maxParticipantsPerEntry: 1,
    maxEntriesPerTeam: 2,
    substituteLimit: 0,
    maxMark: 100,
    judgeCountRequired: 1,
    stageId: 'stg-main',
    eventDate: '2026-07-15',
    startTime: '09:00',
    reportingTime: '08:30',
    durationMinutes: 120,
    rules: 'Tajweed and fluency are major criteria.',
    gradeRuleId: 'grd-default',
    pointRuleId: 'ptr-default',
    tieBreakRuleId: 'tie-default',
    blindJudgingMode: 'participantCodeOnly',
    status: 'published',
    active: true
  },
  {
    id: 'comp-2',
    name: 'മാപ്പിളപ്പാട്ട് (Mappilappattu)',
    code: 'MAP-SNR',
    divisionId: 'div-arts',
    subdivisionId: 'sub-stage',
    categoryId: 'cat-senior',
    genderMode: 'boys',
    resultMode: 'boysResultOnly',
    competitionType: 'individual',
    performanceType: 'stage',
    roundType: 'directFinal',
    minParticipantsPerEntry: 1,
    maxParticipantsPerEntry: 1,
    maxEntriesPerTeam: 2,
    substituteLimit: 0,
    maxMark: 100,
    judgeCountRequired: 1,
    stageId: 'stg-main',
    eventDate: '2026-07-15',
    startTime: '13:00',
    reportingTime: '12:30',
    durationMinutes: 90,
    rules: 'Melody, rhythm, and lyrical accuracy.',
    gradeRuleId: 'grd-default',
    pointRuleId: 'ptr-default',
    tieBreakRuleId: 'tie-default',
    blindJudgingMode: 'none',
    status: 'running',
    active: true
  },
  {
    id: 'comp-3',
    name: '100 മീറ്റർ ഓട്ടം (100m Athletics)',
    code: 'RUN-100-SSR',
    divisionId: 'div-sports',
    subdivisionId: 'sub-track',
    categoryId: 'cat-supersenior',
    genderMode: 'boys',
    resultMode: 'boysResultOnly',
    competitionType: 'individual',
    performanceType: 'track',
    roundType: 'directFinal',
    minParticipantsPerEntry: 1,
    maxParticipantsPerEntry: 1,
    maxEntriesPerTeam: 3,
    substituteLimit: 1,
    maxMark: 100,
    judgeCountRequired: 1,
    stageId: 'stg-ground',
    eventDate: '2026-07-16',
    startTime: '08:00',
    reportingTime: '07:45',
    durationMinutes: 45,
    rules: 'Standard athletic tracking laws apply.',
    gradeRuleId: 'grd-default',
    pointRuleId: 'ptr-default',
    tieBreakRuleId: 'tie-default',
    blindJudgingMode: 'none',
    status: 'draft',
    active: true
  }
];
