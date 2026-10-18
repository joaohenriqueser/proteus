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

  const valTemp = document.getElementById('valTemp');
  const noteTemp = document.getElementById('noteTemp');
  const dotTemp = document.getElementById('dotTemp');

  // Footer & Log Elements
  const historyLogContainer = document.getElementById('historyLogContainer');
  const btnClearHistory = document.getElementById('btnClearHistory');
  const btnToggleTelemetry = document.getElementById('btnToggleTelemetry');
  const mapOverlayStatus = document.getElementById('mapOverlayStatus');

  // Station DOM Elements
  const stationSelect = document.getElementById('stationSelect');
  const stationNameDisplay = document.getElementById('stationNameDisplay');
  const mapStationLabel = document.getElementById('mapStationLabel');
  let allStationMarkers = [];

  // Analytics Floating Card & Full History Modal Elements
  const analyticsPanel = document.getElementById('analyticsPanel');
  const analyticsMiniPill = document.getElementById('analyticsMiniPill');
  const btnMinimizeAnalytics = document.getElementById('btnMinimizeAnalytics');
  const btnRestoreAnalytics = document.getElementById('btnRestoreAnalytics');
  const btnOpenHistoryModal = document.getElementById('btnOpenHistoryModal');
  const btnOpenHistoryModalBottom = document.getElementById('btnOpenHistoryModalBottom');
  const historyModal = document.getElementById('historyModal');
  const btnCloseHistoryModal = document.getElementById('btnCloseHistoryModal');
  const btnClearHistoryModal = document.getElementById('btnClearHistoryModal');
  const historyTableBody = document.getElementById('historyTableBody');
  const historyRecordCount = document.getElementById('historyRecordCount');

  /**
   * Active Station Helper
   */
  function getActiveStation() {
    if (!Array.isArray(state.stations) || state.stations.length === 0) {
      state.stations = app.getDefaultStations();
    }
    let st = state.stations.find(s => s.id === state.activeStationId);
    if (!st) {
      st = state.stations[0];
      state.activeStationId = st.id;
    }
    return st;
  }

  function updateStationUI() {
    const currentSt = getActiveStation();

    if (stationSelect) {
      stationSelect.innerHTML = state.stations.map(st => 
        `<option value="${st.id}" ${st.id === currentSt.id ? 'selected' : ''}>${st.name}</option>`
      ).join('');
    }

    if (stationNameDisplay) {
      stationNameDisplay.textContent = currentSt.name;
    }
    if (mapStationLabel) {
      mapStationLabel.textContent = currentSt.river;
    }

    if (mapInstance && currentSt.coords) {
      mapInstance.flyTo(currentSt.coords, 13);
    }

    renderAllStationMarkers();
  }

  function switchStation(stationId) {
    const st = state.stations.find(s => s.id === stationId);
    if (!st) return;

    state.activeStationId = st.id;
    if (st.params) {
      state.params = { ...st.params };
    }
    if (st.scenarioTag) {
      state.activeScenarioTag = st.scenarioTag;
    }
    app.saveState(state);

    updateStationUI();
    renderDashboard();
  }

  function renderAllStationMarkers() {
    if (!mapInstance || !window.L) return;

    // Clear existing markers
    allStationMarkers.forEach(m => mapInstance.removeLayer(m));
    allStationMarkers = [];

    const currentSt = getActiveStation();
    const currentDiag = engine.diagnose(state.params);
    const activeColor = getStatusColor(currentDiag.status.code);

    state.stations.forEach(st => {
      const isActive = st.id === currentSt.id;
      const stParams = st.params || { ph: 7.2, turb: 8, temp: 22.4 };
      const stDiag = engine.diagnose(stParams);
      const stColor = getStatusColor(stDiag.status.code);

      if (isActive) {
        if (mapHalo) {
          mapHalo.setLatLng(st.coords);
          mapHalo.setStyle({ color: activeColor, fillColor: activeColor });
        }
        if (mapMarker) {
          mapMarker.setLatLng(st.coords);
          mapMarker.setStyle({ color: activeColor, fillColor: '#FFFFFF' });
          mapMarker.setPopupContent(`<b>Estação Ativa: ${st.name}</b><br>${st.river}<br>IRE: ${currentDiag.ire} — ${currentDiag.status.title}`);
        }
      } else {
        const marker = L.circleMarker(st.coords, {
          radius: 6,
          color: stColor,
          weight: 2,
          fillColor: '#FFFFFF',
          fillOpacity: 0.95
        }).addTo(mapInstance);

        marker.bindPopup(`<b>Estação ${st.name}</b><br>${st.river}<br>IRE Estimado: ${stDiag.ire}<br><span style="color:#2563EB">Clique para selecionar</span>`);

        marker.on('click', () => {
          switchStation(st.id);
        });

        allStationMarkers.push(marker);
      }
    });
  }

  /**
   * Color Palette Helper (Refined Light Mode)
   */
  function getStatusColor(code) {
    switch (code) {
      case 'CRITICO': return '#EF4444'; // Red-500
      case 'ALERTA': return '#F97316';  // Orange-500
      case 'ATENCAO': return '#F59E0B'; // Amber-500
      default: return '#10B981';        // Emerald-500
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
      scenarioTagDisplay.textContent = state.activeScenarioTag || 'Água Boa';
    }
    if (lastReadTimestamp) {
      const now = new Date();
      lastReadTimestamp.textContent = now.toLocaleTimeString('pt-BR');
    }

    // Individual Parameters
    // 1. pH
    if (valPH) valPH.textContent = state.params.ph.toFixed(1);
    if (notePH) {
      if (state.params.ph >= 6.5 && state.params.ph <= 8.0) {
        notePH.textContent = 'Faixa neutra (CONAMA OK)';
        if (dotPH) dotPH.style.backgroundColor = '#10B981';
      } else if (state.params.ph > 8.5) {
        notePH.textContent = 'Alcalino / Floração Algal';
        if (dotPH) dotPH.style.backgroundColor = '#F97316';
      } else {
        notePH.textContent = 'Fora dos padrões';
        if (dotPH) dotPH.style.backgroundColor = '#F59E0B';
      }
    }

    // 2. Turbidez
    if (valTurb) valTurb.textContent = Math.round(state.params.turb);
    if (noteTurb) {
      if (state.params.turb <= 10) {
        noteTurb.textContent = 'Sólidos baixos (Excelente)';
        if (dotTurb) dotTurb.style.backgroundColor = '#10B981';
      } else if (state.params.turb > 100) {
        noteTurb.textContent = 'Acima do limite (>100 NTU)';
        if (dotTurb) dotTurb.style.backgroundColor = '#EF4444';
      } else {
        noteTurb.textContent = 'Aporte em elevação';
        if (dotTurb) dotTurb.style.backgroundColor = '#F59E0B';
      }
    }

// 3. Temperatura
    if (valTemp) valTemp.textContent = state.params.temp.toFixed(1);
    if (noteTemp) {
      if (state.params.temp >= 25.0) {
        noteTemp.textContent = 'Estresse térmico (Ftemp 1.2)';
        if (dotTemp) dotTemp.style.backgroundColor = '#F97316';
      } else {
        noteTemp.textContent = 'Sazonal normal';
        if (dotTemp) dotTemp.style.backgroundColor = '#10B981';
      }
    }

    // Sync Map Marker & Circle Halo
    syncMap(colorHex, status.title);

    // Sync Chart & Log
    updateChart(ireNum);
    renderHistoryLog();
  }

  /**
   * Leaflet.js Map Controller
   */
  function initMap() {
    const mapContainer = document.getElementById('leafletMap');
    if (!mapContainer || mapInstance || !window.L) return;

    const currentSt = getActiveStation();
    const coords = currentSt.coords;

    mapInstance = L.map(mapContainer, {
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: true
    }).setView(coords, 13);

    // Esri World Light Gray Canvas (Crisp, minimal light, zero watermarks)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri · OpenStreetMap',
      maxZoom: 16
    }).addTo(mapInstance);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 16,
      opacity: 0.75
    }).addTo(mapInstance);

    // Dedicated Custom Floating Map Controls (Zoom In, Zoom Out, Center)
    const btnZoomIn = document.getElementById('btnMapZoomIn');
    const btnZoomOut = document.getElementById('btnMapZoomOut');
    const btnResetView = document.getElementById('btnMapResetView');

    if (btnZoomIn) {
      btnZoomIn.onclick = () => {
        if (mapInstance) mapInstance.zoomIn();
      };
    }
    if (btnZoomOut) {
      btnZoomOut.onclick = () => {
        if (mapInstance) mapInstance.zoomOut();
      };
    }
    if (btnResetView) {
      btnResetView.onclick = () => {
        const cur = getActiveStation();
        if (mapInstance && cur && cur.coords) {
          mapInstance.flyTo(cur.coords, 13);
        }
      };
    }

    const initialColor = getStatusColor('OTIMO');
    mapHalo = L.circle(coords, {
      radius: 900,
      color: initialColor,
      weight: 1.5,
      fillColor: initialColor,
      fillOpacity: 0.14
    }).addTo(mapInstance);

    mapMarker = L.circleMarker(coords, {
      radius: 7,
      color: initialColor,
      weight: 3,
      fillColor: '#FFFFFF',
      fillOpacity: 1
    }).addTo(mapInstance);

    mapMarker.bindPopup(`<b>Estação ${currentSt.name}</b><br>${currentSt.river}`);

    setTimeout(() => mapInstance.invalidateSize(), 200);
  }

  function syncMap(colorHex, statusTitle) {
    if (!mapInstance || !mapMarker || !mapHalo) return;
    const currentSt = getActiveStation();
    mapHalo.setStyle({ color: colorHex, fillColor: colorHex });
    if (currentSt && currentSt.raio_metros) {
      mapHalo.setRadius(currentSt.raio_metros);
    }
    mapMarker.setStyle({ color: colorHex });
    mapMarker.setPopupContent(`<b>Estação ${currentSt.name}</b><br>Raio de Cobertura: ${currentSt.raio_metros || 1000}m<br>IRE ${state.params.ph.toFixed(1)} — ${statusTitle}<br>${state.activeScenarioTag}`);
    if (mapOverlayStatus) {
      mapOverlayStatus.textContent = statusTitle;
      mapOverlayStatus.style.color = colorHex;
    }
  }

  // Station Switcher Handler
  if (stationSelect) {
    stationSelect.onchange = (e) => {
      switchStation(e.target.value);
    };
  }

  // Analytics Floating Card Minimize & Maximize Controllers
  if (btnMinimizeAnalytics) {
    btnMinimizeAnalytics.onclick = () => {
      if (analyticsPanel) analyticsPanel.classList.add('hidden');
      if (analyticsMiniPill) analyticsMiniPill.classList.remove('hidden');
    };
  }

  if (btnRestoreAnalytics) {
    btnRestoreAnalytics.onclick = () => {
      if (analyticsPanel) analyticsPanel.classList.remove('hidden');
      if (analyticsMiniPill) analyticsMiniPill.classList.add('hidden');
      if (chartInstance) chartInstance.resize();
    };
  }

  // ============================================================
  // Controles de Histórico, Filtros por Período, Alertas e Relatórios (RF10, RF12, RF13)
  // ============================================================
  const historyPeriodSelect = document.getElementById('historyPeriodSelect');
  const historyCustomDates = document.getElementById('historyCustomDates');
  const historyDateStart = document.getElementById('historyDateStart');
  const historyDateEnd = document.getElementById('historyDateEnd');
  const btnApplyHistoryFilter = document.getElementById('btnApplyHistoryFilter');
  const historyStationFilter = document.getElementById('historyStationFilter');
  const btnExportCSV = document.getElementById('btnExportCSV');
  const btnOpenReportFromHistory = document.getElementById('btnOpenReportFromHistory');
  const btnTopReport = document.getElementById('btnTopReport');
  const sidebarBtnRelatorios = document.getElementById('sidebarBtnRelatorios');
  const reportModal = document.getElementById('reportModal');
  const btnCloseReportModal = document.getElementById('btnCloseReportModal');
  const btnPrintReportNow = document.getElementById('btnPrintReportNow');

  // Alertas DOM Elements (RF10)
  const alertasModal = document.getElementById('alertasModal');
  const btnCloseAlertasModal = document.getElementById('btnCloseAlertasModal');
  const btnTopAlerts = document.getElementById('btnTopAlerts');
  const sidebarBtnAlertas = document.getElementById('sidebarBtnAlertas');
  const topAlertCountBadge = document.getElementById('topAlertCountBadge');
  const sidebarAlertBadge = document.getElementById('sidebarAlertBadge');
  const alertasTableBody = document.getElementById('alertasTableBody');
  const alertSummaryCounter = document.getElementById('alertSummaryCounter');
  let currentAlertFilter = 'todos';
  let cachedAlertas = [];

  function openHistoryModal() {
    if (historyModal) {
      historyModal.classList.remove('hidden');
      updateHistoryStationFilterOptions();
      renderHistoryTable();
      if (window.lucide) lucide.createIcons();
    }
  }

  function closeHistoryModal() {
    if (historyModal) {
      historyModal.classList.add('hidden');
    }
  }

  if (btnOpenHistoryModal) btnOpenHistoryModal.onclick = openHistoryModal;
  if (btnOpenHistoryModalBottom) btnOpenHistoryModalBottom.onclick = openHistoryModal;
  if (btnCloseHistoryModal) btnCloseHistoryModal.onclick = closeHistoryModal;

  if (historyModal) {
    historyModal.onclick = (e) => {
      if (e.target === historyModal) closeHistoryModal();
    };
  }

  // Alternar seletor de datas customizadas
  if (historyPeriodSelect) {
    historyPeriodSelect.onchange = () => {
      if (historyPeriodSelect.value === 'custom') {
        if (historyCustomDates) {
          historyCustomDates.classList.remove('hidden');
          historyCustomDates.classList.add('flex');
        }
      } else {
        if (historyCustomDates) {
          historyCustomDates.classList.add('hidden');
          historyCustomDates.classList.remove('flex');
        }
        renderHistoryTable();
      }
    };
  }

  if (btnApplyHistoryFilter) {
    btnApplyHistoryFilter.onclick = () => renderHistoryTable();
  }

  if (historyStationFilter) {
    historyStationFilter.onchange = () => renderHistoryTable();
  }

  function updateHistoryStationFilterOptions() {
    if (!historyStationFilter) return;
    const currentVal = historyStationFilter.value;
    const stations = Array.isArray(state.stations) ? state.stations : app.getDefaultStations();
    historyStationFilter.innerHTML = `
      <option value="todas">Todas as estações</option>
      ${stations.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
    `;
    if (currentVal) historyStationFilter.value = currentVal;
  }

  if (btnClearHistoryModal) {
    btnClearHistoryModal.onclick = () => {
      if (confirm('Deseja limpar todos os registros do histórico?')) {
        state.history = [];
        app.saveState(state);
        renderHistoryTable();
        if (chartInstance) {
          chartInstance.data.labels = [];
          chartInstance.data.datasets[0].data = [];
          chartInstance.update();
        }
      }
    };
  }

  // Exportação CSV (RF12)
  function exportFilteredHistoryToCSV() {
    const list = getFilteredHistory();
    if (list.length === 0) {
      alert('Nenhum registro para exportar no período selecionado.');
      return;
    }

    const headers = ['Horário', 'Data', 'Estação', 'Índice IRE', 'Classificação', 'pH', 'Turbidez (NTU)', 'Temperatura (°C)'];
    const rows = list.map(item => {
      const p = item.params || {};
      return [
        `"${item.timestamp || ''}"`,
        `"${item.date || ''}"`,
        `"${item.stationName || ''}"`,
        (item.ire !== undefined ? Number(item.ire).toFixed(1) : ''),
        `"${item.status ? item.status.title : ''}"`,
        (p.ph !== undefined ? Number(p.ph).toFixed(2) : ''),
        (p.turb !== undefined ? Number(p.turb).toFixed(1) : ''),
        (p.temp !== undefined ? Number(p.temp).toFixed(1) : '')
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `relatorio_telemetria_proteus_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (btnExportCSV) btnExportCSV.onclick = exportFilteredHistoryToCSV;

  // Modal de Relatório Técnico (RF12)
  function openReportModal() {
    const reportModal = document.getElementById('reportModal');
    if (!reportModal) return;

    const list = getFilteredHistory();
    const currentSt = getActiveStation();
    const stName = (historyStationFilter && historyStationFilter.value !== 'todas')
      ? (state.stations.find(s => s.id === historyStationFilter.value)?.name || currentSt.name)
      : (currentSt ? currentSt.name : 'Todas as estações');

    const total = list.length;
    let sumPH = 0, minPH = 999, maxPH = -999;
    let sumTurb = 0, minTurb = 999, maxTurb = -999;
    let sumTemp = 0, minTemp = 999, maxTemp = -999;
    let sumIRE = 0, minIRE = 999, maxIRE = -999;
    let conformes = 0;
    let alertasCount = 0;

    list.forEach(item => {
      const p = item.params || {};
      const ph = Number(p.ph) || 7.0;
      const turb = Number(p.turb) || 5;
      const temp = Number(p.temp) || 22;
      const ire = Number(item.ire) || 80;

      sumPH += ph; minPH = Math.min(minPH, ph); maxPH = Math.max(maxPH, ph);
      sumTurb += turb; minTurb = Math.min(minTurb, turb); maxTurb = Math.max(maxTurb, turb);
      sumTemp += temp; minTemp = Math.min(minTemp, temp); maxTemp = Math.max(maxTemp, temp);
      sumIRE += ire; minIRE = Math.min(minIRE, ire); maxIRE = Math.max(maxIRE, ire);

      if (ph >= 6.0 && ph <= 9.0 && turb <= 100 && temp <= 30) {
        conformes++;
      }
      if (turb > 100 || ph < 6.0 || ph > 9.0 || ire < 55) {
        alertasCount++;
      }
    });

    const avgPH = total > 0 ? (sumPH / total).toFixed(2) : '7.20';
    const avgTurb = total > 0 ? (sumTurb / total).toFixed(1) : '8.0';
    const avgTemp = total > 0 ? (sumTemp / total).toFixed(1) : '22.4';
    const avgIRE = total > 0 ? (sumIRE / total).toFixed(1) : '85.0';
    const complianceRate = total > 0 ? ((conformes / total) * 100).toFixed(1) : '100.0';

    const elEmissao = document.getElementById('reportEmissaoData');
    const elStation = document.getElementById('reportStationName');
    const elTotal = document.getElementById('reportTotalReadings');
    const elCompliance = document.getElementById('reportComplianceRate');
    const elAlerts = document.getElementById('reportTotalAlerts');
    const elBody = document.getElementById('reportBodyParams');

    if (elEmissao) elEmissao.textContent = new Date().toLocaleString('pt-BR');
    if (elStation) elStation.textContent = stName;
    if (elTotal) elTotal.textContent = `${total} registros`;
    if (elCompliance) elCompliance.textContent = `${complianceRate}%`;
    if (elAlerts) elAlerts.textContent = `${alertasCount} evento(s)`;

    if (elBody) {
      elBody.innerHTML = `
        <tr class="hover:bg-slate-50">
          <td class="py-2.5 px-3 font-semibold text-slate-800">pH da Água</td>
          <td class="py-2.5 px-3 text-center">${total > 0 ? minPH.toFixed(2) : '7.00'}</td>
          <td class="py-2.5 px-3 text-center font-bold text-slate-900">${avgPH}</td>
          <td class="py-2.5 px-3 text-center">${total > 0 ? maxPH.toFixed(2) : '7.40'}</td>
          <td class="py-2.5 px-3 font-sans text-slate-600">6.0 a 9.0</td>
          <td class="py-2.5 px-3 text-center">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${avgPH >= 6 && avgPH <= 9 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
              ${avgPH >= 6 && avgPH <= 9 ? 'CONFORME' : 'NÃO CONFORME'}
            </span>
          </td>
        </tr>
        <tr class="hover:bg-slate-50">
          <td class="py-2.5 px-3 font-semibold text-slate-800">Turbidez (NTU)</td>
          <td class="py-2.5 px-3 text-center">${total > 0 ? minTurb.toFixed(1) : '4.0'}</td>
          <td class="py-2.5 px-3 text-center font-bold text-slate-900">${avgTurb} NTU</td>
          <td class="py-2.5 px-3 text-center">${total > 0 ? maxTurb.toFixed(1) : '12.0'}</td>
          <td class="py-2.5 px-3 font-sans text-slate-600">Até 100 NTU</td>
          <td class="py-2.5 px-3 text-center">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${avgTurb <= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
              ${avgTurb <= 100 ? 'CONFORME' : 'NÃO CONFORME'}
            </span>
          </td>
        </tr>
        <tr class="hover:bg-slate-50">
          <td class="py-2.5 px-3 font-semibold text-slate-800">Temperatura da Água (°C)</td>
          <td class="py-2.5 px-3 text-center">${total > 0 ? minTemp.toFixed(1) : '21.0'}</td>
          <td class="py-2.5 px-3 text-center font-bold text-slate-900">${avgTemp} °C</td>
          <td class="py-2.5 px-3 text-center">${total > 0 ? maxTemp.toFixed(1) : '24.0'}</td>
          <td class="py-2.5 px-3 font-sans text-slate-600">Máx. 30 °C (elevação &lt; 3°C)</td>
          <td class="py-2.5 px-3 text-center">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${avgTemp <= 30 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
              ${avgTemp <= 30 ? 'CONFORME' : 'NÃO CONFORME'}
            </span>
          </td>
        </tr>
        <tr class="hover:bg-slate-50 bg-blue-50/30">
          <td class="py-2.5 px-3 font-bold text-blue-900">Índice IRE (Síntese)</td>
          <td class="py-2.5 px-3 text-center font-bold">${total > 0 ? minIRE.toFixed(1) : '80.0'}</td>
          <td class="py-2.5 px-3 text-center font-extrabold text-blue-700 text-sm">${avgIRE}/100</td>
          <td class="py-2.5 px-3 text-center font-bold">${total > 0 ? maxIRE.toFixed(1) : '90.0'}</td>
          <td class="py-2.5 px-3 font-sans text-slate-600">Mínimo ideal &ge; 60.0</td>
          <td class="py-2.5 px-3 text-center">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${avgIRE >= 60 ? 'bg-emerald-100 text-emerald-800' : (avgIRE >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800')}">
              ${avgIRE >= 80 ? 'ÓTIMO' : (avgIRE >= 60 ? 'BOM' : (avgIRE >= 40 ? 'ALERTA' : 'CRÍTICO'))}
            </span>
          </td>
        </tr>
      `;
    }

    reportModal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  function closeReportModal() {
    if (reportModal) reportModal.classList.add('hidden');
  }

  if (btnOpenReportFromHistory) btnOpenReportFromHistory.onclick = openReportModal;
  if (btnTopReport) btnTopReport.onclick = openReportModal;
  if (sidebarBtnRelatorios) sidebarBtnRelatorios.onclick = openReportModal;
  if (btnCloseReportModal) btnCloseReportModal.onclick = closeReportModal;
  if (btnPrintReportNow) {
    btnPrintReportNow.onclick = () => window.print();
  }
  if (reportModal) {
    reportModal.onclick = (e) => {
      if (e.target === reportModal) closeReportModal();
    };
  }

  // Central de Alertas Automáticos (RF10)
  async function fetchAlertas(statusFilter = 'todos') {
    currentAlertFilter = statusFilter;
    try {
      const res = await fetch(`${app.API_BASE_URL}/alertas?status=${statusFilter}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          cachedAlertas = json.data;
          renderAlertasTable(cachedAlertas);
          updateAlertBadges(cachedAlertas);
          return;
        }
      }
    } catch (e) {
      // Modo offline fallback
    }

    // Fallback: calcular alertas a partir do histórico recente
    const mockAlerts = [];
    const currentSt = getActiveStation();
    const stName = currentSt ? currentSt.name : 'BRB-04 · Barbosa';

    (state.history || []).forEach((item, idx) => {
      const p = item.params || {};
      if (p.turb && p.turb > 100) {
        mockAlerts.push({
          id: idx * 10 + 1,
          nivel: p.turb > 150 ? 'Crítico' : 'Atenção',
          estacao_nome: item.stationName || stName,
          parametro: 'Turbidez',
          descricao: `Turbidez elevada de ${p.turb.toFixed(1)} NTU (limite CONAMA: 100 NTU).`,
          status: 'Aberto',
          gerado_em: new Date().toISOString()
        });
      }
      if (p.ph && (p.ph < 6.0 || p.ph > 9.0)) {
        mockAlerts.push({
          id: idx * 10 + 2,
          nivel: 'Crítico',
          estacao_nome: item.stationName || stName,
          parametro: 'pH',
          descricao: `pH fora do padrão (${p.ph.toFixed(2)}), faixa ideal CONAMA: 6.0 a 9.0.`,
          status: 'Aberto',
          gerado_em: new Date().toISOString()
        });
      }
      if (item.ire && item.ire < 40) {
        mockAlerts.push({
          id: idx * 10 + 3,
          nivel: 'Crítico',
          estacao_nome: item.stationName || stName,
          parametro: 'IRE',
          descricao: `Índice IRE Crítico (${Number(item.ire).toFixed(1)}/100) - Risco de floração de microalgas.`,
          status: 'Em análise',
          gerado_em: new Date().toISOString()
        });
      }
    });

    cachedAlertas = mockAlerts;
    const filtered = statusFilter === 'todos' ? cachedAlertas : cachedAlertas.filter(a => a.status.toLowerCase() === statusFilter.toLowerCase());
    renderAlertasTable(filtered);
    updateAlertBadges(cachedAlertas);
  }

  function renderAlertasTable(alerts) {
    if (!alertasTableBody) return;
    if (alerts.length === 0) {
      alertasTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-8 text-slate-400 font-sans">
            Nenhuma ocorrência de alerta registrada para o filtro selecionado. Parâmetros dentro da normalidade CONAMA.
          </td>
        </tr>
      `;
      if (alertSummaryCounter) alertSummaryCounter.textContent = '0 ocorrências encontradas.';
      return;
    }

    alertasTableBody.innerHTML = alerts.map(a => {
      const isCritico = (a.nivel || '').toLowerCase() === 'crítico' || (a.nivel || '').toLowerCase() === 'critico';
      const badgeClass = isCritico
        ? 'bg-rose-100 text-rose-800 border-rose-200'
        : 'bg-amber-100 text-amber-800 border-amber-200';
      const statusClass = a.status === 'Resolvido'
        ? 'bg-emerald-100 text-emerald-800'
        : (a.status === 'Em análise' ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-800');

      const dataFormatada = a.gerado_em ? new Date(a.gerado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Recente';

      return `
        <tr class="hover:bg-slate-50/80 transition-colors">
          <td class="py-2.5 px-3.5 whitespace-nowrap">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border ${badgeClass}">
              <span class="w-1.5 h-1.5 rounded-full ${isCritico ? 'bg-rose-600' : 'bg-amber-600'}"></span>
              ${a.nivel || 'Atenção'}
            </span>
          </td>
          <td class="py-2.5 px-3.5 font-medium text-slate-800">${a.estacao_nome || a.estacao_codigo || 'Estação'}</td>
          <td class="py-2.5 px-3.5 font-bold text-slate-900">${a.parametro || 'Geral'}</td>
          <td class="py-2.5 px-3.5 font-sans text-slate-700">${a.descricao}</td>
          <td class="py-2.5 px-3.5 text-center whitespace-nowrap">
            <span class="px-2 py-0.5 rounded-md text-[10.5px] font-semibold ${statusClass}">${a.status || 'Aberto'}</span>
          </td>
          <td class="py-2.5 px-3.5 text-slate-400 font-mono text-[11px] whitespace-nowrap">${dataFormatada}</td>
        </tr>
      `;
    }).join('');

    if (alertSummaryCounter) {
      alertSummaryCounter.textContent = `${alerts.length} ocorrência(s) encontrada(s).`;
    }
  }

  function updateAlertBadges(alerts) {
    const abertos = alerts.filter(a => (a.status || '').toLowerCase() !== 'resolvido').length;
    if (topAlertCountBadge) topAlertCountBadge.textContent = abertos;
    if (sidebarAlertBadge) sidebarAlertBadge.textContent = abertos;
  }

  function openAlertasModal() {
    if (alertasModal) {
      alertasModal.classList.remove('hidden');
      fetchAlertas(currentAlertFilter);
      if (window.lucide) lucide.createIcons();
    }
  }

  function closeAlertasModal() {
    if (alertasModal) alertasModal.classList.add('hidden');
  }

  if (btnTopAlerts) btnTopAlerts.onclick = openAlertasModal;
  if (sidebarBtnAlertas) sidebarBtnAlertas.onclick = openAlertasModal;
  if (btnCloseAlertasModal) btnCloseAlertasModal.onclick = closeAlertasModal;
  if (alertasModal) {
    alertasModal.onclick = (e) => {
      if (e.target === alertasModal) closeAlertasModal();
    };
  }

  document.querySelectorAll('.alert-filter-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.alert-filter-btn').forEach(b => {
        b.classList.remove('bg-slate-900', 'text-white', 'is-active');
        b.classList.add('text-slate-600');
      });
      btn.classList.add('bg-slate-900', 'text-white', 'is-active');
      btn.classList.remove('text-slate-600');
      fetchAlertas(btn.dataset.status);
    };
  });

  // Atualizar contagem inicial de alertas
  fetchAlertas('todos');

  /**
   * Chart.js Time-Series Dual Y-Axes
   */
  function initChart() {
    const canvas = document.getElementById('ireChart');
    if (!canvas || !window.Chart) return;
    const ctx = canvas.getContext('2d');

    // Create a smooth vertical gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, 160);
    gradient.addColorStop(0, 'rgba(37, 99, 235, 0.22)');
    gradient.addColorStop(0.8, 'rgba(37, 99, 235, 0.02)');
    gradient.addColorStop(1, 'rgba(37, 99, 235, 0.0)');

    const initialLabels = [];
    const initialIRE = [];
    if (Array.isArray(state.history) && state.history.length > 0) {
      const reversed = [...state.history].reverse().slice(-15);
      reversed.forEach(item => {
        initialLabels.push(item.timestamp || item.time || '');
        initialIRE.push(parseFloat(item.ire) || 85);
      });
    }

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: initialLabels,
        datasets: [
          {
            label: 'IRE',
            data: initialIRE,
            borderColor: '#2563EB',
            backgroundColor: gradient,
            borderWidth: 2.5,
            pointRadius: (context) => {
              const idx = context.dataIndex;
              const count = context.dataset.data.length;
              return idx === count - 1 ? 4 : 0;
            },
            pointHoverRadius: 6,
            pointBackgroundColor: '#2563EB',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            tension: 0.38,
            fill: true,
            yAxisID: 'y'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 250 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            borderColor: 'rgba(255, 255, 255, 0.12)',
            borderWidth: 1,
            displayColors: false,
            padding: { top: 8, bottom: 8, left: 10, right: 10 },
            cornerRadius: 8,
            titleFont: { family: "'IBM Plex Mono', monospace", size: 10, weight: '500' },
            titleColor: '#94A3B8',
            bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: '700' },
            bodyColor: '#FFFFFF',
            callbacks: {
              title: (items) => `Horário: ${items[0].label}`,
              label: (item) => `Índice IRE: ${Number(item.raw).toFixed(1)} pts`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: '#94A3B8',
              font: { family: "'IBM Plex Mono', monospace", size: 9.5 },
              maxRotation: 0,
              minRotation: 0,
              autoSkip: true,
              maxTicksLimit: 4,
              padding: 6
            }
          },
          y: {
            min: 0,
            max: 100,
            position: 'left',
            grid: {
              color: '#F1F5F9',
              drawTicks: false
            },
            border: { display: false },
            ticks: {
              color: '#94A3B8',
              font: { family: "'IBM Plex Mono', monospace", size: 9.5 },
              padding: 6,
              stepSize: 25,
              callback: (val) => val
            }
          }
        }
      }
    });

    updateChartHeaderStat();
  }

  function updateChart(ireNum) {
    if (!chartInstance) return;
    const nowLabel = new Date().toLocaleTimeString('pt-BR');
    chartInstance.data.labels.push(nowLabel);
    chartInstance.data.datasets[0].data.push(ireNum);

    if (chartInstance.data.labels.length > 15) {
      chartInstance.data.labels.shift();
      chartInstance.data.datasets[0].data.shift();
    }
    chartInstance.update();
    updateChartHeaderStat();
  }

  function updateChartHeaderStat() {
    const elScore = document.getElementById('chartCurrentIRE');
    const elBadge = document.getElementById('chartCurrentBadge');
    const elCount = document.getElementById('chartReadingsCount');

    if (chartInstance && chartInstance.data.datasets[0].data.length > 0) {
      const data = chartInstance.data.datasets[0].data;
      const latest = data[data.length - 1];
      const count = data.length;

      if (elScore) elScore.textContent = Number(latest).toFixed(1);
      if (elCount) elCount.textContent = `${count} leituras`;

      if (elBadge) {
        if (latest >= 80) {
          elBadge.textContent = 'ÓTIMO';
          elBadge.className = 'text-[10px] font-bold font-mono px-2 py-0.5 rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-200';
        } else if (latest >= 60) {
          elBadge.textContent = 'ATENÇÃO';
          elBadge.className = 'text-[10px] font-bold font-mono px-2 py-0.5 rounded-lg border bg-amber-50 text-amber-700 border-amber-200';
        } else if (latest >= 40) {
          elBadge.textContent = 'ALERTA';
          elBadge.className = 'text-[10px] font-bold font-mono px-2 py-0.5 rounded-lg border bg-orange-50 text-orange-700 border-orange-200';
        } else {
          elBadge.textContent = 'CRÍTICO';
          elBadge.className = 'text-[10px] font-bold font-mono px-2 py-0.5 rounded-lg border bg-rose-50 text-rose-700 border-rose-200';
        }
      }
    }
  }

  /**
   * Telemetry Historical Data Engine & Modal Table Manager
   */
  function seedInitialHistory() {
    if (!Array.isArray(state.history) || state.history.length < 5) {
      const currentSt = getActiveStation();
      const stName = currentSt ? currentSt.name : 'BRB-04 · Barbosa';
      const now = Date.now();
      const sampleOffsets = [
        { min: 4, ph: 7.4, turb: 9, temp: 22.8 },
        { min: 18, ph: 7.3, turb: 12, temp: 23.0 },
        { min: 45, ph: 7.6, turb: 20, temp: 23.5 },
        { min: 90, ph: 7.8, turb: 28, temp: 24.1 },
        { min: 180, ph: 7.9, turb: 35, temp: 24.6 },
        { min: 360, ph: 7.2, turb: 10, temp: 22.2 }
      ];

      state.history = sampleOffsets.map(item => {
        const itemDate = new Date(now - item.min * 60 * 1000);
        const diag = engine.diagnose({ ph: item.ph, turb: item.turb, od: item.od, temp: item.temp });
        return {
          timestamp: itemDate.toLocaleTimeString('pt-BR'),
          date: itemDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          stationName: stName,
          ire: diag.ire,
          status: diag.status,
          params: { ph: item.ph, turb: item.turb, od: item.od, temp: item.temp }
        };
      });
      app.saveState(state);
    }
  }

  function addHistoryLogEntry(params, diag) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR');
    const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const currentSt = getActiveStation();

    const entry = {
      timestamp: timeStr,
      date: dateStr,
      rawDate: now.toISOString(),
      stationName: currentSt ? currentSt.name : 'Estação Tietê',
      stationId: currentSt ? currentSt.id : 'BRB-04',
      ire: diag.ire,
      status: diag.status,
      params: { ...params }
    };

    if (!Array.isArray(state.history)) {
      state.history = [];
    }

    state.history.unshift(entry);
    if (state.history.length > 50) state.history.pop();
    app.saveState(state);
    renderHistoryTable();
  }

  function getFilteredHistory() {
    if (!Array.isArray(state.history)) return [];

    let filtered = [...state.history];

    // Filtro por Estação
    if (historyStationFilter && historyStationFilter.value && historyStationFilter.value !== 'todas') {
      const selectedId = historyStationFilter.value;
      const targetStation = (state.stations || []).find(s => s.id === selectedId);
      filtered = filtered.filter(item => {
        return (item.stationId && item.stationId === selectedId) ||
               (item.stationName && targetStation && item.stationName === targetStation.name) ||
               (item.stationName && item.stationName.includes(selectedId));
      });
    }

    // Filtro por Período (RF13)
    if (historyPeriodSelect) {
      const period = historyPeriodSelect.value;
      const now = Date.now();

      if (period === '24h') {
        const threshold = 24 * 60 * 60 * 1000;
        filtered = filtered.filter(item => {
          if (!item.rawDate) return true;
          return (now - new Date(item.rawDate).getTime()) <= threshold;
        });
      } else if (period === '7d') {
        const threshold = 7 * 24 * 60 * 60 * 1000;
        filtered = filtered.filter(item => {
          if (!item.rawDate) return true;
          return (now - new Date(item.rawDate).getTime()) <= threshold;
        });
      } else if (period === '30d') {
        const threshold = 30 * 24 * 60 * 60 * 1000;
        filtered = filtered.filter(item => {
          if (!item.rawDate) return true;
          return (now - new Date(item.rawDate).getTime()) <= threshold;
        });
      } else if (period === 'custom') {
        const startVal = historyDateStart ? historyDateStart.value : null;
        const endVal = historyDateEnd ? historyDateEnd.value : null;
        if (startVal) {
          const startTime = new Date(startVal + 'T00:00:00').getTime();
          filtered = filtered.filter(item => {
            const d = item.rawDate ? new Date(item.rawDate).getTime() : now;
            return d >= startTime;
          });
        }
        if (endVal) {
          const endTime = new Date(endVal + 'T23:59:59').getTime();
          filtered = filtered.filter(item => {
            const d = item.rawDate ? new Date(item.rawDate).getTime() : now;
            return d <= endTime;
          });
        }
      }
    }

    return filtered;
  }

  function renderHistoryTable() {
    if (!historyTableBody) return;
    const filteredList = getFilteredHistory();

    if (filteredList.length === 0) {
      historyTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-8 text-slate-400 font-sans">
            Nenhum registro encontrado no histórico para o período e estação selecionados.
          </td>
        </tr>
      `;
      if (historyRecordCount) historyRecordCount.textContent = '0 registros encontrados.';
      return;
    }

    historyTableBody.innerHTML = filteredList.map(item => {
      const time = item.timestamp || '--:--:--';
      const date = item.date || 'Hoje';
      const station = item.stationName || 'Estação Tietê';
      const p = item.params || {};
      const ph = p.ph !== undefined ? Number(p.ph).toFixed(1) : '--';
      const turb = p.turb !== undefined ? Math.round(p.turb) : '--';
      const temp = p.temp !== undefined ? Number(p.temp).toFixed(1) : '--';
      const ireVal = item.ire !== undefined ? Number(item.ire).toFixed(1) : '--';
      const statusCode = item.status ? item.status.code : 'REGULAR';
      const statusTitle = item.status ? item.status.title : 'Leitura';
      const colorHex = getStatusColor(statusCode);

      return `
        <tr class="hover:bg-slate-50/80 transition-colors">
          <td class="py-2.5 px-3.5 whitespace-nowrap">
            <span class="font-bold text-slate-900">${time}</span>
            <span class="text-[10px] text-slate-400 ml-1.5">${date}</span>
          </td>
          <td class="py-2.5 px-3.5 whitespace-nowrap font-medium text-slate-800">
            ${station}
          </td>
          <td class="py-2.5 px-3.5 text-center whitespace-nowrap">
            <span class="px-2 py-0.5 rounded-lg font-bold text-xs border" style="color: ${colorHex}; border-color: ${colorHex}40; background-color: ${colorHex}15">
              ${ireVal}
            </span>
          </td>
          <td class="py-2.5 px-3.5 text-center font-semibold text-slate-700">${ph}</td>
          <td class="py-2.5 px-3.5 text-center font-semibold text-slate-700">${turb} <span class="text-[10px] text-slate-400 font-normal">NTU</span></td>
          <td class="py-2.5 px-3.5 text-center font-semibold text-slate-700">${temp} <span class="text-[10px] text-slate-400 font-normal">°C</span></td>
          <td class="py-2.5 px-3.5">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold border" style="color: ${colorHex}; border-color: ${colorHex}30; background-color: ${colorHex}10">
              <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${colorHex}"></span>
              ${statusTitle}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    if (historyRecordCount) {
      historyRecordCount.textContent = `Exibindo ${filteredList.length} registro(s) sincronizados com a telemetria do Rio Tietê.`;
    }
  }

  /**
   * Auto-Simulation Step
   */
  function runSimulationStep() {
    let newPH = state.params.ph + (Math.random() * 0.4 - 0.2);
    newPH = Math.max(5.5, Math.min(10.0, newPH));

    let newTurb = state.params.turb + (Math.random() * 4 - 2);
    newTurb = Math.max(2, Math.min(140, newTurb));

    let newTemp = state.params.temp + (Math.random() * 0.2 - 0.1);
    newTemp = Math.max(15, Math.min(32, newTemp));

    state.params = { ph: newPH, turb: newTurb, temp: newTemp };

    const diag = engine.diagnose(state.params);
    addHistoryLogEntry(state.params, diag);
    renderDashboard();
  }

  function startSimLoop() {
    if (simIntervalId) clearInterval(simIntervalId);
    simIntervalId = setInterval(runSimulationStep, 3000);
    state.isLoopRunning = true;
    if (btnToggleTelemetry) {
      btnToggleTelemetry.className = 'preset-pill-btn active-auto';
      btnToggleTelemetry.innerHTML = `<i data-lucide="pause" class="w-3.5 h-3.5"></i> <span>Pausar Simulação</span>`;
    }
    app.saveState(state);
    if (window.lucide) lucide.createIcons();
  }

  function stopSimLoop() {
    if (simIntervalId) clearInterval(simIntervalId);
    simIntervalId = null;
    state.isLoopRunning = false;
    if (btnToggleTelemetry) {
      btnToggleTelemetry.className = 'preset-pill-btn';
      btnToggleTelemetry.innerHTML = `<i data-lucide="play" class="w-3.5 h-3.5 text-blue-600"></i> <span>Iniciar Simulação</span>`;
    }
    app.saveState(state);
    if (window.lucide) lucide.createIcons();
  }

  // Preset Scenario Quick Buttons Function
  function applyPresetScenario(ph, turb, temp, tag, btnElement, activeClass) {
    if (simIntervalId) {
      clearInterval(simIntervalId);
      simIntervalId = null;
      state.isLoopRunning = false;
    }
    state.params = { ph, turb, temp };
    state.activeScenarioTag = tag;
    app.saveState(state);

    // Update Pill Buttons Highlight
    [sc1, sc2, sc4, btnToggleTelemetry].forEach(b => {
      if (b) {
        b.className = 'preset-pill-btn';
      }
    });

    if (btnElement && activeClass) {
      btnElement.classList.add(activeClass);
    }

    if (btnToggleTelemetry) {
      btnToggleTelemetry.innerHTML = `<i data-lucide="play" class="w-3.5 h-3.5 text-blue-600"></i> <span>Iniciar Simulação</span>`;
    }

    const diag = engine.diagnose(state.params);
    addHistoryLogEntry(state.params, diag);
    renderDashboard();
    if (window.lucide) lucide.createIcons();
  }

  // Bind Quick Buttons
  const sc1 = document.getElementById('btnQuickScenario1');
  const sc2 = document.getElementById('btnQuickScenario2');
  const sc4 = document.getElementById('btnQuickScenario4');

  if (sc1) sc1.onclick = () => applyPresetScenario(7.2, 4.0, 22.4, 'Água Boa', sc1, 'active-ideal');
  if (sc2) sc2.onclick = () => applyPresetScenario(8.4, 48.0, 26.5, 'Água Regular', sc2, 'active-regular');
  if (sc4) sc4.onclick = () => applyPresetScenario(9.2, 120.0, 29.5, 'Água Crítica', sc4, 'active-ruim');

  // Action Buttons
  if (btnToggleTelemetry) {
    btnToggleTelemetry.onclick = () => {
      if (state.isLoopRunning && simIntervalId) {
        stopSimLoop();
      } else {
        [sc1, sc2, sc4].forEach(b => { if (b) b.className = 'preset-pill-btn'; });
        runSimulationStep();
        startSimLoop();
      }
    };
  }

  // Boot & Initial Run
  seedInitialHistory();
  initMap();
  initChart();
  updateStationUI();
  renderDashboard();
  renderHistoryTable();
  stopSimLoop();
});
