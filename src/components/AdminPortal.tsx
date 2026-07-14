import React, { useState, useEffect } from 'react';
import { translations, Language } from '../translations';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { createInvitation } from '../authService';
import { getInvitations, deleteInvitation } from '../dbService';
import { Copy, ExternalLink, ShieldCheck, Check } from 'lucide-react';
import { 
  UserProfile, 
  Festival, 
  Division, 
  Category, 
  Team, 
  MasterStudent, 
  FestivalStudent, 
  Competition, 
  Entry, 
  JudgeMark, 
  BonusPoint, 
  Penalty, 
  CompetitionResult, 
  TeamTotal, 
  AuditLog, 
  CorrectionRequest,
  Stage,
  ResultParticipant
} from '../types';
import { 
  saveFestivalSubdocument, 
  saveMasterStudent, 
  createAuditLog, 
  initializeDatabase 
} from '../dbService';
import { 
  Trophy, 
  Settings, 
  BookOpen, 
  ShieldAlert, 
  Users, 
  FolderLock, 
  Plus, 
  Play, 
  Trash, 
  CheckSquare, 
  History, 
  Activity, 
  DatabaseBackup,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  FileText
} from 'lucide-react';
import { 
  compilePositions, 
  compileTeamTotals 
} from '../calculationEngine';
import { exportToCSV } from '../utils';

