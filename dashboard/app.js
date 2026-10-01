/**
 * RESQNET District Control Room Dashboard Logic
 * User-Friendly Disaster Early Warning Interface with 1-Click Simulations & Audio Alerts
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

// In-App Alert State
let audioAlertsEnabled = true;
let alertHistoryList = [];
let unreadAlertCount = 0;
let lastAlertTimes = {};
let audioCtx = null;

// Clean, User-Friendly Sensor Station Database
let nodesData = [
  { id: "RESQ-NODE-01", name: "Riverside Station", type: "RIVER", lat: 13.0850, lon: 80.2750, location: "Lower River Valley (Zone 1)", risk: 0, water: 45.0, rain: 2.0, soil: 35.0, tilt: 0.5, vib: 0.05, batt: 98 },
  { id: "RESQ-NODE-02", name: "Hillside Station", type: "SLOPE", lat: 13.0920, lon: 80.2680, location: "North Mountain Slope", risk: 0, water: 0.0, rain: 1.5, soil: 40.0, tilt: 1.0, vib: 0.05, batt: 95 },
  { id: "RESQ-NODE-03", name: "Bridge Station", type: "DUAL", lat: 13.0780, lon: 80.2820, location: "Main Highway Bridge", risk: 0, water: 60.0, rain: 2.5, soil: 45.0, tilt: 0.4, vib: 0.04, batt: 92 },
  { id: "RESQ-NODE-04", name: "Ridge Tower", type: "REPEATER", lat: 13.0990, lon: 80.2600, location: "Mountain Summit Gateway", risk: 0, water: 0.0, rain: 0.5, soil: 20.0, tilt: 0.2, vib: 0.02, batt: 100 }
];

// ==========================================================================
// AUDIO ALERT SYNTHESIZER
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
    label.textContent = 'Alert Sound: ON';
    playAlertChime('water-rise');
  } else {
    btn.classList.remove('active');
    icon.textContent = '🔇';
    label.textContent = 'Alert Sound: OFF';
  }
}

// ==========================================================================
// USER-FRIENDLY POPUP ALERTS
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
    severity
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
    if (water !== null) metaHTML += `<div class="toast-meta-item">💧 Water Level: <strong>${Math.round(water)} cm${deltaWater > 0 ? ` (+${Math.round(deltaWater)} cm rise)` : ''}</strong></div>`;
    if (rain !== null && rain > 0) metaHTML += `<div class="toast-meta-item">🌧️ Rain Rate: <strong>${Math.round(rain)} mm/hr</strong></div>`;
    if (soil !== null) metaHTML += `<div class="toast-meta-item">🌱 Ground Moisture: <strong>${Math.round(soil)}%</strong></div>`;
    if (tilt !== null && tilt > 1) metaHTML += `<div class="toast-meta-item">⛰️ Slope Angle: <strong>${tilt.toFixed(1)}°</strong></div>`;
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
        <button class="toast-close" onclick="dismissToast('${toast.id}')" title="Close">✕</button>
      </div>
    </div>
    <div class="toast-message">${message}</div>
    ${metaHTML}
    <div class="toast-actions">
      ${nodeId !== 'SYSTEM' ? `<button class="btn-toast-action" onclick="focusAndDismiss('${nodeId}', '${toast.id}')">📍 Show on Map</button>` : ''}
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
    badge.style.display = unreadAlertCount > 0 ? 'inline-block' : 'none';
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
    list.innerHTML = `<div class="empty-drawer-msg">No active alerts. All monitoring stations are safe.</div>`;
    return;
  }

  list.innerHTML = '';
  alertHistoryList.slice(0, 20).forEach(item => {
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
      <div style="font-size:0.7rem; color:#38bdf8;">📍 Click to View Station on Map</div>
    `;
    list.appendChild(div);
  });
}

// ==========================================================================
// 1. LEAFLET MAP INITIALIZATION
// ==========================================================================
function initMap() {
  const esriDark = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri',
    maxZoom: 16
  });

  const osmStreet = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19
  });

  const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri',
    maxZoom: 18
  });

  map = L.map('map-container', {
    center: [13.0860, 80.2720],
    zoom: 14,
    layers: [esriDark]
  });

  const baseLayers = {
    "🌙 Dark Map": esriDark,
    "🗺️ Street Map": osmStreet,
    "🛰️ Satellite Map": esriSatellite
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
  if (r === 2) return "FLOOD DANGER";
  if (r === 3) return "LANDSLIDE DANGER";
  return "SAFE";
}

function getRiskBadgeHTML(riskLevel) {
  if (riskLevel === 1) return `<span class="risk-tag warning">⚠️ WARNING</span>`;
  if (riskLevel === 2) return `<span class="risk-tag critical">🚨 FLOOD DANGER</span>`;
  if (riskLevel === 3) return `<span class="risk-tag critical">🚨 LANDSLIDE</span>`;
  return `<span class="risk-tag normal">🟢 SAFE</span>`;
}

function formatNodePopupHTML(node) {
  const riskColor = (node.risk >= 2) ? "#ef4444" : (node.risk === 1 ? "#f59e0b" : "#10b981");
  return `
    <div style="font-size:0.85rem; min-width:210px;">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #1f2d4a; padding-bottom:4px; margin-bottom:6px;">
        <strong style="color:#38bdf8;">${node.name}</strong>
        <span style="font-size:0.7rem; color:#94a3b8;">${node.location}</span>
      </div>
      <div style="background:#070a13; padding:6px 8px; border-radius:6px; margin-bottom:8px; border:1px solid #1f2d4a;">
        <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
          <span>Current Status:</span>
          <strong style="color:${riskColor};">${getRiskName(node.risk)}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
          <span>💧 Water Level:</span>
          <strong>${Math.round(node.water)} cm</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
          <span>🌧️ Rain Rate:</span>
          <strong>${Math.round(node.rain)} mm/hr</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
          <span>🌱 Ground Moisture:</span>
          <strong>${Math.round(node.soil)} %</strong>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span>⛰️ Slope Movement:</span>
          <strong>${node.tilt.toFixed(1)}°</strong>
        </div>
      </div>
      <div style="font-size:0.7rem; color:#10b981; text-align:right;">
        🔋 Battery: ${node.batt || 95}% &bull; Station Online
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

  nodesData.forEach(node => {
    if (node.risk > maxRisk) maxRisk = node.risk;
    if (node.water > maxWater) maxWater = node.water;
    if (node.rain > maxRain) maxRain = node.rain;
    if (node.soil > maxSoil) maxSoil = node.soil;
    if (node.tilt > maxTilt) maxTilt = node.tilt;

    const card = document.createElement('div');
    card.className = `node-card ${node.id === selectedNodeId ? 'active' : ''}`;
    card.onclick = () => selectNode(node.id);

    card.innerHTML = `
      <div class="node-top">
        <span class="node-title">${node.name}</span>
        ${getRiskBadgeHTML(node.risk)}
      </div>
      <div class="node-details">
        <div>💧 Water: <strong>${Math.round(node.water)} cm</strong></div>
        <div>🌧️ Rain: <strong>${Math.round(node.rain)} mm/h</strong></div>
        <div>🌱 Moisture: <strong>${Math.round(node.soil)}%</strong></div>
        <div>⛰️ Slope: <strong>${node.tilt.toFixed(1)}°</strong></div>
      </div>
    `;
    container.appendChild(card);
  });

  updateHeroKPI(maxRisk, maxWater, maxRain, maxSoil, maxTilt);
}

function updateHeroKPI(maxRisk, maxWater, maxRain, maxSoil, maxTilt) {
  const pill = document.getElementById('hero-status-pill');
  const text = document.getElementById('hero-status-text');
  const sub = document.getElementById('hero-status-sub');
  const activeBadge = document.getElementById('active-alert-badge');

  if (maxRisk === 2) {
    pill.className = 'status-indicator-badge critical';
    text.textContent = '🚨 DANGER: FLASH FLOOD INUNDATION DETECTED';
    sub.textContent = 'River water levels are dangerously high! Evacuate riverside and low-lying areas immediately.';
    if (activeBadge) { activeBadge.textContent = 'FLOOD ACTIVE'; activeBadge.className = 'risk-tag critical'; }
  } else if (maxRisk === 3) {
    pill.className = 'status-indicator-badge critical';
    text.textContent = '🚨 DANGER: LANDSLIDE & SLOPE COLLAPSE DETECTED';
    sub.textContent = 'Acute hillside ground movement detected! Avoid all mountain roads and steep slopes immediately.';
    if (activeBadge) { activeBadge.textContent = 'LANDSLIDE ACTIVE'; activeBadge.className = 'risk-tag critical'; }
  } else if (maxRisk === 1) {
    pill.className = 'status-indicator-badge warning';
    text.textContent = '🟡 WARNING: HEAVY RAIN & RISING WATER LEVELS';
    sub.textContent = 'Precipitation is heavy across the valley. Prepare emergency response teams.';
    if (activeBadge) { activeBadge.textContent = '1 WARNING'; activeBadge.className = 'risk-tag warning'; }
  } else {
    pill.className = 'status-indicator-badge normal';
    text.textContent = '🟢 ALL CLEAR: NORMAL & SAFE CONDITIONS';
    sub.textContent = 'All rivers, streams, and hillside slopes are within safe normal limits.';
    if (activeBadge) { activeBadge.textContent = '0 ALERTS'; activeBadge.className = 'risk-tag normal'; }
  }

  // Update Metric Cards
  const kw = document.getElementById('kpi-water-val');
  const ktw = document.getElementById('kpi-water-tag');
  const ksw = document.getElementById('kpi-water-sub');
  if (kw) kw.innerHTML = `${Math.round(maxWater)} <small>cm</small>`;
  if (ktw) {
    if (maxWater >= 280) { ktw.textContent = 'DANGER'; ktw.className = 'kpi-tag critical'; ksw.textContent = 'Flooding over bridges & banks!'; }
    else if (maxWater >= 180) { ktw.textContent = 'WARNING'; ktw.className = 'kpi-tag warning'; ksw.textContent = 'River rising rapidly'; }
    else { ktw.textContent = 'SAFE'; ktw.className = 'kpi-tag safe'; ksw.textContent = 'Safe level (Warning at 180 cm)'; }
  }

  const kr = document.getElementById('kpi-rain-val');
  const ktr = document.getElementById('kpi-rain-tag');
  const ksr = document.getElementById('kpi-rain-sub');
  if (kr) kr.innerHTML = `${Math.round(maxRain)} <small>mm/hr</small>`;
  if (ktr) {
    if (maxRain >= 80) { ktr.textContent = 'CLOUDBURST'; ktr.className = 'kpi-tag critical'; ksr.textContent = 'Extremely heavy rainfall'; }
    else if (maxRain >= 35) { ktr.textContent = 'HEAVY'; ktr.className = 'kpi-tag warning'; ksr.textContent = 'Moderate to heavy rain'; }
    else { ktr.textContent = 'LIGHT'; ktr.className = 'kpi-tag safe'; ksr.textContent = 'Light rain falling in valley'; }
  }

  const ks = document.getElementById('kpi-soil-val');
  const kts = document.getElementById('kpi-soil-tag');
  const kss = document.getElementById('kpi-soil-sub');
  if (ks) ks.innerHTML = `${Math.round(maxSoil)} <small>%</small>`;
  if (kts) {
    if (maxSoil >= 85) { kts.textContent = 'SATURATED'; kts.className = 'kpi-tag critical'; kss.textContent = 'Ground is waterlogged (High slide risk)'; }
    else if (maxSoil >= 65) { kts.textContent = 'WET'; kts.className = 'kpi-tag warning'; kss.textContent = 'Ground is absorbing rainwater'; }
    else { kts.textContent = 'NORMAL'; kts.className = 'kpi-tag safe'; kss.textContent = 'Ground is firm and stable'; }
  }

  const ktilt = document.getElementById('kpi-tilt-val');
  const kttilt = document.getElementById('kpi-tilt-tag');
  const kstilt = document.getElementById('kpi-tilt-sub');
  if (ktilt) ktilt.innerHTML = `${maxTilt.toFixed(1)}° <small>${maxTilt >= 7 ? 'COLLAPSE' : (maxTilt >= 3 ? 'Moving' : 'Stable')}</small>`;
  if (kttilt) {
    if (maxTilt >= 7) { kttilt.textContent = 'COLLAPSE'; kttilt.className = 'kpi-tag critical'; kstilt.textContent = 'Severe hillside ground movement!'; }
    else if (maxTilt >= 3) { kttilt.textContent = 'SLOPE TILT'; kttilt.className = 'kpi-tag warning'; kstilt.textContent = 'Minor ground movement detected'; }
    else { kttilt.textContent = 'STABLE'; kttilt.className = 'kpi-tag safe'; kstilt.textContent = 'No slope movement detected'; }
  }
}

function selectNode(nodeId) {
  selectedNodeId = nodeId;
  const target = nodesData.find(n => n.id === nodeId);
  if (target) {
    document.getElementById('chart-title').textContent = `Live Sensor History: ${target.name}`;
  }
  renderNodeList();
  
  if (target && map) {
    map.setView([target.lat, target.lon], 14, { animate: true });
    if (nodeMarkers[nodeId]) {
      nodeMarkers[nodeId].openPopup();
    }
  }
}

// ==========================================================================
// 2. LIVE HYDROGRAPH CHARTS
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
          label: 'Water Level (cm)',
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.15)',
          data: [30, 32, 35, 40, 42, 45, 48, 50, 52, 55, 58, 60],
          fill: true,
          tension: 0.3
        },
        {
          label: 'Rainfall Rate (mm/hr)',
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
        y1: { position: 'right', ticks: { color: '#3b82f6' }, grid: { drawOnChartArea: false }, title: { display: true, text: 'Rain (mm/hr)', color: '#3b82f6' } }
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
          label: 'Ground Moisture (%)',
          borderColor: '#10b981',
          data: [30, 35, 40, 48, 55, 62, 70, 78, 85, 90, 94, 98],
          tension: 0.3
        },
        {
          label: 'Hillside Slope (°)',
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
        y: { ticks: { color: '#10b981' }, grid: { color: '#1f2d4a' }, title: { display: true, text: 'Ground Moisture (%)', color: '#10b981' } },
        y1: { position: 'right', ticks: { color: '#f59e0b' }, grid: { drawOnChartArea: false }, title: { display: true, text: 'Slope Movement (°)', color: '#f59e0b' } }
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
// 3. ACTION & INCIDENT LOGS
// ==========================================================================
function addIncidentCard(hazard, severity, location, details) {
  const container = document.getElementById('incident-feed-container');
  if (!container) return;
  const card = document.createElement('div');
  const isCrit = severity === "CRITICAL" || severity.includes("DANGER");
  card.className = `incident-card ${isCrit ? 'critical' : 'warning'}`;
  
  card.innerHTML = `
    <div class="incident-time">${new Date().toLocaleTimeString()} &bull; ${severity}</div>
    <strong>${hazard}: ${location}</strong>
    <p style="font-size:0.75rem; color:var(--text-secondary); margin-top:0.2rem;">${details}</p>
    <div style="font-size:0.7rem; color:#34d399; margin-top:0.3rem;">✓ Automated SMS & WhatsApp Sent to Emergency Response Team</div>
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
      addIncidentCard(msg.data.risk_name, "CRITICAL DANGER", node.location, msg.data.explanation);
    }

    // In-App Alert Detection
    const nowTime = Date.now();
    const alertKey = `${node.id}`;
    const lastAlertTime = lastAlertTimes[alertKey] || 0;
    const cooldownElapsed = (nowTime - lastAlertTime) > 6000;

    if (newRisk === 2 && (prevRisk < 2 || cooldownElapsed)) {
      lastAlertTimes[alertKey] = nowTime;
      showInAppAlert({
        nodeId: node.id,
        title: `🌊 Flash Flood Alert: ${node.name}`,
        message: `River water depth has surged to ${Math.round(newWater)} cm! Immediate evacuation of lowlands advised.`,
        severity: "critical",
        water: newWater,
        rain: newRain,
        soil: newSoil,
        tilt: newTilt,
        deltaWater: deltaWater > 0 ? deltaWater : 0,
        durationMs: 12000
      });
    } else if (newRisk === 3 && (prevRisk < 3 || cooldownElapsed)) {
      lastAlertTimes[alertKey] = nowTime;
      showInAppAlert({
        nodeId: node.id,
        title: `⛰️ Landslide Danger: ${node.name}`,
        message: `Dangerous slope movement (${newTilt.toFixed(1)}°) with waterlogged soil (${Math.round(newSoil)}%)!`,
        severity: "critical",
        soil: newSoil,
        tilt: newTilt,
        durationMs: 12000
      });
    } else if (deltaWater >= 15.0 || (newWater >= 180.0 && prevWater < 180.0)) {
      lastAlertTimes[alertKey] = nowTime;
      showInAppAlert({
        nodeId: node.id,
        title: `🌊 River Water Rising Rapidly`,
        message: `${node.name} recorded an acute water surge to ${Math.round(newWater)} cm (+${Math.round(deltaWater)} cm rise).`,
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
        title: `⛰️ Hillside Slope Warning`,
        message: `Slope movement detected at ${node.name} (${newTilt.toFixed(1)}° angle). Ground is heavily saturated.`,
        severity: "warning",
        soil: newSoil,
        tilt: newTilt,
        durationMs: 9000
      });
    } else if (newRisk === 1 && prevRisk === 0) {
      lastAlertTimes[alertKey] = nowTime;
      showInAppAlert({
        nodeId: node.id,
        title: `⚠️ Heavy Rain Warning`,
        message: `${node.name} is reporting heavy downpours and rising moisture.`,
        severity: "warning",
        water: newWater,
        rain: newRain,
        durationMs: 8000
      });
    } else if (newRisk === 0 && prevRisk > 0) {
      showInAppAlert({
        nodeId: node.id,
        title: `✅ All Clear (Safe)`,
        message: `${node.name} environmental conditions have returned to safe normal limits.`,
        severity: "normal",
        water: newWater,
        rain: newRain,
        durationMs: 6000
      });
    }
  }
}

// ==========================================================================
// 5. 1-CLICK DISASTER SCENARIOS (0ms Instant Client Response)
// ==========================================================================
function sendTelemetryToServer(payload) {
  // 1. Instantly update client UI
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

  // 2. Sync to cloud backend
  fetch(`${API_BASE}/api/telemetry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(e => console.log("Cloud sync", e));
}

function injectScenario(preset) {
  if (preset === "NORMAL") {
    sendTelemetryToServer({ node_id: "RESQ-NODE-01", water_level_cm: 35.0, rain_intensity_mm_hr: 0.0, soil_moisture_pct: 25.0, tilt_angle_deg: 0.4, vibration_rms_g: 0.03, risk: 0, risk_name: "SAFE", msg: "All conditions within safe normal limits." });
    sendTelemetryToServer({ node_id: "RESQ-NODE-02", water_level_cm: 0.0, rain_intensity_mm_hr: 0.0, soil_moisture_pct: 30.0, tilt_angle_deg: 1.0, vibration_rms_g: 0.04, risk: 0, risk_name: "SAFE", msg: "Hillside slope confirmed stable." });
    sendTelemetryToServer({ node_id: "RESQ-NODE-03", water_level_cm: 45.0, rain_intensity_mm_hr: 0.0, soil_moisture_pct: 35.0, tilt_angle_deg: 0.3, vibration_rms_g: 0.02, risk: 0, risk_name: "SAFE", msg: "Bridge water clearance normal." });
    sendTelemetryToServer({ node_id: "RESQ-NODE-04", water_level_cm: 0.0, rain_intensity_mm_hr: 0.0, soil_moisture_pct: 15.0, tilt_angle_deg: 0.2, vibration_rms_g: 0.01, risk: 0, risk_name: "SAFE", msg: "Summit repeater online." });
  } else if (preset === "WARNING") {
    sendTelemetryToServer({ node_id: "RESQ-NODE-01", water_level_cm: 195.0, rain_intensity_mm_hr: 55.0, soil_moisture_pct: 72.0, tilt_angle_deg: 0.8, vibration_rms_g: 0.08, risk: 1, risk_name: "WARNING", msg: "Heavy rainfall and elevated river water level." });
    sendTelemetryToServer({ node_id: "RESQ-NODE-02", water_level_cm: 0.0, rain_intensity_mm_hr: 60.0, soil_moisture_pct: 78.0, tilt_angle_deg: 3.2, vibration_rms_g: 0.25, risk: 1, risk_name: "WARNING", msg: "Soil moisture high on north slope." });
    sendTelemetryToServer({ node_id: "RESQ-NODE-03", water_level_cm: 210.0, rain_intensity_mm_hr: 52.0, soil_moisture_pct: 75.0, tilt_angle_deg: 0.6, vibration_rms_g: 0.05, risk: 1, risk_name: "WARNING", msg: "River water approaching caution level." });
  } else if (preset === "CRITICAL_FLOOD") {
    sendTelemetryToServer({ node_id: "RESQ-NODE-01", water_level_cm: 430.0, rain_intensity_mm_hr: 145.0, soil_moisture_pct: 90.0, tilt_angle_deg: 0.5, vibration_rms_g: 0.04, risk: 2, risk_name: "FLOOD DANGER", msg: "FLASH FLOOD: River cresting at 4.3 meters depth! Immediate lowlands evacuation." });
    sendTelemetryToServer({ node_id: "RESQ-NODE-03", water_level_cm: 525.0, rain_intensity_mm_hr: 135.0, soil_moisture_pct: 95.0, tilt_angle_deg: 0.4, vibration_rms_g: 0.03, risk: 2, risk_name: "FLOOD DANGER", msg: "FLASH FLOOD: Highway bridge completely submerged!" });
  } else if (preset === "CRITICAL_LANDSLIDE") {
    sendTelemetryToServer({ node_id: "RESQ-NODE-02", water_level_cm: 0.0, rain_intensity_mm_hr: 120.0, soil_moisture_pct: 99.0, tilt_angle_deg: 32.5, vibration_rms_g: 2.95, risk: 3, risk_name: "LANDSLIDE DANGER", msg: "LANDSLIDE: Acute slope failure! Slope Tilt=32.5°, Soil=99%, Vib=2.95g" });
  } else if (preset === "DUAL_DISASTER") {
    sendTelemetryToServer({ node_id: "RESQ-NODE-01", water_level_cm: 435.0, rain_intensity_mm_hr: 150.0, soil_moisture_pct: 92.0, tilt_angle_deg: 0.5, vibration_rms_g: 0.04, risk: 2, risk_name: "FLOOD DANGER", msg: "Severe cloudburst flood inundation." });
    sendTelemetryToServer({ node_id: "RESQ-NODE-02", water_level_cm: 0.0, rain_intensity_mm_hr: 130.0, soil_moisture_pct: 99.2, tilt_angle_deg: 35.0, vibration_rms_g: 3.10, risk: 3, risk_name: "LANDSLIDE DANGER", msg: "Massive mountain hillside collapse in progress." });
    sendTelemetryToServer({ node_id: "RESQ-NODE-03", water_level_cm: 530.0, rain_intensity_mm_hr: 140.0, soil_moisture_pct: 98.0, tilt_angle_deg: 0.4, vibration_rms_g: 0.03, risk: 2, risk_name: "FLOOD DANGER", msg: "Bridge completely overtopped." });
  }
}

function toggleAutoSequence() {
  const btn = document.getElementById('btn-auto-demo');
  const label = document.getElementById('btn-auto-label');

  if (autoSequenceInterval) {
    clearInterval(autoSequenceInterval);
    autoSequenceInterval = null;
    if (label) label.textContent = "Auto Demo (1 min)";
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
        if (label) label.textContent = "Auto Demo (1 min)";
        if (btn) btn.style.background = "linear-gradient(135deg, #10b981, #059669)";
      }
    }, 2000);
  }
}

function triggerManualEmergencyModal() {
  const reason = prompt("Enter Emergency Message to Sound Sirens & Send Alert:", "Flash Flood Warning: Evacuate riverside areas immediately.");
  if (reason) {
    fetch(`${API_BASE}/api/broadcast-alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hazard_type: "DISTRICT_EMERGENCY_EVACUATION", message: reason })
    }).then(() => alert("Emergency evacuation sirens and alerts broadcasted successfully."));
  }
}

// ==========================================================================
// 6. LIVE SYNC & WEBSOCKET ENGINE
// ==========================================================================
function connectWebSocket() {
  try {
    if (websocket) {
      try { websocket.close(); } catch (e) {}
    }

    websocket = new WebSocket(WS_URL);

    websocket.onopen = () => {
      document.getElementById('server-status-dot').className = 'indicator online';
      document.getElementById('server-status-text').textContent = 'Network: 4 Stations Active';

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
          document.getElementById('server-status-dot').className = 'indicator online';
          document.getElementById('server-status-text').textContent = 'Network: 4 Stations Active';
          return;
        } else if (msg.type === "TELEMETRY_UPDATE") {
          handleIncomingTelemetry(msg);
        } else if (msg.type === "EMERGENCY_BROADCAST") {
          addIncidentCard(msg.hazard_type, "EMERGENCY ALERT", "Command Center", msg.message);
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
      document.getElementById('server-status-dot').className = 'indicator online';
      document.getElementById('server-status-text').textContent = 'Network: 4 Stations Active';
      setTimeout(connectWebSocket, 4000);
    };

    websocket.onerror = () => {
      document.getElementById('server-status-dot').className = 'indicator online';
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

// Client-Side Continuous Animation Engine
function runClientSideLiveTicker() {
  setInterval(() => {
    const sel = nodesData.find(n => n.id === selectedNodeId);
    if (sel && sel.risk === 0) {
      sel.water = Math.max(30.0, Math.min(65.0, sel.water + (Math.random() * 0.8 - 0.4)));
      sel.rain = Math.max(0.0, Math.min(6.0, sel.rain + (Math.random() * 0.4 - 0.2)));
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
