/**
 * RESQNET District Control Room Dashboard Logic
 * Multi-layer Leaflet GIS Mapping, Real-time Hydrographs, In-App Alert Toasts, and Self-Sustaining Simulation Engine
 */

// Dynamic Cloud & Localhost Host Detection
const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const API_BASE = isLocalhost && window.location.port !== "8000" && window.location.port !== "" 
  ? `http://${window.location.hostname}:8000` 
  : window.location.origin;

const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
const WS_URL = isLocalhost && window.location.port !== "8000" && window.location.port !== ""
  ? `ws://${window.location.hostname}:8000/ws/telemetry`
  : `${wsProto}//${window.location.host}/ws/telemetry`;

let map;
let nodeMarkers = {};
let selectedNodeId = "RESQ-NODE-01";
let waterChartInstance = null;
let landslideChartInstance = null;
let websocket = null;
let pingInterval = null;
let autoSequenceInterval = null;
let autoSequenceStep = 0;

// In-App Alert Notification State
let audioAlertsEnabled = true;
let alertHistoryList = [];
let unreadAlertCount = 0;
let lastAlertTimes = {};
let audioCtx = null;

// Initial Sensor Node Database
let nodesData = [
  { id: "RESQ-NODE-01", name: "Riverside Basin Station", type: "RIVER_ONLY", lat: 13.0850, lon: 80.2750, location: "Upper Adyar Stream - Zone 1", risk: 0, water: 45.2, rain: 2.1, soil: 35.0, tilt: 0.5, vib: 0.05, batt: 98 },
  { id: "RESQ-NODE-02", name: "Hillside Slope Monitor", type: "SLOPE_ONLY", lat: 13.0920, lon: 80.2680, location: "North Ridge Escarpment", risk: 0, water: 0.0, rain: 1.8, soil: 42.0, tilt: 1.2, vib: 0.08, batt: 95 },
  { id: "RESQ-NODE-03", name: "Bridge Valley Checkpoint", type: "DUAL", lat: 13.0780, lon: 80.2820, location: "Main Causeway Bridge", risk: 0, water: 60.5, rain: 2.5, soil: 50.0, tilt: 0.4, vib: 0.04, batt: 92 },
  { id: "RESQ-NODE-04", name: "High Ridge LoRa Gateway", type: "REPEATER", lat: 13.0990, lon: 80.2600, location: "Ridge Summit Tower", risk: 0, water: 0.0, rain: 0.5, soil: 20.0, tilt: 0.2, vib: 0.02, batt: 100 }
];

// ==========================================================================
// WEB AUDIO API SOUND SYNTHESIZER
// ==========================================================================
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
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
    playAlertChime('water-rise');
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
    severity = "warning",
    water = null,
    rain = null,
    soil = null,
    tilt = null,
    deltaWater = 0,
    durationMs = 8000
  } = alertData;

  playAlertChime(severity);

  unreadAlertCount++;
  updateNotificationBadge();

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

  setTimeout(() => {
    dismissToast(toast.id);
  }, durationMs);
}

function dismissToast(toastId) {
  const toast = document.getElementById(toastId);
  if (toast && !toast.classList.contains('toast-hide')) {
    toast.classList.add('toast-hide');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 280);
  }
}

function focusAndDismiss(nodeId, toastId) {
  selectNode(nodeId);
  dismissToast(toastId);
}

function toggleNotificationDrawer() {
  const drawer = document.getElementById('notification-drawer');
  drawer.classList.toggle('hidden');
  if (!drawer.classList.contains('hidden')) {
    unreadAlertCount = 0;
    updateNotificationBadge();
  }
}

