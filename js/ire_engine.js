/**
 * Tietê River Water Diagnostics - IRE Math Engine
 * Eutrophication Risk Index (Índice de Risco de Eutrofização - IRE)
 */

window.IREEngine = {
  /**
   * Calculate Turbidity Sub-index (S_turb)
   * @param {number} turb - Turbidity in NTU
   * @returns {number} Sub-index 0 to 100
   */
  calculateSubTurbidity(turb) {
    if (turb <= 10) return 100;
    if (turb <= 100) {
      return 100 - 0.89 * (turb - 10);
    }
    return 20;
  },

  /**
   * Calculate pH Sub-index (S_pH)
   * @param {number} ph - pH value (0 to 14)
   * @returns {number} Sub-index 0 to 100
   */
  calculateSubpH(ph) {
    if (ph >= 6.5 && ph <= 8.0) return 100;
    if (ph > 8.5) {
      return Math.max(0, 100 - 30 * (ph - 8.5));
    }
    if (ph < 6.0) {
      return Math.max(0, 100 - 40 * (6.0 - ph));
    }
    // Smooth boundary for 6.0 <= ph < 6.5 or 8.0 < ph <= 8.5
    return 100;
  },

  /**
   * Calculate Dissolved Oxygen Sub-index (S_OD)
   * @param {number} od - Dissolved Oxygen in mg/L
   * @returns {number} Sub-index 0 to 100
   */
  calculateSubOD(od) {
    if (od >= 5.0) return 100;
    if (od >= 2.0) {
      return 20 * od;
    }
    return 0;
  },

  /**
   * Calculate Temperature Penalty Factor (F_temp)
   * @param {number} temp - Water Temperature in °C
   * @returns {number} Multiplier (1.0 or 1.2)
   */
  calculateTempFactor(temp) {
    return temp >= 25 ? 1.2 : 1.0;
  },

  /**
   * Full calculation of IRE and detailed diagnostic step-by-step
   * @param {object} params - { ph, turb, od, temp }
   * @returns {object} Diagnosis results
   */
  diagnose(params) {
    const ph = parseFloat(params.ph);
    const turb = parseFloat(params.turb);
    const od = parseFloat(params.od);
    const temp = parseFloat(params.temp);

    const sTurb = this.calculateSubTurbidity(turb);
    const spH = this.calculateSubpH(ph);
    const sOD = this.calculateSubOD(od);
    const fTemp = this.calculateTempFactor(temp);

    // Weighted sum
    const iPonderado = (0.40 * sTurb) + (0.35 * sOD) + (0.25 * spH);

    // Final IRE (clamped between 0 and 100)
    let ire = iPonderado / fTemp;
    ire = Math.min(100, Math.max(0, ire));

    // Status Mapping
    let status = {
      code: 'OTIMO',
      title: 'ÓTIMO / ÁGUA BOA',
      colorClass: 'status-bg-otimo',
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      textHex: '#16a34a',
      accentColor: '#10b981',
      iconName: 'check-circle-2',
      message: 'Água em equilíbrio, sem proliferação algal.',
      conamaNote: 'Parâmetros em atendimento à Resolução CONAMA 357/2005 (Classe 2).'
    };

    if (ire < 35) {
      status = {
        code: 'CRITICO',
        title: 'CRÍTICO / ÁGUA VERDE INTENSA',
        colorClass: 'status-bg-critico',
        badgeClass: 'bg-red-500/20 text-red-400 border-red-500/30',
        textHex: '#dc2626',
        accentColor: '#ef4444',
        iconName: 'alert-triangle',
        message: 'Hipóxia severa, risco de mortandade de peixes e presença de toxinas.',
        conamaNote: 'Situação Crítica: Colapso do Oxigênio Dissolvido (<2.0 mg/L) e hiper-eutrofização.'
      };
    } else if (ire < 55) {
      status = {
        code: 'ALERTA',
        title: 'ALERTA / EUTROFIZADO',
        colorClass: 'status-bg-alerta',
        badgeClass: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        textHex: '#ea580c',
        accentColor: '#f97316',
        iconName: 'alert-circle',
        message: 'Presença confirmada de água verde. Riscos para recreação e banho.',
        conamaNote: 'Alerta: Floração de cianobactérias/microalgas ativas, pH alcalino elevado.'
      };
    } else if (ire < 80) {
      status = {
        code: 'ATENCAO',
        title: 'ATENÇÃO / PRÉ-FLORAÇÃO',
        colorClass: 'status-bg-atencao',
        badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        textHex: '#ca8a04',
        accentColor: '#f59e0b',
        iconName: 'info',
        message: 'Elevação leve de turbidez/pH. Início de proliferação.',
        conamaNote: 'Atenção: Condições pré-ambientes favoráveis à multiplicação algal.'
      };
    }

    // Individual parameter status relative to CONAMA standards
    const paramEvaluations = {
      ph: {
        value: ph,
        subIndex: spH.toFixed(1),
        percentage: Math.min(100, (ph / 14) * 100),
        statusText: ph >= 6.5 && ph <= 8.0 ? 'Ideal' : (ph > 8.5 ? 'Alcalino Elevado' : 'Ácido'),
        statusColor: ph >= 6.5 && ph <= 8.0 ? 'text-emerald-400' : 'text-amber-400'
      },
      turb: {
        value: turb,
        subIndex: sTurb.toFixed(1),
        percentage: Math.min(100, (turb / 120) * 100),
        statusText: turb <= 10 ? 'Excelente (<=10)' : (turb <= 100 ? 'Moderado' : 'Elevado (>100)'),
        statusColor: turb <= 10 ? 'text-emerald-400' : (turb <= 100 ? 'text-amber-400' : 'text-red-400')
      },
      od: {
        value: od,
        subIndex: sOD.toFixed(1),
        percentage: Math.min(100, (od / 10) * 100),
        statusText: od >= 5.0 ? 'Ótimo (>=5.0 mg/L)' : (od >= 2.0 ? 'Baixo (2-5 mg/L)' : 'Crítico (<2 mg/L)'),
        statusColor: od >= 5.0 ? 'text-emerald-400' : (od >= 2.0 ? 'text-amber-400' : 'text-red-400')
      },
      temp: {
        value: temp,
        subIndex: fTemp === 1.2 ? 'Penalizado (x1.2)' : 'Normal (x1.0)',
        percentage: Math.min(100, (temp / 40) * 100),
        statusText: temp >= 25 ? 'Risco Térmico (>=25°C)' : 'Ameno (<25°C)',
        statusColor: temp >= 25 ? 'text-rose-400' : 'text-emerald-400'
      }
    };

    return {
      params: { ph, turb, od, temp },
      subIndices: {
        sTurb,
        spH,
        sOD,
        fTemp
      },
      iPonderado,
      ire: ire.toFixed(1),
      ireNum: ire,
      status,
      paramEvaluations
    };
  }
};
