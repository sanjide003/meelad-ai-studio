// MeeladPulse Responsive Navigation Engine
import { auth, db } from "./firebase-init.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


const ADMIN_TEXT_TRANSLATIONS = {
  'Portal': 'പോർട്ടൽ',
  'Admin': 'അഡ്മിൻ',
  'Selected Institution': 'തിരഞ്ഞെടുത്ത സ്ഥാപനം',
  'Admin Portal': 'അഡ്മിൻ പോർട്ടൽ',
  'Dashboard': 'ഡാഷ്ബോർഡ്',
  'Setup': 'സജ്ജീകരണം',
  'Students': 'വിദ്യാർത്ഥികൾ',
  'People & Access': 'ഉപയോക്താക്കളും ആക്സസും',
  'Judging': 'വിധിനിർണ്ണയം',
  'Results': 'ഫലങ്ങൾ',
  'Reports & Certificates': 'റിപ്പോർട്ടുകളും സർട്ടിഫിക്കറ്റുകളും',
  'Reports': 'റിപ്പോർട്ടുകൾ',
  'Certificates': 'സർട്ടിഫിക്കറ്റുകൾ',
  'My Account': 'എന്റെ അക്കൗണ്ട്',
  'Accounts': 'അക്കൗണ്ടുകൾ',
  'Invitations': 'ക്ഷണങ്ങൾ',
  'Workspace locked': 'സ്ഥാപനത്തിലേക്ക് ലോക്ക് ചെയ്തു',
  'Sign Out': 'സൈൻ ഔട്ട്',
  'Public Links & Account': 'പബ്ലിക് ലിങ്കുകളും അക്കൗണ്ടും',
  'Invite User': 'ഉപയോക്താവിനെ ക്ഷണിക്കുക',
  'Manage setup, people, judging, results, publishing, and official outputs from one workspace.': 'സജ്ജീകരണം, ആളുകൾ, വിധിനിർണ്ണയം, ഫലങ്ങൾ, പ്രസിദ്ധീകരണം, ഔദ്യോഗിക ഔട്ട്പുട്ടുകൾ എന്നിവ ഒരൊറ്റ വർക്ക്‌സ്‌പേസിൽ നിയന്ത്രിക്കുക.',
  'Command Center': 'കമാൻഡ് സെന്റർ',
  'Start with the setup checklist': 'സജ്ജീകരണ ചെക്ക്ലിസ്റ്റിൽ നിന്ന് ആരംഭിക്കുക',
  'The dashboard shows what must be completed before judges can enter marks and results can be published.': 'ജഡ്ജിമാർക്ക് മാർക്ക് നൽകാനും ഫലങ്ങൾ പ്രസിദ്ധീകരിക്കാനും മുമ്പ് പൂർത്തിയാക്കേണ്ട കാര്യങ്ങൾ ഡാഷ്ബോർഡ് കാണിക്കുന്നു.',
  'Needs Review': 'പരിശോധന വേണം',
  'Validate before publishing': 'പ്രസിദ്ധീകരിക്കുന്നതിന് മുമ്പ് പരിശോധിക്കുക',
  'Review submitted marks, tie-breaks, and pending sheets before approving public results.': 'പബ്ലിക് ഫലങ്ങൾ അംഗീകരിക്കുന്നതിന് മുമ്പ് സമർപ്പിച്ച മാർക്കുകൾ, ടൈ-ബ്രേക്കുകൾ, പെൻഡിംഗ് ഷീറ്റുകൾ എന്നിവ പരിശോധിക്കുക.',
  'Official Outputs': 'ഔദ്യോഗിക ഔട്ട്പുട്ടുകൾ',
  'Generate documents after approval': 'അംഗീകാരത്തിന് ശേഷം ഡോക്യുമെന്റുകൾ സൃഷ്ടിക്കുക',
  'Use reports, certificates, ID cards, and backups once the data is verified.': 'ഡാറ്റ സ്ഥിരീകരിച്ച ശേഷം റിപ്പോർട്ടുകൾ, സർട്ടിഫിക്കറ്റുകൾ, ഐഡി കാർഡുകൾ, ബാക്കപ്പുകൾ എന്നിവ ഉപയോഗിക്കുക.',
  'Registered Users': 'രജിസ്റ്റർ ചെയ്ത ഉപയോക്താക്കൾ',
  'Pending Invites': 'പെൻഡിംഗ് ക്ഷണങ്ങൾ',
  'Active Teams': 'സജീവ ടീമുകൾ',
  'Competitions': 'മത്സരങ്ങൾ',
  'Setup Checklist': 'സജ്ജീകരണ ചെക്ക്ലിസ്റ്റ്',
  'Festival Readiness': 'ഫെസ്റ്റിവൽ തയ്യാറെടുപ്പ്',
  'Complete these steps in order before opening judging and publishing official results.': 'വിധിനിർണ്ണയം തുറക്കുന്നതിനും ഔദ്യോഗിക ഫലങ്ങൾ പ്രസിദ്ധീകരിക്കുന്നതിനും മുമ്പ് ഈ ഘട്ടങ്ങൾ ക്രമത്തിൽ പൂർത്തിയാക്കുക.',
  'Workspace locked to this institution': 'വർക്ക്‌സ്‌പേസ് ഈ സ്ഥാപനത്തിലേക്ക് ലോക്ക് ചെയ്തിരിക്കുന്നു',
  'Step 01': 'ഘട്ടം 01',
  'Step 02': 'ഘട്ടം 02',
  'Master Setup': 'മാസ്റ്റർ സെറ്റപ്പ്',
  'Team Management': 'ടീം മാനേജ്മെന്റ്',
  'Confirm festival profile, venue, registration mode, and public visibility settings.': 'ഫെസ്റ്റിവൽ പ്രൊഫൈൽ, വേദി, രജിസ്ട്രേഷൻ മോഡ്, പബ്ലിക് വിസിബിലിറ്റി ക്രമീകരണങ്ങൾ സ്ഥിരീകരിക്കുക.',
  'Create team groups and confirm team identifiers before registering students.': 'വിദ്യാർത്ഥികളെ രജിസ്റ്റർ ചെയ്യുന്നതിന് മുമ്പ് ടീം ഗ്രൂപ്പുകളും ടീം ഐഡന്റിഫയറുകളും സ്ഥിരീകരിക്കുക.',
  'Next step: complete this section, review warnings, and continue through the admin lifecycle from setup to publishing.': 'അടുത്ത ഘട്ടം: ഈ വിഭാഗം പൂർത്തിയാക്കി മുന്നറിയിപ്പുകൾ പരിശോധിച്ച് സജ്ജീകരണത്തിൽ നിന്ന് പ്രസിദ്ധീകരണം വരെ അഡ്മിൻ ലൈഫ്‌സൈക്കിൾ തുടരുക.',
  'All Students': 'എല്ലാ വിദ്യാർത്ഥികളും',
  'Add Student': 'വിദ്യാർത്ഥിയെ ചേർക്കുക',
  'Student Review': 'വിദ്യാർത്ഥി പരിശോധന',
  'ID Cards': 'ഐഡി കാർഡുകൾ',
  'Divisions': 'ഡിവിഷനുകൾ',
  'Subdivisions': 'സബ്‌ഡിവിഷനുകൾ',
  'Categories': 'വിഭാഗങ്ങൾ',
  'Competition Rules': 'മത്സര നിയമങ്ങൾ',
  'Grade Rules': 'ഗ്രേഡ് നിയമങ്ങൾ',
  'Point Rules': 'പോയിന്റ് നിയമങ്ങൾ',
  'Tie-Break Rules': 'ടൈ-ബ്രേക്ക് നിയമങ്ങൾ',
  'Judges': 'ജഡ്ജിമാർ',
  'Judge Assignments': 'ജഡ്ജ് അസൈൻമെന്റുകൾ',
  'Mark Sheets Monitor': 'മാർക്ക് ഷീറ്റ് മോണിറ്റർ',
  'Submitted Marks': 'സമർപ്പിച്ച മാർക്കുകൾ',
  'Mark Review': 'മാർക്ക് പരിശോധന',
  'Provisional Results': 'പ്രൊവിഷണൽ ഫലങ്ങൾ',
  'Result Review': 'ഫലം പരിശോധന',
  'Publish Results': 'ഫലങ്ങൾ പ്രസിദ്ധീകരിക്കുക',
  'Published Results': 'പ്രസിദ്ധീകരിച്ച ഫലങ്ങൾ',
  'Publishing Board': 'പ്രസിദ്ധീകരണ ബോർഡ്',
  'Announcements': 'അറിയിപ്പുകൾ',
  'Public Data Diagnostics': 'പബ്ലിക് ഡാറ്റ ഡയഗ്നോസ്റ്റിക്സ്',
  'System': 'സിസ്റ്റം',
  'Recalculation': 'വീണ്ടും കണക്കാക്കൽ',
  'Logical Controls': 'ലോജിക്കൽ നിയന്ത്രണങ്ങൾ',
  'Backup & Restore': 'ബാക്കപ്പ് & റിസ്റ്റോർ',
  'Active Festival': 'സജീവ ഫെസ്റ്റിവൽ',
  'Account Summary': 'അക്കൗണ്ട് സംഗ്രഹം',
  'Institution workspace': 'സ്ഥാപന വർക്ക്‌സ്‌പേസ്',
  'Workspace Snapshot': 'വർക്ക്‌സ്‌പേസ് സംഗ്രഹം',
  'Quick Stats': 'ദ്രുത കണക്കുകൾ',
  'Setup Progress': 'സജ്ജീകരണ പുരോഗതി',
  'Progress': 'പുരോഗതി',
  'Start with setup': 'സജ്ജീകരണത്തിൽ നിന്ന് ആരംഭിക്കുക',
  'Complete setup before opening judging and publishing results.': 'വിധിനിർണ്ണയവും ഫലപ്രസിദ്ധീകരണവും തുറക്കുന്നതിന് മുമ്പ് സജ്ജീകരണം പൂർത്തിയാക്കുക.',
  'Generate outputs after approval': 'അംഗീകാരത്തിന് ശേഷം ഔട്ട്പുട്ടുകൾ സൃഷ്ടിക്കുക',
  'Public Links': 'പബ്ലിക് ലിങ്കുകൾ',
  'Portal Links': 'പോർട്ടൽ ലിങ്കുകൾ',
  'Copy Public Result Link': 'പബ്ലിക് ഫലം ലിങ്ക് കോപ്പി ചെയ്യുക',
  'My Account & Public Links': 'എന്റെ അക്കൗണ്ടും പബ്ലിക് ലിങ്കുകളും',
  'Update admin login and copy portal links.': 'അഡ്മിൻ ലോഗിൻ അപ്ഡേറ്റ് ചെയ്ത് പോർട്ടൽ ലിങ്കുകൾ കോപ്പി ചെയ്യുക.',
  'Mark Monitor': 'മാർക്ക് മോണിറ്റർ',
  'Track judging and missing sheets.': 'വിധിനിർണ്ണയവും നഷ്ടമായ ഷീറ്റുകളും ട്രാക്ക് ചെയ്യുക.',
  'Protect data before major changes.': 'പ്രധാന മാറ്റങ്ങൾക്ക് മുമ്പ് ഡാറ്റ സംരക്ഷിക്കുക.',
  'Role': 'റോൾ',
  'Festival': 'ഫെസ്റ്റിവൽ',
  'Workspace': 'വർക്ക്‌സ്‌പേസ്',
  'Scoped': 'സ്കോപ്പ് ചെയ്തു',
  'Setup Needed': 'സജ്ജീകരണം വേണം',
  'Manage setup, people, judging, results, publishing, account access, and public links from one professional workspace.': 'സജ്ജീകരണം, ആളുകൾ, വിധിനിർണ്ണയം, ഫലങ്ങൾ, പ്രസിദ്ധീകരണം, അക്കൗണ്ട് ആക്സസ്, പബ്ലിക് ലിങ്കുകൾ എന്നിവ ഒരൊറ്റ പ്രൊഫഷണൽ വർക്ക്‌സ്‌പേസിൽ നിയന്ത്രിക്കുക.',
};

