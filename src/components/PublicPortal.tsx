import React, { useState, useEffect } from 'react';
import { translations, Language } from '../translations';
import { 
  Festival, 
  TeamTotal, 
  CompetitionResult, 
  Competition, 
  Team, 
  Announcement, 
  Stage 
} from '../types';
import { 
  Trophy, 
  TrendingUp, 
  Award, 
  Calendar, 
  Search, 
  RefreshCw, 
  Megaphone, 
  Monitor, 
  CheckCircle2, 
  Clock, 
  FileDown 
} from 'lucide-react';
import { generateQRUrl, printElement } from '../utils';

interface PublicPortalProps {
  language: Language;
  currentFestival: Festival | null;
  teams: Team[];
  teamTotals: TeamTotal[];
  results: CompetitionResult[];
  competitions: Competition[];
  announcements: Announcement[];
  stages: Stage[];
  onRefresh: () => void;
}

export const PublicPortal: React.FC<PublicPortalProps> = ({
  language,
  currentFestival,
  teams,
  teamTotals,
  results,
  competitions,
  announcements,
  stages,
  onRefresh
}) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'scoreboard' | 'results' | 'ranking' | 'schedule' | 'announcements' | 'downloads'>('scoreboard');
  
  // Search query state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompId, setSelectedCompId] = useState<string>('');

  // Rotator states for Fullscreen Scoreboard TV
  const [slideIndex, setSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto rotate slides every 8 seconds
  useEffect(() => {
    if (activeTab !== 'scoreboard') return;
    const interval = setInterval(() => {
      setSlideIndex(prev => (prev + 1) % 4);
    }, 8000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Find winner displays
  const latestPublishedResults = results
    .filter(r => r.status === 'Published')
    .sort((a, b) => {
      const aTime = a.publishedAt?.toDate ? a.publishedAt.toDate().getTime() : Date.now();
      const bTime = b.publishedAt?.toDate ? b.publishedAt.toDate().getTime() : Date.now();
      return bTime - aTime;
    });

  // Filter schedules
  const [schedFilter, setSchedFilter] = useState('all'); // all, upcoming, completed
  const filteredComps = competitions.filter(c => {
    if (schedFilter === 'upcoming') return c.status !== 'completed' && c.status !== 'published';
    if (schedFilter === 'completed') return c.status === 'completed' || c.status === 'published';
    return true;
  });

  return (
    <div className={`p-4 md:p-6 max-w-7xl mx-auto space-y-6 ${isFullscreen ? 'bg-slate-950 text-white min-h-screen fixed inset-0 z-50 overflow-y-auto' : ''}`}>
      
      {/* Fullscreen score header toggle */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-200 pb-4 no-print">
        <div>
          <h1 className="text-2xl font-display font-black text-slate-800">
            {currentFestival ? currentFestival.title : t.appName}
          </h1>
          <p className="text-sm text-slate-500">
            {t.venue}: {currentFestival?.venue || 'Jamia Grounds'} | {t.date}: {currentFestival?.startDate} - {currentFestival?.endDate}
          </p>
        </div>
        <div className="flex items-center space-x-3 mt-3 sm:mt-0">
          <button
            onClick={onRefresh}
            className="flex items-center space-x-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs px-3 py-1.5 rounded transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('scoreboard');
              setIsFullscreen(!isFullscreen);
            }}
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs px-4 py-1.5 rounded transition font-medium"
          >
            <Monitor className="h-3.5 w-3.5" />
            <span>{isFullscreen ? 'Exit Fullscreen' : 'TV Scoreboard'}</span>
          </button>
        </div>
      </div>

      {/* Tabs navigation */}
      {!isFullscreen && (
        <div className="flex overflow-x-auto border-b border-slate-200 space-x-8 no-print pb-1 scrollbar-none">
          {[
            { id: 'scoreboard', label: t.liveScoreboard, icon: Trophy },
            { id: 'results', label: t.latestResults, icon: Award },
            { id: 'ranking', label: t.overallRanking, icon: TrendingUp },
            { id: 'schedule', label: t.schedule, icon: Calendar },
            { id: 'announcements', label: t.announcements, icon: Megaphone },
            { id: 'downloads', label: t.downloads, icon: FileDown }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 pb-3 text-sm font-semibold tracking-wide border-b-2 transition whitespace-nowrap ${
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
      )}

      {/* Dynamic Content Views */}

      {/* 1. TV Fullscreen rotating Live Scoreboard */}
      {activeTab === 'scoreboard' && (
        <div className="space-y-6">
          
          {/* Rotating Slides */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-xl border border-slate-800 min-h-[420px] flex flex-col justify-between transition-all duration-700 relative overflow-hidden">
            <div className="absolute right-4 top-4 text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-1 rounded">
              {t.live} {slideIndex + 1}/4
            </div>

            {/* Slide 1: Overall Team Standings */}
            {slideIndex === 0 && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center space-x-3 text-amber-400">
                  <Trophy className="h-8 w-8" />
                  <h2 className="text-xl md:text-2xl font-display font-black tracking-tight uppercase">
                    {t.overallRanking}
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {teamTotals.slice(0, 3).map((tt, index) => {
                    const team = teams.find(t => t.id === tt.teamId);
                    return (
                      <div 
                        key={tt.teamId} 
                        className={`p-6 rounded-xl relative border ${
                          index === 0 
                            ? 'bg-emerald-950/40 border-emerald-500/30' 
                            : index === 1 
                              ? 'bg-amber-950/40 border-amber-500/30' 
                              : 'bg-blue-950/40 border-blue-500/30'
                        }`}
                      >
                        <div className="absolute top-4 right-4 text-4xl font-extrabold opacity-20">
                          #{index + 1}
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">{team?.code}</span>
                        <h3 className="text-lg font-bold font-display text-white mt-1">{team?.name || 'Unknown Team'}</h3>
                        <p className="text-xs font-mono text-slate-400 mt-2 italic">{team?.slogan}</p>
                        <div className="mt-4 flex items-baseline space-x-2">
                          <span className="text-3xl font-display font-black text-white">{tt.overallPoints}</span>
                          <span className="text-xs font-mono text-slate-400">{t.pointsShort}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Slide 2: Arts / Sports Category Standings */}
            {slideIndex === 1 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 text-emerald-400">
                  <TrendingUp className="h-8 w-8" />
                  <h2 className="text-xl md:text-2xl font-display font-black tracking-tight uppercase">
                    {t.arts} vs {t.sports} {t.points}
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Arts Standing */}
                  <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 space-y-4">
                    <h3 className="font-display font-bold text-emerald-400 text-lg border-b border-slate-700 pb-2">{t.arts} (Arts Division)</h3>
                    <div className="space-y-3">
                      {teamTotals.slice(0, 3).map((tt, i) => {
                        const team = teams.find(t => t.id === tt.teamId);
                        return (
                          <div key={tt.teamId} className="flex items-center justify-between text-sm">
                            <span className="font-medium text-slate-300">{i+1}. {team?.name}</span>
                            <span className="font-mono font-bold text-emerald-400">{tt.stagePoints + tt.nonStagePoints} {t.pointsShort}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* Sports Standing */}
                  <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 space-y-4">
                    <h3 className="font-display font-bold text-amber-400 text-lg border-b border-slate-700 pb-2">{t.sports} (Sports Division)</h3>
                    <div className="space-y-3">
                      {teamTotals.slice(0, 3).map((tt, i) => {
                        const team = teams.find(t => t.id === tt.teamId);
                        return (
                          <div key={tt.teamId} className="flex items-center justify-between text-sm">
                            <span className="font-medium text-slate-300">{i+1}. {team?.name}</span>
                            <span className="font-mono font-bold text-amber-400">
                              {/* fallback standard division sum */}
                              {tt.divisionTotals['div-sports'] || 0} {t.pointsShort}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Slide 3: Latest Winners Feed */}
            {slideIndex === 2 && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-teal-400">
                  <Award className="h-8 w-8" />
                  <h2 className="text-xl md:text-2xl font-display font-black tracking-tight uppercase">
                    {t.latestResults}
                  </h2>
                </div>
                {latestPublishedResults.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    {t.noData}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {latestPublishedResults.slice(0, 4).map(res => {
                      const comp = competitions.find(c => c.id === res.competitionId);
                      const winner = res.participants.find(p => p.position === '1st');
                      return (
                        <div key={res.id} className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded uppercase">
                              {comp?.code}
                            </span>
                            <h4 className="font-bold text-sm text-slate-100 mt-1">{comp?.name}</h4>
                            <p className="text-xs text-slate-400 font-medium mt-1">
                              {winner ? `🥇 ${winner.displayName} (${winner.teamName})` : 'N/A'}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-mono bg-slate-700 text-slate-300 px-2.5 py-1 rounded">
                              {winner?.grade} {t.grade}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Slide 4: Active Stage Schedule Status */}
            {slideIndex === 3 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 text-rose-400">
                  <Clock className="h-8 w-8" />
                  <h2 className="text-xl md:text-2xl font-display font-black tracking-tight uppercase">
                    {t.stages} Status & Schedules
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {stages.map(stg => {
                    const activeComp = competitions.find(c => c.stageId === stg.id && c.status === 'running');
                    const upcomingComp = competitions.find(c => c.stageId === stg.id && c.status === 'scheduled');
                    
                    return (
                      <div key={stg.id} className="bg-slate-800/40 border border-slate-700/40 p-5 rounded-xl space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-200">{stg.name}</span>
                          <span className={`h-2.5 w-2.5 rounded-full ${activeComp ? 'bg-emerald-500 animate-ping' : 'bg-slate-500'}`} />
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="bg-slate-800 p-2.5 rounded">
                            <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">Now Playing</p>
                            <p className="font-semibold text-slate-200 mt-0.5 truncate">{activeComp ? activeComp.name : 'No active item'}</p>
                          </div>
                          <div className="bg-slate-800 p-2.5 rounded">
                            <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">Next up</p>
                            <p className="font-semibold text-slate-300 mt-0.5 truncate">{upcomingComp ? upcomingComp.name : 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Rotate indicator bars */}
            <div className="flex space-x-2 mt-6">
              {[0, 1, 2, 3].map(idx => (
                <div 
                  key={idx} 
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    slideIndex === idx ? 'bg-emerald-500' : 'bg-slate-800'
                  }`} 
                />
              ))}
            </div>

          </div>

          {/* Announcements Ticker Bar */}
          <div className="bg-emerald-950/30 border border-emerald-900/30 rounded-xl p-3.5 flex items-center space-x-3 text-xs md:text-sm text-emerald-300 no-print">
            <div className="bg-emerald-800 text-white font-bold px-2 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider flex items-center space-x-1">
              <Megaphone className="h-3 w-3" />
              <span>ALERT</span>
            </div>
            <div className="flex-1 overflow-hidden relative h-5">
              <div className="absolute animate-marquee whitespace-nowrap">
                {announcements.length > 0 
                  ? announcements.map(a => `📢 ${a.title}: ${a.content}`).join('   |   ')
                  : 'Welcome to MeeladPulse live portal! Updates are refreshed automatically.'
                }
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 2. Latest Results view */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
            
            {/* Search Input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-slate-400" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by competition name or code..."
                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Filter by Competition dropdown */}
            <select
              value={selectedCompId}
              onChange={(e) => setSelectedCompId(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">All Competitions</option>
              {competitions.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Results Display */}
          <div className="space-y-6">
            {latestPublishedResults
              .filter(r => {
                const comp = competitions.find(c => c.id === r.competitionId);
                const matchesSearch = comp ? comp.name.toLowerCase().includes(searchQuery.toLowerCase()) || comp.code.toLowerCase().includes(searchQuery.toLowerCase()) : true;
                const matchesComp = selectedCompId ? r.competitionId === selectedCompId : true;
                return matchesSearch && matchesComp;
              })
              .map(res => {
                const comp = competitions.find(c => c.id === res.competitionId);
                return (
                  <div key={res.id} className="bg-white border border-slate-100 rounded-xl shadow-sm p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded mr-2">
                          {comp?.code}
                        </span>
                        <h3 className="font-display font-extrabold text-lg text-slate-800 inline-block mt-1 sm:mt-0">
                          {comp?.name}
                        </h3>
                      </div>
                      <span className="text-xs text-slate-500 font-mono mt-1 sm:mt-0">
                        Published: {res.publishedAt?.toDate ? res.publishedAt.toDate().toLocaleString('en-IN') : 'Just now'}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100 text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.position}</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.studentName}</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.chestNumber}</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.teams}</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.grade}</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.points}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {res.participants.map((part, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-extrabold ${
                                  part.position === '1st' 
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                    : part.position === '2nd' 
                                      ? 'bg-slate-100 text-slate-800' 
                                      : part.position === '3rd' 
                                        ? 'bg-orange-100 text-orange-800' 
                                        : 'text-slate-500'
                                }`}>
                                  {part.position !== 'None' ? part.position : '-'}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800">{part.displayName}</td>
                              <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-500">{part.chestNumber}</td>
                              <td className="px-4 py-3 whitespace-nowrap font-semibold text-emerald-700">{part.teamName}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-bold font-mono">
                                  {part.grade}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-slate-900">{part.teamPoints}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* 3. Overall Rankings tab */}
      {activeTab === 'ranking' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Standings */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-6">
            <h3 className="font-display font-extrabold text-lg text-slate-800 flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-emerald-600" />
              <span>Championship Standings (ഗ്രാൻഡ് ലീഡർബോർഡ്)</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Rank</th>
                    <th className="px-4 py-3 text-left">Team Code</th>
                    <th className="px-4 py-3 text-left">Team Name</th>
                    <th className="px-4 py-3 text-left">Arts Points</th>
                    <th className="px-4 py-3 text-left">Sports Points</th>
                    <th className="px-4 py-3 text-left">Overall Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {teamTotals.map((tt, i) => {
                    const team = teams.find(t => t.id === tt.teamId);
                    return (
                      <tr key={tt.teamId} className="hover:bg-slate-50/50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="font-display font-black text-slate-800 text-lg">#{i+1}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap font-mono font-bold text-slate-400">{team?.code}</td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div>
                            <span className="font-bold text-slate-800">{team?.name}</span>
                            <p className="text-xs text-slate-400 mt-0.5">{team?.slogan}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap font-mono text-emerald-600 font-semibold">
                          {tt.stagePoints + tt.nonStagePoints} Pts
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap font-mono text-amber-600 font-semibold">
                          {tt.divisionTotals['div-sports'] || 0} Pts
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap font-mono font-black text-xl text-slate-900">
                          {tt.overallPoints}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Metrics & Highlights */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white rounded-xl p-5 shadow-sm space-y-4">
              <TrendingUp className="h-6 w-6 text-emerald-300" />
              <h4 className="font-display font-extrabold text-md tracking-tight">Active Milestones</h4>
              <p className="text-xs text-emerald-100 leading-relaxed">
                The grand championship points are compiled instantly from verified published mark-sheets. Standard position values and academic bonus points are computed.
              </p>
              <div className="border-t border-emerald-700/50 pt-3 flex items-center justify-between text-xs font-mono text-emerald-200">
                <span>Calculations verified:</span>
                <span className="text-white font-bold">Automatic OK</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 4. Schedule tab */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 no-print">
            <div className="flex space-x-2">
              {['all', 'upcoming', 'completed'].map(f => (
                <button
                  key={f}
                  onClick={() => setSchedFilter(f)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold capitalize transition ${
                    schedFilter === f 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredComps.map(comp => {
              const stg = stages.find(s => s.id === comp.stageId);
              return (
                <div key={comp.id} className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {comp.code}
                      </span>
                      <span className={`h-2 w-2 rounded-full ${
                        comp.status === 'published' || comp.status === 'completed'
                          ? 'bg-slate-400'
                          : comp.status === 'running'
                            ? 'bg-emerald-500'
                            : 'bg-blue-500'
                      }`} />
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm">{comp.name}</h4>
                    <p className="text-xs text-slate-500 font-medium">
                      📍 {stg?.name || 'N/A'} | ⏰ {comp.startTime} | 🗓️ {comp.eventDate}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-mono px-2.5 py-1 rounded font-semibold capitalize ${
                      comp.status === 'published' || comp.status === 'completed'
                        ? 'bg-slate-100 text-slate-500'
                        : comp.status === 'running'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                    }`}>
                      {comp.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Announcements Portal tab */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <h3 className="font-display font-extrabold text-lg text-slate-800">{t.announcements} (അറിയിപ്പുകൾ)</h3>
          {announcements.length === 0 ? (
            <div className="bg-slate-50 text-center py-12 rounded-xl text-slate-400 font-medium">
              No recent announcements.
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map(ann => (
                <div key={ann.id} className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-bold text-emerald-600 font-mono tracking-wider bg-emerald-50 px-2 py-0.5 rounded">
                      {ann.type}
                    </span>
                    <span>
                      {ann.createdAt?.toDate ? ann.createdAt.toDate().toLocaleString('en-IN') : 'Just now'}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">{ann.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{ann.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. Certificate & ID Downloads */}
      {activeTab === 'downloads' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-4">
            <h3 className="font-display font-extrabold text-lg text-slate-800">Public Verification & Downloads</h3>
            <p className="text-xs text-slate-500">
              Generate visual winner verification slips and certificates directly in the browser! Verified results are equipped with offline QR security indicators.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Sample Certificate Generator preview */}
              <div id="winner-cert-preview" className="certificate-container p-8 rounded border-4 border-double border-emerald-600 bg-white shadow-md text-center max-w-xl mx-auto space-y-4">
                <span className="text-[10px] font-mono tracking-widest uppercase text-emerald-600 block">
                  MEELADPULSE EXCELLENCE SLIP
                </span>
                <h2 className="text-xl font-display font-extrabold text-slate-800">
                  സർട്ടിഫിക്കറ്റ് ഓഫ് മെറിറ്റ്
                </h2>
                <p className="text-xs text-slate-500 font-serif">
                  This is to certify that a candidate of our educational institution has won distinction in the annual cultural festival:
                </p>
                <div className="py-2">
                  <p className="text-md font-bold text-slate-900">Muhammad Faiz (അഹ്‌മദ്‌ ഫായിസ്)</p>
                  <p className="text-xs text-slate-500">Representing Emerald Green Team</p>
                </div>
                <p className="text-xs text-slate-600">
                  Secured <strong className="text-emerald-700">1st Position</strong> with <strong className="text-emerald-700">A+ Grade</strong> in <strong className="text-slate-800">Quran Qira'ath (ഖുർആൻ പാരായണം)</strong>.
                </p>
                
                <div className="pt-4 flex justify-between items-end border-t border-slate-100">
                  <div className="text-left text-[9px] text-slate-400 font-mono">
                    <span>Cert No: MP-2026-0912</span><br/>
                    <span>Date: 15-07-2026</span>
                  </div>
                  <img 
                    src={generateQRUrl('Verified Winner Faiz. Event: Quran. Position: 1st.')} 
                    alt="Verification QR" 
                    className="h-14 w-14"
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col justify-center space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                  <h4 className="font-bold text-slate-700 text-xs">Print slips</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Admins, Judges, and Team leaders can print official ID Cards and Certificate templates directly from their respective portals. Click print below to export the public slip.
                  </p>
                </div>
                <button
                  onClick={() => printElement('winner-cert-preview')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2 px-4 rounded transition w-full"
                >
                  Print Winner Slips
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
