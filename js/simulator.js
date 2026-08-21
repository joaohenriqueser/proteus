/**
 * P.R.O.T.E.U.S. - Standalone Simulator Sandbox Controller (simulador.html)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Local initial parameters for testing
  const params = {
    ph: 7.2,
    turb: 8,
    od: 6.8,
    temp: 22.4
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

  // Preview Diagnostic Card Elements
  const previewDiagnosticCard = document.getElementById('previewDiagnosticCard');
  const previewBadge = document.getElementById('previewBadge');
  const previewIcon = document.getElementById('previewIcon');
  const previewStatusTitle = document.getElementById('previewStatusTitle');
  const previewIREValue = document.getElementById('previewIREValue');
  const previewProgressBar = document.getElementById('previewProgressBar');
  const previewMessageText = document.getElementById('previewMessageText');

  // Sub-Indices Mini-Pills Badges
  const subTurbBadge = document.getElementById('subTurbBadge');
  const subODBadge = document.getElementById('subODBadge');
  const subPHBadge = document.getElementById('subPHBadge');
  const subTempBadge = document.getElementById('subTempBadge');

  // Reset Button
  const btnReset = document.getElementById('btnReset');

  /**
   * Main Simulator Update Render (Pure Local Calculation)
   */
  function updateSimulatorUI() {
    if (!window.IREEngine) return;
    const diag = window.IREEngine.diagnose(params);

    // 1. Sliders & Text Displays
    inputPH.value = params.ph;
    inputTurb.value = params.turb;
    inputOD.value = params.od;
    inputTemp.value = params.temp;

    valPHDisplay.textContent = params.ph.toFixed(1);
    valTurbDisplay.textContent = `${Math.round(params.turb)} NTU`;
    valODDisplay.textContent = `${params.od.toFixed(1)} mg/L`;
    valTempDisplay.textContent = `${params.temp.toFixed(1)} °C`;

    // 2. Preview Diagnostic Card
    previewIREValue.textContent = diag.ire;
    previewProgressBar.style.width = `${Math.min(100, Math.max(0, diag.ireNum))}%`;
    previewProgressBar.style.backgroundColor = diag.status.accentColor;
    previewDiagnosticCard.className = `bg-[#0F172A] border border-[#1E293B] rounded p-5 flex flex-col justify-between flex-grow transition-all duration-300 relative overflow-hidden space-y-5 ${diag.status.colorClass}`;

    previewStatusTitle.textContent = diag.status.title;
    previewBadge.className = `px-2.5 py-1 rounded text-xs font-mono font-bold border flex items-center gap-1.5 ${diag.status.badgeClass}`;
    previewMessageText.textContent = `"${diag.status.message}"`;

    if (previewIcon) {
      previewIcon.setAttribute('data-lucide', diag.status.iconName);
    }

    // 3. Update Sub-Indices Mini-Pills Badges
    if (subTurbBadge) subTurbBadge.textContent = `${diag.subIndices.sTurb.toFixed(1)} / 100`;
    if (subODBadge) subODBadge.textContent = `${diag.subIndices.sOD.toFixed(1)} / 100`;
    if (subPHBadge) subPHBadge.textContent = `${diag.subIndices.spH.toFixed(1)} / 100`;
    if (subTempBadge) subTempBadge.textContent = diag.subIndices.fTemp === 1.2 ? '1.2x (Alerta)' : '1.0x (Normal)';

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  /**
   * Bind Event Listeners
   */
  function bindEvents() {
    inputPH.addEventListener('input', (e) => {
      params.ph = parseFloat(e.target.value);
      updateSimulatorUI();
    });

    inputTurb.addEventListener('input', (e) => {
      params.turb = parseFloat(e.target.value);
      updateSimulatorUI();
    });

    inputOD.addEventListener('input', (e) => {
      params.od = parseFloat(e.target.value);
      updateSimulatorUI();
    });

    inputTemp.addEventListener('input', (e) => {
      params.temp = parseFloat(e.target.value);
      updateSimulatorUI();
    });

    // Reset Parameters to Default
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        params.ph = 7.2;
        params.turb = 8;
        params.od = 6.8;
        params.temp = 22.4;
        updateSimulatorUI();
      });
    }
  }

  // Boot Local Sandbox
  bindEvents();
  updateSimulatorUI();
});