const ADMIN_REVERSE_TEXT_TRANSLATIONS = Object.fromEntries(
  Object.entries(ADMIN_TEXT_TRANSLATIONS).map(([english, malayalam]) => [malayalam, english])
);

export function applyAdminTranslations(root = document, lang = localStorage.getItem('meeladpulse_lang') || 'en') {
  const normalizedLang = lang === 'ml' ? 'ml' : 'en';
  const doc = root.nodeType === 9 ? root : root.ownerDocument || document;
  if (doc.documentElement) doc.documentElement.lang = normalizedLang;
  const scope = root.nodeType === 9 ? root.body : root;
  if (!scope) return;
  const map = normalizedLang === 'ml' ? ADMIN_TEXT_TRANSLATIONS : ADMIN_REVERSE_TEXT_TRANSLATIONS;
  const filterApi = doc.defaultView?.NodeFilter || window.NodeFilter;
  const walker = doc.createTreeWalker(scope, filterApi.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue?.trim()) return filterApi.FILTER_REJECT;
      const parent = node.parentElement;
      if (parent?.closest('script,style,textarea,input,option')) return filterApi.FILTER_REJECT;
      if (parent?.classList?.contains('selected-festival-title')) return filterApi.FILTER_REJECT;
      if (parent?.classList?.contains('user-profile-name')) return filterApi.FILTER_REJECT;
      return filterApi.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const original = node.nodeValue;
    const trimmed = original.trim();
    const translated = map[trimmed];
    if (translated) node.nodeValue = original.replace(trimmed, translated);
  });
}