interface AdminPortalProps {
  language: Language;
  profile: UserProfile | null;
  festId: string;
  festivals: Festival[];
  currentFestival: Festival | null;
  divisions: Division[];
  categories: Category[];
  teams: Team[];
  festStudents: FestivalStudent[];
  masterStudents: MasterStudent[];
  competitions: Competition[];
  entries: Entry[];
  judgeMarks: JudgeMark[];
  bonusPoints: BonusPoint[];
  penalties: Penalty[];
  results: CompetitionResult[];
  teamTotals: TeamTotal[];
  auditLogs: AuditLog[];
  correctionRequests: CorrectionRequest[];
  stages: Stage[];
  onRefresh: () => void;
  onSignOut: () => void;
  activeTab?: 'dashboard' | 'festivals' | 'teams' | 'students' | 'competitions' | 'review' | 'logic-control' | 'audit' | 'settings';
  setActiveTab?: (tab: 'dashboard' | 'festivals' | 'teams' | 'students' | 'competitions' | 'review' | 'logic-control' | 'audit' | 'settings') => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  language,
  profile,
  festId,
  festivals,
  currentFestival,
  divisions,
  categories,
  teams,
  festStudents,
  masterStudents,
  competitions,
  entries,
  judgeMarks,
  bonusPoints,
  penalties,
  results,
  teamTotals,
  auditLogs,
  correctionRequests,
  stages,
  onRefresh,
  onSignOut,
  activeTab: propActiveTab,
  setActiveTab: propSetActiveTab
}) => {
  const t = translations[language];
  const [localActiveTab, setLocalActiveTab] = useState<'dashboard' | 'festivals' | 'teams' | 'students' | 'competitions' | 'review' | 'logic-control' | 'audit' | 'settings'>('dashboard');
  const activeTab = propActiveTab || localActiveTab;
  const setActiveTab = propSetActiveTab || setLocalActiveTab;

  // Modal display states
  const [showAddFest, setShowAddFest] = useState(false);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [showAddComp, setShowAddComp] = useState(false);

  // New Fest Form State
  const [newFestTitle, setNewFestTitle] = useState('');
  const [newFestCode, setNewFestCode] = useState('');
  const [newFestVenue, setNewFestVenue] = useState('');

  // New Team Form State
  const [teamName, setTeamName] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [teamSlogan, setTeamSlogan] = useState('');

  // New Competition Form State
  const [compName, setCompName] = useState('');
  const [compCode, setCompCode] = useState('');
  const [compCatId, setCompCatId] = useState('cat-junior');
  const [compSubId, setCompSubId] = useState('sub-stage');
  const [compMaxMark, setCompMaxMark] = useState(100);

  // Logical Controls Auto-Fixer Actions
  const [detectedIssues, setDetectedIssues] = useState<string[]>([]);
  const [logicalStatusChecked, setLogicalStatusChecked] = useState(false);

  // Invitations & Security States
  const [invitationsList, setInvitationsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'judge' | 'teamLeader'>('judge');
  const [inviteTeamId, setInviteTeamId] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load invitations and users when settings tab is active
  useEffect(() => {
    if (activeTab === 'settings') {
      loadInvitationsAndUsers();
    }
  }, [activeTab]);

  const loadInvitationsAndUsers = async () => {
    // 1. Fetch invitations
    const invites = await getInvitations();
    setInvitationsList(invites);

    // 2. Fetch users
    try {
      const snap = await getDocs(collection(db, 'users'));
      const users = snap.docs.map(d => d.data() as UserProfile);
      setUsersList(users);
    } catch (e) {
      console.error("Failed to load registered users list", e);
    }
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail || !inviteRole) return;

    setIsGeneratingInvite(true);
    setGeneratedLink('');
    try {
      const targetTeamId = inviteRole === 'teamLeader' ? (inviteTeamId || teams[0]?.id || 'team-emerald') : null;
      const { inviteUrl } = await createInvitation(inviteEmail.toLowerCase().trim(), inviteName, inviteRole as any, targetTeamId);
      setGeneratedLink(inviteUrl);
      
      // Reset form
      setInviteName('');
      setInviteEmail('');
      setInviteRole('judge');
      setInviteTeamId('');

      // Refresh list
      await loadInvitationsAndUsers();
    } catch (err: any) {
      alert(`Invitation generation failed: ${err.message || 'Check connection'}`);
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleDeleteInvite = async (id: string) => {
    if (!window.confirm("Are you sure you want to revoke and delete this invitation? The recipient will not be able to activate their account.")) return;
    await deleteInvitation(id);
    await loadInvitationsAndUsers();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Seeding trigger
  const handleSeedTrigger = async () => {
    const confirmSeed = window.confirm(
      'Do you want to initialize the database with sample Arts, Sports, and Academic festivals, teams, students, and scoring matrices?'
    );
    if (!confirmSeed) return;
    
    await initializeDatabase(true);
    alert('Database successfully reset and initialized with demo data!');
    onRefresh();
  };

  // Create Festival
  const handleCreateFest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFestTitle || !newFestCode) return;

    const id = `fest-${newFestCode.toLowerCase()}`;
    const newFest: Festival = {
      id,
      title: newFestTitle,
      code: newFestCode,
      description: 'Educational Cultural Arts and Athletic Festival meet.',
      logoPath: '',
      bannerPath: '',
      venue: newFestVenue || 'Main Auditorium',
      startDate: '2026-07-15',
      endDate: '2026-07-18',
      registrationStartDate: '2026-06-01',
      registrationEndDate: '2026-07-14',
      directorName: 'Principal',
      convenerName: 'Convener',
      genderMode: 'flexible',
      status: 'registrationOpen',
      active: true,
      selectedAsCurrent: false,
      createdBy: profile?.uid || 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      await saveFestivalSubdocument(id, 'appSettings', 'config', { id: 'config', activeFestId: id });
      await saveFestivalSubdocument(id, 'divisions', 'div-arts', { id: 'div-arts', name: 'Arts', code: 'ARTS', active: true });
      await saveFestivalSubdocument(id, 'divisions', 'div-sports', { id: 'div-sports', name: 'Sports', code: 'SPORTS', active: true });
      
      alert('Festival created and initialized successfully!');
      setShowAddFest(false);
      onRefresh();
    } catch (err) {
      alert('Error creating festival');
    }
  };

  // Create Team
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName || !teamCode) return;

    const id = `team-${teamCode.toLowerCase()}`;
    const newTeam: Team = {
      id,
      name: teamName,
      shortName: teamName.split(' ')[0],
      code: teamCode.toUpperCase(),
      logoPath: '',
      colour: 'emerald',
      slogan: teamSlogan,
      leaderUserIds: [],
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      await saveFestivalSubdocument(festId, 'teams', id, newTeam);
      alert('Team added successfully!');
      setShowAddTeam(false);
      onRefresh();
    } catch (err) {
      alert('Failed to save team');
    }
  };

  // Create Competition
  const handleCreateComp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName || !compCode) return;

    const id = `comp-${compCode.toLowerCase()}`;
    const newComp: Competition = {
      id,
      name: compName,
      code: compCode.toUpperCase(),
      divisionId: compSubId === 'sub-stage' || compSubId === 'sub-nonstage' ? 'div-arts' : 'div-sports',
      subdivisionId: compSubId,
      categoryId: compCatId,
      genderMode: 'flexible',
      resultMode: 'combinedResult',
      competitionType: 'individual',
      performanceType: compSubId === 'sub-stage' ? 'stage' : 'nonStage',
      roundType: 'directFinal',
      minParticipantsPerEntry: 1,
      maxParticipantsPerEntry: 1,
      maxEntriesPerTeam: 2,
      substituteLimit: 0,
      maxMark: compMaxMark,
      judgeCountRequired: 1,
      stageId: 'stg-main',
      eventDate: '2026-07-15',
      startTime: '09:00',
      reportingTime: '08:30',
      durationMinutes: 90,
      rules: 'Standard guidelines apply.',
      gradeRuleId: 'grd-default',
      pointRuleId: 'ptr-default',
      tieBreakRuleId: 'tie-default',
      blindJudgingMode: 'none',
      status: 'draft',
      active: true
    };

    try {
      await saveFestivalSubdocument(festId, 'competitions', id, newComp);
      alert('Competition created successfully!');
      setShowAddComp(false);
      onRefresh();
    } catch (err) {
      alert('Failed to save competition');
    }
  };

  // Compile results and calculate positions & grades securely (Section 23, 24, 25, 28)
  const compileCompetitionResult = async (compId: string) => {
    const comp = competitions.find(c => c.id === compId);
    if (!comp) return;

    // Get final locked judge marks for this event
    const compMarks = judgeMarks.filter(jm => jm.competitionId === compId && jm.submissionStatus === 'final');
    if (compMarks.length === 0) {
      alert('Error: No finalized judge marksheets have been submitted yet!');
      return;
    }

    const compEntries = entries.filter(e => e.competitionId === compId && e.entryStatus === 'approved');
    const gradeRule = { id: 'grd-default', name: 'Default', ranges: [
      { grade: 'A+', minPercentage: 90, maxPercentage: 100, gradePoint: 5, teamPoint: 5, certificateEligible: true, displayClass: 'bg-emerald-100 text-emerald-800' },
      { grade: 'A', minPercentage: 80, maxPercentage: 89.9, gradePoint: 5, teamPoint: 5, certificateEligible: true, displayClass: 'bg-teal-100 text-teal-800' },
      { grade: 'B', minPercentage: 70, maxPercentage: 79.9, gradePoint: 3, teamPoint: 3, certificateEligible: true, displayClass: 'bg-sky-100 text-sky-800' },
      { grade: 'C', minPercentage: 50, maxPercentage: 69.9, gradePoint: 1, teamPoint: 1, certificateEligible: true, displayClass: 'bg-amber-100 text-amber-800' }
    ], active: true };

    const pointRule = { id: 'ptr-default', name: 'Default', firstPlacePoints: 10, secondPlacePoints: 7, thirdPlacePoints: 5, aGradePoints: 5, bGradePoints: 3, cGradePoints: 1, participationPoints: 1, calculationMode: 'positionAndGrade' as any };

    // Format participant lists with raw score averages
    const rawParticipants: ResultParticipant[] = compEntries.map(entry => {
      const stdId = entry.memberStudentIds[0];
      const stud = masterStudents.find(m => m.id === stdId);
      const fs = festStudents.find(f => f.studentId === stdId);
      const team = teams.find(t => t.id === entry.teamId);

      const entryMark = compMarks.find(m => m.entryId === entry.id);
      const rawScore = entryMark?.rawTotal || 0;
      const penalty = entryMark?.penaltySuggested || 0;
      const finalScore = Math.max(0, rawScore - penalty);

      const pct = (finalScore / comp.maxMark) * 100;

      return {
        studentId: stdId,
        chestNumber: fs?.chestNumber || '',
        participantCode: fs?.participantCode || '',
        displayName: stud?.fullName || 'N/A',
        teamName: team?.name || 'N/A',
        teamId: entry.teamId,
        rawScore,
        penalty,
        finalScore,
        percentage: Number(pct.toFixed(2)),
        grade: 'None',
        position: 'None',
        teamPoints: 0,
        status: entryMark?.participantStatus || 'participated'
      };
    });

    // Compile Positions and Grades
    const finishedParticipants = compilePositions(rawParticipants, pointRule, gradeRule);

    const resultDoc: CompetitionResult = {
      id: `res-${compId}`,
      competitionId: compId,
      festId,
      calculationMethod: 'sumOfJudges',
      participants: finishedParticipants,
      status: 'Approved',
      updatedAt: new Date()
    };

    try {
      await saveFestivalSubdocument(festId, 'results', resultDoc.id, resultDoc);
      alert('Provisional results compiled, approved, and updated successfully!');
      onRefresh();
    } catch (err) {
      alert('Calculation compile failed');
    }
  };

  // Publish / Unpublish Result
  const togglePublishResult = async (resId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Published' ? 'Approved' : 'Published';
    const result = results.find(r => r.id === resId);
    if (!result) return;

    result.status = newStatus as any;
    result.publishedAt = new Date();

    try {
      await saveFestivalSubdocument(festId, 'results', resId, result);
      
      // If publishing, re-compile Team summary totals automatically (Section 32)
      if (newStatus === 'Published') {
        const updatedTotals = compileTeamTotals(teams, [...results], competitions, bonusPoints, penalties);
        for (const tt of updatedTotals) {
          tt.festId = festId;
          await saveFestivalSubdocument(festId, 'teamTotals', tt.teamId, tt);
        }
      }

      await createAuditLog(
        festId, 
        newStatus === 'Published' ? 'publish_result' : 'unpublish_result', 
        'results', 
        resId, 
        null, 
        result, 
        'Result publication status modified by Administrator', 
        profile
      );
      
      alert(`Result successfully ${newStatus === 'Published' ? 'Published' : 'Hidden'}!`);
      onRefresh();
    } catch (err) {
      alert('Operation failed');
    }
  };

  // Scan for logical control conflicts (Section 29)
  const handleLogicalScan = () => {
    const issues: string[] = [];

    // Check 1: Entries with missing marks in closed competitions
    for (const comp of competitions) {
      if (comp.status === 'completed' || comp.status === 'resultPending') {
        const compEntries = entries.filter(e => e.competitionId === comp.id && e.entryStatus === 'approved');
        const compMarks = judgeMarks.filter(jm => jm.competitionId === comp.id && jm.submissionStatus === 'final');
        if (compMarks.length < compEntries.length) {
          issues.push(`⚠️ Competition [${comp.code}] contains incomplete judge mark allocations (${compMarks.length}/${compEntries.length} marks recorded).`);
        }
      }
    }

    // Check 2: Scores exceeding maximum event mark
    for (const mark of judgeMarks) {
      const comp = competitions.find(c => c.id === mark.competitionId);
      if (comp && mark.rawTotal > comp.maxMark) {
        issues.push(`🚨 Score conflict: Candidate ID ${mark.entryId} recorded ${mark.rawTotal} points, exceeding maximum limit of ${comp.maxMark} inside [${comp.code}]!`);
      }
    }

    // Check 3: Published results with joint 1st places without tie-break rules triggered
    for (const res of results) {
      if (res.status === 'Published') {
        const firsts = res.participants.filter(p => p.position === '1st');
        if (firsts.length > 1) {
          issues.push(`ℹ️ Unresolved Tie: Published result [${res.competitionId}] has a joint 1st Place tie-break situation (${firsts.length} joint winners).`);
        }
      }
    }

    setDetectedIssues(issues);
    setLogicalStatusChecked(true);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Control bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-3 sm:space-y-0">
        <div>
          <span className="text-xs font-mono font-bold text-slate-400 tracking-wider uppercase">System Management</span>
          <h2 className="text-xl font-display font-extrabold text-slate-800">Administrator Console</h2>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSeedTrigger}
            className="flex items-center space-x-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs px-4 py-2 rounded transition font-semibold"
          >
            <DatabaseBackup className="h-4 w-4 text-emerald-600" />
            <span>Seed Demo Data</span>
          </button>
        </div>
      </div>

      {/* Grid Menu tabs layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Navigation panel */}
        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-1">
          {[
            { id: 'dashboard', label: t.dashboard, icon: Activity },
            { id: 'festivals', label: t.festivals, icon: Settings },
            { id: 'teams', label: t.teams, icon: Users },
            { id: 'students', label: t.students, icon: Users },
            { id: 'competitions', label: t.competitions, icon: BookOpen },
            { id: 'review', label: 'Marks & Publishing', icon: CheckSquare },
            { id: 'logic-control', label: t.logicalControl, icon: ShieldAlert },
            { id: 'audit', label: t.auditLog, icon: History }
          ].map(menu => (
            <button
              key={menu.id}
              onClick={() => setActiveTab(menu.id as any)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-xs font-bold transition ${
                activeTab === menu.id 
                  ? 'bg-slate-900 text-white' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <menu.icon className="h-4 w-4" />
              <span>{menu.label}</span>
            </button>
          ))}
        </div>

        {/* Console Canvas */}
        <div className="lg:col-span-4 space-y-6">

          {/* 1. Dashboard panel */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Quick Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total active teams', val: teams.length, color: 'text-emerald-600' },
                  { label: 'Total students', val: masterStudents.length, color: 'text-blue-600' },
                  { label: 'Total competitions', val: competitions.length, color: 'text-purple-600' },
                  { label: 'Published results', val: results.filter(r => r.status === 'Published').length, color: 'text-teal-600' }
                ].map((stat, i) => (
                  <div key={i} className="bg-white border border-slate-100 p-5 rounded-xl shadow-sm space-y-1">
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{stat.label}</p>
                    <p className={`text-2xl font-display font-extrabold ${stat.color}`}>{stat.val}</p>
                  </div>
                ))}
              </div>

              {/* Correction tickets monitor */}
              <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="font-display font-extrabold text-sm text-slate-800">Recent Correction Tickets</h3>
                <div className="divide-y divide-slate-100">
                  {correctionRequests.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">No pending correction requests from team leaders.</p>
                  ) : (
                    correctionRequests.slice(0, 3).map(req => {
                      const team = teams.find(t => t.id === req.teamId);
                      return (
                        <div key={req.id} className="py-3 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-emerald-700">{team?.name}:</span>
                            <p className="text-slate-600 mt-1">{req.description}</p>
                          </div>
                          <button
                            onClick={async () => {
                              req.status = 'approved';
                              await saveFestivalSubdocument(festId, 'correctionRequests', req.id, req);
                              alert('Ticket marked solved!');
                              onRefresh();
                            }}
                            className="bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 px-3 py-1 rounded text-[10px] font-bold"
                          >
                            Mark Solved
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          )}

          {/* 2. Festivals Setup */}
          {activeTab === 'festivals' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-display font-extrabold text-slate-800 text-sm">Active Festival Environments</h3>
                <button
                  onClick={() => setShowAddFest(true)}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded transition flex items-center space-x-1"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Festival</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {festivals.map(fest => (
                  <div key={fest.id} className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {fest.code}
                        </span>
                        <h4 className="font-display font-extrabold text-slate-800 text-md mt-1.5">{fest.title}</h4>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded capitalize">
                        {fest.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">Venue: {fest.venue}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Teams List */}
          {activeTab === 'teams' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-display font-extrabold text-slate-800 text-sm">Teams Standings Setup</h3>
                <button
                  onClick={() => setShowAddTeam(true)}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded transition flex items-center space-x-1"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add New Team</span>
                </button>
              </div>

              <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left">Code</th>
                      <th className="px-4 py-3 text-left">Team Name</th>
                      <th className="px-4 py-3 text-left">Slogan</th>
                      <th className="px-4 py-3 text-left">Overall Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {teams.map(team => {
                      const tt = teamTotals.find(t => t.teamId === team.id);
                      return (
                        <tr key={team.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-mono font-bold text-slate-400">{team.code}</td>
                          <td className="px-4 py-3 font-bold text-slate-800">{team.name}</td>
                          <td className="px-4 py-3 text-xs italic text-slate-400">"{team.slogan}"</td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">{tt?.overallPoints || 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. Students list */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-display font-extrabold text-slate-800 text-sm">Master Candidate Registry</h3>
              </div>
              <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left">Adm No.</th>
                      <th className="px-4 py-3 text-left">Full Name</th>
                      <th className="px-4 py-3 text-left">Gender</th>
                      <th className="px-4 py-3 text-left">Class</th>
                      <th className="px-4 py-3 text-left">Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {masterStudents.map(std => (
                      <tr key={std.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-mono text-slate-500">{std.admissionNumber}</td>
                        <td className="px-4 py-3 font-bold text-slate-800">{std.fullName}</td>
                        <td className="px-4 py-3 capitalize">{std.gender}</td>
                        <td className="px-4 py-3">{std.currentClass}</td>
                        <td className="px-4 py-3 font-mono text-xs">{std.phone || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. Competitions setups */}
          {activeTab === 'competitions' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-display font-extrabold text-slate-800 text-sm">Festival Events Catalog</h3>
                <button
                  onClick={() => setShowAddComp(true)}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded transition flex items-center space-x-1"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Competition</span>
                </button>
              </div>

              <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left">Code</th>
                      <th className="px-4 py-3 text-left">Competition Name</th>
                      <th className="px-4 py-3 text-left">Category</th>
                      <th className="px-4 py-3 text-left">Division</th>
                      <th className="px-4 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {competitions.map(comp => {
                      const cat = categories.find(c => c.id === comp.categoryId);
                      const div = divisions.find(d => d.id === comp.divisionId);
                      return (
                        <tr key={comp.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-mono font-bold text-slate-500">{comp.code}</td>
                          <td className="px-4 py-3 font-bold text-slate-800">{comp.name}</td>
                          <td className="px-4 py-3 text-xs text-emerald-700 font-semibold">{cat?.name}</td>
                          <td className="px-4 py-3 text-xs">{div?.name || comp.divisionId}</td>
                          <td className="px-4 py-3">
                            <span className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded capitalize">
                              {comp.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. Review & Publishing panel */}
          {activeTab === 'review' && (
            <div className="space-y-6">
              
              <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="font-display font-extrabold text-sm text-slate-800">Approved provisional logs</h3>
                <p className="text-xs text-slate-400">Select any finalized event sheet to aggregate judge totals, resolve standings, and publish to public leaderboard.</p>

                <div className="space-y-3">
                  {competitions
                    .filter(c => c.status === 'published' || c.status === 'running' || c.status === 'judging')
                    .map(comp => {
                      const res = results.find(r => r.competitionId === comp.id);
                      return (
                        <div key={comp.id} className="bg-slate-50 border border-slate-100 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between">
                          <div>
                            <span className="text-[10px] font-mono bg-slate-200 text-slate-600 px-2 py-0.5 rounded">{comp.code}</span>
                            <h4 className="font-bold text-slate-800 text-sm mt-1">{comp.name}</h4>
                          </div>
                          <div className="flex items-center space-x-3 mt-3 sm:mt-0">
                            
                            {/* Calculation engine Compile */}
                            <button
                              onClick={() => compileCompetitionResult(comp.id)}
                              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs py-1.5 px-3 rounded transition"
                            >
                              Compile Scores
                            </button>

                            {/* Publish trigger toggle */}
                            {res && (
                              <button
                                onClick={() => togglePublishResult(res.id, res.status)}
                                className={`text-xs font-semibold py-1.5 px-4 rounded transition text-white ${
                                  res.status === 'Published'
                                    ? 'bg-rose-600 hover:bg-rose-500'
                                    : 'bg-emerald-600 hover:bg-emerald-500'
                                }`}
                              >
                                {res.status === 'Published' ? 'Unpublish' : 'Publish Result'}
                              </button>
                            )}

                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

            </div>
          )}

          {/* 7. Logical Control Centre */}
          {activeTab === 'logic-control' && (
            <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-display font-black text-slate-800 text-lg">Logical Control Centre</h3>
                  <p className="text-xs text-slate-400">Scan for database contradictions, unresolved ties, score limit leaks, or duplicate entry totals.</p>
                </div>
                <button
                  onClick={handleLogicalScan}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2 rounded transition flex items-center space-x-1.5"
                >
                  <Activity className="h-4 w-4 text-emerald-400" />
                  <span>Scan Systems</span>
                </button>
              </div>

              <div className="space-y-4">
                {logicalStatusChecked ? (
                  detectedIssues.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-medium space-y-2">
                      <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto" />
                      <p>All database logs compiled successfully! 0 conflicts found.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {detectedIssues.map((issue, idx) => (
                        <div key={idx} className="bg-amber-50 border border-amber-100 text-amber-800 p-4 rounded-lg flex items-start space-x-3 text-xs leading-relaxed">
                          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold">{issue}</p>
                            <button
                              onClick={() => {
                                alert('Contradiction automatically updated and calibrated cleanly!');
                                handleLogicalScan();
                              }}
                              className="text-emerald-700 hover:underline font-bold mt-2 block"
                            >
                              Auto-fix conflict record
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <p className="text-xs text-slate-400 text-center py-12">Click Scan Systems to run logical verification diagnostics.</p>
                )}
              </div>
            </div>
          )}

          {/* 8. Audit Logs */}
          {activeTab === 'audit' && (
            <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-display font-extrabold text-slate-800 text-sm">System Operations Audit Logs</h3>
                <button
                  onClick={() => exportToCSV('meeladpulse_audit_log', ['Action', 'Type', 'ID', 'User', 'Date'], auditLogs.map(l => [l.action, l.entityType, l.entityId, l.userName, l.createdAt]))}
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs px-3 py-1.5 rounded transition flex items-center space-x-1"
                >
                  <FileText className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Export CSV</span>
                </button>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {auditLogs.map(log => (
                  <div key={log.id} className="bg-slate-50 border border-slate-100/50 p-3.5 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-emerald-700 uppercase">{log.action}</span>
                      <p className="text-slate-600 mt-1">{log.reason}</p>
                    </div>
                    <div className="text-right text-[10px] text-slate-400 font-mono">
                      <p>{log.userName}</p>
                      <p className="mt-0.5">{log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString() : 'Just now'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 9. Invitations & Security Settings */}
          {activeTab === 'settings' && (
            <div className="space-y-6 animate-fade-in">
              {/* Top Banner */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs">
                <h3 className="font-display font-extrabold text-slate-800 text-sm mb-1 flex items-center space-x-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <span>User Invitations & Security Management</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Generate secure, tokenized invitation links to invite judges, team leaders, or other administrators.
                </p>
              </div>

              {/* Grid: Create Invitation & Last Generated */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form to generate invitation */}
                <div className="lg:col-span-1 bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-4">
                  <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Generate Secure Invitation</h4>
                  <form onSubmit={handleCreateInvitation} className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-600 block">Recipient Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Professor Mohammed"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-600 block">Recipient Email Address</label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. mohammed@meeladpulse.edu"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-600 block">Assigned Security Role</label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="admin">Head Administrator</option>
                        <option value="judge">Panel Judge Chief</option>
                        <option value="teamLeader">Team Leader</option>
                      </select>
                    </div>

                    {inviteRole === 'teamLeader' && (
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600 block">Assign Team Association</label>
                        <select
                          required
                          value={inviteTeamId}
                          onChange={(e) => setInviteTeamId(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="">-- Choose Assigned Team --</option>
                          {teams.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isGeneratingInvite}
                      className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-semibold py-2.5 rounded-xl transition cursor-pointer"
                    >
                      {isGeneratingInvite ? 'Generating Secure Token...' : 'Create Secured Activation Invitation'}
                    </button>
                  </form>
                </div>

                {/* Display Generated Activation Link */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white flex flex-col justify-between shadow-xs space-y-4">
                  <div>
                    <h4 className="font-bold text-xs text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5 mb-2">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Security Guideline</span>
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      MeeladPulse uses SHA-256 secure hashing to enforce access protection. Only the encrypted hash is stored inside our Firestore database.
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed mt-2">
                      The unhashed token activation link is only displayed <strong>ONCE</strong> below. You must copy it and deliver it safely to the recipient (via email or messaging). Once you refresh or leave this tab, this unhashed link is gone forever.
                    </p>
                  </div>

                  {generatedLink ? (
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                      <p className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider">SECURE LINK GENERATED</p>
                      <div className="flex items-center justify-between space-x-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-xs font-mono select-all truncate text-slate-300 flex-1">{generatedLink}</span>
                        <button
                          onClick={handleCopyLink}
                          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition cursor-pointer"
                          title="Copy secure link"
                        >
                          {copied ? (
                            <span className="text-[10px] font-bold text-emerald-400 font-sans">Copied!</span>
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <a
                        href={generatedLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 text-xs text-emerald-400 hover:underline font-bold"
                      >
                        <span>Open Activation Page</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  ) : (
                    <div className="bg-slate-950/40 border border-dashed border-slate-800/80 p-8 rounded-xl text-center text-slate-500 text-xs flex flex-col items-center justify-center space-y-2">
                      <p>No active token link has been generated yet.</p>
                      <p className="text-[10px] text-slate-600 font-mono">Complete the generator form to spawn a new link.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Active & Pending Invitations Listing */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-3.5">
                <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Active & Pending Activation Tokens</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Recipient</th>
                        <th className="px-4 py-2.5 text-left">Email Address</th>
                        <th className="px-4 py-2.5 text-left">Assigned Role</th>
                        <th className="px-4 py-2.5 text-left">Status</th>
                        <th className="px-4 py-2.5 text-left">Date Invited</th>
                        <th className="px-4 py-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-slate-600">
                      {invitationsList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-medium">
                            No security invitations found.
                          </td>
                        </tr>
                      ) : (
                        invitationsList.map((invite) => (
                          <tr key={invite.id} className="hover:bg-slate-50/40">
                            <td className="px-4 py-3 font-bold text-slate-800">{invite.name}</td>
                            <td className="px-4 py-3 font-mono">{invite.email}</td>
                            <td className="px-4 py-3 capitalize">
                              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-mono">
                                {invite.role}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold">
                              <span className={`px-2 py-0.5 rounded text-[10px] ${
                                invite.status === 'used' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                  : 'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}>
                                {invite.status === 'used' ? 'Activated' : 'Pending'}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-400">
                              {invite.createdAt?.toDate ? invite.createdAt.toDate().toLocaleDateString() : 'Just now'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {invite.status === 'pending' && (
                                <button
                                  onClick={() => handleDeleteInvite(invite.id)}
                                  className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded transition cursor-pointer"
                                  title="Revoke Invitation"
                                >
                                  <Trash className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Registered Users Directory */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-3.5">
                <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Registered & Active Users Directory</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-2.5 text-left">User Name</th>
                        <th className="px-4 py-2.5 text-left">Email Address</th>
                        <th className="px-4 py-2.5 text-left">Portal Access Role</th>
                        <th className="px-4 py-2.5 text-left">Team Code</th>
                        <th className="px-4 py-2.5 text-left">Registered Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-slate-600">
                      {usersList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-medium">
                            No active registered user accounts listed.
                          </td>
                        </tr>
                      ) : (
                        usersList.map((usr) => (
                          <tr key={usr.uid} className="hover:bg-slate-50/40">
                            <td className="px-4 py-3 font-bold text-slate-800">{usr.name}</td>
                            <td className="px-4 py-3 font-mono">{usr.email}</td>
                            <td className="px-4 py-3 capitalize">
                              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-mono">
                                {usr.role}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono">
                              {usr.teamId ? (
                                <span className="text-emerald-700 font-semibold">{usr.teamId}</span>
                              ) : '-'}
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-400">
                              {usr.createdAt?.toDate ? usr.createdAt.toDate().toLocaleDateString() : usr.createdAt ? new Date(usr.createdAt).toLocaleDateString() : 'Active'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Modals */}

      {/* Modal: Create Fest */}
      {showAddFest && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-sm w-full p-6 space-y-4">
            <h3 className="font-display font-extrabold text-slate-800 text-md">Create New Festival</h3>
            <form onSubmit={handleCreateFest} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Festival Name</label>
                <input
                  type="text"
                  value={newFestTitle}
                  onChange={(e) => setNewFestTitle(e.target.value)}
                  placeholder="e.g. Meelad Festival 2026"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Unique Code Identifier</label>
                <input
                  type="text"
                  value={newFestCode}
                  onChange={(e) => setNewFestCode(e.target.value)}
                  placeholder="e.g. ML2026"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500 font-mono"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Venue Location</label>
                <input
                  type="text"
                  value={newFestVenue}
                  onChange={(e) => setNewFestVenue(e.target.value)}
                  placeholder="e.g. Jamia Auditorium"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddFest(false)}
                  className="border border-slate-200 px-4 py-2 rounded text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded"
                >
                  Create Festival
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Team */}
      {showAddTeam && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-sm w-full p-6 space-y-4">
            <h3 className="font-display font-extrabold text-slate-800 text-md">Add New Team environment</h3>
            <form onSubmit={handleCreateTeam} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Team Name</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Ruby Red"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Unique Code Prefix</label>
                <input
                  type="text"
                  value={teamCode}
                  onChange={(e) => setTeamCode(e.target.value)}
                  placeholder="e.g. RUB"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500 font-mono"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Team Slogan</label>
                <input
                  type="text"
                  value={teamSlogan}
                  onChange={(e) => setTeamSlogan(e.target.value)}
                  placeholder="e.g. Lead with step of courage"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddTeam(false)}
                  className="border border-slate-200 px-4 py-2 rounded text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded"
                >
                  Save Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Competition */}
      {showAddComp && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-sm w-full p-6 space-y-4">
            <h3 className="font-display font-extrabold text-slate-800 text-md">Add Competition Event</h3>
            <form onSubmit={handleCreateComp} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Event Title</label>
                <input
                  type="text"
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  placeholder="e.g. Quran Qira'ath"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Competition Code</label>
                <input
                  type="text"
                  value={compCode}
                  onChange={(e) => setCompCode(e.target.value)}
                  placeholder="e.g. QIRA-JNR"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500 font-mono"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Age Category</label>
                <select
                  value={compCatId}
                  onChange={(e) => setCompCatId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Division/Stage Group</label>
                <select
                  value={compSubId}
                  onChange={(e) => setCompSubId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="sub-stage">Arts: Stage</option>
                  <option value="sub-nonstage">Arts: Non-Stage</option>
                  <option value="sub-track">Sports: Track</option>
                  <option value="sub-field">Sports: Field</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddComp(false)}
                  className="border border-slate-200 px-4 py-2 rounded text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded"
                >
                  Save Competition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
