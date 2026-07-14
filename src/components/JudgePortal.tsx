import React, { useState, useEffect } from 'react';
import { translations, Language } from '../translations';
import { 
  Competition, 
  JudgeMark, 
  Entry, 
  FestivalStudent, 
  MasterStudent, 
  UserProfile, 
  CompetitionCriterion 
} from '../types';
import { 
  getCompetitionCriteria, 
  saveFestivalSubdocument, 
  createAuditLog 
} from '../dbService';
import { 
  CheckSquare, 
  Save, 
  UserX, 
  AlertTriangle, 
  Bookmark, 
  CheckCircle 
} from 'lucide-react';
import { calculateAggregatedScore } from '../calculationEngine';

interface JudgePortalProps {
  language: Language;
  profile: UserProfile | null;
  festId: string;
  competitions: Competition[];
  entries: Entry[];
  festStudents: FestivalStudent[];
  masterStudents: MasterStudent[];
  onRefresh: () => void;
}

export const JudgePortal: React.FC<JudgePortalProps> = ({
  language,
  profile,
  festId,
  competitions,
  entries,
  festStudents,
  masterStudents,
  onRefresh
}) => {
  const t = translations[language];
  const [selectedCompId, setSelectedCompId] = useState<string>('');
  const [criteria, setCriteria] = useState<CompetitionCriterion[]>([]);
  const [markSheets, setMarkSheets] = useState<{ [entryId: string]: JudgeMark }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter competitions assigned to this judge
  // (In seed or if all assigned, we show all active and judging status items)
  const judgeComps = competitions.filter(
    c => c.status === 'running' || c.status === 'judging' || c.status === 'resultPending'
  );

  const selectedComp = competitions.find(c => c.id === selectedCompId);
  const compEntries = entries.filter(e => e.competitionId === selectedCompId && e.entryStatus === 'approved');

  // Load criteria when competition selection changes
  useEffect(() => {
    if (!selectedCompId) return;
    
    async function loadCriteria() {
      const list = await getCompetitionCriteria(festId, selectedCompId);
      setCriteria(list);
      
      // Initialize scoring models for each entry
      const sheets: { [entryId: string]: JudgeMark } = {};
      
      for (const entry of compEntries) {
        // Preset basic scoring model
        sheets[entry.id] = {
          id: `jm-${entry.id}-${profile?.uid || 'judge'}`,
          competitionId: selectedCompId,
          entryId: entry.id,
          judgeUserId: profile?.uid || 'judge-1',
          criterionMarks: {},
          rawTotal: 0,
          penaltySuggested: 0,
          notes: '',
          participantStatus: 'participated',
          submissionStatus: 'draft',
          submittedAt: null,
          updatedAt: null
        };
        
        // Populate criteria keys
        for (const crit of list) {
          sheets[entry.id].criterionMarks[crit.id] = 0;
        }
      }
      setMarkSheets(sheets);
    }
    loadCriteria();
  }, [selectedCompId]);

  // Handle single cell scoring edit
  const handleScoreChange = (entryId: string, critId: string, value: number, max: number) => {
    if (value < 0 || value > max) return; // safeguard limits

    setMarkSheets(prev => {
      const updated = { ...prev };
      const sheet = updated[entryId];
      sheet.criterionMarks[critId] = value;
      
      // Real-time raw total compilation
      const total = Object.values(sheet.criterionMarks).reduce((a: number, b: any) => a + Number(b), 0);
      sheet.rawTotal = total;
      
      return updated;
    });
  };

  // Set absent or status
  const handleStatusChange = (entryId: string, status: any) => {
    setMarkSheets(prev => {
      const updated = { ...prev };
      updated[entryId].participantStatus = status;
      if (status === 'absent') {
        updated[entryId].rawTotal = 0;
        for (const k in updated[entryId].criterionMarks) {
          updated[entryId].criterionMarks[k] = 0;
        }
      }
      return updated;
    });
  };

  // Save current sheet as draft
  const saveDraftSheet = async (entryId: string) => {
    const data = markSheets[entryId];
    if (!data) return;
    try {
      await saveFestivalSubdocument(festId, 'judgeMarks', data.id, data);
      await createAuditLog(
        festId, 
        'save_draft', 
        'judgeMarks', 
        data.id, 
        null, 
        data, 
        'Draft marks saved by judge', 
        profile
      );
      alert('Draft saved successfully!');
    } catch (e) {
      alert('Error saving draft');
    }
  };

  // Submit complete competition final marks
  const submitFinalMarks = async () => {
    const sheetsList: JudgeMark[] = Object.values(markSheets) as JudgeMark[];
    if (sheetsList.length === 0) return;

    const confirmSubmit = window.confirm(
      'Are you absolutely sure you want to submit these marks? Once submitted, they will be LOCKED and sent to the Admin Review Panel!'
    );
    if (!confirmSubmit) return;

    setIsSubmitting(true);
    try {
      for (const sheet of sheetsList) {
        sheet.submissionStatus = 'final';
        sheet.submittedAt = new Date();
        await saveFestivalSubdocument(festId, 'judgeMarks', sheet.id, sheet);
        await createAuditLog(
          festId, 
          'submit_final_marks', 
          'judgeMarks', 
          sheet.id, 
          null, 
          sheet, 
          'Final marks locked and submitted by judge', 
          profile
        );
      }
      alert('Marks successfully locked and submitted to admin review!');
      setSelectedCompId('');
      onRefresh();
    } catch (e) {
      alert('Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Overview stats header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-5 text-white flex flex-col md:flex-row items-center justify-between shadow-sm">
        <div className="space-y-1">
          <span className="text-emerald-400 text-xs font-mono font-bold tracking-widest uppercase">{t.judgePortal}</span>
          <h2 className="text-xl font-display font-extrabold">{t.markingCriteria} Panel</h2>
          <p className="text-xs text-slate-400">View assignments, record criteria scoring logs, and submit securely.</p>
        </div>
        <div className="mt-4 md:mt-0 bg-slate-800 border border-slate-700/50 p-4 rounded-lg flex space-x-6 text-center">
          <div>
            <p className="text-[10px] font-mono text-slate-500 uppercase">Assigned</p>
            <p className="text-xl font-bold font-display text-emerald-400">{judgeComps.length}</p>
          </div>
          <div className="border-l border-slate-700 pl-6">
            <p className="text-[10px] font-mono text-slate-500 uppercase">Awaiting Submission</p>
            <p className="text-xl font-bold font-display text-amber-400">
              {judgeComps.filter(c => c.status === 'running').length}
            </p>
          </div>
        </div>
      </div>

      {/* Selector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Sidebar Assigned List */}
        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-4">
          <h3 className="font-display font-extrabold text-sm text-slate-800">Assigned Competitions</h3>
          {judgeComps.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">{t.noData}</p>
          ) : (
            <div className="space-y-2">
              {judgeComps.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCompId(c.id)}
                  className={`w-full text-left p-3 rounded-lg text-xs transition border ${
                    selectedCompId === c.id 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-semibold' 
                      : 'border-slate-100 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="flex justify-between font-mono mb-1 text-[10px]">
                    <span>{c.code}</span>
                    <span className="capitalize">{c.status}</span>
                  </div>
                  <p className="font-semibold">{c.name}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scoring Canvas */}
        <div className="lg:col-span-3 space-y-6">
          {selectedComp ? (
            <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-6">
              
              {/* Header Info */}
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between">
                <div>
                  <h3 className="font-display font-black text-lg text-slate-800">{selectedComp.name}</h3>
                  <p className="text-xs text-slate-400">Max Score Allowed: {selectedComp.maxMark} | Criteria weights: Equal</p>
                </div>
                <span className="text-xs font-mono text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full uppercase mt-2 sm:mt-0 font-bold">
                  {compEntries.length} Participants Approved
                </span>
              </div>

              {/* Scoring spreadsheet-like list */}
              <div className="space-y-4">
                {compEntries.map(entry => {
                  const sheet = markSheets[entry.id];
                  if (!sheet) return null;
                  
                  // Display Student Label
                  const isBlind = selectedComp.blindJudgingMode === 'participantCodeOnly';
                  const stdId = entry.memberStudentIds[0];
                  const fs = festStudents.find(f => f.studentId === stdId);
                  const ms = masterStudents.find(m => m.id === stdId);

                  const displayName = isBlind ? `Participant Code: ${fs?.participantCode || 'N/A'}` : ms?.fullName || 'N/A';

                  return (
                    <div 
                      key={entry.id} 
                      className={`p-5 rounded-xl border ${
                        sheet.participantStatus === 'absent' 
                          ? 'bg-rose-50/40 border-rose-100/50' 
                          : 'bg-slate-50/50 border-slate-100'
                      } space-y-4`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                        <div>
                          <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                            {isBlind ? 'BLIND SCORING MODE' : `Admission No: ${ms?.admissionNumber || 'N/A'}`}
                          </p>
                          <h4 className="font-display font-extrabold text-sm text-slate-800 mt-1">{displayName}</h4>
                        </div>
                        
                        {/* Present/Absent Toggles */}
                        <div className="flex items-center space-x-3 mt-2 sm:mt-0">
                          <button
                            onClick={() => handleStatusChange(entry.id, sheet.participantStatus === 'absent' ? 'participated' : 'absent')}
                            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold border transition ${
                              sheet.participantStatus === 'absent'
                                ? 'bg-rose-600 text-white border-rose-700'
                                : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                            }`}
                          >
                            <UserX className="h-3.5 w-3.5" />
                            <span>Absent</span>
                          </button>
                        </div>
                      </div>

                      {sheet.participantStatus !== 'absent' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {criteria.map(crit => (
                            <div key={crit.id} className="bg-white p-3.5 rounded-lg border border-slate-100 space-y-2">
                              <label className="text-xs font-semibold text-slate-600 block">{crit.name}</label>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="number"
                                  step="0.5"
                                  value={sheet.criterionMarks[crit.id] || ''}
                                  onChange={(e) => handleScoreChange(entry.id, crit.id, parseFloat(e.target.value) || 0, crit.maxMark)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-bold"
                                />
                                <span className="text-xs text-slate-400 font-mono">/ {crit.maxMark}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100/30">
                        <div className="flex items-center space-x-4">
                          <span className="text-xs text-slate-400">Suggested notes:</span>
                          <input
                            type="text"
                            value={sheet.notes}
                            onChange={(e) => {
                              const note = e.target.value;
                              setMarkSheets(prev => {
                                const up = { ...prev };
                                up[entry.id].notes = note;
                                return up;
                              });
                            }}
                            placeholder="Add judging review remarks..."
                            className="bg-transparent border-b border-slate-200 focus:border-slate-400 text-xs py-0.5 outline-none min-w-[200px]"
                          />
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-xs text-slate-400">Total:</span>
                          <span className="text-lg font-display font-black text-slate-900">{sheet.rawTotal}</span>
                          <button
                            onClick={() => saveDraftSheet(entry.id)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded transition"
                            title="Save Draft for this row"
                          >
                            <Bookmark className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Lock and lock overall submission */}
              <div className="border-t border-slate-100 pt-6 flex justify-between items-center">
                <div className="flex items-center space-x-2 text-xs text-amber-600 font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Double check before final lock! These values are audited.</span>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setSelectedCompId('')}
                    className="border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2 rounded transition"
                  >
                    Close Sheet
                  </button>
                  <button
                    onClick={submitFinalMarks}
                    disabled={isSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-5 py-2 rounded transition flex items-center space-x-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>{isSubmitting ? t.submitting : t.submitFinal}</span>
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-slate-50 text-center py-20 rounded-xl text-slate-400 font-semibold border-2 border-dashed border-slate-200">
              <CheckSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <span>Select an assigned competition from the sidebar to start grading.</span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
