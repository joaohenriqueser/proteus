/**
 * P.R.O.T.E.U.S. - Live Telemetry Dashboard & Auto-Simulation Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  const app = window.TieteApp;
  const engine = window.IREEngine;
  if (!app || !engine) return;

  let state = app.loadState();
  let chartInstance = null;
  let simIntervalId = null;

  // DOM Elements
  const ireValueDisplay = document.getElementById('ireValueDisplay');
  const ireProgressBar = document.getElementById('ireProgressBar');
  const diagBadge = document.getElementById('diagBadge');
  const diagIcon = document.getElementById('diagIcon');
  const diagStatusTitle = document.getElementById('diagStatusTitle');
  const diagMessageText = document.getElementById('diagMessageText');
  const diagConamaNote = document.getElementById('diagConamaNote');
  const mainDiagnosticCard = document.getElementById('mainDiagnosticCard');

  const iPonderadoDisplay = document.getElementById('iPonderadoDisplay');
  const fTempDisplay = document.getElementById('fTempDisplay');

  // Individual Cards
  const cardValPH = document.getElementById('cardValPH');
  const subPHVal = document.getElementById('subPHVal');
  const barPH = document.getElementById('barPH');
  const statusPHText = document.getElementById('statusPHText');

  const cardValTurb = document.getElementById('cardValTurb');
  const subTurbVal = document.getElementById('subTurbVal');
  const barTurb = document.getElementById('barTurb');
  const statusTurbText = document.getElementById('statusTurbText');

  const cardValOD = document.getElementById('cardValOD');
  const subODVal = document.getElementById('subODVal');
  const barOD = document.getElementById('barOD');
  const statusODText = document.getElementById('statusODText');

  const cardValTemp = document.getElementById('cardValTemp');
  const subTempVal = document.getElementById('subTempVal');
  const barTemp = document.getElementById('barTemp');
  const statusTempText = document.getElementById('statusTempText');

  const historyLogContainer = document.getElementById('historyLogContainer');
  const btnClearHistory = document.getElementById('btnClearHistory');
  const btnToggleTelemetry = document.getElementById('btnToggleTelemetry');

  /**
   * Render Dashboard Telemetry & Diagnosis
   */
  function renderDashboard() {
    const diag = engine.diagnose(state.params);
    const { ire, ireNum, subIndices, iPonderado, status } = diag;

    // Big IRE Score Display
    if (ireValueDisplay) ireValueDisplay.textContent = ire;
    if (ireProgressBar) {
      ireProgressBar.style.width = `${Math.min(100, Math.max(0, ireNum))}%`;
      ireProgressBar.style.backgroundColor = status.accentColor || '#10b981';
    }

    // Status Badge & Message
    if (diagBadge) {
      diagBadge.className = `px-3.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-sm ${status.badgeClass}`;
    }
    if (diagIcon) diagIcon.setAttribute('data-lucide', status.iconName || 'check-circle-2');
    if (diagStatusTitle) diagStatusTitle.textContent = status.title;
    if (diagMessageText) diagMessageText.textContent = `"${status.message}"`;
    if (diagConamaNote) diagConamaNote.textContent = status.conamaNote;

    // Card Main Background Class
    if (mainDiagnosticCard) {
      mainDiagnosticCard.className = `glass-panel p-6 transition-all duration-300 w-full space-y-4 ${status.colorClass}`;
    }

    // Secondary Metrics
    if (iPonderadoDisplay) iPonderadoDisplay.textContent = `${iPonderado.toFixed(1)} pts`;
    if (fTempDisplay) fTempDisplay.textContent = `${subIndices.fTemp === 1.2 ? '1.2 (Penalizado)' : '1.0 (Normal)'}`;

    // Parameter 1: pH
    if (cardValPH) cardValPH.textContent = state.params.ph.toFixed(1);
    if (subPHVal) subPHVal.textContent = `${subIndices.spH.toFixed(1)} / 100`;
    if (barPH) barPH.style.width = `${(state.params.ph / 14) * 100}%`;
    if (statusPHText) {
      if (state.params.ph >= 6.5 && state.params.ph <= 8.0) {
        statusPHText.textContent = 'Faixa Ideal (6.5 - 8.0)';
        statusPHText.className = 'font-bold text-emerald-400';
      } else if (state.params.ph > 8.5) {
        statusPHText.textContent = 'Alcalino / Floração Algal (>8.5)';
        statusPHText.className = 'font-bold text-rose-400';
      } else {
        statusPHText.textContent = 'Fora dos padrões CONAMA';
        statusPHText.className = 'font-bold text-amber-400';
      }
    }

    // Parameter 2: Turbidez
    if (cardValTurb) cardValTurb.innerHTML = `${Math.round(state.params.turb)} <span class="text-xs font-normal opacity-70">NTU</span>`;
    if (subTurbVal) subTurbVal.textContent = `${subIndices.sTurb.toFixed(1)} / 100`;
    if (barTurb) barTurb.style.width = `${Math.min((state.params.turb / 150) * 100, 100)}%`;
    if (statusTurbText) {
      if (state.params.turb <= 10) {
        statusTurbText.textContent = 'Excelente (<=10 NTU)';
        statusTurbText.className = 'font-bold text-emerald-400';
      } else if (state.params.turb > 100) {
        statusTurbText.textContent = 'Crítico (>100 NTU)';
        statusTurbText.className = 'font-bold text-rose-400';
      } else {
        statusTurbText.textContent = 'Moderado (CONAMA <=100)';
        statusTurbText.className = 'font-bold text-amber-400';
      }
    }

    // Parameter 3: OD
    if (cardValOD) cardValOD.innerHTML = `${state.params.od.toFixed(1)} <span class="text-xs font-normal opacity-70">mg/L</span>`;
    if (subODVal) subODVal.textContent = `${subIndices.sOD.toFixed(1)} / 100`;
    if (barOD) barOD.style.width = `${Math.min((state.params.od / 12) * 100, 100)}%`;
    if (statusODText) {
      if (state.params.od >= 5.0) {
        statusODText.textContent = 'Ótimo (>=5.0 mg/L)';
        statusODText.className = 'font-bold text-emerald-400';
      } else if (state.params.od < 2.0) {
        statusODText.textContent = 'Anoxia / Colapso (<2.0 mg/L)';
        statusODText.className = 'font-bold text-rose-400';
      } else {
        statusODText.textContent = 'Atenção (<5.0 mg/L)';
        statusODText.className = 'font-bold text-amber-400';
      }
    }

    // Parameter 4: Temperatura
    if (cardValTemp) cardValTemp.innerHTML = `${state.params.temp.toFixed(1)} <span class="text-xs font-normal opacity-70">°C</span>`;
    if (subTempVal) subTempVal.textContent = subIndices.fTemp === 1.2 ? '1.2 (Penalizado)' : '1.0 (Normal)';
    if (barTemp) barTemp.style.width = `${Math.min(((state.params.temp - 10) / 30) * 100, 100)}%`;
    if (statusTempText) {
      if (state.params.temp >= 25.0) {
        statusTempText.textContent = 'Alerta Térmico (>=25°C)';
        statusTempText.className = 'font-bold text-rose-400';
      } else {
        statusTempText.textContent = 'Ameno (<25°C)';
        statusTempText.className = 'font-bold text-emerald-400';
      }
    }

    if (window.lucide) lucide.createIcons();
    updateChart(diag.ireNum, state.params.od);
    renderHistoryLog();
  }

  /**
   * Initialize Chart.js
   */
  function initChart() {
    const ctx = document.getElementById('ireChart');
    if (!ctx) return;

    // Pre-fill chart with existing history from state if available
    const initialLabels = [];
    const initialIRE = [];
    const initialOD = [];

    if (Array.isArray(state.history) && state.history.length > 0) {
      const reversed = [...state.history].reverse().slice(-15);
      reversed.forEach(item => {
        initialLabels.push(item.timestamp || item.time || '');
        initialIRE.push(parseFloat(item.ire) || 85);
        const odVal = item.params ? item.params.od : parseFloat(item.od) || 6.8;
        initialOD.push(odVal * 10);
      });
    }

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: initialLabels,
        datasets: [
          {
            label: 'Índice IRE',
            data: initialIRE,
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            fill: true,
            tension: 0.3,
            borderWidth: 2.5,
            pointRadius: 3
          },
          {
            label: 'Oxigênio (OD mg/L)',
            data: initialOD,
            borderColor: '#06b6d4',
            backgroundColor: 'transparent',
            borderDash: [4, 4],
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: '#0f172a',
            borderColor: '#334155',
            borderWidth: 1,
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1'
          }
        },
        scales: {
          x: {
            grid: { color: '#1e293b' },
            ticks: { color: '#94a3b8', font: { size: 10 } }
          },
          y: {
            min: 0,
            max: 100,
            grid: { color: '#1e293b' },
            ticks: { color: '#94a3b8', font: { size: 10 } }
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
    chartInstance.data.datasets[1].data.push(od * 10); // Scaled for comparison

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
      historyLogContainer.innerHTML = `<div class="text-xs text-slate-500 py-4 text-center">Nenhuma leitura registrada.</div>`;
      return;
    }

    historyLogContainer.innerHTML = state.history.map(item => {
      const time = item.timestamp || item.time || '--:--:--';
      const title = item.status ? item.status.title : 'LEITURA TELEMETRIA';
      const badgeClass = item.status ? item.status.badgeClass : 'text-emerald-400';
      const ireVal = item.ire || '--';

      return `
        <div class="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs transition-all hover:border-slate-700">
          <div class="flex items-center gap-2">
            <span class="font-mono text-[11px] text-slate-400 font-bold">${time}</span>
            <span class="font-bold text-[11px] ${badgeClass} px-2 py-0.5 rounded border">${title}</span>
          </div>
          <div class="font-mono font-bold text-white text-xs">
            IRE: ${ireVal}
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Real-time Simulation Engine Loop (3s Interval)
   */
  function runSimulationStep() {
    // Generate realistic IoT telemetry fluctuations
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
      btnToggleTelemetry.innerHTML = `<i data-lucide="pause" class="w-3.5 h-3.5"></i> <span>Pausar Telemetria</span>`;
    }
    app.saveState(state);
    if (window.lucide) lucide.createIcons();
  }

  function stopSimLoop() {
    if (simIntervalId) clearInterval(simIntervalId);
    simIntervalId = null;
    state.isLoopRunning = false;
    if (btnToggleTelemetry) {
      btnToggleTelemetry.innerHTML = `<i data-lucide="play" class="w-3.5 h-3.5"></i> <span>Atualizar / Iniciar</span>`;
    }
    app.saveState(state);
    if (window.lucide) lucide.createIcons();
  }

  // Telemetry Toggle Button on index.html
  if (btnToggleTelemetry) {
    btnToggleTelemetry.onclick = () => {
      if (state.isLoopRunning && simIntervalId) {
        stopSimLoop();
      } else {
        runSimulationStep(); // Immediate reading
        startSimLoop();
      }
    };
  }

  // Clear History Button
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
  initChart();
  renderDashboard();
  startSimLoop(); // AUTO START LIVE TELEMETRY SIMULATION IMMEDIATELY!
});
