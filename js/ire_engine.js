/**
 * Tietê River Water Diagnostics - IRE Math Engine
 * Eutrophication Risk Index (Índice de Risco de Eutrofização - IRE)
 * Environmental Water Quality Framework for Tietê River (Barbosa-SP)
 * 
 * ARQUITETURA ATUALIZADA: Módulo Tri-paramétrico (pH, Turbidez, Temperatura)
 * Sensor de Oxigênio Dissolvido (OD) dispensado por viabilidade técnico-financeira IoT.
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
    return 100;
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
   * @param {object} params - { ph, turb, temp }
   * @returns {object} Diagnosis results
   */
  diagnose(params) {
    const ph = parseFloat(params.ph);
    const turb = parseFloat(params.turb);
    const temp = parseFloat(params.temp);

    const sTurb = this.calculateSubTurbidity(turb);
    const spH = this.calculateSubpH(ph);
    const fTemp = this.calculateTempFactor(temp);

    // FÓRMULA ATUALIZADA DO PROTEUS SEM OXIGÊNIO (Tri-paramétrica: 60% Turb, 40% pH)
    // A turbidez afere a biomassa fitoplanctônica e o pH afere a alcalinização fotossintética,
    // com penalidade cinética por estresse térmico (F_temp).
    const iPonderado = (0.60 * sTurb) + (0.40 * spH);
    const formulaMode = 'Atualizada PROTEUS (Sem OD - 3 Sensores IoT)';
    const weights = { turb: 0.60, ph: 0.40 };

    // Final IRE (clamped between 0 and 100)
    let ire = iPonderado / fTemp;
    ire = Math.min(100, Math.max(0, ire));

    // Real-World Status Mapping (Light Mode Design System)
    let status = {
      code: 'OTIMO',
      title: 'ÓTIMO / ÁGUA BOA',
      colorClass: 'status-bg-otimo',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm',
      textHex: '#059669',
      accentColor: '#10b981',
      iconName: 'check-circle-2',
      message: 'Água em equilíbrio ecológico, sem proliferação de microalgas.',
      conamaNote: 'Conforme com a Resolução CONAMA 357/2005 (Classe 2).'
    };

    if (ire < 35) {
      status = {
        code: 'CRITICO',
        title: 'CRÍTICO / ÁGUA VERDE INTENSA',
        colorClass: 'status-bg-critico',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 shadow-sm',
        textHex: '#dc2626',
        accentColor: '#ef4444',
        iconName: 'alert-triangle',
        message: 'Proliferação algal massiva confirmada, risco de toxinas e mortandade.',
        conamaNote: 'Alerta Ambiental: Floração algal crítica com alta biomassa óptica e desequilíbrio metabólico.'
      };
    } else if (ire < 55) {
      status = {
        code: 'ALERTA',
        title: 'ALERTA / EUTROFIZADO',
        colorClass: 'status-bg-alerta',
        badgeClass: 'bg-orange-50 text-orange-700 border-orange-200 shadow-sm',
        textHex: '#ea580c',
        accentColor: '#f97316',
        iconName: 'alert-circle',
        message: 'Presença confirmada de água verde. Riscos para recreação e balneabilidade.',
        conamaNote: 'Alerta: Floração ativa com pH alcalino e turbidez óptica elevada.'
      };
    } else if (ire < 80) {
      status = {
        code: 'ATENCAO',
        title: 'ATENÇÃO / PRÉ-FLORAÇÃO',
        colorClass: 'status-bg-atencao',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm',
        textHex: '#d97706',
        accentColor: '#f59e0b',
        iconName: 'info',
        message: 'Elevação leve de turbidez/pH. Início de proliferação algal.',
        conamaNote: 'Atenção Operacional: Condições ambientais propícias à proliferação.'
      };
    }

    // Individual parameter status relative to standards
    const paramEvaluations = {
      ph: {
        value: ph,
        subIndex: spH.toFixed(1),
        percentage: Math.min(100, (ph / 14) * 100),
        statusText: ph >= 6.5 && ph <= 8.0 ? 'Faixa Ideal' : (ph > 8.5 ? 'Alcalino Elevado' : 'Ácido'),
        statusColor: ph >= 6.5 && ph <= 8.0 ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'
      },
      turb: {
        value: turb,
        subIndex: sTurb.toFixed(1),
        percentage: Math.min(100, (turb / 120) * 100),
        statusText: turb <= 10 ? 'Excelente (<=10)' : (turb <= 100 ? 'Moderado' : 'Elevado (>100)'),
        statusColor: turb <= 10 ? 'text-emerald-600 font-semibold' : (turb <= 100 ? 'text-amber-600 font-semibold' : 'text-rose-600 font-semibold')
      },
      temp: {
        value: temp,
        subIndex: fTemp === 1.2 ? 'Penalizado (x1.2)' : 'Normal (x1.0)',
        percentage: Math.min(100, (temp / 40) * 100),
        statusText: temp >= 25 ? 'Risco Térmico (>=25°C)' : 'Ameno (<25°C)',
        statusColor: temp >= 25 ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-semibold'
      }
    };

    return {
      params: { ph, turb, temp },
      hasOD: false,
      formulaMode,
      weights,
      subIndices: {
        sTurb,
        spH,
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
