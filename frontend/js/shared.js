/**
 * P.R.O.T.E.U.S. - Platform for Real-time Observation & Telemetry of Eutrophication in Urban Streams
 * Shared Controller & State Manager (Prototype Architecture)
 */

window.TieteApp = {
  STORAGE_KEY: 'proteus_telemetry_state',
  API_BASE_URL: 'http://localhost:3000/api',

  async fetchStationsFromAPI() {
    try {
      const response = await fetch(`${this.API_BASE_URL}/estacoes`);
      if (response.ok) {
        const json = await response.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          return json.data;
        }
      }
    } catch (e) {
      console.log('Backend API offline ou indisponível. Usando estações locais.', e.message);
    }
    return null;
  },

  async sendTelemetryToAPI(reading) {
    try {
      await fetch(`${this.API_BASE_URL}/telemetria`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estacao_codigo: reading.stationId || 'BRB-04',
          ph: reading.ph,
          turb: reading.turb,
          od: reading.od,
          temp: reading.temp,
          ire: reading.ire,
          nivel_risco: reading.nivel_risco || reading.statusTitle,
          cenario_tag: reading.scenarioTag
        })
      });
    } catch (e) {
      // Ignora silenciosamente se a API estática estiver offline
    }
  },

  getDefaultStations() {
    return [
      {
        id: 'BRB-04',
        name: 'BRB-04 · Barbosa-SP',
        river: 'Rio Tietê · Barbosa-SP',
        coords: [-21.2662, -49.9482],
        params: { ph: 7.2, turb: 4.0, od: 8.6, temp: 22.4 },
        scenarioTag: '[MOCK] ÁGUA IDEAL'
      },
      {
        id: 'PNP-02',
        name: 'PNP-02 · Penápolis-SP',
        river: 'Res. Nova Avanhandava · Penápolis-SP',
        coords: [-21.4285, -50.0775],
        params: { ph: 8.4, turb: 48.0, od: 3.8, temp: 26.5 },
        scenarioTag: '[MOCK] ÁGUA REGULAR'
      },
      {
        id: 'ARÇ-01',
        name: 'ARÇ-01 · Araçatuba-SP',
        river: 'Rio Tietê · Araçatuba (Jupiá)',
        coords: [-21.2089, -50.4402],
        params: { ph: 9.2, turb: 120.0, od: 1.1, temp: 29.5 },
        scenarioTag: '[MOCK] ÁGUA RUIM / CRÍTICA'
      }
    ];
  },

  getDefaultState() {
    const defaultStations = this.getDefaultStations();
    return {
      params: { ...defaultStations[0].params },
      activeScenarioTag: defaultStations[0].scenarioTag,
      isLoopRunning: true,
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
        return {
          params: { ...this.getDefaultState().params, ...parsed.params },
          activeScenarioTag: parsed.activeScenarioTag || '[MOCK] ÁGUA IDEAL',
          isLoopRunning: typeof parsed.isLoopRunning === 'boolean' ? parsed.isLoopRunning : true,
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
        history: state.history.slice(0, 30),
        stations: state.stations,
        activeStationId: state.activeStationId
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
