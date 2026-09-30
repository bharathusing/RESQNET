/**
 * RESQNET District Control Room Dashboard Logic
 * Multi-layer Leaflet GIS Mapping, Glowing divIcon Markers, Chart.js Hydrographs, and Simulation Studio
 */

const API_BASE = "http://localhost:8000";
const WS_URL = "ws://localhost:8000/ws/telemetry";

let map;
let nodeMarkers = {};
let selectedNodeId = "RESQ-NODE-01";
let waterChartInstance = null;
let landslideChartInstance = null;
let websocket = null;
let autoSequenceInterval = null;
let autoSequenceStep = 0;

// In-App Alert Notification State & Settings
let audioAlertsEnabled = true;
let alertHistoryList = [];
let unreadAlertCount = 0;
let lastAlertTimes = {}; // Cooldown tracker per node & hazard
let audioCtx = null;

// Initial Sensor Node Database
let nodesData = [
  { id: "RESQ-NODE-01", name: "Riverside Basin Station", type: "RIVER_ONLY", lat: 13.0850, lon: 80.2750, location: "Upper Adyar Stream - Zone 1", risk: 0, water: 45.2, rain: 2.1, soil: 35.0, tilt: 0.5, vib: 0.05, batt: 98 },
  { id: "RESQ-NODE-02", name: "Hillside Slope Monitor", type: "SLOPE_ONLY", lat: 13.0920, lon: 80.2680, location: "North Ridge Escarpment", risk: 0, water: 0.0, rain: 1.8, soil: 42.0, tilt: 1.2, vib: 0.08, batt: 95 },
  { id: "RESQ-NODE-03", name: "Bridge Valley Checkpoint", type: "DUAL", lat: 13.0780, lon: 80.2820, location: "Main Causeway Bridge", risk: 0, water: 60.5, rain: 2.5, soil: 50.0, tilt: 0.4, vib: 0.04, batt: 92 },
  { id: "RESQ-NODE-04", name: "High Ridge LoRa Gateway", type: "REPEATER", lat: 13.0990, lon: 80.2600, location: "Ridge Summit Tower", risk: 0, water: 0.0, rain: 0.5, soil: 20.0, tilt: 0.2, vib: 0.02, batt: 100 }
];

// ==========================================================================
// WEB AUDIO API SOUND SYNTHESIZER (Zero External Files Needed)
// ==========================================================================
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playAlertChime(severity) {
  if (!audioAlertsEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (severity === 'critical') {
      // Urgent triple beep alarm
      [0, 0.15, 0.3].forEach((delay, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(idx % 2 === 0 ? 950 : 1200, now + delay);
        gain.gain.setValueAtTime(0.2, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.12);
      });
    } else if (severity === 'water-rise') {
      // Ascending rapid water chime
      [520, 680, 880].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.22, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.18);
      });
    } else {
      // Gentle warning dual chime
      [650, 480].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.14);
        gain.gain.setValueAtTime(0.18, now + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.14 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 0.2);
      });
    }
  } catch (e) {
    console.warn("Audio chime skipped:", e);
  }
}

function toggleAudioAlerts() {
  audioAlertsEnabled = !audioAlertsEnabled;
  const btn = document.getElementById('btn-audio-toggle');
  const icon = document.getElementById('audio-icon');
  const label = document.getElementById('audio-label');

  if (audioAlertsEnabled) {
    btn.classList.add('active');
    icon.textContent = '🔊';
    label.textContent = 'Sound: ON';
    playAlertChime('water-rise'); // Confirmation beep
  } else {
    btn.classList.remove('active');
    icon.textContent = '🔇';
    label.textContent = 'Sound: OFF';
  }
}