function setupLanguageSwitcher(root = document) {
  const langEnBtn = root.getElementById?.('lang-btn-en');
  const langMlBtn = root.getElementById?.('lang-btn-ml');
  let currentLang = localStorage.getItem('meeladpulse_lang') || 'en';
  const updateLangButtons = () => {
    if (!langEnBtn || !langMlBtn) return;
    if (currentLang === 'ml') {
      langMlBtn.className = "px-2 py-1 text-[10px] font-extrabold rounded-lg bg-indigo-600 text-white transition cursor-pointer";
      langEnBtn.className = "px-2 py-1 text-[10px] font-extrabold rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer";
    } else {
      langEnBtn.className = "px-2 py-1 text-[10px] font-extrabold rounded-lg bg-indigo-600 text-white transition cursor-pointer";
      langMlBtn.className = "px-2 py-1 text-[10px] font-extrabold rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer";
    }
  };
  const setLanguage = (lang) => {
    currentLang = lang === 'ml' ? 'ml' : 'en';
    localStorage.setItem('meeladpulse_lang', currentLang);
    applyAdminTranslations(document, currentLang);
    const frameDoc = document.getElementById('admin-content-frame')?.contentDocument;
    if (frameDoc) applyAdminTranslations(frameDoc, currentLang);
    updateLangButtons();
    window.dispatchEvent(new CustomEvent('meelad_language_changed', { detail: currentLang }));
  };
  updateLangButtons();
  applyAdminTranslations(document, currentLang);
  if (langEnBtn && langMlBtn && langEnBtn.dataset.langBound !== '1') {
    langEnBtn.dataset.langBound = '1';
    langMlBtn.dataset.langBound = '1';
    langEnBtn.addEventListener('click', () => setLanguage('en'));
    langMlBtn.addEventListener('click', () => setLanguage('ml'));
  }
}

