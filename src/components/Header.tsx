import React from 'react';
import { translations, Language } from '../translations';
import { UserProfile, Festival } from '../types';
import { Globe, LogOut, User, Award } from 'lucide-react';

interface HeaderProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  profile: UserProfile | null;
  currentFestival: Festival | null;
  festivals: Festival[];
  setCurrentFestival: (fest: Festival) => void;
  onLogout: () => void;
  activePortal: string;
  setActivePage: (page: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  setLanguage,
  profile,
  currentFestival,
  festivals,
  setCurrentFestival,
  onLogout,
  activePortal,
  setActivePage
}) => {
  const t = translations[language];

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Branding */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActivePage('public-results')}>
          <div className="bg-emerald-600 p-2 rounded-lg flex items-center justify-center">
            <Award className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="font-display font-extrabold text-xl tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              {t.appName}
            </span>
            <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Current Festival Selection */}
        {profile?.role === 'admin' && festivals.length > 0 && (
          <div className="hidden md:flex items-center space-x-2">
            <label className="text-xs text-slate-400 font-mono">{t.currentFestival}:</label>
            <select
              value={currentFestival?.id || ''}
              onChange={(e) => {
                const selected = festivals.find(f => f.id === e.target.value);
                if (selected) setCurrentFestival(selected);
              }}
              className="bg-slate-800 text-xs text-slate-200 rounded border border-slate-700 px-2 py-1 focus:ring-1 focus:ring-emerald-500"
            >
              {festivals.map(f => (
                <option key={f.id} value={f.id}>{f.title}</option>
              ))}
            </select>
          </div>
        )}

        {/* Navigation & Controls */}
        <div className="flex items-center space-x-4">
          
          {/* Active Portal Badge */}
          {profile && (
            <span className="hidden sm:inline-block bg-slate-800 text-xs text-emerald-400 px-2.5 py-1 rounded-full font-mono font-medium">
              {profile.role === 'admin' ? t.adminPortal : profile.role === 'judge' ? t.judgePortal : t.teamPortal}
            </span>
          )}

          {/* Language Selector */}
          <button
            onClick={() => setLanguage(language === 'ml' ? 'en' : 'ml')}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1.5 rounded transition font-medium"
            title="Switch Language"
          >
            <Globe className="h-3.5 w-3.5 text-slate-400" />
            <span>{language === 'ml' ? 'English' : 'മലയാളം'}</span>
          </button>

          {/* User Profile Info & Action */}
          {profile ? (
            <div className="flex items-center space-x-3 pl-3 border-l border-slate-800">
              <div className="hidden lg:block text-right">
                <p className="text-xs font-semibold text-slate-200">{profile.name}</p>
                <p className="text-[10px] font-mono text-slate-500">{profile.email}</p>
              </div>
              <button
                onClick={onLogout}
                className="bg-rose-950/40 hover:bg-rose-950 text-rose-300 p-2 rounded transition border border-rose-900/30"
                title={t.logout}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setActivePage('login')}
              className="bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold px-4 py-2 rounded transition"
            >
              {t.login}
            </button>
          )}

        </div>
      </div>
    </header>
  );
};