// ==========================================================================
// IN-APP POPUP TOAST ALERT ENGINE
// ==========================================================================
function showInAppAlert(alertData) {
  const {
    nodeId = "SYSTEM",
    title = "Hazard Alert",
    message = "",
    severity = "warning", // 'water-rise' | 'warning' | 'critical' | 'normal'
    water = null,
    rain = null,
    soil = null,
    tilt = null,
    deltaWater = 0,
    durationMs = 8000
  } = alertData;

  // Play synthesized audio alert
  playAlertChime(severity);

  // Update notification badge counter
  unreadAlertCount++;
  updateNotificationBadge();

  // Save to in-memory drawer history
  const historyItem = {
    id: 'alert-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    time: new Date().toLocaleTimeString(),
    nodeId,
    title,
    message,
    severity,
    water,
    rain,
    soil,
    tilt
  };
  alertHistoryList.unshift(historyItem);
  renderAlertDrawer();

  // Render floating popup toast
  const container = document.getElementById('in-app-toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-card toast-${severity}`;
  toast.id = historyItem.id;

  let icon = "⚠️";
  if (severity === "critical") icon = "🚨";
  else if (severity === "water-rise") icon = "🌊";
  else if (severity === "normal") icon = "✅";

  let metaHTML = '';
  if (water !== null || rain !== null || soil !== null || tilt !== null) {
    metaHTML = `<div class="toast-meta-grid">`;
    if (water !== null) metaHTML += `<div class="toast-meta-item">💧 Water: <strong>${water.toFixed(1)} cm${deltaWater > 0 ? ` (+${deltaWater.toFixed(1)}cm)` : ''}</strong></div>`;
    if (rain !== null && rain > 0) metaHTML += `<div class="toast-meta-item">🌧️ Rain: <strong>${rain.toFixed(1)} mm/h</strong></div>`;
    if (soil !== null) metaHTML += `<div class="toast-meta-item">🌱 Soil: <strong>${soil.toFixed(1)}%</strong></div>`;
    if (tilt !== null && tilt > 1) metaHTML += `<div class="toast-meta-item">📐 Tilt: <strong>${tilt.toFixed(1)}°</strong></div>`;
    metaHTML += `</div>`;
  }

  toast.innerHTML = `
    <div class="toast-header">
      <div class="toast-header-left">
        <span class="toast-icon">${icon}</span>
        <span class="toast-title">${title}</span>
      </div>
      <div style="display:flex; align-items:center; gap:0.4rem;">
        <span class="toast-time">Just now</span>
        <button class="toast-close" onclick="dismissToast('${toast.id}')" title="Dismiss">✕</button>
      </div>
    </div>
    <div class="toast-message">${message}</div>
    ${metaHTML}
    <div class="toast-actions">
      ${nodeId !== 'SYSTEM' ? `<button class="btn-toast-action" onclick="focusAndDismiss('${nodeId}', '${toast.id}')">📍 View on Map</button>` : ''}
      <button class="btn-toast-action" style="color:#94a3b8;" onclick="dismissToast('${toast.id}')">Dismiss</button>
    </div>
    <div class="toast-progress-bar" style="animation-duration: ${durationMs}ms;"></div>
  `;

  container.appendChild(toast);

  // Auto-dismiss after durationMs
  setTimeout(() => {
    dismissToast(toast.id);
  }, durationMs);
}

function dismissToast(toastId) {
  const toast = document.getElementById(toastId);
  if (toast && !toast.classList.contains('toast-hide')) {
    toast.classList.add('toast-hide');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 280);
  }
}

function focusAndDismiss(nodeId, toastId) {
  selectNode(nodeId);
  dismissToast(toastId);
}

// Notification Drawer Logic
function toggleNotificationDrawer() {
  const drawer = document.getElementById('notification-drawer');
  drawer.classList.toggle('hidden');
  if (!drawer.classList.contains('hidden')) {
    // Reset unread badge on drawer open
    unreadAlertCount = 0;
    updateNotificationBadge();
  }
}

function updateNotificationBadge() {
  const badge = document.getElementById('notification-badge');
  if (badge) {
    badge.textContent = unreadAlertCount;
    if (unreadAlertCount > 0) {
      badge.style.display = 'flex';
      badge.classList.add('animate-pop');
      setTimeout(() => badge.classList.remove('animate-pop'), 200);
    } else {
      badge.style.display = 'none';
    }
  }
}

function clearAlertHistory() {
  alertHistoryList = [];
  renderAlertDrawer();
}

function renderAlertDrawer() {
  const list = document.getElementById('drawer-alerts-list');
  if (!list) return;

  if (alertHistoryList.length === 0) {
    list.innerHTML = `<div class="empty-drawer-msg">No alerts triggered yet. System monitoring within normal limits.</div>`;
    return;
  }

  list.innerHTML = '';
  alertHistoryList.slice(0, 30).forEach(item => {
    const div = document.createElement('div');
    div.className = `drawer-item ${item.severity}`;
    div.onclick = () => {
      if (item.nodeId && item.nodeId !== 'SYSTEM') {
        selectNode(item.nodeId);
        toggleNotificationDrawer();
      }
    };
    div.innerHTML = `
      <div class="drawer-item-top">
        <span>${item.title}</span>
        <span style="font-size:0.68rem; color:#94a3b8;">${item.time}</span>
      </div>
      <div style="color:#cbd5e1; margin-bottom:0.25rem;">${item.message}</div>
      <div style="font-size:0.7rem; color:#38bdf8;">📍 Node: ${item.nodeId} &bull; Click to Inspect</div>
    `;
    list.appendChild(div);
  });
}