if (typeof window !== 'undefined') {
  window.meeladPulseApplyAdminTranslations = applyAdminTranslations;
}

function appUrl(path) {
  return new URL(path.replace(/^\//, ""), new URL(/* @vite-ignore */ "../../", import.meta.url)).href;
}


function applyAdminPageGuidance() {
  if (!window.location.pathname.includes('/admin/')) return;
  if (document.querySelector('[data-admin-guidance="auto"]')) return;
  const page = window.location.pathname.split('/').pop();
  const guidance = {
    'festival-settings.html': ['Master Setup', 'Configure institution, festival, modes, sections, and categories before registrations.', 'Setup'],
    'participating.html': ['Participating', 'Manage admin, team leader, and public registration entry modes.', 'Setup'],
    'teams.html': ['Team Management', 'Create teams, chest-number series, leaders, and team logins before registering students.', 'Setup'],
    'divisions.html': ['Divisions', 'Define the main competition divisions used for eligibility and reporting.', 'Setup'],
    'subdivisions.html': ['Subdivisions', 'Refine divisions into smaller groups when your festival rules require it.', 'Setup'],
    'categories.html': ['Categories', 'Create category groups used for competition eligibility and result grouping.', 'Setup'],
    'students.html': ['Students', 'Register, search, and manage student records for the selected festival.', 'Students'],
    'student-review.html': ['Student Review', 'Review pending student registration data before it becomes official.', 'Students'],
    'account-settings.html': ['My Account', 'Update the primary admin login and copy public portal links safely.', 'People & Access'],
    'users.html': ['Accounts', 'Manage administrators, judges, and portal users with the correct access level.', 'People & Access'],
    'user-invitations.html': ['Invitations', 'Invite new users with the right role before they access the portal.', 'People & Access'],
    'judges.html': ['Judges', 'Create and verify judge profiles before assigning competitions.', 'People & Access'],
    'judge-assignments.html': ['Judge Assignments', 'Assign verified judges to competitions and control mark sheet access.', 'People & Access'],
    'mark-monitor.html': ['Mark Sheets Monitor', 'Track mark entry progress and identify missing or returned submissions.', 'Judging'],
    'submitted-marks.html': ['Submitted Marks', 'Review submitted mark sheets before result approval.', 'Judging'],
    'mark-review.html': ['Mark Review', 'Verify scoring differences, missing criteria, and judge submissions.', 'Judging'],
    'result-review.html': ['Result Review', 'Approve, hold, or recalculate results before public publishing.', 'Results'],
    'result-publish.html': ['Publish Results', 'Publish approved results only after validation is complete.', 'Results'],
    'published-results.html': ['Published Results', 'Review public result versions and correction history.', 'Results'],
    'reports.html': ['Reports', 'Generate official summaries, exports, and printable records.', 'Reports & Certificates'],
    'certificates.html': ['Certificates', 'Generate certificates after winners and official results are finalized.', 'Reports & Certificates'],
    'recalculation.html': ['Recalculation', 'Recalculate rankings carefully after confirming rules and backups.', 'System'],
    'backup-restore.html': ['Backup & Restore', 'Protect festival data before high-impact maintenance actions.', 'System']
  };
  const item = guidance[page];
  if (!item) return;
  const main = document.querySelector('main');
  if (!main) return;
  const panel = document.createElement('section');
  panel.className = 'admin-guidance-card mb-5 border-l-4 border-l-emerald-500';
  panel.dataset.adminGuidance = 'auto';
  panel.innerHTML = `<div class="flex flex-col md:flex-row md:items-center justify-between gap-3"><div><span class="status-badge status-badge-info">${item[2]}</span><h1 class="text-xl font-extrabold text-slate-900 mt-3 font-display">${item[0]}</h1><p class="text-xs text-slate-500 mt-1 leading-relaxed">${item[1]}</p></div><p class="text-[11px] text-slate-500 max-w-sm">Next step: complete this section, review warnings, and continue through the admin lifecycle from setup to publishing.</p></div>`;
  main.prepend(panel);
}


function enhanceAdminResponsiveExperience() {
  if (!window.location.pathname.includes('/admin/')) return;
  const noticeId = 'admin-responsive-advisory';
  const render = () => {
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    let notice = document.getElementById(noticeId);
    if (isDesktop) {
      notice?.remove();
      return;
    }
    if (!notice) {
      notice = document.createElement('div');
      notice.id = noticeId;
      notice.className = 'admin-responsive-advisory';
      notice.innerHTML = `<span class="status-badge status-badge-info">Desktop Friendly</span><p>This admin workspace is designed for desktop screens, but it remains available on this device. Use landscape mode for large tables and reports.</p><button type="button" aria-label="Dismiss responsive advisory">×</button>`;
      notice.querySelector('button')?.addEventListener('click', () => notice.remove());
      document.body.appendChild(notice);
    }
  };
  render();
  window.addEventListener('resize', render);
}


function enhanceAdminEmptyStates() {
  if (!window.location.pathname.includes('/admin/')) return;
  document.querySelectorAll('tbody').forEach((tbody) => {
    if (tbody.dataset.emptyStateEnhanced === '1') return;
    const onlyRow = tbody.querySelector('tr:only-child');
    const onlyCell = onlyRow?.querySelector('td[colspan]');
    if (!onlyCell) return;
    const text = onlyCell.textContent?.trim() || '';
    if (!/no |not found|empty|failed|loading/i.test(text)) return;
    onlyCell.classList.add('admin-empty-state-cell');
    tbody.dataset.emptyStateEnhanced = '1';
  });
}


function hydrateMobileAdminMenu() {
  const mobileNavMenu = document.getElementById('mobile-dropdown-menu');
  const sidebar = document.getElementById('portal-sidebar');
  if (!mobileNavMenu || !sidebar) return;
  const sidebarLinks = Array.from(sidebar.querySelectorAll('a.nav-link-item'));
  if (!sidebarLinks.length) return;
  const linkHtml = sidebarLinks.map((link) => {
    const href = link.getAttribute('href') || '#';
    const label = link.textContent.trim().replace(/\s+/g, ' ');
    const svg = link.querySelector('svg')?.outerHTML || '';
    return `<a href="${href}" class="nav-link-item flex items-center py-2 px-3 hover:bg-slate-50 rounded-lg">${svg}<span>${label}</span></a>`;
  }).join('');
  mobileNavMenu.innerHTML = `
    <div class="p-3 space-y-2 max-h-[70vh] overflow-y-auto">${linkHtml}</div>
    <div class="p-3 bg-slate-50">
      <button class="logout-action-btn w-full text-left font-semibold text-rose-600 flex items-center py-2 px-3 hover:bg-rose-50 rounded-lg cursor-pointer">
        <span>Sign Out</span>
      </button>
    </div>`;
}

export function initializeNavigation() {
  hydrateMobileAdminMenu();
  // 1. Mobile Hamburger Menu Setup
  const hamburgerBtn = document.getElementById('mobile-hamburger-btn');
  const mobileNavMenu = document.getElementById('mobile-dropdown-menu');

  if (hamburgerBtn && mobileNavMenu) {
    hamburgerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = hamburgerBtn.getAttribute('aria-expanded') === 'true';
      setMenuState(!isExpanded);
    });

    // Close when clicking any nav links inside the menu
    const navLinks = mobileNavMenu.querySelectorAll('a');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        setMenuState(false);
      });
    });

    // Close on Escape key press
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        setMenuState(false);
      }
    });

    // Prevent close-on-click inside menu content
    mobileNavMenu.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Clicking anywhere else closes the mobile menu
    document.addEventListener('click', () => {
      setMenuState(false);
    });
  }

  function setMenuState(open) {
    if (!hamburgerBtn || !mobileNavMenu) return;
    
    if (open) {
      hamburgerBtn.setAttribute('aria-expanded', 'true');
      mobileNavMenu.classList.remove('max-h-0', 'opacity-0', 'pointer-events-none');
      mobileNavMenu.classList.add('max-h-[85vh]', 'opacity-100');
    } else {
      hamburgerBtn.setAttribute('aria-expanded', 'false');
      mobileNavMenu.classList.add('max-h-0', 'opacity-0', 'pointer-events-none');
      mobileNavMenu.classList.remove('max-h-[85vh]', 'opacity-100');
    }
  }

  // 2. Active Page Highlighting & Accordion expansion
  const currentPath = window.location.pathname;
  const allNavLinks = document.querySelectorAll('.nav-link-item');

  allNavLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;

    const hrefPath = new URL(href, window.location.href).pathname;
    if (currentPath === hrefPath || currentPath.endsWith(hrefPath.split('/').pop())) {
      link.classList.remove('text-slate-400', 'text-slate-500', 'text-slate-600');
      link.classList.add('bg-emerald-100', 'text-emerald-800', 'font-extrabold', 'shadow-sm', 'admin-active-tab');
      link.setAttribute('aria-current', 'page');
      
      // Auto expand parent group if it exists
      const parentGroup = link.closest('.nav-group-content');
      if (parentGroup) {
        parentGroup.classList.remove('hidden');
        const trigger = document.querySelector(`[aria-controls="${parentGroup.id}"]`);
        if (trigger) {
          trigger.setAttribute('aria-expanded', 'true');
          trigger.classList.add('bg-emerald-50', 'text-emerald-800', 'font-bold');
          trigger.setAttribute('aria-current', 'section');
          localStorage.setItem(`meeladpulse_nav_${parentGroup.id}`, 'open');
        }
      }
    }
  });

  // 3. Dropdown Expanders (Sidebar groups)
  const groupTriggers = document.querySelectorAll('.nav-group-trigger');
  groupTriggers.forEach(trigger => {
    const targetId = trigger.getAttribute('aria-controls');
    const target = document.getElementById(targetId);
    if (!targetId || !target) return;

    if (localStorage.getItem(`meeladpulse_nav_${targetId}`) === 'open') {
      target.classList.remove('hidden');
      trigger.setAttribute('aria-expanded', 'true');
    }

    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
      const nextOpen = !isExpanded;
      trigger.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
      target.classList.toggle('hidden', !nextOpen);
      localStorage.setItem(`meeladpulse_nav_${targetId}`, nextOpen ? 'open' : 'closed');
    });
  });


  // 4. Fast internal navigation: keep static multi-page routing, but avoid loader flicker and warm the next page.
  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

    let url;
    try {
      url = new URL(href, window.location.href);
    } catch (_) {
      return;
    }

    if (url.origin !== window.location.origin || !url.pathname.endsWith('.html')) return;

    link.addEventListener('pointerenter', () => {
      if (document.head.querySelector(`link[rel="prefetch"][href="${url.href}"]`)) return;
      const prefetch = document.createElement('link');
      prefetch.rel = 'prefetch';
      prefetch.href = url.href;
      document.head.appendChild(prefetch);
    }, { once: true });

    link.addEventListener('click', () => {
      sessionStorage.setItem('meeladpulse_fast_nav', '1');
    });
  });

  // 5. Update dynamic user profile information
  updateProfileDetails();

  // 6. Add consistent admin page purpose guidance where pages do not already provide it.
  applyAdminPageGuidance();

  // 7. Admin is desktop-friendly while remaining usable on smaller devices.
  enhanceAdminResponsiveExperience();

  // 8. Improve common admin table empty/loading states without touching page logic.
  enhanceAdminEmptyStates();

  // 9. Keep the admin shell language switcher in sync without requiring a reload.
  setupLanguageSwitcher(document);

  // 10. Logout Listener Bindings
  const logoutBtns = document.querySelectorAll('.logout-action-btn');
  logoutBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await signOut(auth);
        sessionStorage.removeItem('meeladpulse_manual_user');
        localStorage.removeItem('meeladpulse_selected_fest_id');
        localStorage.removeItem('meeladpulse_selected_institution_id');
        localStorage.removeItem('meeladpulse_selected_fest_title');
        window.location.replace(appUrl('login.html'));
      } catch (err) {
        console.error("Sign out process error:", err);
      }
    });
  });
}

