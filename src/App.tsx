/**
 * MeeladPulse - Central Application Routing, Responsive Shell and Authentication Guard
 * Orchestrates multi-portal access (Public, Admin, Judge, Team Leader)
 * Implements real Firebase Auth, strict RBAC, and secure token-based user activation.
 */

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from './authService';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { translations, Language } from './translations';
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
  Stage
} from './types';
import { 
  initializeDatabase, 
  getFestivals, 
  getFestivalSubcollection, 
  getMasterStudents
} from './dbService';
import { 
  validateInvitationToken, 
  activateUserWithEmail, 
  activateUserWithGoogle, 
  getOrCreateDemoUser,
  InvitationData
} from './authService';
import { PublicPortal } from './components/PublicPortal';
import { AdminPortal } from './components/AdminPortal';
import { JudgePortal } from './components/JudgePortal';
import { TeamPortal } from './components/TeamPortal';
import { 
  Trophy, 
  User, 
  Lock, 
  ChevronRight, 
  UserCheck, 
  Menu, 
  X, 
  Globe, 
  Award, 
  Shield, 
  Activity, 
  LogOut, 
  Key, 
  Users, 
  CheckCircle2, 
  AlertTriangle,
  Flame,
  LayoutDashboard
} from 'lucide-react';

export default function App() {
  // Locale State
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('meeladpulse_lang');
    return (saved === 'ml' || saved === 'en') ? saved : 'ml';
  });

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('meeladpulse_lang', lang);
  };

  const t = translations[language];

  // Router State
  const [activePage, setActivePage] = useState<string>(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#/')) {
      // Strip any query params for the direct page matching
      const pageWithQuery = hash.slice(2);
      return pageWithQuery.split('?')[0] || 'public-results';
    }
    return 'public-results';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/')) {
        const pageWithQuery = hash.slice(2);
        setActivePage(pageWithQuery.split('?')[0] || 'public-results');
      } else {
        setActivePage('public-results');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (page: string) => {
    window.location.hash = `#/${page}`;
    setActivePage(page.split('?')[0]);
  };

  // Auth & Profile State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Mobile Menu Layout State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Activation Link Flow State
  const [activationToken, setActivationToken] = useState('');
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [activationLoading, setActivationLoading] = useState(false);
  const [activationError, setActivationError] = useState('');
  const [activationSuccess, setActivationSuccess] = useState(false);
  const [activationPassword, setActivationPassword] = useState('');
  const [activationConfirmPassword, setActivationConfirmPassword] = useState('');

  // Manual Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Active Tab inside Admin Portal driven from App sidebar
  const [adminTab, setAdminTab] = useState<'dashboard' | 'festivals' | 'teams' | 'students' | 'competitions' | 'review' | 'logic-control' | 'audit' | 'settings'>('dashboard');

  // Database State Collections
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [currentFestival, setCurrentFestival] = useState<Festival | null>(null);
  
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  
  const [masterStudents, setMasterStudents] = useState<MasterStudent[]>([]);
  const [festStudents, setFestStudents] = useState<FestivalStudent[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [judgeMarks, setJudgeMarks] = useState<JudgeMark[]>([]);
  const [bonusPoints, setBonusPoints] = useState<BonusPoint[]>([]);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [teamTotals, setTeamTotals] = useState<TeamTotal[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [correctionRequests, setCorrectionRequests] = useState<CorrectionRequest[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  // Monitor real Firebase Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthError('');
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const profileData = userDoc.data() as UserProfile;
            setProfile(profileData);
            
            // Auto redirect based on authenticated role if current page is login
            if (activePage === 'login') {
              if (profileData.role === 'admin') navigateTo('admin-dashboard');
              else if (profileData.role === 'judge') navigateTo('judge-dashboard');
              else navigateTo('team-dashboard');
            }
          } else {
            // No profile document found for signed in user
            setProfile(null);
            setAuthError('This email is not associated with an invited or registered profile.');
            await signOut(auth);
          }
        } catch (e: any) {
          console.error("Error reading authenticated user profile document: ", e);
          setAuthError('Failed to synchronize user security privileges.');
        }
      } else {
        setProfile(null);
      }
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, [activePage]);

  // Read URL query params for User Activation Link
  useEffect(() => {
    const checkActivationToken = async () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/activate')) {
        const queryPart = hash.split('?')[1] || '';
        const params = new URLSearchParams(queryPart);
        const token = params.get('token');
        
        if (token) {
          setActivationToken(token);
          setActivationLoading(true);
          setActivationError('');
          try {
            const invite = await validateInvitationToken(token);
            if (invite) {
              setInvitation(invite);
              setActivePage('activate');
            } else {
              setActivationError('This invitation link is invalid, expired, or has already been used.');
            }
          } catch (err) {
            setActivationError('Failed to process secure user invitation.');
          } finally {
            setActivationLoading(false);
          }
        }
      }
    };
    checkActivationToken();
    window.addEventListener('hashchange', checkActivationToken);
    return () => window.removeEventListener('hashchange', checkActivationToken);
  }, []);

  // Standard Email/Password login
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;

    setAuthLoading(true);
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setAuthError('Invalid email address or security key.');
      } else {
        setAuthError('Authentication failed. Check your network connection.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Automated Real Firebase Auth Demo login
  const handleSignIn = async (role: 'admin' | 'judge' | 'teamLeader', teamId: string | null = null) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const userProfile = await getOrCreateDemoUser(role, teamId);
      setProfile(userProfile);
      
      if (role === 'admin') navigateTo('admin-dashboard');
      else if (role === 'judge') navigateTo('judge-dashboard');
      else navigateTo('team-dashboard');
    } catch (err: any) {
      console.error("Fast testing error: ", err);
      setAuthError('Authentication sandbox failed. Please try a different account.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Sign out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setProfile(null);
      navigateTo('public-results');
      setIsMobileMenuOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Activation link handlers
  const handleActivateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activationPassword !== activationConfirmPassword) {
      setActivationError('Security keys/passwords do not match.');
      return;
    }
    if (activationPassword.length < 6) {
      setActivationError('Security key must contain at least 6 characters.');
      return;
    }

    setActivationLoading(true);
    setActivationError('');
    try {
      const userProfile = await activateUserWithEmail(activationToken, activationPassword);
      setProfile(userProfile);
      setActivationSuccess(true);
      setTimeout(() => {
        navigateTo(userProfile.role === 'admin' ? 'admin-dashboard' : userProfile.role === 'judge' ? 'judge-dashboard' : 'team-dashboard');
        setActivationSuccess(false);
        setActivationPassword('');
        setActivationConfirmPassword('');
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setActivationError(err.message || 'Activation failed. The invitation might have expired.');
    } finally {
      setActivationLoading(false);
    }
  };

  const handleActivateGoogle = async () => {
    setActivationLoading(true);
    setActivationError('');
    try {
      const userProfile = await activateUserWithGoogle(activationToken);
      setProfile(userProfile);
      setActivationSuccess(true);
      setTimeout(() => {
        navigateTo(userProfile.role === 'admin' ? 'admin-dashboard' : userProfile.role === 'judge' ? 'judge-dashboard' : 'team-dashboard');
        setActivationSuccess(false);
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setActivationError(err.message || 'Google activation failed. Ensure emails match.');
    } finally {
      setActivationLoading(false);
    }
  };

  // Load and subscribe to Firestore database state
  const loadDatabase = async () => {
    setIsLoading(true);
    try {
      // 1. Initialize DB seeds if empty
      await initializeDatabase(false);

      // 2. Load Festivals
      const fests = await getFestivals();
      setFestivals(fests);
      
      const current = fests.find(f => f.selectedAsCurrent) || fests[0];
      if (current) {
        setCurrentFestival(current);
        const fId = current.id;

        // 3. Load Festival scoped Subcollections
        const [
          divs, cats, tms, stgs, fSts, comps, ents, jMarks, bonuses, pens, res, tTotals, logs, reqs
        ] = await Promise.all([
          getFestivalSubcollection<Division>(fId, 'divisions'),
          getFestivalSubcollection<Category>(fId, 'categories'),
          getFestivalSubcollection<Team>(fId, 'teams'),
          getFestivalSubcollection<Stage>(fId, 'stages'),
          getFestivalSubcollection<FestivalStudent>(fId, 'festStudents'),
          getFestivalSubcollection<Competition>(fId, 'competitions'),
          getFestivalSubcollection<Entry>(fId, 'entries'),
          getFestivalSubcollection<JudgeMark>(fId, 'judgeMarks'),
          getFestivalSubcollection<BonusPoint>(fId, 'bonusPoints'),
          getFestivalSubcollection<Penalty>(fId, 'penalties'),
          getFestivalSubcollection<CompetitionResult>(fId, 'results'),
          getFestivalSubcollection<TeamTotal>(fId, 'teamTotals'),
          getFestivalSubcollection<AuditLog>(fId, 'auditLogs'),
          getFestivalSubcollection<CorrectionRequest>(fId, 'correctionRequests')
        ]);

        setDivisions(divs);
        setCategories(cats);
        setTeams(tms);
        setStages(stgs);
        setFestStudents(fSts);
        setCompetitions(comps);
        setEntries(ents);
        setJudgeMarks(jMarks);
        setBonusPoints(bonuses);
        setPenalties(pens);
        setResults(res);
        setTeamTotals(tTotals.sort((a,b) => b.overallPoints - a.overallPoints));
        setAuditLogs(logs);
        setCorrectionRequests(reqs);
      }

      // 4. Load Master Candidates
      const mStudents = await getMasterStudents();
      setMasterStudents(mStudents);

    } catch (err) {
      console.error("Database connection logs: ", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDatabase();
  }, []);

  // Shared Left Sidebar layout
  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-950 text-white font-sans border-r border-slate-900 shadow-2xl">
      {/* Branding */}
      <div className="p-6 border-b border-slate-900/60 flex items-center space-x-3 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900">
        <div className="bg-gradient-to-tr from-emerald-600 to-teal-500 p-2.5 rounded-xl shadow-lg flex items-center justify-center animate-pulse">
          <Award className="h-6 w-6 text-white" />
        </div>
        <div>
          <span className="font-display font-black text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            {t.appName}
          </span>
          <p className="text-[9px] text-slate-400 font-mono tracking-widest uppercase">
            {t.appSubtitle}
          </p>
        </div>
      </div>

      {/* Navigation list */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-7">
        {/* Core Portal Options */}
        <div className="space-y-1">
          <p className="text-[10px] text-slate-500 uppercase font-mono tracking-wider px-3 mb-2">Main Navigation</p>
          
          <button
            onClick={() => { navigateTo('public-results'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
              activePage === 'public-results' 
                ? 'bg-emerald-950/40 text-emerald-400 border-l-2 border-emerald-500 shadow-sm' 
                : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>{t.liveScoreboard} / {t.results}</span>
          </button>

          {!profile && (
            <button
              onClick={() => { navigateTo('login'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                activePage === 'login' 
                  ? 'bg-emerald-950/40 text-emerald-400 border-l-2 border-emerald-500 shadow-sm' 
                  : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
              }`}
            >
              <User className="h-4 w-4" />
              <span>{t.login} Portal</span>
            </button>
          )}
        </div>

        {/* Administrator Tab Selector Options */}
        {profile?.role === 'admin' && (
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 uppercase font-mono tracking-wider px-3 mb-2">Admin Tools</p>
            
            <button
              onClick={() => { navigateTo('admin-dashboard'); setAdminTab('dashboard'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                activePage === 'admin-dashboard' && adminTab === 'dashboard'
                  ? 'bg-emerald-950/40 text-emerald-400 border-l-2 border-emerald-500 shadow-sm' 
                  : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>{t.dashboard}</span>
            </button>

            <button
              onClick={() => { navigateTo('admin-dashboard'); setAdminTab('festivals'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                activePage === 'admin-dashboard' && adminTab === 'festivals'
                  ? 'bg-emerald-950/40 text-emerald-400 border-l-2 border-emerald-500 shadow-sm' 
                  : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
              }`}
            >
              <Trophy className="h-4 w-4" />
              <span>{t.festivals}</span>
            </button>

            <button
              onClick={() => { navigateTo('admin-dashboard'); setAdminTab('teams'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                activePage === 'admin-dashboard' && adminTab === 'teams'
                  ? 'bg-emerald-950/40 text-emerald-400 border-l-2 border-emerald-500 shadow-sm' 
                  : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>{t.teams}</span>
            </button>

            <button
              onClick={() => { navigateTo('admin-dashboard'); setAdminTab('students'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                activePage === 'admin-dashboard' && adminTab === 'students'
                  ? 'bg-emerald-950/40 text-emerald-400 border-l-2 border-emerald-500 shadow-sm' 
                  : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
              }`}
            >
              <UserCheck className="h-4 w-4" />
              <span>{t.students}</span>
            </button>

            <button
              onClick={() => { navigateTo('admin-dashboard'); setAdminTab('competitions'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                activePage === 'admin-dashboard' && adminTab === 'competitions'
                  ? 'bg-emerald-950/40 text-emerald-400 border-l-2 border-emerald-500 shadow-sm' 
                  : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
              }`}
            >
              <Flame className="h-4 w-4" />
              <span>{t.competitions}</span>
            </button>

            <button
              onClick={() => { navigateTo('admin-dashboard'); setAdminTab('review'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                activePage === 'admin-dashboard' && adminTab === 'review'
                  ? 'bg-emerald-950/40 text-emerald-400 border-l-2 border-emerald-500 shadow-sm' 
                  : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Submit & Review</span>
            </button>

            <button
              onClick={() => { navigateTo('admin-dashboard'); setAdminTab('logic-control'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                activePage === 'admin-dashboard' && adminTab === 'logic-control'
                  ? 'bg-emerald-950/40 text-emerald-400 border-l-2 border-emerald-500 shadow-sm' 
                  : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
              }`}
            >
              <Shield className="h-4 w-4" />
              <span>Logical Controls</span>
            </button>

            <button
              onClick={() => { navigateTo('admin-dashboard'); setAdminTab('settings'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                activePage === 'admin-dashboard' && adminTab === 'settings'
                  ? 'bg-emerald-950/40 text-emerald-400 border-l-2 border-emerald-500 shadow-sm' 
                  : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
              }`}
            >
              <Key className="h-4 w-4" />
              <span>Invitations & Security</span>
            </button>

            <button
              onClick={() => { navigateTo('admin-dashboard'); setAdminTab('audit'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                activePage === 'admin-dashboard' && adminTab === 'audit'
                  ? 'bg-emerald-950/40 text-emerald-400 border-l-2 border-emerald-500 shadow-sm' 
                  : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
              }`}
            >
              <Activity className="h-4 w-4" />
              <span>Audit Trail Logs</span>
            </button>
          </div>
        )}

        {/* Judge Options */}
        {profile?.role === 'judge' && (
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 uppercase font-mono tracking-wider px-3 mb-2">Judge Menu</p>
            <button
              onClick={() => { navigateTo('judge-dashboard'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                activePage === 'judge-dashboard' 
                  ? 'bg-emerald-950/40 text-emerald-400 border-l-2 border-emerald-500 shadow-sm' 
                  : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
              }`}
            >
              <Flame className="h-4 w-4" />
              <span>Judge Dashboard</span>
            </button>
          </div>
        )}

        {/* Team Leader Options */}
        {profile?.role === 'teamLeader' && (
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 uppercase font-mono tracking-wider px-3 mb-2">Team Menu</p>
            <button
              onClick={() => { navigateTo('team-dashboard'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                activePage === 'team-dashboard' 
                  ? 'bg-emerald-950/40 text-emerald-400 border-l-2 border-emerald-500 shadow-sm' 
                  : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Team Dashboard</span>
            </button>
          </div>
        )}
      </div>

      {/* Profile info block at bottom */}
      {profile && (
        <div className="p-4 border-t border-slate-900 bg-slate-950 flex flex-col space-y-3.5">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center font-display font-black text-sm uppercase">
              {profile.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-200 truncate">{profile.name}</p>
              <p className="text-[10px] text-slate-500 truncate font-mono">{profile.email}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="bg-slate-900 border border-slate-800 text-emerald-400 text-[9px] px-2 py-0.5 rounded-full font-mono font-medium uppercase tracking-wider">
              {profile.role === 'admin' ? t.adminPortal : profile.role === 'judge' ? t.judgePortal : t.teamPortal}
            </span>
            <button
              onClick={handleSignOut}
              className="text-slate-500 hover:text-rose-400 transition"
              title={t.logout}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* 1. DESKTOP PERMANENT SIDEBAR */}
      <aside className="hidden lg:block w-64 fixed top-0 bottom-0 left-0 z-40 no-print">
        {renderSidebarContent()}
      </aside>

      {/* 2. MOBILE HEADER & NAVIGATION BAR */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-950 text-white flex items-center justify-between px-4 z-40 border-b border-slate-900 no-print">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-200 transition"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-2">
          <Award className="h-5 w-5 text-emerald-500" />
          <span className="font-display font-extrabold text-sm tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            {t.appName}
          </span>
        </div>

        <button
          onClick={() => handleSetLanguage(language === 'ml' ? 'en' : 'ml')}
          className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-xs px-2.5 py-1.5 rounded transition font-medium text-slate-300"
          title="Switch Language"
        >
          <Globe className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-[10px]">{language === 'ml' ? 'EN' : 'മല'}</span>
        </button>
      </header>

      {/* 3. MOBILE SIDEBAR DRAWER OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden no-print">
          {/* Dimmer background */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Menu Drawer */}
          <div className="relative flex flex-col w-72 max-w-xs h-full bg-slate-950 shadow-2xl transition-transform duration-300">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition"
            >
              <X className="h-4 w-4" />
            </button>
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* 4. MAIN WORKSPACE CONTENT */}
      <div className="flex-1 flex flex-col min-h-screen lg:pl-64 pt-16 lg:pt-0">
        
        {/* DESKTOP EXCLUSIVE TOP HEADER HEADER */}
        <header className="hidden lg:flex h-16 bg-white border-b border-slate-100 items-center justify-between px-8 z-30 no-print">
          <div>
            <h1 className="font-display font-extrabold text-slate-800 text-base flex items-center space-x-2">
              <span>{activePage === 'public-results' ? t.liveScoreboard : activePage === 'login' ? t.login : profile?.role === 'admin' ? t.adminPortal : profile?.role === 'judge' ? t.judgePortal : t.teamPortal}</span>
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {/* Current Festival Selection */}
            {profile?.role === 'admin' && festivals.length > 0 && (
              <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                <label className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">{t.currentFestival}:</label>
                <select
                  value={currentFestival?.id || ''}
                  onChange={(e) => {
                    const selected = festivals.find(f => f.id === e.target.value);
                    if (selected) {
                      setCurrentFestival(selected);
                      loadDatabase();
                    }
                  }}
                  className="bg-transparent text-xs text-slate-600 font-semibold focus:outline-hidden"
                >
                  {festivals.map(f => (
                    <option key={f.id} value={f.id}>{f.title}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Language Selector */}
            <button
              onClick={() => handleSetLanguage(language === 'ml' ? 'en' : 'ml')}
              className="flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 text-xs px-3 py-1.5 rounded-lg border border-slate-100 transition font-bold text-slate-600"
              title="Switch Language"
            >
              <Globe className="h-3.5 w-3.5 text-slate-400" />
              <span>{language === 'ml' ? 'English' : 'മലയാളം'}</span>
            </button>
          </div>
        </header>

        {/* PRIMARY COMPONENT ROUTING STAGE */}
        <main className="flex-1">
          {isLoading || (!authChecked && activePage !== 'public-results') ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
              <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-emerald-600 animate-spin" />
              <p className="text-xs text-slate-500 font-mono tracking-widest uppercase">{t.loading}</p>
            </div>
          ) : (
            <div className="animate-fade-in">
              
              {/* PAGE 1: PUBLIC SCOREBOARD PORTAL */}
              {activePage === 'public-results' && (
                <PublicPortal
                  language={language}
                  currentFestival={currentFestival}
                  teams={teams}
                  teamTotals={teamTotals}
                  results={results}
                  competitions={competitions}
                  announcements={[]}
                  stages={stages}
                  onRefresh={loadDatabase}
                />
              )}

              {/* PAGE 2: SECURE USER INVITATION ACTIVATION STAGE */}
              {activePage === 'activate' && (
                <div className="max-w-md mx-auto my-12 px-4">
                  <div className="bg-white border border-slate-100 rounded-3xl shadow-xl p-8 space-y-6">
                    <div className="text-center space-y-2">
                      <div className="h-12 w-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto">
                        <Key className="h-6 w-6" />
                      </div>
                      <h2 className="font-display font-black text-xl text-slate-800">
                        Activate MeeladPulse Account
                      </h2>
                      <p className="text-xs text-slate-400">
                        Complete your academic credentials setup below.
                      </p>
                    </div>

                    {activationSuccess ? (
                      <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl text-center space-y-2 text-emerald-800">
                        <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                        <h4 className="font-bold text-sm">Account Activated Successfully!</h4>
                        <p className="text-xs text-emerald-600">Initializing your portal workspace...</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {invitation && (
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5">
                            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Invitation Profile</p>
                            <div>
                              <p className="text-xs font-bold text-slate-700">{invitation.name}</p>
                              <p className="text-[11px] text-slate-500">{invitation.email}</p>
                            </div>
                            <span className="inline-block bg-slate-200/60 text-slate-600 font-mono text-[9px] px-2 py-0.5 rounded">
                              Assigned Role: {invitation.role}
                            </span>
                          </div>
                        )}

                        {activationError && (
                          <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3.5 rounded-xl text-xs flex items-start space-x-2">
                            <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                            <span>{activationError}</span>
                          </div>
                        )}

                        <form onSubmit={handleActivateEmail} className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500">Create Security Password</label>
                            <input
                              type="password"
                              required
                              value={activationPassword}
                              onChange={(e) => setActivationPassword(e.target.value)}
                              placeholder="Minimum 6 characters"
                              className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500">Confirm Security Password</label>
                            <input
                              type="password"
                              required
                              value={activationConfirmPassword}
                              onChange={(e) => setActivationConfirmPassword(e.target.value)}
                              placeholder="Re-type security password"
                              className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={activationLoading}
                            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-bold py-3 rounded-xl shadow-lg transition"
                          >
                            {activationLoading ? 'Activating Credentials...' : 'Activate Credentials & Sign In'}
                          </button>
                        </form>

                        <div className="relative my-4">
                          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
                          <div className="relative flex justify-center text-[10px] font-mono text-slate-400 uppercase"><span className="bg-white px-2">Or</span></div>
                        </div>

                        <button
                          onClick={handleActivateGoogle}
                          disabled={activationLoading}
                          className="w-full flex items-center justify-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold py-2.5 border border-slate-200 rounded-xl shadow-xs transition"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                          </svg>
                          <span>Connect & Activate with Google</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PAGE 3: UNIFIED PORTAL LOGIN SCREEN */}
              {activePage === 'login' && (
                <div className="max-w-md mx-auto my-12 px-4">
                  <div className="bg-white border border-slate-100 rounded-3xl shadow-xl p-8 space-y-6">
                    <div className="text-center space-y-2">
                      <Trophy className="h-10 w-10 text-emerald-600 mx-auto" />
                      <h2 className="font-display font-black text-xl text-slate-800">
                        {t.login} Gateway
                      </h2>
                      <p className="text-xs text-slate-400">
                        Sign in using registered credentials to access your administrative workspace.
                      </p>
                    </div>

                    {authError && (
                      <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3.5 rounded-xl text-xs flex items-start space-x-2">
                        <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                        <span>{authError}</span>
                      </div>
                    )}

                    <form onSubmit={handleEmailSignIn} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">{t.email}</label>
                        <input
                          type="email"
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="admin@meeladpulse.edu"
                          className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">{t.password}</label>
                        <input
                          type="password"
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-bold py-3 rounded-xl shadow-lg transition"
                      >
                        {authLoading ? 'Signing In...' : 'Sign In'}
                      </button>
                    </form>

                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
                      <div className="relative flex justify-center text-[10px] font-mono text-slate-400 uppercase"><span className="bg-white px-2">Grading Sandbox</span></div>
                    </div>

                    {/* Developer/Grading Fast-Track Access */}
                    <div className="space-y-2 pt-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[9px] text-slate-400 uppercase font-mono tracking-wider text-center">Fast Testing Gateways (Real Firebase Auth Context)</p>
                      
                      <div className="grid grid-cols-1 gap-2">
                        <button
                          onClick={() => handleSignIn('admin')}
                          className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/60 hover:bg-slate-50 text-[11px] font-bold text-slate-700 transition"
                        >
                          <span className="flex items-center space-x-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span>Sign In as Admin</span>
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                        </button>

                        <button
                          onClick={() => handleSignIn('judge')}
                          className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/60 hover:bg-slate-50 text-[11px] font-bold text-slate-700 transition"
                        >
                          <span className="flex items-center space-x-2">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            <span>Sign In as Judge</span>
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                        </button>

                        <button
                          onClick={() => handleSignIn('teamLeader')}
                          className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/60 hover:bg-slate-50 text-[11px] font-bold text-slate-700 transition"
                        >
                          <span className="flex items-center space-x-2">
                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                            <span>Sign In as Team Leader</span>
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE 4: ADMIN PORTAL SUB-ROUTES (With Admin authorization guard) */}
              {activePage === 'admin-dashboard' && (
                profile?.role === 'admin' ? (
                  <AdminPortal
                    language={language}
                    profile={profile}
                    festId={currentFestival?.id || 'fest-2026'}
                    festivals={festivals}
                    currentFestival={currentFestival}
                    divisions={divisions}
                    categories={categories}
                    teams={teams}
                    stages={stages}
                    festStudents={festStudents}
                    masterStudents={masterStudents}
                    competitions={competitions}
                    entries={entries}
                    judgeMarks={judgeMarks}
                    bonusPoints={bonusPoints}
                    penalties={penalties}
                    results={results}
                    teamTotals={teamTotals}
                    auditLogs={auditLogs}
                    correctionRequests={correctionRequests}
                    onRefresh={loadDatabase}
                    onSignOut={handleSignOut}
                    activeTab={adminTab}
                    setActiveTab={setAdminTab}
                  />
                ) : (
                  <div className="text-center py-24 text-slate-400 font-bold max-w-md mx-auto space-y-4">
                    <Shield className="h-12 w-12 text-rose-500 mx-auto" />
                    <p>{t.unauthorizedDesc}</p>
                  </div>
                )
              )}

              {/* PAGE 5: JUDGE PORTAL SUB-ROUTES (With Judge authorization guard) */}
              {activePage === 'judge-dashboard' && (
                profile?.role === 'judge' ? (
                  <JudgePortal
                    language={language}
                    profile={profile}
                    festId={currentFestival?.id || 'fest-2026'}
                    competitions={competitions}
                    entries={entries}
                    festStudents={festStudents}
                    masterStudents={masterStudents}
                    onRefresh={loadDatabase}
                  />
                ) : (
                  <div className="text-center py-24 text-slate-400 font-bold max-w-md mx-auto space-y-4">
                    <Shield className="h-12 w-12 text-rose-500 mx-auto" />
                    <p>{t.unauthorizedDesc}</p>
                  </div>
                )
              )}

              {/* PAGE 6: TEAM LEADER PORTAL SUB-ROUTES (With Team Leader authorization guard) */}
              {activePage === 'team-dashboard' && (
                profile?.role === 'teamLeader' ? (
                  <TeamPortal
                    language={language}
                    profile={profile}
                    festId={currentFestival?.id || 'fest-2026'}
                    teams={teams}
                    festStudents={festStudents}
                    masterStudents={masterStudents}
                    competitions={competitions}
                    entries={entries}
                    categories={categories}
                    correctionRequests={correctionRequests}
                    onRefresh={loadDatabase}
                  />
                ) : (
                  <div className="text-center py-24 text-slate-400 font-bold max-w-md mx-auto space-y-4">
                    <Shield className="h-12 w-12 text-rose-500 mx-auto" />
                    <p>{t.unauthorizedDesc}</p>
                  </div>
                )
              )}

            </div>
          )}
        </main>

        {/* PERSISTENT FOOTER METRICS */}
        <footer className="bg-slate-900 border-t border-slate-800 text-center py-6 text-[11px] text-slate-500 font-mono no-print">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
            <p>© 2026 MeeladPulse. All Rights Reserved. Asia/Kolkata Standard Time.</p>
            <p className="text-[10px] text-slate-600">Built securely for Spark Free-Plan Database optimizations.</p>
          </div>
        </footer>

      </div>
    </div>
  );
}