// 1. Initialize Map with 3 Free Zero-API-Key Base Layers
function initMap() {
  // Base Layer 1: Dark Mode (Esri World Dark Gray Canvas - Default)
  const esriDark = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 16
  });

  // Base Layer 2: Street Map (OpenStreetMap Standard)
  const osmStreet = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  });

  // Base Layer 3: Satellite View (Esri World Imagery)
  const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18
  });

  // Initialize map instance
  map = L.map('map-container', {
    center: [13.0860, 80.2720],
    zoom: 14,
    layers: [esriDark] // Default base layer
  });

  // Layer Switcher in top-right corner
  const baseLayers = {
    "🌙 Dark Mode": esriDark,
    "🗺️ Street Map": osmStreet,
    "🛰️ Satellite View": esriSatellite
  };

  L.control.layers(baseLayers, null, { position: 'topright' }).addTo(map);

  // Render glowing markers
  updateMapMarkers();
}

// 2. Helper: Custom Glowing L.divIcon Marker Generator
function createGlowingIcon(riskLevel) {
  let statusClass = "status-normal";
  if (riskLevel === 1) statusClass = "status-warning";
  if (riskLevel >= 2) statusClass = "status-critical";

  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div class="resq-marker ${statusClass}">
        <div class="marker-pulse"></div>
        <div class="marker-core"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14]
  });
}

function getRiskName(r) {
  if (r === 1) return "WARNING";
  if (r === 2) return "CRITICAL FLOOD";
  if (r === 3) return "CRITICAL LANDSLIDE";
  return "NORMAL";
}

function getRiskBadgeHTML(riskLevel, riskName) {
  if (riskLevel === 1) return `<span class="risk-tag warning">⚠️ WARNING</span>`;
  if (riskLevel === 2) return `<span class="risk-tag critical">🚨 CRIT FLOOD</span>`;
  if (riskLevel === 3) return `<span class="risk-tag critical">🚨 CRIT SLIDE</span>`;
  return `<span class="risk-tag normal">✓ NORMAL</span>`;
}

function formatNodePopupHTML(node) {
  const riskColor = (node.risk >= 2) ? "#ef4444" : (node.risk === 1 ? "#f59e0b" : "#10b981");
  return `
    <div style="font-size:0.85rem; min-width:210px;">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #1f2d4a; padding-bottom:4px; margin-bottom:6px;">
        <strong style="color:#38bdf8;">${node.name}</strong>
        <span style="font-size:0.7rem; color:#94a3b8;">${node.id}</span>
      </div>
      <div style="color:#94a3b8; font-size:0.72rem; margin-bottom:8px;">📍 ${node.location}</div>
      <div style="background:#0b0f19; padding:6px 8px; border-radius:6px; margin-bottom:8px; border:1px solid #1f2d4a;">
        <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
          <span>Risk Status:</span>
          <strong style="color:${riskColor};">${getRiskName(node.risk)}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
          <span>💧 Water Level:</span>
          <strong>${node.water.toFixed(1)} cm</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
          <span>🌧️ Rain Intensity:</span>
          <strong>${node.rain.toFixed(1)} mm/hr</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
          <span>🌱 Soil Moisture:</span>
          <strong>${node.soil.toFixed(1)} %</strong>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span>📐 Slope Tilt:</span>
          <strong>${node.tilt.toFixed(1)}°</strong>
        </div>
      </div>
      <div style="font-size:0.7rem; color:#10b981; text-align:right;">
        🔋 Battery: ${node.batt || 95}% | 📶 LoRa Mesh Sync
      </div>
    </div>
  `;
}

function updateMapMarkers() {
  nodesData.forEach(node => {
    const icon = createGlowingIcon(node.risk);
    const popupContent = formatNodePopupHTML(node);

    if (!nodeMarkers[node.id]) {
      const marker = L.marker([node.lat, node.lon], { icon: icon }).addTo(map);
      marker.bindPopup(popupContent);

      marker.on('click', () => {
        selectNode(node.id);
      });

      nodeMarkers[node.id] = marker;
    } else {
      nodeMarkers[node.id].setIcon(icon);
      nodeMarkers[node.id].setPopupContent(popupContent);
    }
  });
}

