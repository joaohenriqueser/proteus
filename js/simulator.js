/**
 * Tietê BioMonitor IoT - Simulator Controller (simulador.html)
 */

document.addEventListener('DOMContentLoaded', () => {
  const state = window.TieteApp.loadState();
  let loopInterval = null;

  // DOM Elements
  const inputPH = document.getElementById('inputPH');
  const inputTurb = document.getElementById('inputTurb');
  const inputOD = document.getElementById('inputOD');
  const inputTemp = document.getElementById('inputTemp');

  const valPHDisplay = document.getElementById('valPHDisplay');
  const valTurbDisplay = document.getElementById('valTurbDisplay');
  const valODDisplay = document.getElementById('valODDisplay');
  const valTempDisplay = document.getElementById('valTempDisplay');

  // Preview Diagnostic Card Elements
  const previewDiagnosticCard = document.getElementById('previewDiagnosticCard');
  const previewBadge = document.getElementById('previewBadge');
  const previewIcon = document.getElementById('previewIcon');
  const previewStatusTitle = document.getElementById('previewStatusTitle');
  const previewIREValue = document.getElementById('previewIREValue');
  const previewProgressBar = document.getElementById('previewProgressBar');
  const previewMessageText = document.getElementById('previewMessageText');

  // Scenario Buttons
  const btnScenario1 = document.getElementById('btnScenario1');
  const btnScenario2 = document.getElementById('btnScenario2');
  const btnScenario3 = document.getElementById('btnScenario3');
  const btnScenario4 = document.getElementById('btnScenario4');

  // Loop Controls & Actions
  const toggleSimLoop = document.getElementById('toggleSimLoop');
  const simToggleIcon = document.getElementById('simToggleIcon');
  const simToggleText = document.getElementById('simToggleText');
  const simLoopBadge = document.getElementById('simLoopBadge');
  const btnReset = document.getElementById('btnReset');
  const btnApplyToDashboard = document.getElementById('btnApplyToDashboard');
  const toastNotification = document.getElementById('toastNotification');

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
   * Main Simulator Update Render
   */
  function updateSimulatorUI() {
    const diag = window.IREEngine.diagnose(state.params);

    // 1. Sliders & Text Displays
    inputPH.value = state.params.ph;
    inputTurb.value = state.params.turb;
    inputOD.value = state.params.od;
    inputTemp.value = state.params.temp;

    valPHDisplay.textContent = state.params.ph.toFixed(1);
    valTurbDisplay.textContent = `${Math.round(state.params.turb)} NTU`;
    valODDisplay.textContent = `${state.params.od.toFixed(1)} mg/L`;
    valTempDisplay.textContent = `${state.params.temp.toFixed(1)} °C`;

    // 2. Preview Diagnostic Card
    previewIREValue.textContent = diag.ire;
    previewProgressBar.style.width = `${Math.min(100, Math.max(0, diag.ireNum))}%`;
    previewProgressBar.style.backgroundColor = diag.status.accentColor;
    previewDiagnosticCard.className = `glass-panel rounded-2xl p-6 flex flex-col justify-between flex-grow transition-all duration-500 relative overflow-hidden ${diag.status.colorClass}`;

    previewStatusTitle.textContent = diag.status.title;
    previewBadge.className = `px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${diag.status.badgeClass}`;
    previewMessageText.textContent = `"${diag.status.message}"`;

    if (previewIcon) {
      previewIcon.setAttribute('data-lucide', diag.status.iconName);
    }

    // 3. Mathematical Breakdown Table
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
    tableSubTemp.textContent = diag.subIndices.fTemp === 1.2 ? '1.2 (Ponderado)' : '1.0 (Normal)';
    tableRuleTemp.textContent = state.params.temp >= 25 ? 'Temp >= 25 °C -> F_temp = 1.2' : 'Temp < 25 °C -> F_temp = 1.0';

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  /**
   * Save Telemetry Record
   */
  function pushRecord() {
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
      status: diag.status,
      params: { ...state.params }
    };

    if (!Array.isArray(state.history)) {
      state.history = [];
    }

    state.history.unshift(record);
    if (state.history.length > 30) {
      state.history.pop();
    }

    window.TieteApp.saveState(state);
  }

  /**
   * Set Scenario Preset
   */
  function setScenario(ph, turb, od, temp) {
    state.params.ph = ph;
    state.params.turb = turb;
    state.params.od = od;
    state.params.temp = temp;

    updateSimulatorUI();
    pushRecord();
    showToast('Cenário aplicado com sucesso!');
  }

  /**
   * Continuous Simulation Loop Toggle
   */
  function toggleLoop() {
    state.isLoopRunning = !state.isLoopRunning;

    if (state.isLoopRunning) {
      simToggleIcon.setAttribute('data-lucide', 'square');
      simToggleText.textContent = 'Parar Simulação Contínua';
      toggleSimLoop.className = 'px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-lg shadow-rose-900/30';
      simLoopBadge.classList.remove('hidden');
      simLoopBadge.classList.add('flex');

      loopInterval = setInterval(() => {
        const deltaPH = (Math.random() - 0.5) * 0.15;
        const deltaTurb = (Math.random() - 0.5) * 3.0;
        const deltaOD = (Math.random() - 0.5) * 0.2;
        const deltaTemp = (Math.random() - 0.5) * 0.2;

        state.params.ph = Math.min(14, Math.max(0, parseFloat((state.params.ph + deltaPH).toFixed(1))));
        state.params.turb = Math.min(150, Math.max(0, Math.round(state.params.turb + deltaTurb)));
        state.params.od = Math.min(12, Math.max(0, parseFloat((state.params.od + deltaOD).toFixed(1))));
        state.params.temp = Math.min(40, Math.max(10, parseFloat((state.params.temp + deltaTemp).toFixed(1))));

        updateSimulatorUI();
        pushRecord();
      }, 3000);

      showToast('Simulação de telemetria contínua iniciada!');

    } else {
      clearInterval(loopInterval);
      loopInterval = null;

      simToggleIcon.setAttribute('data-lucide', 'play');
      simToggleText.textContent = 'Iniciar Simulação Contínua (3s)';
      toggleSimLoop.className = 'px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-lg shadow-sky-900/30';
      simLoopBadge.classList.add('hidden');
      simLoopBadge.classList.remove('flex');

      showToast('Simulação contínua pausada.');
    }

    window.TieteApp.saveState(state);

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  /**
   * Show Toast Notification
   */
  function showToast(msg) {
    if (!toastNotification) return;
    toastNotification.querySelector('#toastMessage').textContent = msg;
    toastNotification.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
    toastNotification.classList.add('opacity-100', 'translate-y-0');

    setTimeout(() => {
      toastNotification.classList.remove('opacity-100', 'translate-y-0');
      toastNotification.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
    }, 2500);
  }

  /**
   * Bind Events
   */
  function bindEvents() {
    inputPH.addEventListener('input', (e) => {
      state.params.ph = parseFloat(e.target.value);
      updateSimulatorUI();
      pushRecord();
    });

    inputTurb.addEventListener('input', (e) => {
      state.params.turb = parseFloat(e.target.value);
      updateSimulatorUI();
      pushRecord();
    });

    inputOD.addEventListener('input', (e) => {
      state.params.od = parseFloat(e.target.value);
      updateSimulatorUI();
      pushRecord();
    });

    inputTemp.addEventListener('input', (e) => {
      state.params.temp = parseFloat(e.target.value);
      updateSimulatorUI();
      pushRecord();
    });

    // Preset Scenario Buttons
    btnScenario1.addEventListener('click', () => setScenario(7.2, 8, 6.8, 22.0));
    btnScenario2.addEventListener('click', () => setScenario(7.5, 55, 5.2, 24.0));
    btnScenario3.addEventListener('click', () => setScenario(8.9, 85, 6.1, 27.0));
    btnScenario4.addEventListener('click', () => setScenario(9.1, 120, 1.5, 28.0));

    // Simulation Toggle
    toggleSimLoop.addEventListener('click', toggleLoop);

    // Reset
    btnReset.addEventListener('click', () => {
      if (state.isLoopRunning) {
        toggleLoop();
      }
      setScenario(7.2, 8, 6.8, 22.0);
    });

    // Apply to Dashboard
    btnApplyToDashboard.addEventListener('click', () => {
      window.TieteApp.saveState(state);
      showToast('Estado sincronizado com o Monitoramento ao Vivo!');
    });
  }

  // Boot
  bindEvents();
  updateSimulatorUI();
});
