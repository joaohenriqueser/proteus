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
  const previewMessageText = document.getElementById('previewMessageText');

  // SVG Water Droplet Liquid Fill Gauge Elements
  const dropletLiquidFill = document.getElementById('dropletLiquidFill');
  const dropletBorderGlow = document.getElementById('dropletBorderGlow');
  const dropletGradStop1 = document.getElementById('dropletGradStop1');
  const dropletGradStop2 = document.getElementById('dropletGradStop2');

  // Reset Button
  const btnReset = document.getElementById('btnReset');

  /**
   * Main Simulator Update Render (Pure Local Calculation & Water Droplet Gauge)
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
    previewDiagnosticCard.className = `bg-[#0F172A] border border-[#1E293B] rounded p-5 flex flex-col justify-between flex-grow transition-all duration-300 relative overflow-hidden space-y-4 ${diag.status.colorClass}`;

    previewStatusTitle.textContent = diag.status.title;
    previewBadge.className = `px-2.5 py-1 rounded text-xs font-mono font-bold border flex items-center gap-1.5 ${diag.status.badgeClass}`;
    previewMessageText.textContent = `"${diag.status.message}"`;

    if (previewIcon) {
      previewIcon.setAttribute('data-lucide', diag.status.iconName);
    }

    // 3. SVG Water Droplet Liquid Fill & Color Gauge Logic
    const irePct = Math.min(100, Math.max(0, diag.ireNum));
    // Calculate SVG rect Y coordinate: 110 = 0% (empty), 10 = 100% (full)
    const rectY = 110 - (irePct / 100) * 100;

    if (dropletLiquidFill) {
      dropletLiquidFill.setAttribute('y', rectY.toFixed(1));
    }

    // Dynamic Liquid Gradient Colors & Glow based on Diagnosis Status
    let stop1Color = '#3FA87A';
    let stop2Color = '#06B6D4';
    let borderGlowColor = '#3FA87A';

    switch (diag.status.code) {
      case 'CRITICO':
        stop1Color = '#C55A54';
        stop2Color = '#EF4444';
        borderGlowColor = '#C55A54';
        break;
      case 'ALERTA':
        stop1Color = '#C97A3C';
        stop2Color = '#F97316';
        borderGlowColor = '#C97A3C';
        break;
      case 'ATENCAO':
        stop1Color = '#C9A03C';
        stop2Color = '#EAB308';
        borderGlowColor = '#C9A03C';
        break;
      default: // OTIMO
        stop1Color = '#3FA87A';
        stop2Color = '#06B6D4';
        borderGlowColor = '#3FA87A';
        break;
    }

    if (dropletGradStop1) dropletGradStop1.setAttribute('stop-color', stop1Color);
    if (dropletGradStop2) dropletGradStop2.setAttribute('stop-color', stop2Color);
    if (dropletBorderGlow) dropletBorderGlow.setAttribute('stroke', borderGlowColor);

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