function renderNodeList() {
  const container = document.getElementById('node-list-container');
  container.innerHTML = '';

  let criticalCount = 0;

  nodesData.forEach(node => {
    if (node.risk >= 2) criticalCount++;
    const card = document.createElement('div');
    card.className = `node-card ${node.id === selectedNodeId ? 'active' : ''}`;
    card.onclick = () => selectNode(node.id);

    card.innerHTML = `
      <div class="node-top">
        <span class="node-title">${node.name}</span>
        ${getRiskBadgeHTML(node.risk, getRiskName(node.risk))}
      </div>
      <div class="node-details">
        <div>💧 Water: <strong>${node.water.toFixed(1)} cm</strong></div>
        <div>🌧️ Rain: <strong>${node.rain.toFixed(1)} mm/h</strong></div>
        <div>🌱 Soil: <strong>${node.soil.toFixed(1)}%</strong></div>
        <div>📐 Tilt: <strong>${node.tilt.toFixed(1)}°</strong></div>
      </div>
    `;
    container.appendChild(card);
  });

  const activeBadge = document.getElementById('active-alert-badge');
  if (criticalCount > 0) {
    activeBadge.textContent = `${criticalCount} CRITICAL`;
    activeBadge.className = 'risk-tag critical';
  } else {
    activeBadge.textContent = `0 CRITICAL`;
    activeBadge.className = 'risk-tag normal';
  }
}

function selectNode(nodeId) {
  selectedNodeId = nodeId;
  document.getElementById('chart-title').textContent = `Real-Time Sensor Telemetry: ${nodeId}`;
  document.getElementById('sim-selected-node-label').textContent = nodeId;
  renderNodeList();
  
  const targetNode = nodesData.find(n => n.id === nodeId);
  if (targetNode && map) {
    map.setView([targetNode.lat, targetNode.lon], 14, { animate: true });
    if (nodeMarkers[nodeId]) {
      nodeMarkers[nodeId].openPopup();
    }
    // Update sliders with selected node's current values
    document.getElementById('slider-water').value = targetNode.water;
    document.getElementById('slider-rain').value = targetNode.rain;
    document.getElementById('slider-soil').value = targetNode.soil;
    document.getElementById('slider-tilt').value = targetNode.tilt;
    updateSliderLabels();
  }
}

// 3. Chart.js Initialization
function initCharts() {
  const ctxWater = document.getElementById('waterChart').getContext('2d');
  const ctxSlide = document.getElementById('landslideChart').getContext('2d');

  const initialLabels = Array.from({length: 12}, (_, i) => `${(12-i)*2}s ago`);

  waterChartInstance = new Chart(ctxWater, {
    type: 'line',
    data: {
      labels: [...initialLabels],
      datasets: [
        {
          label: 'Water Depth (cm)',
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.15)',
          data: [30, 32, 35, 40, 42, 45, 48, 50, 52, 55, 58, 60],
          fill: true,
          tension: 0.3
        },
        {
          label: 'Rain Intensity (mm/hr)',
          borderColor: '#3b82f6',
          borderDash: [4, 4],
          data: [2, 5, 10, 15, 20, 25, 30, 40, 45, 50, 55, 60],
          yAxisID: 'y1',
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: '#1f2d4a' } },
        y: { ticks: { color: '#06b6d4' }, grid: { color: '#1f2d4a' }, title: { display: true, text: 'Water Level (cm)', color: '#06b6d4' } },
        y1: { position: 'right', ticks: { color: '#3b82f6' }, grid: { drawOnChartArea: false }, title: { display: true, text: 'Rain (mm/h)', color: '#3b82f6' } }
      },
      plugins: { legend: { labels: { color: '#f8fafc', font: { size: 11 } } } }
    }
  });

  landslideChartInstance = new Chart(ctxSlide, {
    type: 'line',
    data: {
      labels: [...initialLabels],
      datasets: [
        {
          label: 'Soil Moisture (%)',
          borderColor: '#10b981',
          data: [30, 35, 40, 48, 55, 62, 70, 78, 85, 90, 94, 98],
          tension: 0.3
        },
        {
          label: 'Slope Tilt (°)',
          borderColor: '#f59e0b',
          data: [0.5, 0.6, 0.7, 0.9, 1.2, 1.8, 2.5, 4.0, 6.5, 9.2, 14.0, 18.5],
          yAxisID: 'y1',
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: '#1f2d4a' } },
        y: { ticks: { color: '#10b981' }, grid: { color: '#1f2d4a' }, title: { display: true, text: 'Soil Saturation (%)', color: '#10b981' } },
        y1: { position: 'right', ticks: { color: '#f59e0b' }, grid: { drawOnChartArea: false }, title: { display: true, text: 'Tilt Angle (°)', color: '#f59e0b' } }
      },
      plugins: { legend: { labels: { color: '#f8fafc', font: { size: 11 } } } }
    }
  });
}