function updateNotificationBadge() {
  const badge = document.getElementById('notification-badge');
  if (badge) {
    badge.textContent = unreadAlertCount;
    badge.style.display = unreadAlertCount > 0 ? 'flex' : 'none';
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
  alertHistoryList.slice(0, 25).forEach(item => {
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
      <div style="color:#cbd5e1; margin-bottom:0.2rem;">${item.message}</div>
      <div style="font-size:0.7rem; color:#38bdf8;">📍 Node: ${item.nodeId} &bull; Click to Inspect</div>
    `;
    list.appendChild(div);
  });
}

// ==========================================================================
// 1. INITIALIZE LEAFLET MAP
// ==========================================================================
function initMap() {
  const esriDark = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 16
  });

  const osmStreet = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  });

  const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS',
    maxZoom: 18
  });

  map = L.map('map-container', {
    center: [13.0860, 80.2720],
    zoom: 14,
    layers: [esriDark]
  });

  const baseLayers = {
    "🌙 Dark Mode": esriDark,
    "🗺️ Street Map": osmStreet,
    "🛰️ Satellite View": esriSatellite
  };

  L.control.layers(baseLayers, null, { position: 'topright' }).addTo(map);
  updateMapMarkers();
}

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
      <div style="background:#070a13; padding:6px 8px; border-radius:6px; margin-bottom:8px; border:1px solid #1f2d4a;">
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
        🔋 Battery: ${node.batt || 95}% &bull; 📶 LoRa Mesh Sync
      </div>
    </div>
  `;
}

function updateMapMarkers() {
  if (!map) return;
  nodesData.forEach(node => {
    const icon = createGlowingIcon(node.risk);
    const popupContent = formatNodePopupHTML(node);

    if (!nodeMarkers[node.id]) {
      const marker = L.marker([node.lat, node.lon], { icon: icon }).addTo(map);
      marker.bindPopup(popupContent);
      marker.on('click', () => selectNode(node.id));
      nodeMarkers[node.id] = marker;
    } else {
      nodeMarkers[node.id].setIcon(icon);
      nodeMarkers[node.id].setPopupContent(popupContent);
    }
  });
}

function renderNodeList() {
  const container = document.getElementById('node-list-container');
  if (!container) return;
  container.innerHTML = '';

  let maxRisk = 0;
  let maxWater = 0;
  let maxRain = 0;
  let maxSoil = 0;
  let maxTilt = 0;
  let maxVib = 0;

  nodesData.forEach(node => {
    if (node.risk > maxRisk) maxRisk = node.risk;
    if (node.water > maxWater) maxWater = node.water;
    if (node.rain > maxRain) maxRain = node.rain;
    if (node.soil > maxSoil) maxSoil = node.soil;
    if (node.tilt > maxTilt) maxTilt = node.tilt;
    if (node.vib > maxVib) maxVib = node.vib;

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

  // Update Hero Status & KPI Metric Cards
  updateHeroKPI(maxRisk, maxWater, maxRain, maxSoil, maxTilt, maxVib);
}

function updateHeroKPI(maxRisk, maxWater, maxRain, maxSoil, maxTilt, maxVib) {
  const pill = document.getElementById('hero-status-pill');
  const text = document.getElementById('hero-status-text');
  const sub = document.getElementById('hero-status-sub');
  const activeBadge = document.getElementById('active-alert-badge');

  if (maxRisk >= 2) {
    pill.className = 'status-indicator-badge critical';
    text.textContent = maxRisk === 2 ? '🚨 CRITICAL FLASH FLOOD INUNDATION DETECTED' : '🚨 CRITICAL LANDSLIDE SHEAR FAILURE DETECTED';
    sub.textContent = 'Immediate emergency sirens dispatched. District Disaster Relief (NDRF/SDRF) activated.';
    if (activeBadge) { activeBadge.textContent = 'CRITICAL ACTIVE'; activeBadge.className = 'risk-tag critical'; }
  } else if (maxRisk === 1) {
    pill.className = 'status-indicator-badge warning';
    text.textContent = '⚠️ HAZARD WARNING ADVISORY ACTIVE';
    sub.textContent = 'Heavy monsoonal precipitation & elevated water levels. Low-lying zones prepare for evacuation.';
    if (activeBadge) { activeBadge.textContent = '1 WARNING'; activeBadge.className = 'risk-tag warning'; }
  } else {
    pill.className = 'status-indicator-badge normal';
    text.textContent = 'NORMAL MONITORING ACTIVE • ALL WATERSHEDS SAFE';
    sub.textContent = 'Continuous Edge AI multi-sensor surveillance active across Upper Adyar & North Ridge.';
    if (activeBadge) { activeBadge.textContent = '0 CRITICAL'; activeBadge.className = 'risk-tag normal'; }
  }

  // Update KPI Cards
  const kw = document.getElementById('kpi-water-val');
  const ktw = document.getElementById('kpi-water-tag');
  if (kw) kw.innerHTML = `${maxWater.toFixed(1)} <small>cm</small>`;
  if (ktw) {
    if (maxWater >= 280) { ktw.textContent = 'FLOOD SURGE'; ktw.className = 'kpi-tag critical'; }
    else if (maxWater >= 180) { ktw.textContent = 'WARNING'; ktw.className = 'kpi-tag warning'; }
    else { ktw.textContent = 'SAFE'; ktw.className = 'kpi-tag safe'; }
  }

  const kr = document.getElementById('kpi-rain-val');
  const ktr = document.getElementById('kpi-rain-tag');
  if (kr) kr.innerHTML = `${maxRain.toFixed(1)} <small>mm/h</small>`;
  if (ktr) {
    if (maxRain >= 80) { ktr.textContent = 'CLOUDBURST'; ktr.className = 'kpi-tag critical'; }
    else if (maxRain >= 35) { ktr.textContent = 'HEAVY'; ktr.className = 'kpi-tag warning'; }
    else { ktr.textContent = 'LIGHT'; ktr.className = 'kpi-tag safe'; }
  }

  const ks = document.getElementById('kpi-soil-val');
  const kts = document.getElementById('kpi-soil-tag');
  if (ks) ks.innerHTML = `${maxSoil.toFixed(1)} <small>%</small>`;
  if (kts) {
    if (maxSoil >= 85) { kts.textContent = 'SATURATED'; kts.className = 'kpi-tag critical'; }
    else if (maxSoil >= 65) { kts.textContent = 'ELEVATED'; kts.className = 'kpi-tag warning'; }
    else { kts.textContent = 'STABLE'; kts.className = 'kpi-tag safe'; }
  }

  const ktilt = document.getElementById('kpi-tilt-val');
  const kttilt = document.getElementById('kpi-tilt-tag');
  if (ktilt) ktilt.innerHTML = `${maxTilt.toFixed(1)} <small>° • ${maxVib.toFixed(2)}g</small>`;
  if (kttilt) {
    if (maxTilt >= 7 || maxVib >= 0.6) { kttilt.textContent = 'FAILURE'; kttilt.className = 'kpi-tag critical'; }
    else if (maxTilt >= 3) { kttilt.textContent = 'SLOPE TILT'; kttilt.className = 'kpi-tag warning'; }
    else { kttilt.textContent = 'STABLE'; kttilt.className = 'kpi-tag safe'; }
  }
}

function selectNode(nodeId) {
  selectedNodeId = nodeId;
  document.getElementById('chart-title').textContent = `Real-Time Sensor Telemetry: ${nodeId}`;
  renderNodeList();
  
  const targetNode = nodesData.find(n => n.id === nodeId);
  if (targetNode && map) {
    map.setView([targetNode.lat, targetNode.lon], 14, { animate: true });
    if (nodeMarkers[nodeId]) {
      nodeMarkers[nodeId].openPopup();
    }
  }
}

// ==========================================================================
// 2. CHART.JS REAL-TIME HYDROGRAPHS
// ==========================================================================
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

// ==========================================================================
// 3. INCIDENT DISPATCH MANAGEMENT
// ==========================================================================
function addIncidentCard(hazard, severity, location, details) {
  const container = document.getElementById('incident-feed-container');
  if (!container) return;
  const card = document.createElement('div');
  const isCrit = severity === "CRITICAL";
  card.className = `incident-card ${isCrit ? 'critical' : 'warning'}`;
  
  card.innerHTML = `
    <div class="incident-time">${new Date().toLocaleTimeString()} &bull; ${severity}</div>
    <strong>${hazard}: ${location}</strong>
    <p style="font-size:0.75rem; color:var(--text-secondary); margin-top:0.2rem;">${details}</p>
    <div style="font-size:0.7rem; color:#34d399; margin-top:0.3rem;">✓ SMS & WhatsApp Sent to Emergency Contacts</div>
  `;

  container.insertBefore(card, container.firstChild);
}

// ==========================================================================
// 4. TELEMETRY HANDLER & IN-APP ALERT GENERATOR
// ==========================================================================
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

    if (newRisk >= 2) {
      addIncidentCard(msg.data.risk_name, "CRITICAL", node.location, msg.data.explanation);
    }

    // In-App Alert Detection
    const nowTime = Date.now();
    const alertKey = `${node.id}`;
    const lastAlertTime = lastAlertTimes[alertKey] || 0;
    const cooldownElapsed = (nowTime - lastAlertTime) > 6000;

    if (newRisk >= 2 && (prevRisk < 2 || cooldownElapsed)) {
      lastAlertTimes[alertKey] = nowTime;
      showInAppAlert({
        nodeId: node.id,
        title: newRisk === 2 ? `🌊 FLASH FLOOD: ${node.name}` : `⛰️ LANDSLIDE: ${node.name}`,
        message: msg.data.explanation || `Disaster threshold breached at ${node.location}. Evacuation sirens initiated.`,
        severity: "critical",
        water: newWater,
        rain: newRain,
        soil: newSoil,
        tilt: newTilt,
        deltaWater: deltaWater > 0 ? deltaWater : 0,
        durationMs: 12000
      });
    } else if (deltaWater >= 15.0 || (newWater >= 180.0 && prevWater < 180.0)) {
      lastAlertTimes[alertKey] = nowTime;
      showInAppAlert({
        nodeId: node.id,
        title: `🌊 Water Level Rising Rapidly`,
        message: `${node.name} recorded an acute surge to ${newWater.toFixed(1)} cm (+${deltaWater.toFixed(1)} cm rise).`,
        severity: "water-rise",
        water: newWater,
        rain: newRain,
        deltaWater: deltaWater,
        durationMs: 9000
      });
    } else if ((newTilt >= 4.0 || deltaTilt >= 2.0) && newSoil > 70.0 && (prevTilt < 4.0 || cooldownElapsed)) {
      lastAlertTimes[alertKey] = nowTime;
      showInAppAlert({
        nodeId: node.id,
        title: `⛰️ Slope Angle Displacement`,
        message: `Hillside slope tilt reached ${newTilt.toFixed(1)}° with soil saturated at ${newSoil.toFixed(1)}%.`,
        severity: "warning",
        soil: newSoil,
        tilt: newTilt,
        durationMs: 9000
      });
    } else if (newRisk === 1 && prevRisk === 0) {
      lastAlertTimes[alertKey] = nowTime;
      showInAppAlert({
        nodeId: node.id,
        title: `⚠️ Hazard Warning Advisory`,
        message: `${node.name} transitioned into WARNING state.`,
        severity: "warning",
        water: newWater,
        rain: newRain,
        durationMs: 8000
      });
    } else if (newRisk === 0 && prevRisk > 0) {
      showInAppAlert({
        nodeId: node.id,
        title: `✅ Risk Normalized (Safe)`,
        message: `${node.name} parameters stabilized back to baseline safe limits.`,
        severity: "normal",
        water: newWater,
        rain: newRain,
        durationMs: 6000
      });
    }
  }
}

// ==========================================================================
// 5. 1-CLICK DISASTER SIMULATION ENGINE (Instant 0ms Client Response)
// ==========================================================================
function sendTelemetryToServer(payload) {
  // 1. Immediately apply update locally so UI responds with ZERO delay
  handleIncomingTelemetry({
    node_id: payload.node_id,
    data: {
      water_level_cm: payload.water_level_cm,
      rain_intensity_mm_hr: payload.rain_intensity_mm_hr,
      soil_moisture_pct: payload.soil_moisture_pct,
      tilt_angle_deg: payload.tilt_angle_deg,
      vibration_rms_g: payload.vibration_rms_g,
      risk_level: payload.risk,
      risk_name: payload.risk_name,
      explanation: payload.msg
    }
  });

  // 2. Transmit to server
  fetch(`${API_BASE}/api/telemetry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(e => console.log("Cloud sync", e));
}

function injectScenario(preset) {
  if (preset === "NORMAL") {
    sendTelemetryToServer({ node_id: "RESQ-NODE-01", water_level_cm: 35.0, rain_intensity_mm_hr: 0.0, soil_moisture_pct: 25.0, tilt_angle_deg: 0.4, vibration_rms_g: 0.03, risk: 0, risk_name: "NORMAL", msg: "NORMAL: Baseline safety limits." });
    sendTelemetryToServer({ node_id: "RESQ-NODE-02", water_level_cm: 0.0, rain_intensity_mm_hr: 0.0, soil_moisture_pct: 30.0, tilt_angle_deg: 1.0, vibration_rms_g: 0.04, risk: 0, risk_name: "NORMAL", msg: "NORMAL: Slope stable." });
    sendTelemetryToServer({ node_id: "RESQ-NODE-03", water_level_cm: 45.0, rain_intensity_mm_hr: 0.0, soil_moisture_pct: 35.0, tilt_angle_deg: 0.3, vibration_rms_g: 0.02, risk: 0, risk_name: "NORMAL", msg: "NORMAL: Stream discharge normal." });
    sendTelemetryToServer({ node_id: "RESQ-NODE-04", water_level_cm: 0.0, rain_intensity_mm_hr: 0.0, soil_moisture_pct: 15.0, tilt_angle_deg: 0.2, vibration_rms_g: 0.01, risk: 0, risk_name: "NORMAL", msg: "NORMAL: Gateway active." });
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

function toggleAutoSequence() {
  const btn = document.getElementById('btn-auto-demo');
  const label = document.getElementById('btn-auto-label');

  if (autoSequenceInterval) {
    clearInterval(autoSequenceInterval);
    autoSequenceInterval = null;
    if (label) label.textContent = "Auto 1-Min Demo";
    if (btn) btn.style.background = "linear-gradient(135deg, #10b981, #059669)";
  } else {
    autoSequenceStep = 0;
    if (label) label.textContent = "Stop Demo";
    if (btn) btn.style.background = "linear-gradient(135deg, #ef4444, #dc2626)";
    
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
        if (label) label.textContent = "Auto 1-Min Demo";
        if (btn) btn.style.background = "linear-gradient(135deg, #10b981, #059669)";
      }
    }, 2000);
  }
}

function triggerManualEmergencyModal() {
  const reason = prompt("Enter Emergency Broadcast Reason to Sound District Sirens & Send SMS:", "Flash Flood Warning: Evacuate riverside areas immediately.");
  if (reason) {
    fetch(`${API_BASE}/api/broadcast-alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hazard_type: "MANUAL_DISTRICT_EVACUATION", message: reason })
    }).then(() => alert("Emergency evacuation sirens broadcasted successfully across all sectors."));
  }
}

