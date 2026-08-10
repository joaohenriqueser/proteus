/**
 * P.R.O.T.E.U.S. - Live Telemetry Dashboard, Leaflet Map & Auto-Simulation Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  const app = window.TieteApp;
  const engine = window.IREEngine;
  if (!app || !engine) return;

  let state = app.loadState();
  let chartInstance = null;
  let mapInstance = null;
  let mapMarker = null;
  let mapHalo = null;
  let simIntervalId = null;

  const BARBOSA_COORDS = [-21.2662, -49.9482];

  // DOM Elements
  const ireValueDisplay = document.getElementById('ireValueDisplay');
  const ireProgressBar = document.getElementById('ireProgressBar');
  const statusLabelDisplay = document.getElementById('statusLabelDisplay');
  const statusDotDisplay = document.getElementById('statusDotDisplay');
  const diagSummaryText = document.getElementById('diagSummaryText');
  const scenarioTagDisplay = document.getElementById('scenarioTagDisplay');
  const lastReadTimestamp = document.getElementById('lastReadTimestamp');

  // Parameter Value & Note Displays
  const valPH = document.getElementById('valPH');
  const notePH = document.getElementById('notePH');
  const dotPH = document.getElementById('dotPH');

  const valTurb = document.getElementById('valTurb');
  const noteTurb = document.getElementById('noteTurb');
  const dotTurb = document.getElementById('dotTurb');

  const valOD = document.getElementById('valOD');
  const noteOD = document.getElementById('noteOD');
  const dotOD = document.getElementById('dotOD');

  const valTemp = document.getElementById('valTemp');
  const noteTemp = document.getElementById('noteTemp');
  const dotTemp = document.getElementById('dotTemp');

  // Footer & Log Elements
  const historyLogContainer = document.getElementById('historyLogContainer');
  const btnClearHistory = document.getElementById('btnClearHistory');
  const btnToggleTelemetry = document.getElementById('btnToggleTelemetry');
  const mapOverlayStatus = document.getElementById('mapOverlayStatus');

  /**
   * Color Palette Helper
   */
  function getStatusColor(code) {
    switch (code) {
      case 'CRITICO': return '#C55A54';
      case 'ALERTA': return '#C97A3C';
      case 'ATENCAO': return '#C9A03C';
      default: return '#3FA87A';
    }
  }

  /**
   * Render Dashboard Telemetry, Map & Cards
   */
  function renderDashboard() {
    const diag = engine.diagnose(state.params);
    const { ire, ireNum, subIndices, status } = diag;
    const colorHex = getStatusColor(status.code);

    // Hero IRE Score & Status
    if (ireValueDisplay) {
      ireValueDisplay.textContent = ire;
      ireValueDisplay.style.color = colorHex;
    }
    if (statusLabelDisplay) {
      statusLabelDisplay.textContent = status.title;
      statusLabelDisplay.style.color = colorHex;
    }
    if (statusDotDisplay) {
      statusDotDisplay.style.backgroundColor = colorHex;
    }
    if (ireProgressBar) {
      ireProgressBar.style.width = `${Math.min(100, Math.max(0, ireNum))}%`;
      ireProgressBar.style.backgroundColor = colorHex;
    }
    if (diagSummaryText) {
      diagSummaryText.textContent = status.message;
    }
    if (scenarioTagDisplay) {
      scenarioTagDisplay.textContent = state.activeScenarioTag || '[MOCK] 1 · ÁGUA LIMPA';
    }
    if (lastReadTimestamp) {
      const now = new Date();
      lastReadTimestamp.textContent = `${now.toLocaleTimeString('pt-BR')} [MOCK]`;
    }

    // Individual Parameters
    // 1. pH
    if (valPH) valPH.textContent = state.params.ph.toFixed(1);
    if (notePH) {
      if (state.params.ph >= 6.5 && state.params.ph <= 8.0) {
        notePH.textContent = 'Faixa neutra (CONAMA OK)';
        if (dotPH) dotPH.style.backgroundColor = '#3FA87A';
      } else if (state.params.ph > 8.5) {
        notePH.textContent = 'Alcalino / Floração Algal';
        if (dotPH) dotPH.style.backgroundColor = '#C97A3C';
      } else {
        notePH.textContent = 'Fora dos padrões';
        if (dotPH) dotPH.style.backgroundColor = '#C9A03C';
      }
    }

    // 2. Turbidez
    if (valTurb) valTurb.textContent = Math.round(state.params.turb);
    if (noteTurb) {
      if (state.params.turb <= 10) {
        noteTurb.textContent = 'Sólidos baixos (Excelente)';
        if (dotTurb) dotTurb.style.backgroundColor = '#3FA87A';
      } else if (state.params.turb > 100) {
        noteTurb.textContent = 'Acima do limite (>100 NTU)';
        if (dotTurb) dotTurb.style.backgroundColor = '#C55A54';
      } else {
        noteTurb.textContent = 'Aporte em elevação';
        if (dotTurb) dotTurb.style.backgroundColor = '#C9A03C';
      }
    }

    // 3. OD
    if (valOD) valOD.textContent = state.params.od.toFixed(1);
    if (noteOD) {
      if (state.params.od >= 5.0) {
        noteOD.textContent = 'Saturação adequada';
        if (dotOD) dotOD.style.backgroundColor = '#3FA87A';
      } else if (state.params.od < 2.0) {
        noteOD.textContent = 'Anóxico / Hipóxia Severa';
        if (dotOD) dotOD.style.backgroundColor = '#C55A54';
      } else {
        noteOD.textContent = 'Oxigênio em queda';
        if (dotOD) dotOD.style.backgroundColor = '#C9A03C';
      }
    }

    // 4. Temperatura
    if (valTemp) valTemp.textContent = state.params.temp.toFixed(1);
    if (noteTemp) {
      if (state.params.temp >= 25.0) {
        noteTemp.textContent = 'Estresse térmico (Ftemp 1.2)';
        if (dotTemp) dotTemp.style.backgroundColor = '#C97A3C';
      } else {
        noteTemp.textContent = 'Sazonal normal';
        if (dotTemp) dotTemp.style.backgroundColor = '#3FA87A';
      }
    }

    // Sync Map Marker & Circle Halo
    syncMap(colorHex, status.title);

    // Sync Chart & Log
    updateChart(ireNum, state.params.od);
    renderHistoryLog();
  }

  /**
   * Leaflet.js Map Controller
   */
  function initMap() {
    const mapContainer = document.getElementById('leafletMap');
    if (!mapContainer || mapInstance || !window.L) return;

    mapInstance = L.map(mapContainer, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false
    }).setView(BARBOSA_COORDS, 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap · © CARTO · TILES REAIS / DADOS MOCKADOS',
      maxZoom: 19
    }).addTo(mapInstance);

    const initialColor = getStatusColor('OTIMO');
    mapHalo = L.circle(BARBOSA_COORDS, {
      radius: 900,
      color: initialColor,
      weight: 1,
      fillColor: initialColor,
      fillOpacity: 0.12
    }).addTo(mapInstance);

    mapMarker = L.circleMarker(BARBOSA_COORDS, {
      radius: 6,
      color: initialColor,
      weight: 2,
      fillColor: '#020617',
      fillOpacity: 1
    }).addTo(mapInstance);

    mapMarker.bindPopup(`<b>Ponto de Coleta (SIMULADO) - Barbosa-SP</b><br>IRE 85.4 / 100 — ÓTIMO / ÁGUA BOA`);
    setTimeout(() => mapInstance.invalidateSize(), 200);
  }

  function syncMap(colorHex, statusTitle) {
    if (!mapInstance || !mapMarker || !mapHalo) return;
    mapHalo.setStyle({ color: colorHex, fillColor: colorHex });
    mapMarker.setStyle({ color: colorHex });
    mapMarker.setPopupContent(`<b>Ponto de Coleta (SIMULADO) - Barbosa-SP</b><br>IRE ${state.params.ph.toFixed(1)} — ${statusTitle}<br>${state.activeScenarioTag}`);
    if (mapOverlayStatus) {
      mapOverlayStatus.textContent = statusTitle;
      mapOverlayStatus.style.color = colorHex;
    }
  }

  /**
   * Chart.js Time-Series Dual Y-Axes
   */
  function initChart() {
    const ctx = document.getElementById('ireChart');
    if (!ctx || !window.Chart) return;

    const initialLabels = [];
    const initialIRE = [];
    const initialOD = [];

    if (Array.isArray(state.history) && state.history.length > 0) {
      const reversed = [...state.history].reverse().slice(-15);
      reversed.forEach(item => {
        initialLabels.push(item.timestamp || item.time || '');
        initialIRE.push(parseFloat(item.ire) || 85);
        const odVal = item.params ? item.params.od : parseFloat(item.od) || 6.8;
        initialOD.push(odVal);
      });
    }

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: initialLabels,
        datasets: [
          {
            label: 'IRE [MOCK]',
            data: initialIRE,
            borderColor: '#06B6D4',
            backgroundColor: 'rgba(6, 182, 212, 0.10)',
            borderWidth: 1.6,
            pointRadius: 2,
            pointBackgroundColor: '#06B6D4',
            tension: 0.3,
            fill: true,
            yAxisID: 'y'
          },
          {
            label: 'OD mg/L [MOCK]',
            data: initialOD,
            borderColor: '#2563EB',
            backgroundColor: 'transparent',
            borderWidth: 1.6,
            borderDash: [4, 4],
            pointRadius: 2,
            pointBackgroundColor: '#2563EB',
            tension: 0.3,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 320 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0F172A',
            borderColor: '#1E293B',
            borderWidth: 1,
            displayColors: true,
            titleColor: '#F8FAFC',
            bodyColor: '#94A3B8',
            padding: 8,
            cornerRadius: 3,
            titleFont: { family: "'IBM Plex Mono',monospace", size: 10 },
            bodyFont: { family: "'IBM Plex Mono',monospace", size: 10 }
          }
        },
        scales: {
          x: {
            grid: { color: '#111C31', drawTicks: false },
            border: { color: '#1E293B' },
            ticks: { color: '#475569', font: { family: "'IBM Plex Mono',monospace", size: 9 }, padding: 8 }
          },
          y: {
            min: 0,
            max: 100,
            position: 'left',
            grid: { color: '#111C31', drawTicks: false },
            border: { display: false },
            title: { display: true, text: 'IRE [MOCK]', color: '#475569', font: { family: "'IBM Plex Mono',monospace", size: 9 } },
            ticks: { color: '#475569', font: { family: "'IBM Plex Mono',monospace", size: 9 }, padding: 6, stepSize: 25 }
          },
          y1: {
            min: 0,
            max: 10,
            position: 'right',
            grid: { display: false },
            border: { display: false },
            title: { display: true, text: 'OD mg/L [MOCK]', color: '#475569', font: { family: "'IBM Plex Mono',monospace", size: 9 } },
            ticks: { color: '#475569', font: { family: "'IBM Plex Mono',monospace", size: 9 }, padding: 6, stepSize: 2.5 }
          }
        }
      }
    });
  }

  function updateChart(ireNum, od) {
    if (!chartInstance) return;
    const nowLabel = new Date().toLocaleTimeString('pt-BR');
    
    chartInstance.data.labels.push(nowLabel);
    chartInstance.data.datasets[0].data.push(ireNum);
    chartInstance.data.datasets[1].data.push(od);

    if (chartInstance.data.labels.length > 15) {
      chartInstance.data.labels.shift();
      chartInstance.data.datasets[0].data.shift();
      chartInstance.data.datasets[1].data.shift();
    }

    chartInstance.update();
  }

  /**
   * Log Stream Manager
   */
  function addHistoryLogEntry(params, diag) {
    const timeStr = new Date().toLocaleTimeString('pt-BR');
    const entry = {
      timestamp: timeStr,
      ire: diag.ire,
      status: diag.status,
      params: { ...params }
    };

    if (!Array.isArray(state.history)) {
      state.history = [];
    }

    state.history.unshift(entry);
    if (state.history.length > 25) state.history.pop();
    app.saveState(state);
  }

  function renderHistoryLog() {
    if (!historyLogContainer) return;
    if (!Array.isArray(state.history) || state.history.length === 0) {
      historyLogContainer.innerHTML = `<div class="text-xs text-slate-500 py-4 text-center font-mono font-medium">NENHUMA LEITURA REGISTRADA NO MOCK.</div>`;
      return;
    }

    historyLogContainer.innerHTML = state.history.map(item => {
      const time = item.timestamp || item.time || '--:--:--';
      const title = item.status ? item.status.title : 'LEITURA SIMULADA';
      const colorHex = item.status ? getStatusColor(item.status.code) : '#3FA87A';
      const ireVal = item.ire || '--';

      return `
        <div class="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono transition-all hover:border-slate-700">
          <div class="flex items-center gap-2">
            <span class="text-[11px] text-slate-500 font-medium">${time}</span>
            <span class="font-semibold text-[10px] px-1.5 py-0.5 rounded border" style="color: ${colorHex}; border-color: ${colorHex}40; background-color: ${colorHex}15">${title}</span>
          </div>
          <div class="font-bold text-white text-xs">
            IRE: <span style="color: ${colorHex}">${ireVal}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Auto-Simulation Step
   */
  function runSimulationStep() {
    let newPH = state.params.ph + (Math.random() * 0.4 - 0.2);
    newPH = Math.max(5.5, Math.min(10.0, newPH));

    let newTurb = state.params.turb + (Math.random() * 4 - 2);
    newTurb = Math.max(2, Math.min(140, newTurb));

    let newOD = state.params.od + (Math.random() * 0.3 - 0.15);
    newOD = Math.max(0.5, Math.min(10.0, newOD));

    let newTemp = state.params.temp + (Math.random() * 0.2 - 0.1);
    newTemp = Math.max(15, Math.min(32, newTemp));

    state.params = { ph: newPH, turb: newTurb, od: newOD, temp: newTemp };

    const diag = engine.diagnose(state.params);
    addHistoryLogEntry(state.params, diag);
    renderDashboard();
  }

  function startSimLoop() {
    if (simIntervalId) clearInterval(simIntervalId);
    simIntervalId = setInterval(runSimulationStep, 3000);
    state.isLoopRunning = true;
    if (btnToggleTelemetry) {
      btnToggleTelemetry.innerHTML = `<i data-lucide="pause" class="w-3 h-3"></i> <span>PAUSAR SIMULAÇÃO</span>`;
    }
    app.saveState(state);
    if (window.lucide) lucide.createIcons();
  }

  function stopSimLoop() {
    if (simIntervalId) clearInterval(simIntervalId);
    simIntervalId = null;
    state.isLoopRunning = false;
    if (btnToggleTelemetry) {
      btnToggleTelemetry.innerHTML = `<i data-lucide="play" class="w-3 h-3"></i> <span>REINICIAR SIMULAÇÃO</span>`;
    }
    app.saveState(state);
    if (window.lucide) lucide.createIcons();
  }

  // Preset Scenario Quick Buttons Function
  function applyPresetScenario(ph, turb, od, temp, tag) {
    state.params = { ph, turb, od, temp };
    state.activeScenarioTag = tag;
    app.saveState(state);
    renderDashboard();
  }

  // Bind Quick Buttons
  const sc1 = document.getElementById('btnQuickScenario1');
  const sc2 = document.getElementById('btnQuickScenario2');
  const sc3 = document.getElementById('btnQuickScenario3');
  const sc4 = document.getElementById('btnQuickScenario4');

  if (sc1) sc1.onclick = () => applyPresetScenario(7.2, 4.1, 8.6, 22.4, '[MOCK] 1 · ÁGUA LIMPA');
  if (sc2) sc2.onclick = () => applyPresetScenario(6.8, 128, 6.1, 24.1, '[MOCK] 2 · ENXURRADA');
  if (sc3) sc3.onclick = () => applyPresetScenario(9.1, 34, 5.2, 27.8, '[MOCK] 3 · ÁGUA VERDE');
  if (sc4) sc4.onclick = () => applyPresetScenario(6.2, 96, 1.1, 29.6, '[MOCK] 4 · CRÍTICO');

  // Action Buttons
  if (btnToggleTelemetry) {
    btnToggleTelemetry.onclick = () => {
      if (state.isLoopRunning && simIntervalId) {
        stopSimLoop();
      } else {
        runSimulationStep();
        startSimLoop();
      }
    };
  }

  if (btnClearHistory) {
    btnClearHistory.onclick = () => {
      state.history = [];
      app.saveState(state);
      renderHistoryLog();
      if (chartInstance) {
        chartInstance.data.labels = [];
        chartInstance.data.datasets[0].data = [];
        chartInstance.data.datasets[1].data = [];
        chartInstance.update();
      }
    };
  }

  // Boot & Initial Run
  initMap();
  initChart();
  renderDashboard();
  startSimLoop();
});