function updateCharts(waterVal, rainVal, soilVal, tiltVal) {
  const timeLabel = new Date().toLocaleTimeString().split(' ')[0];

  if (waterChartInstance) {
    waterChartInstance.data.labels.shift();
    waterChartInstance.data.labels.push(timeLabel);
    waterChartInstance.data.datasets[0].data.shift();
    waterChartInstance.data.datasets[0].data.push(waterVal);
    waterChartInstance.data.datasets[1].data.shift();
    waterChartInstance.data.datasets[1].data.push(rainVal);
    waterChartInstance.update('none');
  }

  if (landslideChartInstance) {
    landslideChartInstance.data.labels.shift();
    landslideChartInstance.data.labels.push(timeLabel);
    landslideChartInstance.data.datasets[0].data.shift();
    landslideChartInstance.data.datasets[0].data.push(soilVal);
    landslideChartInstance.data.datasets[1].data.shift();
    landslideChartInstance.data.datasets[1].data.push(tiltVal);
    landslideChartInstance.update('none');
  }
}

// 4. Incident Management
function addIncidentCard(hazard, severity, location, details) {
  const container = document.getElementById('incident-feed-container');
  const card = document.createElement('div');
  const isCrit = severity === "CRITICAL";
  card.className = `incident-card ${isCrit ? 'critical' : 'warning'}`;
  
  card.innerHTML = `
    <div class="incident-time">${new Date().toLocaleTimeString()} - ${severity}</div>
    <strong>${hazard}: ${location}</strong>
    <p style="font-size:0.75rem; color:var(--text-secondary); margin-top:0.2rem;">${details}</p>
    <div style="font-size:0.7rem; color:#34d399; margin-top:0.3rem;">✓ SMS & WhatsApp Sent to Emergency Contacts</div>
  `;

  container.insertBefore(card, container.firstChild);
}

// 5. WebSocket Live Streaming
function connectWebSocket() {
  try {
    websocket = new WebSocket(WS_URL);

    websocket.onopen = () => {
      document.getElementById('ws-status-dot').className = 'indicator online';
      document.getElementById('ws-status-text').textContent = 'WebSocket: Live Stream Connected';
    };

    websocket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "TELEMETRY_UPDATE") {
        handleIncomingTelemetry(msg);
      } else if (msg.type === "EMERGENCY_BROADCAST") {
        addIncidentCard(msg.hazard_type, "MANUAL SIREN", "Command Center", msg.message);
        showInAppAlert({
          nodeId: "SYSTEM",
          title: "🚨 DISTRICT EVACUATION BROADCAST",
          message: msg.message || "District-wide evacuation sirens activated.",
          severity: "critical",
          durationMs: 15000
        });
      }
    };

    websocket.onclose = () => {
      document.getElementById('ws-status-dot').className = 'indicator warning';
      document.getElementById('ws-status-text').textContent = 'WebSocket: Reconnecting...';
      setTimeout(connectWebSocket, 3000);
    };
  } catch (e) {
    console.warn("WebSocket fallback", e);
  }
}

