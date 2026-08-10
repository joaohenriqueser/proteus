/**
 * P.R.O.T.E.U.S. - Platform for Real-time Observation & Telemetry of Eutrophication in Urban Streams
 * Shared Controller & State Manager (Prototype Architecture)
 */

window.TieteApp = {
  STORAGE_KEY: 'proteus_telemetry_state',

  getDefaultState() {
    return {
      params: {
        ph: 7.2,
        turb: 8,
        od: 6.8,
        temp: 22.4
      },
      activeScenarioTag: '[MOCK] 1 · ÁGUA LIMPA',
      isLoopRunning: true,
      history: []
    };
  },

  loadState() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          params: { ...this.getDefaultState().params, ...parsed.params },
          activeScenarioTag: parsed.activeScenarioTag || '[MOCK] 1 · ÁGUA LIMPA',
          isLoopRunning: typeof parsed.isLoopRunning === 'boolean' ? parsed.isLoopRunning : true,
          history: Array.isArray(parsed.history) ? parsed.history : []
        };
      }
    } catch (e) {
      console.warn('Failed to load state from localStorage:', e);
    }
    return this.getDefaultState();
  },

  saveState(state) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        params: state.params,
        activeScenarioTag: state.activeScenarioTag,
        isLoopRunning: state.isLoopRunning,
        history: state.history.slice(0, 30)
      }));
    } catch (e) {
      console.warn('Failed to save state to localStorage:', e);
    }
  },

  initCommonUI() {
    document.documentElement.classList.add('dark');

    // Live Clock & Date Badge
    const liveClock = document.getElementById('liveClock');
    if (liveClock) {
      const updateClock = () => {
        const now = new Date();
        const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
        const timeStr = now.toLocaleTimeString('pt-BR');
        liveClock.textContent = `${dateStr} · ${timeStr}`;
      };
      updateClock();
      setInterval(updateClock, 1000);
    }

    // Active Sidebar Nav Link Highlight
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.sidebar-link').forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPath || (currentPath === '' && href === 'index.html')) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Mobile Hamburger Menu & Slide-out Drawer Controller
    this.initMobileMenu();

    if (window.lucide) {
      lucide.createIcons();
    }
  },

  initMobileMenu() {
    const btnToggle = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('mainSidebar');
    const backdrop = document.getElementById('mobileMenuBackdrop');
    const btnClose = document.getElementById('mobileMenuCloseBtn');

    if (!btnToggle || !sidebar) return;

    const openMenu = () => {
      sidebar.classList.remove('-translate-x-full');
      sidebar.classList.add('translate-x-0');
      if (backdrop) backdrop.classList.remove('hidden');
    };

    const closeMenu = () => {
      sidebar.classList.add('-translate-x-full');
      sidebar.classList.remove('translate-x-0');
      if (backdrop) backdrop.classList.add('hidden');
    };

    btnToggle.onclick = () => {
      if (sidebar.classList.contains('-translate-x-full')) {
        openMenu();
      } else {
        closeMenu();
      }
    };

    if (btnClose) btnClose.onclick = closeMenu;
    if (backdrop) backdrop.onclick = closeMenu;

    document.querySelectorAll('.sidebar-link').forEach(link => {
      link.addEventListener('click', closeMenu);
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.TieteApp.initCommonUI();
});
