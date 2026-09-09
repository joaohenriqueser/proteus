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

  // Animated Liquid Water Tank Elements
  const simulatedWaterLiquid = document.getElementById('simulatedWaterLiquid');
  const waterTankDot = document.getElementById('waterTankDot');
  const waterQualityTag = document.getElementById('waterQualityTag');

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
    previewDiagnosticCard.className = `bg-[#0F172A] border border-[#1E293B] rounded p-5 flex flex-col justify-between flex-grow transition-all duration-300 relative overflow-hidden space-y-4 ${diag.status.colorClass}`;

    previewStatusTitle.textContent = diag.status.title;
    previewBadge.className = `px-2.5 py-1 rounded text-xs font-mono font-bold border flex items-center gap-1.5 ${diag.status.badgeClass}`;
    previewMessageText.textContent = `"${diag.status.message}"`;

    if (previewIcon) {
      previewIcon.setAttribute('data-lucide', diag.status.iconName);
    }

    // 3. Dynamic Water Tank Liquid Reaction
    if (simulatedWaterLiquid && waterQualityTag) {
      const ire = diag.ireNum;
      let liquidBg = '';
      let qualityText = '';
      let dotColor = '#3FA87A';

      if (ire >= 80) {
        liquidBg = 'linear-gradient(180deg, rgba(6, 182, 212, 0.85) 0%, rgba(14, 116, 144, 0.95) 100%)';
        qualityText = 'LIMPA / CRISTALINA';
        dotColor = '#3FA87A';
      } else if (ire >= 60) {
        liquidBg = 'linear-gradient(180deg, rgba(34, 197, 94, 0.85) 0%, rgba(21, 128, 61, 0.95) 100%)';
        qualityText = 'BOA / ACEITÁVEL';
        dotColor = '#3FA87A';
      } else if (ire >= 40) {
        liquidBg = 'linear-gradient(180deg, rgba(234, 179, 8, 0.85) 0%, rgba(161, 98, 7, 0.95) 100%)';
        qualityText = 'ATENÇÃO / TURVA';
        dotColor = '#C9A03C';
      } else if (ire >= 20) {
        liquidBg = 'linear-gradient(180deg, rgba(202, 138, 4, 0.9) 0%, rgba(133, 77, 14, 0.95) 100%)';
        qualityText = 'ALERTA / ÁGUA VERDE';
        dotColor = '#C97A3C';
      } else {
        liquidBg = 'linear-gradient(180deg, rgba(239, 68, 68, 0.9) 0%, rgba(153, 27, 27, 0.95) 100%)';
        qualityText = 'CRÍTICA / POLUÍDA';
        dotColor = '#C55A54';
      }

      simulatedWaterLiquid.style.background = liquidBg;
      const fillHeight = Math.min(85, Math.max(35, 40 + (ire * 0.45)));
      simulatedWaterLiquid.style.height = `${fillHeight}%`;

      waterQualityTag.textContent = qualityText;
      waterQualityTag.style.color = dotColor;
      if (waterTankDot) waterTankDot.style.backgroundColor = dotColor;
    }

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