function handleIncomingTelemetry(msg) {
  const node = nodesData.find(n => n.id === msg.node_id);
  if (node) {
    const prevWater = node.water;
    const prevRisk = node.risk;
    const prevTilt = node.tilt;
    const prevRain = node.rain;

    const newWater = Number(msg.data.water_level_cm);
    const newRain = Number(msg.data.rain_intensity_mm_hr);
    const newSoil = Number(msg.data.soil_moisture_pct);
    const newTilt = Number(msg.data.tilt_angle_deg);
    const newVib = Number(msg.data.vibration_rms_g);
    const newRisk = Number(msg.data.risk_level);

    const deltaWater = newWater - prevWater;
    const deltaTilt = newTilt - prevTilt;

    node.water = newWater;
    node.rain = newRain;
    node.soil = newSoil;
    node.tilt = newTilt;
    node.vib = newVib;
    node.risk = newRisk;

    updateMapMarkers();
    renderNodeList();

    if (msg.node_id === selectedNodeId) {
      updateCharts(node.water, node.rain, node.soil, node.tilt);
    }

    // Incident card in right sidebar
    if (newRisk >= 2) {
      addIncidentCard(msg.data.risk_name, "CRITICAL", node.location, msg.data.explanation);
    }

    // =========================================================================
    // INTELLIGENT IN-APP POPUP NOTIFICATION TRIGGERS
    // =========================================================================
    const nowTime = Date.now();
    const alertKey = `${node.id}`;
    const lastAlertTime = lastAlertTimes[alertKey] || 0;
    const cooldownElapsed = (nowTime - lastAlertTime) > 6000; // 6s cooldown unless escalation

    // 1. Critical Hazard Escalation (Red Alarm)
    if (newRisk >= 2 && (prevRisk < 2 || cooldownElapsed)) {
      lastAlertTimes[alertKey] = nowTime;
      showInAppAlert({
        nodeId: node.id,
        title: newRisk === 2 ? `🌊 FLASH FLOOD CRITICAL: ${node.name}` : `⛰️ LANDSLIDE CRITICAL: ${node.name}`,
        message: msg.data.explanation || `Immediate hazard spike detected at ${node.location}. Evacuation sirens initiated.`,
        severity: "critical",
        water: newWater,
        rain: newRain,
        soil: newSoil,
        tilt: newTilt,
        deltaWater: deltaWater > 0 ? deltaWater : 0,
        durationMs: 12000
      });
    }
    // 2. Rapid Water Level Rise Alert (Cyan/Blue Surge)
    else if (deltaWater >= 15.0 || (newWater >= 180.0 && prevWater < 180.0)) {
      lastAlertTimes[alertKey] = nowTime;
      showInAppAlert({
        nodeId: node.id,
        title: `🌊 Water Level Rising Rapidly`,
        message: `${node.name} recorded an acute surge to ${newWater.toFixed(1)} cm (+${deltaWater.toFixed(1)} cm rise). Stream clearance narrowing.`,
        severity: "water-rise",
        water: newWater,
        rain: newRain,
        deltaWater: deltaWater,
        durationMs: 9000
      });
    }
    // 3. Slope Instability Spike (Amber/Orange Warning)
    else if ((newTilt >= 4.0 || deltaTilt >= 2.0) && newSoil > 70.0 && (prevTilt < 4.0 || cooldownElapsed)) {
      lastAlertTimes[alertKey] = nowTime;
      showInAppAlert({
        nodeId: node.id,
        title: `⛰️ Slope Angle Displacement`,
        message: `Hillside slope tilt increased to ${newTilt.toFixed(1)}° with soil moisture saturated at ${newSoil.toFixed(1)}%.`,
        severity: "warning",
        soil: newSoil,
        tilt: newTilt,
        durationMs: 9000
      });
    }
    // 4. Heavy Cloudburst Precipitation Alert
    else if (newRain >= 45.0 && prevRain < 45.0) {
      lastAlertTimes[alertKey] = nowTime;
      showInAppAlert({
        nodeId: node.id,
        title: `🌧️ High Rainfall Rate Recorded`,
        message: `Torrential rainfall detected at ${newRain.toFixed(1)} mm/hr over ${node.location}.`,
        severity: "warning",
        rain: newRain,
        water: newWater,
        durationMs: 8000
      });
    }
    // 5. Warning Level Transition
    else if (newRisk === 1 && prevRisk === 0) {
      lastAlertTimes[alertKey] = nowTime;
      showInAppAlert({
        nodeId: node.id,
        title: `⚠️ Hazard Warning Advisory`,
        message: `${node.name} transitioned into WARNING state: ${msg.data.explanation || 'Elevated environmental parameters.'}`,
        severity: "warning",
        water: newWater,
        rain: newRain,
        soil: newSoil,
        tilt: newTilt,
        durationMs: 8000
      });
    }
    // 6. Safe Normalization Notice
    else if (newRisk === 0 && prevRisk > 0) {
      showInAppAlert({
        nodeId: node.id,
        title: `✅ Risk Normalized (Safe)`,
        message: `${node.name} environmental parameters have stabilized back to baseline safe limits.`,
        severity: "normal",
        water: newWater,
        rain: newRain,
        soil: newSoil,
        tilt: newTilt,
        durationMs: 6000
      });
    }
  }
}

// 6. Simulation Studio Controls
function toggleSimModal() {
  const modal = document.getElementById('simulation-modal');
  modal.classList.toggle('hidden');
}

function updateSliderLabels() {
  document.getElementById('val-slider-water').textContent = `${document.getElementById('slider-water').value} cm`;
  document.getElementById('val-slider-rain').textContent = `${document.getElementById('slider-rain').value} mm/h`;
  document.getElementById('val-slider-soil').textContent = `${document.getElementById('slider-soil').value} %`;
  document.getElementById('val-slider-tilt').textContent = `${document.getElementById('slider-tilt').value} °`;
  document.getElementById('val-slider-vib').textContent = `${document.getElementById('slider-vib').value} g`;
}

