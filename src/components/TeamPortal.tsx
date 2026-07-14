import React, { useState } from 'react';
import { translations, Language } from '../translations';
import { 
  UserProfile, 
  Team, 
  FestivalStudent, 
  MasterStudent, 
  Competition, 
  Entry, 
  CorrectionRequest, 
  Category 
} from '../types';
import { saveFestivalSubdocument, saveMasterStudent, createAuditLog } from '../dbService';
import { 
  Users, 
  Award, 
  Plus, 
  CheckCircle, 
  AlertCircle, 
  UserPlus, 
  Edit, 
  Trash, 
  Send 
} from 'lucide-react';

interface TeamPortalProps {
  language: Language;
  profile: UserProfile | null;
  festId: string;
  teams: Team[];
  festStudents: FestivalStudent[];
  masterStudents: MasterStudent[];
  competitions: Competition[];
  entries: Entry[];
  categories: Category[];
  correctionRequests: CorrectionRequest[];
  onRefresh: () => void;
}

export const TeamPortal: React.FC<TeamPortalProps> = ({
  language,
  profile,
  festId,
  teams,
  festStudents,
  masterStudents,
  competitions,
  entries,
  categories,
  correctionRequests,
  onRefresh
}) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'students' | 'registrations' | 'corrections'>('students');

  // Find this leader's team
  const leaderTeamId = profile?.teamId || 'team-emerald';
  const myTeam = teams.find(t => t.id === leaderTeamId) || teams[0];

  // Filters for Students
  const myFestStudents = festStudents.filter(f => f.teamId === leaderTeamId);
  const myMasterStudents = masterStudents.filter(ms => 
    myFestStudents.some(fs => fs.studentId === ms.id)
  );

  // Form states for creating student
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [admNo, setAdmNo] = useState('');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [dob, setDob] = useState('2012-01-01');
  const [className, setClassName] = useState('5');
  const [parent, setParent] = useState('');
  const [phone, setPhone] = useState('');
  const [catId, setCatId] = useState('cat-junior');

  // Entry registration form states
  const [showRegModal, setShowRegModal] = useState(false);
  const [regCompId, setRegCompId] = useState('');
  const [regStudentId, setRegStudentId] = useState('');

  // Correction request form
  const [correctionText, setCorrectionText] = useState('');

  // Add Student function
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admNo || !fullName) return;

    const stdId = `std-${Date.now()}`;
    const newMaster: MasterStudent = {
      id: stdId,
      admissionNumber: admNo,
      fullName,
      gender,
      dateOfBirth: dob,
      currentClass: className,
      division: 'A',
      parentName: parent,
      phone,
      photoPath: '',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const newFestStd: FestivalStudent = {
      id: `fs-${stdId}`,
      studentId: stdId,
      festId,
      teamId: leaderTeamId,
      categoryId: catId,
      chestNumber: `C${admNo}`,
      participantCode: `P${admNo}`,
      status: 'active',
      notes: 'Added by team leader',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      await saveMasterStudent(newMaster);
      await saveFestivalSubdocument(festId, 'festStudents', newFestStd.id, newFestStd);
      await createAuditLog(
        festId, 
        'add_student_team', 
        'festStudents', 
        newFestStd.id, 
        null, 
        newFestStd, 
        'Student registered under team leader portal', 
        profile
      );
      
      alert('Student registered successfully!');
      setShowAddStudentModal(false);
      
      // Reset form
      setAdmNo('');
      setFullName('');
      setParent('');
      setPhone('');
      onRefresh();
    } catch (e) {
      alert('Registration failed');
    }
  };

  // Register Student into Competition
  const handleRegisterEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regCompId || !regStudentId) return;

    // Item Validation
    const comp = competitions.find(c => c.id === regCompId);
    const studEntries = entries.filter(ent => 
      ent.memberStudentIds.includes(regStudentId) && 
      competitions.some(c => c.id === ent.competitionId && c.festId === festId)
    );

    // 1. Max items checks
    const cat = categories.find(c => c.id === festStudents.find(f => f.studentId === regStudentId)?.categoryId);
    const limit = cat?.maxIndividualItems || 3;
    if (studEntries.length >= limit) {
      alert(`Validation Error: Student has already reached their maximum individual entry limit of ${limit} competitions!`);
      return;
    }

    // 2. Already registered check
    const isRegistered = entries.some(ent => ent.competitionId === regCompId && ent.memberStudentIds.includes(regStudentId));
    if (isRegistered) {
      alert('Validation Error: This student is already registered for this competition!');
      return;
    }

    const newEntry: Entry = {
      id: `ent-${Date.now()}`,
      competitionId: regCompId,
      teamId: leaderTeamId,
      memberStudentIds: [regStudentId],
      entryStatus: 'approved', // auto approved for speed testing in sandbox
      submittedBy: profile?.uid || 'leader',
      submittedAt: new Date()
    };

    try {
      await saveFestivalSubdocument(festId, 'entries', newEntry.id, newEntry);
      await createAuditLog(
        festId, 
        'register_competition_entry', 
        'entries', 
        newEntry.id, 
        null, 
        newEntry, 
        'Student registered into competition', 
        profile
      );
      alert('Student registered for competition successfully!');
      setShowRegModal(false);
      onRefresh();
    } catch (err) {
      alert('Registration failed');
    }
  };

  // Submit Correction Request
  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionText) return;

    const req: CorrectionRequest = {
      id: `req-${Date.now()}`,
      teamId: leaderTeamId,
      description: correctionText,
      status: 'pending',
      createdBy: profile?.uid || 'leader',
      createdAt: new Date()
    };

    try {
      await saveFestivalSubdocument(festId, 'correctionRequests', req.id, req);
      await createAuditLog(
        festId, 
        'correction_request', 
        'correctionRequests', 
        req.id, 
        null, 
        req, 
        'Correction request filed by team leader', 
        profile
      );
      alert('Correction request submitted to admin successfully!');
      setCorrectionText('');
      onRefresh();
    } catch (err) {
      alert('Failed to submit correction request');
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Team Dashboard Hero Card */}
      <div className="bg-gradient-to-br from-emerald-800 to-teal-900 rounded-xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-4 top-4 text-8xl font-black opacity-10 uppercase tracking-widest font-mono">
          {myTeam?.code}
        </div>
        <div className="space-y-2">
          <span className="text-emerald-300 text-xs font-mono font-bold tracking-wider uppercase">
            {t.teamPortal} | {myTeam?.code}
          </span>
          <h2 className="text-2xl font-display font-black tracking-tight">{myTeam?.name} Dashboard</h2>
          <p className="text-xs text-emerald-100 italic">"{myTeam?.slogan}"</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8 border-t border-emerald-700/50 pt-6">
          <div>
            <p className="text-[10px] text-emerald-300 font-mono uppercase tracking-wider">Total Registered Students</p>
            <p className="text-2xl font-bold font-display mt-0.5">{myMasterStudents.length}</p>
          </div>
          <div>
            <p className="text-[10px] text-emerald-300 font-mono uppercase tracking-wider">Total Active Entries</p>
            <p className="text-2xl font-bold font-display mt-0.5">
              {entries.filter(e => e.teamId === leaderTeamId).length}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-emerald-300 font-mono uppercase tracking-wider">Arts points</p>
            <p className="text-2xl font-bold font-display mt-0.5">Verified in results</p>
          </div>
          <div>
            <p className="text-[10px] text-emerald-300 font-mono uppercase tracking-wider">Pending Correction Cases</p>
            <p className="text-2xl font-bold font-display mt-0.5">
              {correctionRequests.filter(c => c.teamId === leaderTeamId && c.status === 'pending').length}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-200 space-x-6">
        {[
          { id: 'students', label: 'My Students', icon: Users },
          { id: 'registrations', label: 'Competition Entries', icon: Award },
          { id: 'corrections', label: 'Correction Requests', icon: AlertCircle }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 pb-3 text-sm font-semibold border-b-2 transition ${
              activeTab === tab.id
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panels */}

      {/* 1. Students list */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-extrabold text-slate-800 text-sm">Registered Students</h3>
            <button
              onClick={() => setShowAddStudentModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded transition flex items-center space-x-1.5"
            >
              <UserPlus className="h-4 w-4" />
              <span>Register New Student</span>
            </button>
          </div>

          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Adm No.</th>
                  <th className="px-4 py-3 text-left">Full Name</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Chest No.</th>
                  <th className="px-4 py-3 text-left">Class / Division</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {myMasterStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">{t.noData}</td>
                  </tr>
                ) : (
                  myMasterStudents.map(std => {
                    const fs = myFestStudents.find(f => f.studentId === std.id);
                    const cat = categories.find(c => c.id === fs?.categoryId);
                    return (
                      <tr key={std.id} className="hover:bg-slate-50/50 text-slate-700">
                        <td className="px-4 py-3 whitespace-nowrap font-mono">{std.admissionNumber}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-800">{std.fullName}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-semibold text-emerald-700">{cat?.name}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-slate-500">{fs?.chestNumber}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{std.currentClass} - {std.division}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                            {fs?.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Entries Panel */}
      {activeTab === 'registrations' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-extrabold text-slate-800 text-sm">Competition Registrations</h3>
            <button
              onClick={() => setShowRegModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded transition flex items-center space-x-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Register Student for Event</span>
            </button>
          </div>

          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Comp Code</th>
                  <th className="px-4 py-3 text-left">Competition Name</th>
                  <th className="px-4 py-3 text-left">Student Name</th>
                  <th className="px-4 py-3 text-left">Chest No</th>
                  <th className="px-4 py-3 text-left">Reg Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {entries.filter(e => e.teamId === leaderTeamId).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400 font-medium">{t.noData}</td>
                  </tr>
                ) : (
                  entries
                    .filter(e => e.teamId === leaderTeamId)
                    .map(ent => {
                      const comp = competitions.find(c => c.id === ent.competitionId);
                      const std = masterStudents.find(m => m.id === ent.memberStudentIds[0]);
                      const fs = festStudents.find(f => f.studentId === std?.id);
                      return (
                        <tr key={ent.id} className="hover:bg-slate-50/50 text-slate-700">
                          <td className="px-4 py-3 whitespace-nowrap font-mono">{comp?.code}</td>
                          <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-800">{comp?.name}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{std?.fullName}</td>
                          <td className="px-4 py-3 whitespace-nowrap font-mono font-semibold text-slate-500">{fs?.chestNumber}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                              {ent.entryStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Corrections requests tab */}
      {activeTab === 'corrections' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Submit Correction Form */}
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
            <h4 className="font-display font-extrabold text-sm text-slate-800">File a Correction Request</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Spotted a misspelled candidate name, an incorrect DOB, or wrong age category mapping? Send a formal correction ticket to the admin panel.
            </p>
            <form onSubmit={handleSubmitCorrection} className="space-y-4">
              <textarea
                value={correctionText}
                onChange={(e) => setCorrectionText(e.target.value)}
                placeholder="Describe spelling mistake, chest number duplicate, or class adjustments..."
                rows={4}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2 px-4 rounded transition w-full flex items-center justify-center space-x-1"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Submit Ticket</span>
              </button>
            </form>
          </div>

          {/* Ticket log */}
          <div className="md:col-span-2 bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
            <h4 className="font-display font-extrabold text-sm text-slate-800">Submitted Tickets Log</h4>
            <div className="space-y-3">
              {correctionRequests.filter(r => r.teamId === leaderTeamId).length === 0 ? (
                <p className="text-xs text-slate-400 py-12 text-center">No correction requests filed.</p>
              ) : (
                correctionRequests
                  .filter(r => r.teamId === leaderTeamId)
                  .map(req => (
                    <div key={req.id} className="bg-slate-50 border border-slate-100 rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-700">{req.description}</p>
                        <span className="text-[9px] font-mono text-slate-400">Filed: {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleDateString() : 'Just now'}</span>
                      </div>
                      <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded uppercase ${
                        req.status === 'approved' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : req.status === 'rejected' 
                            ? 'bg-rose-100 text-rose-800' 
                            : 'bg-amber-100 text-amber-800'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* Modal: Add Student */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-md w-full p-6 space-y-4">
            <h3 className="font-display font-extrabold text-slate-800 text-md">Register New Student</h3>
            <form onSubmit={handleAddStudent} className="space-y-3 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Admission Number</label>
                  <input
                    type="text"
                    value={admNo}
                    onChange={(e) => setAdmNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-emerald-500"
                    placeholder="e.g. 1045"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Category Assignment</label>
                  <select
                    value={catId}
                    onChange={(e) => setCatId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-emerald-500"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Student Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g. Abdul Rahman"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Current Class</label>
                  <input
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-emerald-500"
                    placeholder="e.g. 6"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Parent/Guardian Name</label>
                <input
                  type="text"
                  value={parent}
                  onChange={(e) => setParent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g. Yusuf"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Phone Contact</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g. 9876543210"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="border border-slate-200 px-4 py-2 rounded text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded"
                >
                  Register Student
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal: Register Entry */}
      {showRegModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-sm w-full p-6 space-y-4">
            <h3 className="font-display font-extrabold text-slate-800 text-md">Register Student for Event</h3>
            <form onSubmit={handleRegisterEntry} className="space-y-3 text-xs">
              
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Select Student</label>
                <select
                  value={regStudentId}
                  onChange={(e) => setRegStudentId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-emerald-500"
                  required
                >
                  <option value="">-- Choose Candidate --</option>
                  {myMasterStudents.map(std => (
                    <option key={std.id} value={std.id}>{std.fullName} ({std.admissionNumber})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Select Competition</label>
                <select
                  value={regCompId}
                  onChange={(e) => setRegCompId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-emerald-500"
                  required
                >
                  <option value="">-- Choose Competition --</option>
                  {competitions
                    .filter(c => c.active)
                    .map(comp => (
                      <option key={comp.id} value={comp.id}>{comp.name} ({comp.code})</option>
                    ))}
                </select>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="border border-slate-200 px-4 py-2 rounded text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded"
                >
                  Submit Registration
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
