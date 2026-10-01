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
  const waterSediments = document.getElementById('waterSediments');
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
    previewDiagnosticCard.className = `glass-card p-5 sm:p-6 flex flex-col justify-between flex-grow transition-all duration-300 relative overflow-hidden space-y-4 shadow-md`;

    previewStatusTitle.textContent = diag.status.title;
    previewBadge.className = `px-2.5 py-1 rounded-full text-xs font-mono font-bold border flex items-center gap-1.5 ${diag.status.badgeClass}`;
    previewMessageText.textContent = `"${diag.status.message}"`;

    if (previewIcon) {
      previewIcon.setAttribute('data-lucide', diag.status.iconName);
    }

    // 3. Dynamic Water Tank Liquid Reaction (Realistic Limnology: Crystalline -> Eutrophic Green/Moss)
    if (simulatedWaterLiquid && waterQualityTag) {
      const ire = diag.ireNum;
      let liquidBg = '';
      let qualityText = '';
      let dotColor = '#0284C7';

      if (ire >= 80) {
        // Ótimo: Água pura, azul límpido e cristalina
        liquidBg = 'linear-gradient(180deg, #0284C7 0%, #0369A1 100%)';
        qualityText = 'LIMPA / CRISTALINA';
        dotColor = '#0284C7';
      } else if (ire >= 60) {
        // Regular: Turquesa / leve perda de transparência
        liquidBg = 'linear-gradient(180deg, #0D9488 0%, #0F766E 100%)';
        qualityText = 'BOA / LEVE TURVAÇÃO';
        dotColor = '#0D9488';
      } else if (ire >= 40) {
        // Atenção: Verde-oliva / início de densidade algal
        liquidBg = 'linear-gradient(180deg, #65A30D 0%, #4D7C0F 100%)';
        qualityText = 'ATENÇÃO / PROLIFERAÇÃO';
        dotColor = '#65A30D';
      } else if (ire >= 20) {
        // Alerta: Verde musgo denso / floração perceptível
        liquidBg = 'linear-gradient(180deg, #365314 0%, #1E3A1E 100%)';
        qualityText = 'ALERTA / FLORAÇÃO ALGAL';
        dotColor = '#365314';
      } else {
        // Crítico: Verde-lodo profundo / biomassa eutrofizada (sem tom de sangue)
        liquidBg = 'linear-gradient(180deg, #14532D 0%, #0B2516 100%)';
        qualityText = 'CRÍTICA / EUTROFIZADA';
        dotColor = '#14532D';
      }

      simulatedWaterLiquid.style.background = liquidBg;
      
      // Mantém a gota preenchida de forma realista (entre 78% e 88%), sem ficar "meio-vazia"
      const fillHeight = Math.min(88, Math.max(76, 76 + (ire * 0.12)));
      simulatedWaterLiquid.style.height = `${fillHeight}%`;

      // Aplica densidade de sedimentos suspensos proporcional à turbidez da água
      if (waterSediments) {
        const sedimentOpacity = Math.min(0.9, Math.max(0, (params.turb - 5) / 140));
        waterSediments.style.opacity = sedimentOpacity.toFixed(2);
      }

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