function sendTelemetryToServer(payload) {
  fetch(`${API_BASE}/api/telemetry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(e => console.log("Local injection", e));
}

function injectScenario(preset) {
  if (preset === "NORMAL") {
    sendTelemetryToServer({ node_id: "RESQ-NODE-01", water_level_cm: 35.0, rain_intensity_mm_hr: 0.0, soil_moisture_pct: 25.0, tilt_angle_deg: 0.4, vibration_rms_g: 0.03, risk: 0, risk_name: "NORMAL", msg: "NORMAL: Baseline safety limits." });
    sendTelemetryToServer({ node_id: "RESQ-NODE-02", water_level_cm: 0.0, rain_intensity_mm_hr: 0.0, soil_moisture_pct: 30.0, tilt_angle_deg: 1.0, vibration_rms_g: 0.04, risk: 0, risk_name: "NORMAL", msg: "NORMAL: Slope stable." });
    sendTelemetryToServer({ node_id: "RESQ-NODE-03", water_level_cm: 45.0, rain_intensity_mm_hr: 0.0, soil_moisture_pct: 35.0, tilt_angle_deg: 0.3, vibration_rms_g: 0.02, risk: 0, risk_name: "NORMAL", msg: "NORMAL: Stream discharge rate normal." });
    sendTelemetryToServer({ node_id: "RESQ-NODE-04", water_level_cm: 0.0, rain_intensity_mm_hr: 0.0, soil_moisture_pct: 15.0, tilt_angle_deg: 0.2, vibration_rms_g: 0.01, risk: 0, risk_name: "NORMAL", msg: "NORMAL: LoRa gateway link active." });
  } else if (preset === "WARNING") {
    sendTelemetryToServer({ node_id: "RESQ-NODE-01", water_level_cm: 195.0, rain_intensity_mm_hr: 55.0, soil_moisture_pct: 72.0, tilt_angle_deg: 0.8, vibration_rms_g: 0.08, risk: 1, risk_name: "WARNING", msg: "WARNING: High rainfall rate & elevated water level." });
    sendTelemetryToServer({ node_id: "RESQ-NODE-02", water_level_cm: 0.0, rain_intensity_mm_hr: 60.0, soil_moisture_pct: 78.0, tilt_angle_deg: 3.2, vibration_rms_g: 0.25, risk: 1, risk_name: "WARNING", msg: "WARNING: Soil moisture saturation approaching critical limit." });
    sendTelemetryToServer({ node_id: "RESQ-NODE-03", water_level_cm: 210.0, rain_intensity_mm_hr: 52.0, soil_moisture_pct: 75.0, tilt_angle_deg: 0.6, vibration_rms_g: 0.05, risk: 1, risk_name: "WARNING", msg: "WARNING: River clearance decreasing." });
  } else if (preset === "CRITICAL_FLOOD") {
    sendTelemetryToServer({ node_id: "RESQ-NODE-01", water_level_cm: 430.0, rain_intensity_mm_hr: 145.0, soil_moisture_pct: 90.0, tilt_angle_deg: 0.5, vibration_rms_g: 0.04, risk: 2, risk_name: "CRITICAL_FLOOD", msg: "CRITICAL FLASH FLOOD: River cresting at 4.3m depth! Immediate lowlands evacuation." });
    sendTelemetryToServer({ node_id: "RESQ-NODE-03", water_level_cm: 525.0, rain_intensity_mm_hr: 135.0, soil_moisture_pct: 95.0, tilt_angle_deg: 0.4, vibration_rms_g: 0.03, risk: 2, risk_name: "CRITICAL_FLOOD", msg: "CRITICAL FLASH FLOOD: Causeway bridge completely inundated!" });
  } else if (preset === "CRITICAL_LANDSLIDE") {
    sendTelemetryToServer({ node_id: "RESQ-NODE-02", water_level_cm: 0.0, rain_intensity_mm_hr: 120.0, soil_moisture_pct: 99.0, tilt_angle_deg: 32.5, vibration_rms_g: 2.95, risk: 3, risk_name: "CRITICAL_LANDSLIDE", msg: "CRITICAL LANDSLIDE: Acute slope shear displacement! Tilt=32.5 deg, Soil=99%, Vib=2.95g" });
  } else if (preset === "DUAL_DISASTER") {
    sendTelemetryToServer({ node_id: "RESQ-NODE-01", water_level_cm: 435.0, rain_intensity_mm_hr: 150.0, soil_moisture_pct: 92.0, tilt_angle_deg: 0.5, vibration_rms_g: 0.04, risk: 2, risk_name: "CRITICAL_FLOOD", msg: "CRITICAL: Severe cloudburst flash flood inundation." });
    sendTelemetryToServer({ node_id: "RESQ-NODE-02", water_level_cm: 0.0, rain_intensity_mm_hr: 130.0, soil_moisture_pct: 99.2, tilt_angle_deg: 35.0, vibration_rms_g: 3.10, risk: 3, risk_name: "CRITICAL_LANDSLIDE", msg: "CRITICAL: Massive hillside slope collapse in progress." });
    sendTelemetryToServer({ node_id: "RESQ-NODE-03", water_level_cm: 530.0, rain_intensity_mm_hr: 140.0, soil_moisture_pct: 98.0, tilt_angle_deg: 0.4, vibration_rms_g: 0.03, risk: 2, risk_name: "CRITICAL_FLOOD", msg: "CRITICAL: Downstream bridge overtopped." });
  }
}

function injectCustomSliderValues() {
  const water = parseFloat(document.getElementById('slider-water').value);
  const rain = parseFloat(document.getElementById('slider-rain').value);
  const soil = parseFloat(document.getElementById('slider-soil').value);
  const tilt = parseFloat(document.getElementById('slider-tilt').value);
  const vib = parseFloat(document.getElementById('slider-vib').value);

  let risk = 0;
  let riskName = "NORMAL";
  let msg = "NORMAL: Custom values within baseline.";

  if (water >= 280 || (water > 200 && rain > 50)) {
    risk = 2;
    riskName = "CRITICAL_FLOOD";
    msg = `CRITICAL: Flash flood surge! Water=${water}cm, Rain=${rain}mm/h`;
  } else if ((tilt >= 7 && soil > 80) || (vib >= 0.65 && soil > 85)) {
    risk = 3;
    riskName = "CRITICAL_LANDSLIDE";
    msg = `CRITICAL: Slope failure imminent! Tilt=${tilt} deg, Soil=${soil}%, Vib=${vib}g`;
  } else if (rain > 30 || water > 180 || soil > 70 || tilt > 3) {
    risk = 1;
    riskName = "WARNING";
    msg = `WARNING: Elevated hazard risk. Rain=${rain}mm/h, Soil=${soil}%`;
  }

  sendTelemetryToServer({
    node_id: selectedNodeId,
    water_level_cm: water,
    rain_intensity_mm_hr: rain,
    soil_moisture_pct: soil,
    tilt_angle_deg: tilt,
    vibration_rms_g: vib,
    risk: risk,
    risk_name: riskName,
    msg: msg
  });
}

function toggleAutoSequence() {
  const btn = document.getElementById('btn-auto-sequence');
  if (autoSequenceInterval) {
    clearInterval(autoSequenceInterval);
    autoSequenceInterval = null;
    btn.textContent = "▶️ Run 1-Minute Live Disaster Sequence";
    btn.style.background = "#10b981";
  } else {
    autoSequenceStep = 0;
    btn.textContent = "⏹️ Stop Disaster Sequence";
    btn.style.background = "#ef4444";
    
    autoSequenceInterval = setInterval(() => {
      autoSequenceStep++;
      if (autoSequenceStep <= 3) {
        injectScenario("NORMAL");
      } else if (autoSequenceStep <= 8) {
        injectScenario("WARNING");
      } else if (autoSequenceStep <= 14) {
        injectScenario("CRITICAL_FLOOD");
      } else if (autoSequenceStep <= 20) {
        injectScenario("DUAL_DISASTER");
      } else {
        injectScenario("NORMAL");
        clearInterval(autoSequenceInterval);
        autoSequenceInterval = null;
        btn.textContent = "▶️ Run 1-Minute Live Disaster Sequence";
        btn.style.background = "#10b981";
      }
    }, 2000);
  }
}

function triggerManualEmergencyModal() {
  const reason = prompt("Enter Emergency Broadcast Reason to Dispatch District Sirens & SMS Alert:", "Flash Flood Warning: Evacuate riverside areas immediately.");
  if (reason) {
    fetch(`${API_BASE}/api/broadcast-alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hazard_type: "MANUAL_DISTRICT_EVACUATION", message: reason })
    }).then(() => alert("Emergency alert broadcasted successfully across SMS, WhatsApp and Siren network."));
  }
}

function refreshNodes() {
  fetch(`${API_BASE}/api/telemetry/latest`)
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data) && data.length > 0) {
        data.forEach(item => {
          const existing = nodesData.find(n => n.id === item.node.id);
          if (existing && item.latest_reading) {
            existing.water = item.latest_reading.water_level_cm;
            existing.rain = item.latest_reading.rain_intensity_mm_hr;
            existing.soil = item.latest_reading.soil_moisture_pct;
            existing.tilt = item.latest_reading.tilt_angle_deg;
            existing.risk = item.latest_reading.risk_level;
          }
        });
        updateMapMarkers();
        renderNodeList();
      }
    }).catch(err => console.log("Local standalone mode active"));
}

window.addEventListener('DOMContentLoaded', () => {
  initMap();
  initCharts();
  renderNodeList();
  connectWebSocket();
});