function updateProfileDetails() {
  const profile = window.currentUserProfile;
  if (!profile) return;

  // Render profile name
  document.querySelectorAll('.user-profile-name').forEach(el => {
    el.textContent = profile.name || 'User Account';
  });

  // Render profile role display
  const rolesMap = {
    admin: 'Head Administrator',
    judge: 'Panel Judge Chief',
    teamLeader: 'Team Leader'
  };
  document.querySelectorAll('.user-profile-role').forEach(el => {
    let text = rolesMap[profile.role] || profile.role;
    if (profile.role === 'teamLeader' && profile.teamId) {
      text += ` (${profile.teamId})`;
    }
    el.textContent = text;
  });

  // Render festival name
  const festTitle = localStorage.getItem('meeladpulse_selected_fest_title') || 'No Festival Selected';
  document.querySelectorAll('.selected-festival-title').forEach(el => {
    el.textContent = festTitle;
  });
}

/**
 * Initializes Public Header & Footer layouts dynamically and configures interactions.
 */
export async function initializePublicNavigation() {
  const headerContainer = document.getElementById('public-header');
  const footerContainer = document.getElementById('public-footer');

  // Load components dynamically if containers exist
  if (headerContainer) {
    try {
      const res = await fetch(appUrl('components/public-header.html'));
      if (res.ok) {
        headerContainer.innerHTML = await res.text();
      }
    } catch (err) {
      console.error("Failed to load public-header component:", err);
    }
  }

  if (footerContainer) {
    try {
      const res = await fetch(appUrl('components/public-footer.html'));
      if (res.ok) {
        footerContainer.innerHTML = await res.text();
      }
    } catch (err) {
      console.error("Failed to load public-footer component:", err);
    }
  }

  // Active Page Highlighting for Public Links
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('#public-header a[data-nav], #public-mobile-menu a[data-nav]');
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && (currentPath === href || currentPath.endsWith(href) || (href !== 'index.html' && href !== '../index.html' && currentPath.includes(href.replace('.html', ''))))) {
      link.classList.add('bg-indigo-50/70', 'text-indigo-600');
      link.classList.remove('text-slate-500', 'text-slate-600');
    }
  });

  // Dynamic Festival Branding Setup
  const festId = localStorage.getItem('meeladpulse_selected_fest_id') || 'FEST_2026_CORE';
  let festTitle = localStorage.getItem('meeladpulse_selected_fest_title') || '';
  
  if (!festTitle && db) {
    try {
      const docSnap = await getDoc(doc(db, window.meeladPulseScopedFestivalPath()));
      if (docSnap.exists()) {
        const data = docSnap.data();
        festTitle = data.title || data.name || 'MeeladPulse';
        localStorage.setItem('meeladpulse_selected_fest_title', festTitle);
      }
    } catch (e) {
      console.warn("Could not load festival branding in navigation:", e);
    }
  }
  
  if (festTitle) {
    const titleEl = document.getElementById('header-fest-title');
    if (titleEl) titleEl.textContent = festTitle;
  }

  // Desktop Results Dropdown Toggle logic
  const dropdownBtn = document.getElementById('results-dropdown-btn');
  const dropdownMenu = document.getElementById('results-dropdown-menu');
  
  if (dropdownBtn && dropdownMenu) {
    dropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
      dropdownMenu.classList.add('hidden');
    });
  }

  // Mobile Menu Downward Push Toggle logic
  const mobBtn = document.getElementById('public-mobile-menu-btn');
  const mobMenu = document.getElementById('public-mobile-menu');
  
  if (mobBtn && mobMenu) {
    mobBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      mobMenu.classList.toggle('hidden');
    });

    // Close when clicking link inside
    mobMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobMenu.classList.add('hidden');
      });
    });

    // Close on Escape key press
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        mobMenu.classList.add('hidden');
      }
    });

    // Prevent closing when clicking menu content
    mobMenu.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Click outside closes menu
    document.addEventListener('click', () => {
      mobMenu.classList.add('hidden');
    });
  }

  // Language Switcher state and interactions
  const langEnBtn = document.getElementById('lang-btn-en');
  const langMlBtn = document.getElementById('lang-btn-ml');
  let currentLang = localStorage.getItem('meeladpulse_lang') || 'en';
  document.documentElement.lang = currentLang === 'ml' ? 'ml' : 'en';

  function updateLangButtons() {
    if (!langEnBtn || !langMlBtn) return;
    if (currentLang === 'ml') {
      langMlBtn.className = "px-2 py-1 text-[10px] font-extrabold rounded-lg bg-indigo-600 text-white transition cursor-pointer";
      langEnBtn.className = "px-2 py-1 text-[10px] font-extrabold rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer";
    } else {
      langEnBtn.className = "px-2 py-1 text-[10px] font-extrabold rounded-lg bg-indigo-600 text-white transition cursor-pointer";
      langMlBtn.className = "px-2 py-1 text-[10px] font-extrabold rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer";
    }
  }

  updateLangButtons();

  if (langEnBtn && langMlBtn) {
    langEnBtn.addEventListener('click', () => {
      if (currentLang !== 'en') {
        currentLang = 'en';
        localStorage.setItem('meeladpulse_lang', 'en');
        document.documentElement.lang = 'en';
        updateLangButtons();
        applyAdminTranslations(document, 'en');
        window.dispatchEvent(new CustomEvent('meelad_language_changed', { detail: 'en' }));
      }
    });

    langMlBtn.addEventListener('click', () => {
      if (currentLang !== 'ml') {
        currentLang = 'ml';
        localStorage.setItem('meeladpulse_lang', 'ml');
        document.documentElement.lang = 'ml';
        updateLangButtons();
        applyAdminTranslations(document, 'ml');
        window.dispatchEvent(new CustomEvent('meelad_language_changed', { detail: 'ml' }));
      }
    });
  }
}

