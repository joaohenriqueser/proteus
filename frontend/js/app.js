/**
 * Tietê River Water Diagnostics - Main Application Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  if (window.lucide) {
    lucide.createIcons();
  }

  // State Management
  const state = {
    params: {
      ph: 7.2,
      turb: 8,
      od: 6.8,
      temp: 22.0
    },
    isLoopRunning: false,
    loopInterval: null,
    history: [], // [{ timestamp, ph, turb, od, temp, ire, status }]
    chart: null
  };

  // DOM Elements
  const inputPH = document.getElementById('inputPH');
  const inputTurb = document.getElementById('inputTurb');
  const inputOD = document.getElementById('inputOD');
  const inputTemp = document.getElementById('inputTemp');

  const valPHDisplay = document.getElementById('valPHDisplay');
  const valTurbDisplay = document.getElementById('valTurbDisplay');
  const valODDisplay = document.getElementById('valODDisplay');
  const valTempDisplay = document.getElementById('valTempDisplay');

  // Diagnostic Card Elements
  const mainDiagnosticCard = document.getElementById('mainDiagnosticCard');
  const diagBadge = document.getElementById('diagBadge');
  const diagIcon = document.getElementById('diagIcon');
  const diagStatusTitle = document.getElementById('diagStatusTitle');
  const ireValueDisplay = document.getElementById('ireValueDisplay');
  const ireProgressBar = document.getElementById('ireProgressBar');
  const diagMessageText = document.getElementById('diagMessageText');
  const diagConamaNote = document.getElementById('diagConamaNote');
  const iPonderadoDisplay = document.getElementById('iPonderadoDisplay');
  const fTempDisplay = document.getElementById('fTempDisplay');

  // Parameter Cards
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

  // Scenario Buttons
  const btnScenario1 = document.getElementById('btnScenario1');
  const btnScenario2 = document.getElementById('btnScenario2');
  const btnScenario3 = document.getElementById('btnScenario3');
  const btnScenario4 = document.getElementById('btnScenario4');

  // Simulation Controls
  const toggleSimLoop = document.getElementById('toggleSimLoop');
  const simToggleIcon = document.getElementById('simToggleIcon');
  const simToggleText = document.getElementById('simToggleText');
  const simLoopBadge = document.getElementById('simLoopBadge');
  const btnReset = document.getElementById('btnReset');

  // History & Accordion
  const historyLogContainer = document.getElementById('historyLogContainer');
  const btnClearHistory = document.getElementById('btnClearHistory');
  const toggleFormulaAccordion = document.getElementById('toggleFormulaAccordion');
  const formulaAccordionBody = document.getElementById('formulaAccordionBody');
  const accordionChevron = document.getElementById('accordionChevron');
  const liveClock = document.getElementById('liveClock');

  // Table Elements
  const tableValTurb = document.getElementById('tableValTurb');
  const tableRuleTurb = document.getElementById('tableRuleTurb');
  const tableSubTurb = document.getElementById('tableSubTurb');

  const tableValOD = document.getElementById('tableValOD');
  const tableRuleOD = document.getElementById('tableRuleOD');
  const tableSubOD = document.getElementById('tableSubOD');

  const tableValPH = document.getElementById('tableValPH');
  const tableRulePH = document.getElementById('tableRulePH');
  const tableSubPH = document.getElementById('tableSubPH');

  const tableValTemp = document.getElementById('tableValTemp');
  const tableRuleTemp = document.getElementById('tableRuleTemp');
  const tableSubTemp = document.getElementById('tableSubTemp');

  /**
   * Live Clock Handler
   */
  function startLiveClock() {
    function update() {
      const now = new Date();
      liveClock.textContent = now.toLocaleTimeString('pt-BR');
    }
    update();
    setInterval(update, 1000);
  }

  /**
   * Chart.js Initialization
   */
  function initChart() {
    const ctx = document.getElementById('ireChart').getContext('2d');
    
    // Gradient definitions
    const gradientIRE = ctx.createLinearGradient(0, 0, 0, 300);
    gradientIRE.addColorStop(0, 'rgba(14, 165, 233, 0.4)');
    gradientIRE.addColorStop(1, 'rgba(14, 165, 233, 0.0)');

    state.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Índice IRE',
            data: [],
            borderColor: '#38bdf8',
            backgroundColor: gradientIRE,
            fill: true,
            tension: 0.35,
            borderWidth: 3,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: '#38bdf8',
            yAxisID: 'y'
          },
          {
            label: 'Oxigênio Dissolvido (mg/L)',
            data: [],
            borderColor: '#22d3ee',
            borderDash: [4, 4],
            backgroundColor: 'transparent',
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: '#22d3ee',
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleFont: { family: 'Inter', size: 12 },
            bodyFont: { family: 'Inter', size: 11 },
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 10,
            displayColors: true
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            },
            ticks: {
              color: '#94a3b8',
              font: { family: 'Inter', size: 10 }
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            min: 0,
            max: 100,
            title: {
              display: true,
              text: 'Pontuação IRE (0-100)',
              color: '#38bdf8',
              font: { size: 10 }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            },
            ticks: {
              color: '#94a3b8',
              font: { family: 'Inter', size: 10 }
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            min: 0,
            max: 12,
            title: {
              display: true,
              text: 'OD (mg/L)',
              color: '#22d3ee',
              font: { size: 10 }
            },
            grid: {
              drawOnChartArea: false
            },
            ticks: {
              color: '#22d3ee',
              font: { family: 'Inter', size: 10 }
            }
          }
        }
      }
    });
  }

  /**
   * Main Calculation & UI Update Pipeline
   */
  function updateDashboard() {
    // 1. Run Diagnostic Engine
    const diag = window.IREEngine.diagnose(state.params);

    // 2. Update Input Display Values
    valPHDisplay.textContent = state.params.ph.toFixed(1);
    valTurbDisplay.textContent = `${Math.round(state.params.turb)} NTU`;
    valODDisplay.textContent = `${state.params.od.toFixed(1)} mg/L`;
    valTempDisplay.textContent = `${state.params.temp.toFixed(1)} °C`;

    // Make sure input ranges match state
    inputPH.value = state.params.ph;
    inputTurb.value = state.params.turb;
    inputOD.value = state.params.od;
    inputTemp.value = state.params.temp;

    // 3. Update Main Diagnostic Card
    ireValueDisplay.textContent = diag.ire;
    ireProgressBar.style.width = `${Math.min(100, Math.max(0, diag.ireNum))}%`;

    // Apply color theme to diagnostic card
    mainDiagnosticCard.className = `glass-panel rounded-2xl p-6 flex flex-col justify-between flex-grow transition-all duration-500 relative overflow-hidden ${diag.status.colorClass}`;
    
    // Badge & Text
    diagStatusTitle.textContent = diag.status.title;
    diagBadge.className = `px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${diag.status.badgeClass}`;
    diagMessageText.textContent = `"${diag.status.message}"`;
    
    // Icon refresh
    diagIcon.setAttribute('data-lucide', diag.status.iconName);
    
    // Footer notes
    iPonderadoDisplay.textContent = `${diag.iPonderado.toFixed(1)} pts`;
    fTempDisplay.textContent = diag.subIndices.fTemp === 1.2 ? '1.2 (Penalizado 25°C+)' : '1.0 (Normal)';

    // Dynamic color for progress bar inside diagnostic card
    ireProgressBar.style.backgroundColor = diag.status.accentColor;

    // 4. Update Parameter Grid Cards
    // Card 1: pH
    cardValPH.textContent = state.params.ph.toFixed(1);
    subPHVal.textContent = `${diag.subIndices.spH.toFixed(1)} / 100`;
    barPH.style.width = `${(state.params.ph / 14) * 100}%`;
    statusPHText.textContent = diag.paramEvaluations.ph.statusText;
    statusPHText.className = `font-semibold ${diag.paramEvaluations.ph.statusColor}`;

    // Card 2: Turbidez
    cardValTurb.innerHTML = `${Math.round(state.params.turb)} <span class="text-xs font-normal text-slate-400">NTU</span>`;
    subTurbVal.textContent = `${diag.subIndices.sTurb.toFixed(1)} / 100`;
    barTurb.style.width = `${Math.min(100, (state.params.turb / 150) * 100)}%`;
    statusTurbText.textContent = diag.paramEvaluations.turb.statusText;
    statusTurbText.className = `font-semibold ${diag.paramEvaluations.turb.statusColor}`;

    // Card 3: OD
    cardValOD.innerHTML = `${state.params.od.toFixed(1)} <span class="text-xs font-normal text-slate-400">mg/L</span>`;
    subODVal.textContent = `${diag.subIndices.sOD.toFixed(1)} / 100`;
    barOD.style.width = `${(state.params.od / 12) * 100}%`;
    statusODText.textContent = diag.paramEvaluations.od.statusText;
    statusODText.className = `font-semibold ${diag.paramEvaluations.od.statusColor}`;

    // Card 4: Temp
    cardValTemp.innerHTML = `${state.params.temp.toFixed(1)} <span class="text-xs font-normal text-slate-400">°C</span>`;
    subTempVal.textContent = diag.subIndices.fTemp === 1.2 ? 'x1.2 (Penalização Risco)' : 'x1.0 (Sem Penalização)';
    barTemp.style.width = `${(state.params.temp / 40) * 100}%`;
    statusTempText.textContent = diag.paramEvaluations.temp.statusText;
    statusTempText.className = `font-semibold ${diag.paramEvaluations.temp.statusColor}`;

    // 5. Update Mathematical Table
    tableValTurb.textContent = `${Math.round(state.params.turb)} NTU`;
    tableSubTurb.textContent = `${diag.subIndices.sTurb.toFixed(1)} / 100`;
    if (state.params.turb <= 10) {
      tableRuleTurb.textContent = 'Turb <= 10 -> S_turb = 100';
    } else if (state.params.turb <= 100) {
      tableRuleTurb.textContent = `100 - 0.89 * (${Math.round(state.params.turb)} - 10)`;
    } else {
      tableRuleTurb.textContent = 'Turb > 100 -> S_turb = 20';
    }

    tableValOD.textContent = `${state.params.od.toFixed(1)} mg/L`;
    tableSubOD.textContent = `${diag.subIndices.sOD.toFixed(1)} / 100`;
    if (state.params.od >= 5.0) {
      tableRuleOD.textContent = 'OD >= 5.0 -> S_OD = 100';
    } else if (state.params.od >= 2.0) {
      tableRuleOD.textContent = `20 * ${state.params.od.toFixed(1)}`;
    } else {
      tableRuleOD.textContent = 'OD < 2.0 -> S_OD = 0';
    }

    tableValPH.textContent = state.params.ph.toFixed(1);
    tableSubPH.textContent = `${diag.subIndices.spH.toFixed(1)} / 100`;
    if (state.params.ph >= 6.5 && state.params.ph <= 8.0) {
      tableRulePH.textContent = '6.5 <= pH <= 8.0 -> S_pH = 100';
    } else if (state.params.ph > 8.5) {
      tableRulePH.textContent = `100 - 30 * (${state.params.ph.toFixed(1)} - 8.5)`;
    } else if (state.params.ph < 6.0) {
      tableRulePH.textContent = `100 - 40 * (6.0 - ${state.params.ph.toFixed(1)})`;
    } else {
      tableRulePH.textContent = 'Faixa Intermediária -> S_pH = 100';
    }

    tableValTemp.textContent = `${state.params.temp.toFixed(1)} °C`;
    tableSubTemp.textContent = diag.subIndices.fTemp === 1.2 ? '1.2 (Ponderação)' : '1.0 (Normal)';
    tableRuleTemp.textContent = state.params.temp >= 25 ? 'Temp >= 25 °C -> F_temp = 1.2' : 'Temp < 25 °C -> F_temp = 1.0';

    // Re-render Lucide icons
    if (window.lucide) {
      lucide.createIcons();
    }
  }

  /**
   * Push Packet to History Log and Chart
   */
  function pushTelemetryRecord(isAuto = false) {
    const diag = window.IREEngine.diagnose(state.params);
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR');

    const record = {
      timestamp: timeStr,
      ph: state.params.ph.toFixed(1),
      turb: Math.round(state.params.turb),
      od: state.params.od.toFixed(1),
      temp: state.params.temp.toFixed(1),
      ire: diag.ire,
      status: diag.status
    };

    state.history.unshift(record);

    // Limit history to 30 entries
    if (state.history.length > 30) {
      state.history.pop();
    }

    // Update Chart
    if (state.chart) {
      state.chart.data.labels.push(timeStr);
      state.chart.data.datasets[0].data.push(diag.ireNum);
      state.chart.data.datasets[1].data.push(state.params.od);

      // Keep last 15 points on chart
      if (state.chart.data.labels.length > 15) {
        state.chart.data.labels.shift();
        state.chart.data.datasets[0].data.shift();
        state.chart.data.datasets[1].data.shift();
      }

      state.chart.update('none'); // Update without full redraw animation for smoothness
    }

    // Append to UI Log Stream
    renderHistoryLog();
  }

  /**
   * Render History Log Cards
   */
  function renderHistoryLog() {
    historyLogContainer.innerHTML = '';
    
    if (state.history.length === 0) {
      historyLogContainer.innerHTML = `
        <div class="text-center py-8 text-xs text-slate-500">
          Nenhuma leitura gravada ainda.
        </div>
      `;
      return;
    }

    state.history.forEach((rec, idx) => {
      const item = document.createElement('div');
      item.className = 'bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between text-xs transition-all hover:border-slate-700';
      item.innerHTML = `
        <div class="flex items-center gap-2.5">
          <span class="w-2 h-2 rounded-full" style="background-color: ${rec.status.textHex}"></span>
          <div>
            <div class="font-semibold text-slate-200">${rec.status.title}</div>
            <div class="text-[10px] text-slate-400 font-mono">
              pH: ${rec.ph} | Turb: ${rec.turb} | OD: ${rec.od} | ${rec.temp}°C
            </div>
          </div>
        </div>
        <div class="text-right">
          <div class="font-mono font-bold" style="color: ${rec.status.textHex}">IRE ${rec.ire}</div>
          <div class="text-[10px] text-slate-500 font-mono">${rec.timestamp}</div>
        </div>
      `;
      historyLogContainer.appendChild(item);
    });
  }

  /**
   * Set Preset Scenario
   */
  function setScenario(ph, turb, od, temp) {
    state.params.ph = ph;
    state.params.turb = turb;
    state.params.od = od;
    state.params.temp = temp;

    updateDashboard();
    pushTelemetryRecord();
  }

  /**
   * Continuous Telemetry Loop Engine (ESP32 Noise Generator)
   */
  function toggleSimulationLoop() {
    state.isLoopRunning = !state.isLoopRunning;

    if (state.isLoopRunning) {
      simToggleIcon.setAttribute('data-lucide', 'square');
      simToggleText.textContent = 'Parar Simulação (3s)';
      toggleSimLoop.className = 'px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-lg shadow-rose-900/30';
      simLoopBadge.classList.remove('hidden');
      simLoopBadge.classList.add('flex');

      // Start 3s interval loop
      state.loopInterval = setInterval(() => {
        // Add small stochastic fluctuations simulating IoT sensors
        const deltaPH = (Math.random() - 0.5) * 0.15;
        const deltaTurb = (Math.random() - 0.5) * 3.0;
        const deltaOD = (Math.random() - 0.5) * 0.2;
        const deltaTemp = (Math.random() - 0.5) * 0.2;

        state.params.ph = Math.min(14, Math.max(0, parseFloat((state.params.ph + deltaPH).toFixed(1))));
        state.params.turb = Math.min(150, Math.max(0, Math.round(state.params.turb + deltaTurb)));
        state.params.od = Math.min(12, Math.max(0, parseFloat((state.params.od + deltaOD).toFixed(1))));
        state.params.temp = Math.min(40, Math.max(10, parseFloat((state.params.temp + deltaTemp).toFixed(1))));

        updateDashboard();
        pushTelemetryRecord(true);
      }, 3000);

    } else {
      clearInterval(state.loopInterval);
      state.loopInterval = null;

      simToggleIcon.setAttribute('data-lucide', 'play');
      simToggleText.textContent = 'Simular Leitura Contínua (3s)';
      toggleSimLoop.className = 'px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-lg shadow-sky-900/30';
      simLoopBadge.classList.add('hidden');
      simLoopBadge.classList.remove('flex');
    }

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  /**
   * Event Listener Bindings
   */
  function bindEvents() {
    // Sliders
    inputPH.addEventListener('input', (e) => {
      state.params.ph = parseFloat(e.target.value);
      updateDashboard();
      pushTelemetryRecord();
    });

    inputTurb.addEventListener('input', (e) => {
      state.params.turb = parseFloat(e.target.value);
      updateDashboard();
      pushTelemetryRecord();
    });

    inputOD.addEventListener('input', (e) => {
      state.params.od = parseFloat(e.target.value);
      updateDashboard();
      pushTelemetryRecord();
    });

    inputTemp.addEventListener('input', (e) => {
      state.params.temp = parseFloat(e.target.value);
      updateDashboard();
      pushTelemetryRecord();
    });

    // Preset Scenario Buttons
    btnScenario1.addEventListener('click', () => setScenario(7.2, 8, 6.8, 22.0));
    btnScenario2.addEventListener('click', () => setScenario(7.5, 55, 5.2, 24.0));
    btnScenario3.addEventListener('click', () => setScenario(8.9, 85, 6.1, 27.0));
    btnScenario4.addEventListener('click', () => setScenario(9.1, 120, 1.5, 28.0));

    // Simulation Toggle
    toggleSimLoop.addEventListener('click', toggleSimulationLoop);

    // Reset Button
    btnReset.addEventListener('click', () => {
      if (state.isLoopRunning) {
        toggleSimulationLoop();
      }
      setScenario(7.2, 8, 6.8, 22.0);
    });

    // Clear History
    btnClearHistory.addEventListener('click', () => {
      state.history = [];
      if (state.chart) {
        state.chart.data.labels = [];
        state.chart.data.datasets[0].data = [];
        state.chart.data.datasets[1].data = [];
        state.chart.update();
      }
      renderHistoryLog();
    });

    // Accordion Toggle
    toggleFormulaAccordion.addEventListener('click', () => {
      formulaAccordionBody.classList.toggle('hidden');
      accordionChevron.classList.toggle('rotate-180');
    });
  }

  /**
   * Boot Application
   */
  function boot() {
    startLiveClock();
    initChart();
    bindEvents();
    updateDashboard();

    // Add initial record to history and chart
    pushTelemetryRecord();
  }

  boot();
});
