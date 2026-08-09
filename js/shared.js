/**
 * P.R.O.T.E.U.S. - Platform for Real-time Observation & Telemetry of Eutrophication in Urban Streams
 * Shared Controller & State Manager (Dark Mode Only)
 * Idealizadores: Cauã Cristal Lemes & João Henrique Servellati Bitencourt Lemos
 * IFSP Campus Birigui - Orientador: Dr. Rogério Pinto Alexandre
 */

window.TieteApp = {
  STORAGE_KEY: 'proteus_telemetry_state',

  /**
   * Default initial telemetry state
   */
  getDefaultState() {
    return {
      params: {
        ph: 7.2,
        turb: 8,
        od: 6.8,
        temp: 22.0
      },
      isLoopRunning: true, // Auto-start telemetry by default
      history: []
    };
  },

  /**
   * Load state from localStorage or default
   */
  loadState() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          params: { ...this.getDefaultState().params, ...parsed.params },
          isLoopRunning: typeof parsed.isLoopRunning === 'boolean' ? parsed.isLoopRunning : true,
          history: Array.isArray(parsed.history) ? parsed.history : []
        };
      }
    } catch (e) {
      console.warn('Failed to load state from localStorage:', e);
    }
    return this.getDefaultState();
  },

  /**
   * Save state to localStorage
   */
  saveState(state) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        params: state.params,
        isLoopRunning: state.isLoopRunning,
        history: state.history.slice(0, 30) // Keep last 30 entries
      }));
    } catch (e) {
      console.warn('Failed to save state to localStorage:', e);
    }
  },

  /**
   * Initialize Common UI & Enforce Dark Mode
   */
  initCommonUI() {
    // Always enforce Dark Mode
    document.documentElement.classList.add('dark');

    // Live Clock (Dedicated clock element on index.html)
    const liveClock = document.getElementById('liveClock');
    if (liveClock) {
      const updateClock = () => {
        const now = new Date();
        liveClock.textContent = now.toLocaleTimeString('pt-BR');
      };
      updateClock();
      setInterval(updateClock, 1000);
    }

    // Active Nav Link Highlight
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPath || (currentPath === '' && href === 'index.html')) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Initialize Lucide Icons
    if (window.lucide) {
      lucide.createIcons();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.TieteApp.initCommonUI();
});
