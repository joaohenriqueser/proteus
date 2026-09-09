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

  const valOD = document.getElementById('valOD');
  const noteOD = document.getElementById('noteOD');
  const dotOD = document.getElementById('dotOD');

  const valTemp = document.getElementById('valTemp');
  const noteTemp = document.getElementById('noteTemp');
  const dotTemp = document.getElementById('dotTemp');

  // Footer & Log Elements
  const historyLogContainer = document.getElementById('historyLogContainer');
  const btnClearHistory = document.getElementById('btnClearHistory');
  const btnToggleTelemetry = document.getElementById('btnToggleTelemetry');
  const mapOverlayStatus = document.getElementById('mapOverlayStatus');

  // Station DOM Elements & Map Picker Variables
  const stationSelect = document.getElementById('stationSelect');
  const stationNameDisplay = document.getElementById('stationNameDisplay');
  const mapStationLabel = document.getElementById('mapStationLabel');
  const addStationModal = document.getElementById('addStationModal');
  const btnAddStationModal = document.getElementById('btnAddStationModal');
  const btnEditStation = document.getElementById('btnEditStation');
  const btnDeleteStation = document.getElementById('btnDeleteStation');
  const btnCloseStationModal = document.getElementById('btnCloseStationModal');
  const btnCancelStationModal = document.getElementById('btnCancelStationModal');
  const formAddStation = document.getElementById('formAddStation');
  const inputEditingStationId = document.getElementById('inputEditingStationId');
  const modalStationTitle = document.getElementById('modalStationTitle');

  const mapPickBanner = document.getElementById('mapPickBanner');
  const btnCancelMapPick = document.getElementById('btnCancelMapPick');
  const btnPickPointOnMap = document.getElementById('btnPickPointOnMap');

  let allStationMarkers = [];
  let isMapPickMode = false;
  let tempPickerMarker = null;

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
      const stParams = st.params || { ph: 7.2, turb: 8, od: 6.8, temp: 22.4 };
      const stDiag = engine.diagnose(stParams);
      const stColor = getStatusColor(stDiag.status.code);

      if (isActive) {
        if (mapHalo) {
          mapHalo.setLatLng(st.coords);
          mapHalo.setStyle({ color: activeColor, fillColor: activeColor });
        }
        if (mapMarker) {
          mapMarker.setLatLng(st.coords);
          mapMarker.setStyle({ color: activeColor, fillColor: '#020617' });
          mapMarker.setPopupContent(`<b>Estação Ativa: ${st.name}</b><br>${st.river}<br>IRE: ${currentDiag.ire} — ${currentDiag.status.title}`);
        }
      } else {
        const marker = L.circleMarker(st.coords, {
          radius: 6,
          color: stColor,
          weight: 2,
          fillColor: '#0F172A',
          fillOpacity: 0.85
        }).addTo(mapInstance);

        marker.bindPopup(`<b>Estação ${st.name}</b><br>${st.river}<br>IRE Estimado: ${stDiag.ire}<br><span style="color:#06B6D4">Clique para selecionar</span>`);

        marker.on('click', () => {
          switchStation(st.id);
        });

        allStationMarkers.push(marker);
      }
    });
  }

  /**
   * Color Palette Helper
   */
  function getStatusColor(code) {
    switch (code) {
      case 'CRITICO': return '#C55A54';
      case 'ALERTA': return '#C97A3C';
      case 'ATENCAO': return '#C9A03C';
      default: return '#3FA87A';
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
      scenarioTagDisplay.textContent = state.activeScenarioTag || '[MOCK] ÁGUA IDEAL';
    }
    if (lastReadTimestamp) {
      const now = new Date();
      lastReadTimestamp.textContent = `${now.toLocaleTimeString('pt-BR')} [MOCK]`;
    }

    // Individual Parameters
    // 1. pH
    if (valPH) valPH.textContent = state.params.ph.toFixed(1);
    if (notePH) {
      if (state.params.ph >= 6.5 && state.params.ph <= 8.0) {
        notePH.textContent = 'Faixa neutra (CONAMA OK)';
        if (dotPH) dotPH.style.backgroundColor = '#3FA87A';
      } else if (state.params.ph > 8.5) {
        notePH.textContent = 'Alcalino / Floração Algal';
        if (dotPH) dotPH.style.backgroundColor = '#C97A3C';
      } else {
        notePH.textContent = 'Fora dos padrões';
        if (dotPH) dotPH.style.backgroundColor = '#C9A03C';
      }
    }

    // 2. Turbidez
    if (valTurb) valTurb.textContent = Math.round(state.params.turb);
    if (noteTurb) {
      if (state.params.turb <= 10) {
        noteTurb.textContent = 'Sólidos baixos (Excelente)';
        if (dotTurb) dotTurb.style.backgroundColor = '#3FA87A';
      } else if (state.params.turb > 100) {
        noteTurb.textContent = 'Acima do limite (>100 NTU)';
        if (dotTurb) dotTurb.style.backgroundColor = '#C55A54';
      } else {
        noteTurb.textContent = 'Aporte em elevação';
        if (dotTurb) dotTurb.style.backgroundColor = '#C9A03C';
      }
    }

    // 3. OD
    if (valOD) valOD.textContent = state.params.od.toFixed(1);
    if (noteOD) {
      if (state.params.od >= 5.0) {
        noteOD.textContent = 'Saturação adequada';
        if (dotOD) dotOD.style.backgroundColor = '#3FA87A';
      } else if (state.params.od < 2.0) {
        noteOD.textContent = 'Anóxico / Hipóxia Severa';
        if (dotOD) dotOD.style.backgroundColor = '#C55A54';
      } else {
        noteOD.textContent = 'Oxigênio em queda';
        if (dotOD) dotOD.style.backgroundColor = '#C9A03C';
      }
    }

    // 4. Temperatura
    if (valTemp) valTemp.textContent = state.params.temp.toFixed(1);
    if (noteTemp) {
      if (state.params.temp >= 25.0) {
        noteTemp.textContent = 'Estresse térmico (Ftemp 1.2)';
        if (dotTemp) dotTemp.style.backgroundColor = '#C97A3C';
      } else {
        noteTemp.textContent = 'Sazonal normal';
        if (dotTemp) dotTemp.style.backgroundColor = '#3FA87A';
      }
    }

    // Sync Map Marker & Circle Halo
    syncMap(colorHex, status.title);

    // Sync Chart & Log
    updateChart(ireNum, state.params.od);
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
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false
    }).setView(coords, 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap · © CARTO · TILES REAIS / DADOS MOCKADOS',
      maxZoom: 19
    }).addTo(mapInstance);

    const initialColor = getStatusColor('OTIMO');
    mapHalo = L.circle(coords, {
      radius: 900,
      color: initialColor,
      weight: 1,
      fillColor: initialColor,
      fillOpacity: 0.12
    }).addTo(mapInstance);

    mapMarker = L.circleMarker(coords, {
      radius: 6,
      color: initialColor,
      weight: 2,
      fillColor: '#020617',
      fillOpacity: 1
    }).addTo(mapInstance);

    mapMarker.bindPopup(`<b>Estação ${currentSt.name}</b><br>${currentSt.river}`);

    // Map Click Listener for Station Picker Mode
    mapInstance.on('click', handleMapClick);

    setTimeout(() => mapInstance.invalidateSize(), 200);
  }

  function syncMap(colorHex, statusTitle) {
    if (!mapInstance || !mapMarker || !mapHalo) return;
    const currentSt = getActiveStation();
    mapHalo.setStyle({ color: colorHex, fillColor: colorHex });
    mapMarker.setStyle({ color: colorHex });
    mapMarker.setPopupContent(`<b>Estação ${currentSt.name}</b><br>IRE ${state.params.ph.toFixed(1)} — ${statusTitle}<br>${state.activeScenarioTag}`);
    if (mapOverlayStatus) {
      mapOverlayStatus.textContent = statusTitle;
      mapOverlayStatus.style.color = colorHex;
    }
  }

  /**
   * Map Point Picker Mode Controller
   */
  function enableMapPickMode() {
    isMapPickMode = true;
    if (addStationModal) addStationModal.classList.add('hidden');
    if (mapPickBanner) mapPickBanner.classList.remove('hidden');
    const container = document.getElementById('leafletMap');
    if (container) container.style.cursor = 'crosshair';
  }

  function disableMapPickMode() {
    isMapPickMode = false;
    if (mapPickBanner) mapPickBanner.classList.add('hidden');
    const container = document.getElementById('leafletMap');
    if (container) container.style.cursor = '';
  }

  function handleMapClick(e) {
    if (!isMapPickMode) return;

    const lat = parseFloat(e.latlng.lat.toFixed(4));
    const lng = parseFloat(e.latlng.lng.toFixed(4));

    const inputLat = document.getElementById('inputStationLat');
    const inputLng = document.getElementById('inputStationLng');
    if (inputLat) inputLat.value = lat;
    if (inputLng) inputLng.value = lng;

    if (tempPickerMarker && mapInstance) {
      mapInstance.removeLayer(tempPickerMarker);
    }

    if (window.L && mapInstance) {
      tempPickerMarker = L.circleMarker([lat, lng], {
        radius: 8,
        color: '#22D3EE',
        fillColor: '#06B6D4',
        fillOpacity: 0.9,
        weight: 3
      }).addTo(mapInstance);
      tempPickerMarker.bindPopup(`<b>Ponto Selecionado</b><br>Lat: ${lat}, Lng: ${lng}`).openPopup();
    }

    disableMapPickMode();
    openStationModal(!!(inputEditingStationId && inputEditingStationId.value));
  }

  /**
   * Station Modal Controller
   */
  function openStationModal(isEdit = false) {
    const currentSt = getActiveStation();
    if (isEdit && currentSt) {
      if (inputEditingStationId) inputEditingStationId.value = currentSt.id;
      if (modalStationTitle) modalStationTitle.innerHTML = `<i data-lucide="edit-3" class="w-4 h-4 text-[#06B6D4]"></i> Editar Estação de Telemetria`;

      const inputName = document.getElementById('inputStationName');
      const inputLat = document.getElementById('inputStationLat');
      const inputLng = document.getElementById('inputStationLng');
      const inputRiver = document.getElementById('inputStationRiver');

      if (inputName) inputName.value = currentSt.name;
      if (inputLat) inputLat.value = currentSt.coords[0];
      if (inputLng) inputLng.value = currentSt.coords[1];
      if (inputRiver) inputRiver.value = currentSt.river;
    } else {
      if (inputEditingStationId) inputEditingStationId.value = '';
      if (modalStationTitle) modalStationTitle.innerHTML = `<i data-lucide="map-pin-plus" class="w-4 h-4 text-[#06B6D4]"></i> Cadastrar Nova Estação de Telemetria`;
      if (formAddStation) formAddStation.reset();
    }

    if (addStationModal) addStationModal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  function closeStationModal() {
    if (addStationModal) addStationModal.classList.add('hidden');
    if (formAddStation) formAddStation.reset();
    if (tempPickerMarker && mapInstance) {
      mapInstance.removeLayer(tempPickerMarker);
      tempPickerMarker = null;
    }
  }

  function deleteActiveStation() {
    if (!Array.isArray(state.stations) || state.stations.length <= 1) {
      alert('Você deve manter pelo menos uma estação cadastrada.');
      return;
    }
    const currentSt = getActiveStation();
    if (!currentSt) return;

    if (confirm(`Tem certeza que deseja remover a estação "${currentSt.name}"?`)) {
      state.stations = state.stations.filter(s => s.id !== currentSt.id);
      const nextStation = state.stations[0];
      switchStation(nextStation.id);
    }
  }

  if (btnAddStationModal) btnAddStationModal.onclick = () => openStationModal(false);
  if (btnEditStation) btnEditStation.onclick = () => openStationModal(true);
  if (btnDeleteStation) btnDeleteStation.onclick = deleteActiveStation;
  if (btnCloseStationModal) btnCloseStationModal.onclick = closeStationModal;
  if (btnCancelStationModal) btnCancelStationModal.onclick = closeStationModal;

  if (btnPickPointOnMap) btnPickPointOnMap.onclick = enableMapPickMode;
  if (btnCancelMapPick) {
    btnCancelMapPick.onclick = () => {
      disableMapPickMode();
      openStationModal(!!(inputEditingStationId && inputEditingStationId.value));
    };
  }

  if (stationSelect) {
    stationSelect.onchange = (e) => {
      switchStation(e.target.value);
    };
  }

  if (formAddStation) {
    formAddStation.onsubmit = (e) => {
      e.preventDefault();
      const editingId = inputEditingStationId ? inputEditingStationId.value : '';
      const name = document.getElementById('inputStationName').value.trim();
      const lat = parseFloat(document.getElementById('inputStationLat').value);
      const lng = parseFloat(document.getElementById('inputStationLng').value);
      const river = document.getElementById('inputStationRiver').value.trim();

      if (!name || isNaN(lat) || isNaN(lng) || !river) return;

      if (editingId) {
        const st = state.stations.find(s => s.id === editingId);
        if (st) {
          st.name = name;
          st.coords = [lat, lng];
          st.river = river;
        }
        switchStation(editingId);
      } else {
        const newId = 'STATION_' + Date.now();
        const newStation = {
          id: newId,
          name,
          river,
          coords: [lat, lng],
          params: { ph: 7.2, turb: 10, od: 7.0, temp: 23.0 },
          scenarioTag: '[MOCK] NOVA ESTAÇÃO'
        };

        state.stations.push(newStation);
        switchStation(newId);
      }

      if (tempPickerMarker && mapInstance) {
        mapInstance.removeLayer(tempPickerMarker);
        tempPickerMarker = null;
      }
      closeStationModal();
    };
  }

  /**
   * Chart.js Time-Series Dual Y-Axes
   */
  function initChart() {
    const ctx = document.getElementById('ireChart');
    if (!ctx || !window.Chart) return;

    const initialLabels = [];
    const initialIRE = [];
    const initialOD = [];

    if (Array.isArray(state.history) && state.history.length > 0) {
      const reversed = [...state.history].reverse().slice(-15);
      reversed.forEach(item => {
        initialLabels.push(item.timestamp || item.time || '');
        initialIRE.push(parseFloat(item.ire) || 85);
        const odVal = item.params ? item.params.od : parseFloat(item.od) || 6.8;
        initialOD.push(odVal);
      });
    }

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: initialLabels,
        datasets: [
          {
            label: 'IRE [MOCK]',
            data: initialIRE,
            borderColor: '#06B6D4',
            backgroundColor: 'rgba(6, 182, 212, 0.10)',
            borderWidth: 1.6,
            pointRadius: 2,
            pointBackgroundColor: '#06B6D4',
            tension: 0.3,
            fill: true,
            yAxisID: 'y'
          },
          {
            label: 'OD mg/L [MOCK]',
            data: initialOD,
            borderColor: '#2563EB',
            backgroundColor: 'transparent',
            borderWidth: 1.6,
            borderDash: [4, 4],
            pointRadius: 2,
            pointBackgroundColor: '#2563EB',
            tension: 0.3,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 320 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0F172A',
            borderColor: '#1E293B',
            borderWidth: 1,
            displayColors: true,
            titleColor: '#F8FAFC',
            bodyColor: '#94A3B8',
            padding: 8,
            cornerRadius: 3,
            titleFont: { family: "'IBM Plex Mono',monospace", size: 10 },
            bodyFont: { family: "'IBM Plex Mono',monospace", size: 10 }
          }
        },
        scales: {
          x: {
            grid: { color: '#111C31', drawTicks: false },
            border: { color: '#1E293B' },
            ticks: { color: '#475569', font: { family: "'IBM Plex Mono',monospace", size: 9 }, padding: 8 }
          },
          y: {
            min: 0,
            max: 100,
            position: 'left',
            grid: { color: '#111C31', drawTicks: false },
            border: { display: false },
            title: { display: true, text: 'IRE [MOCK]', color: '#475569', font: { family: "'IBM Plex Mono',monospace", size: 9 } },
            ticks: { color: '#475569', font: { family: "'IBM Plex Mono',monospace", size: 9 }, padding: 6, stepSize: 25 }
          },
          y1: {
            min: 0,
            max: 10,
            position: 'right',
            grid: { display: false },
            border: { display: false },
            title: { display: true, text: 'OD mg/L [MOCK]', color: '#475569', font: { family: "'IBM Plex Mono',monospace", size: 9 } },
            ticks: { color: '#475569', font: { family: "'IBM Plex Mono',monospace", size: 9 }, padding: 6, stepSize: 2.5 }
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
    chartInstance.data.datasets[1].data.push(od);

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
      historyLogContainer.innerHTML = `<div class="text-xs text-slate-500 py-4 text-center font-mono font-medium">NENHUMA LEITURA REGISTRADA NO MOCK.</div>`;
      return;
    }

    historyLogContainer.innerHTML = state.history.map(item => {
      const time = item.timestamp || item.time || '--:--:--';
      const title = item.status ? item.status.title : 'LEITURA SIMULADA';
      const colorHex = item.status ? getStatusColor(item.status.code) : '#3FA87A';
      const ireVal = item.ire || '--';

      return `
        <div class="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono transition-all hover:border-slate-700">
          <div class="flex items-center gap-2">
            <span class="text-[11px] text-slate-500 font-medium">${time}</span>
            <span class="font-semibold text-[10px] px-1.5 py-0.5 rounded border" style="color: ${colorHex}; border-color: ${colorHex}40; background-color: ${colorHex}15">${title}</span>
          </div>
          <div class="font-bold text-white text-xs">
            IRE: <span style="color: ${colorHex}">${ireVal}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Auto-Simulation Step
   */
  function runSimulationStep() {
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
      btnToggleTelemetry.innerHTML = `<i data-lucide="pause" class="w-3 h-3"></i> <span>PAUSAR SIMULAÇÃO</span>`;
    }
    app.saveState(state);
    if (window.lucide) lucide.createIcons();
  }

  function stopSimLoop() {
    if (simIntervalId) clearInterval(simIntervalId);
    simIntervalId = null;
    state.isLoopRunning = false;
    if (btnToggleTelemetry) {
      btnToggleTelemetry.innerHTML = `<i data-lucide="play" class="w-3 h-3"></i> <span>REINICIAR SIMULAÇÃO</span>`;
    }
    app.saveState(state);
    if (window.lucide) lucide.createIcons();
  }

  // Preset Scenario Quick Buttons Function
  function applyPresetScenario(ph, turb, od, temp, tag, btnElement, activeClass) {
    if (simIntervalId) {
      clearInterval(simIntervalId);
      simIntervalId = null;
      state.isLoopRunning = false;
    }
    state.params = { ph, turb, od, temp };
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
      btnToggleTelemetry.innerHTML = `<i data-lucide="play" class="w-3.5 h-3.5 text-[#06B6D4]"></i> <span>Simulação Automática</span>`;
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

  if (sc1) sc1.onclick = () => applyPresetScenario(7.2, 4.0, 8.6, 22.4, '[MOCK] ÁGUA IDEAL', sc1, 'active-ideal');
  if (sc2) sc2.onclick = () => applyPresetScenario(8.4, 48.0, 3.8, 26.5, '[MOCK] ÁGUA REGULAR', sc2, 'active-regular');
  if (sc4) sc4.onclick = () => applyPresetScenario(9.2, 120.0, 1.1, 29.5, '[MOCK] ÁGUA RUIM / CRÍTICA', sc4, 'active-ruim');

  // Action Buttons
  if (btnToggleTelemetry) {
    btnToggleTelemetry.onclick = () => {
      [sc1, sc2, sc4].forEach(b => { if (b) b.className = 'preset-pill-btn'; });
      if (state.isLoopRunning && simIntervalId) {
        stopSimLoop();
        btnToggleTelemetry.className = 'preset-pill-btn';
      } else {
        btnToggleTelemetry.className = 'preset-pill-btn active-auto';
        runSimulationStep();
        startSimLoop();
      }
    };
  }

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
  initMap();
  initChart();
  updateStationUI();
  renderDashboard();
  startSimLoop();
});