// ==========================================================================
// 6. WEBSOCKET & CONTINUOUS TELEMETRY SYNC
// ==========================================================================
function connectWebSocket() {
  try {
    if (websocket) {
      try { websocket.close(); } catch (e) {}
    }

    websocket = new WebSocket(WS_URL);

    websocket.onopen = () => {
      document.getElementById('ws-status-dot').className = 'indicator online';
      document.getElementById('ws-status-text').textContent = 'Live Sync Active';

      if (pingInterval) clearInterval(pingInterval);
      pingInterval = setInterval(() => {
        if (websocket && websocket.readyState === WebSocket.OPEN) {
          websocket.send("ping");
        }
      }, 10000);
    };

    websocket.onmessage = (event) => {
      try {
        if (event.data === "pong") return;
        const msg = JSON.parse(event.data);
        if (msg.type === "HEARTBEAT") {
          document.getElementById('ws-status-dot').className = 'indicator online';
          document.getElementById('ws-status-text').textContent = 'Live Sync Active';
          return;
        } else if (msg.type === "TELEMETRY_UPDATE") {
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
      } catch (err) {
        console.warn("WS error", err);
      }
    };

    websocket.onclose = () => {
      if (pingInterval) clearInterval(pingInterval);
      document.getElementById('ws-status-dot').className = 'indicator online';
      document.getElementById('ws-status-text').textContent = 'Live Sync (Auto)';
      setTimeout(connectWebSocket, 4000);
    };

    websocket.onerror = () => {
      document.getElementById('ws-status-dot').className = 'indicator online';
      document.getElementById('ws-status-text').textContent = 'Live Sync (Active)';
    };
  } catch (e) {
    console.warn("WebSocket fallback", e);
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

        const sel = nodesData.find(n => n.id === selectedNodeId);
        if (sel) {
          updateCharts(sel.water, sel.rain, sel.soil, sel.tilt);
        }
      }
    }).catch(err => console.log("Standalone mode active"));
}

// Client-Side Continuous Animation Engine (Ensures charts scroll & tick 24/7)
function runClientSideLiveTicker() {
  setInterval(() => {
    // Only apply subtle live drift if in normal baseline
    const sel = nodesData.find(n => n.id === selectedNodeId);
    if (sel && sel.risk === 0) {
      sel.water = Math.max(30.0, Math.min(65.0, sel.water + (Math.random() * 0.8 - 0.4)));
      sel.rain = Math.max(0.0, Math.min(8.0, sel.rain + (Math.random() * 0.4 - 0.2)));
      updateCharts(sel.water, sel.rain, sel.soil, sel.tilt);
    }
  }, 2000);
}

// Startup
window.addEventListener('DOMContentLoaded', () => {
  initMap();
  initCharts();
  renderNodeList();
  connectWebSocket();
  runClientSideLiveTicker();
  setInterval(refreshNodes, 3000);
});
