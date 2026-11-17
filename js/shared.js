/**
 * P.R.O.T.E.U.S. - Platform for Real-time Observation & Telemetry of Eutrophication in Urban Streams
 * Shared Controller & State Manager (Prototype Architecture)
 */

window.TieteApp = {
  STORAGE_KEY: 'proteus_telemetry_state_v2',

  getDefaultStations() {
    return [
      {
        id: 'BRB-04',
        name: 'BRB-04 · Barbosa-SP',
        river: 'Rio Tietê · Barbosa-SP',
        coords: [-21.2662, -49.9482],
        params: { ph: 7.2, turb: 4.0, temp: 22.4 },
        scenarioTag: 'Água Boa'
      },
      {
        id: 'PNP-02',
        name: 'PNP-02 · Penápolis-SP',
        river: 'Res. Nova Avanhandava · Penápolis-SP',
        coords: [-21.4285, -50.0775],
        params: { ph: 8.4, turb: 48.0, temp: 26.5 },
        scenarioTag: 'Água Regular'
      },
      {
        id: 'ARÇ-01',
        name: 'ARÇ-01 · Araçatuba-SP',
        river: 'Rio Tietê · Araçatuba (Jupiá)',
        coords: [-21.2089, -50.4402],
        params: { ph: 9.2, turb: 120.0, temp: 29.5 },
        scenarioTag: 'Água Crítica'
      }
    ];
  },

  getDefaultState() {
    const defaultStations = this.getDefaultStations();
    return {
      params: { ...defaultStations[0].params },
      activeScenarioTag: defaultStations[0].scenarioTag,
      isLoopRunning: false,
      history: [],
      stations: defaultStations,
      activeStationId: 'BRB-04'
    };
  },

  loadState() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.params && parsed.params.od !== undefined) delete parsed.params.od;
        if (Array.isArray(parsed.stations)) parsed.stations.forEach(s => { if (s.params) delete s.params.od; });
        if (Array.isArray(parsed.history)) parsed.history.forEach(h => { if (h.params) delete h.params.od; });
        return {
          params: { ...this.getDefaultState().params, ...parsed.params },
          activeScenarioTag: parsed.activeScenarioTag || 'Água Boa',
          isLoopRunning: false,
          history: Array.isArray(parsed.history) ? parsed.history : [],
          stations: Array.isArray(parsed.stations) && parsed.stations.length > 0 ? parsed.stations : this.getDefaultStations(),
          activeStationId: parsed.activeStationId || 'BRB-04'
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
        history: (state.history || []).slice(0, 200),
        stations: state.stations,
        activeStationId: state.activeStationId
      }));
    } catch (e) {
      console.warn('Failed to save state to localStorage:', e);
    }
  },

  initCommonUI() {
    document.documentElement.classList.remove('dark');

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
