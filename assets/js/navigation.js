// MeeladPulse Responsive Navigation Engine
import { auth, db } from "./firebase-init.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function appUrl(path) {
  return new URL(path.replace(/^\//, ""), new URL(/* @vite-ignore */ "../../", import.meta.url)).href;
}


function applyAdminPageGuidance() {
  if (!window.location.pathname.includes('/admin/')) return;
  if (document.querySelector('[data-admin-guidance="auto"]')) return;
  const page = window.location.pathname.split('/').pop();
  const guidance = {
    'festival-settings.html': ['Festival Settings', 'Confirm the active festival profile, registration rules, and public visibility before creating competitions.', 'Setup'],
    'teams.html': ['Teams', 'Create and maintain team groups before registering students.', 'Setup'],
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

export function initializeNavigation() {
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

  // 6. Logout Listener Bindings
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
        window.dispatchEvent(new CustomEvent('meelad_language_changed', { detail: 'en' }));
        location.reload(); // Reload to translate everything perfectly
      }
    });

    langMlBtn.addEventListener('click', () => {
      if (currentLang !== 'ml') {
        currentLang = 'ml';
        localStorage.setItem('meeladpulse_lang', 'ml');
        document.documentElement.lang = 'ml';
        updateLangButtons();
        window.dispatchEvent(new CustomEvent('meelad_language_changed', { detail: 'ml' }));
        location.reload(); // Reload to translate everything perfectly
      }
    });
  }
}

