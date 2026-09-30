/**
 * RESQNET District Control Room Dashboard Logic
 * Real-time GIS Mapping, WebSocket Streaming, Chart.js Hydrographs, and Emergency Management
 */

const API_BASE = "http://localhost:8000";
const WS_URL = "ws://localhost:8000/ws/telemetry";

let map;
let nodeMarkers = {};
let selectedNodeId = "RESQ-NODE-01";
let waterChartInstance = null;
let landslideChartInstance = null;
let websocket = null;

// Initial Node Database Fallback
let nodesData = [
  { id: "RESQ-NODE-01", name: "Riverside Basin Station", type: "RIVER_ONLY", lat: 13.0850, lon: 80.2750, location: "Upper Stream - Sector 1", risk: 0, water: 45.2, rain: 2.1, soil: 35.0, tilt: 0.5, vib: 0.05 },
  { id: "RESQ-NODE-02", name: "Hillside Slope Monitor", type: "SLOPE_ONLY", lat: 13.0920, lon: 80.2680, location: "North Ridge Escarpment", risk: 0, water: 0.0, rain: 1.8, soil: 42.0, tilt: 1.2, vib: 0.08 },
  { id: "RESQ-NODE-03", name: "Bridge Valley Checkpoint", type: "DUAL", lat: 13.0780, lon: 80.2820, location: "Main Causeway Bridge", risk: 0, water: 60.5, rain: 2.5, soil: 50.0, tilt: 0.4, vib: 0.04 },
  { id: "RESQ-NODE-04", name: "High Ridge LoRa Gateway", type: "REPEATER", lat: 13.0990, lon: 80.2600, location: "Ridge Summit Tower", risk: 0, water: 0.0, rain: 0.5, soil: 20.0, tilt: 0.2, vib: 0.02 }
];

// Initialize Map
function initMap() {
  map = L.map('map-container').setView([13.0860, 13.0860 > 50 ? 80.2700 : 80.2720], 14);

  // Free OpenStreetMap (No API Key Required)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);

  updateMapMarkers();
}

function getRiskColor(riskLevel) {
  if (riskLevel === 1) return "#f59e0b"; // Warning Yellow
  if (riskLevel >= 2) return "#ef4444"; // Critical Red
  return "#10b981";                    // Normal Green
}

function getRiskBadgeHTML(riskLevel, riskName) {
  if (riskLevel === 1) return `<span class="risk-tag warning">⚠️ WARNING</span>`;
  if (riskLevel === 2) return `<span class="risk-tag critical">🚨 CRIT FLOOD</span>`;
  if (riskLevel === 3) return `<span class="risk-tag critical">🚨 CRIT SLIDE</span>`;
  return `<span class="risk-tag normal">✓ NORMAL</span>`;
}

function updateMapMarkers() {
  nodesData.forEach(node => {
    const color = getRiskColor(node.risk);
    const radius = node.risk >= 2 ? 14 : 9;

    if (!nodeMarkers[node.id]) {
      const circleMarker = L.circleMarker([node.lat, node.lon], {
        radius: radius,
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.8
      }).addTo(map);

      circleMarker.bindPopup(`
        <div style="font-size:0.85rem;">
          <strong>${node.name} (${node.id})</strong><br>
          <span style="color:#94a3b8;">${node.location}</span><br><br>
          <b>Risk Status:</b> <span style="color:${color}; font-weight:bold;">${getRiskName(node.risk)}</span><br>
          <b>Water Level:</b> ${node.water.toFixed(1)} cm<br>
          <b>Rainfall Rate:</b> ${node.rain.toFixed(1)} mm/hr<br>
          <b>Soil Moisture:</b> ${node.soil.toFixed(1)} %<br>
          <b>Slope Tilt:</b> ${node.tilt.toFixed(1)}°
        </div>
      `);

      circleMarker.on('click', () => {
        selectNode(node.id);
      });

      nodeMarkers[node.id] = circleMarker;
    } else {
      nodeMarkers[node.id].setStyle({
        fillColor: color,
        radius: radius
      });
      nodeMarkers[node.id].setPopupContent(`
        <div style="font-size:0.85rem;">
          <strong>${node.name} (${node.id})</strong><br>
          <span style="color:#94a3b8;">${node.location}</span><br><br>
          <b>Risk Status:</b> <span style="color:${color}; font-weight:bold;">${getRiskName(node.risk)}</span><br>
          <b>Water Level:</b> ${node.water.toFixed(1)} cm<br>
          <b>Rainfall Rate:</b> ${node.rain.toFixed(1)} mm/hr<br>
          <b>Soil Moisture:</b> ${node.soil.toFixed(1)} %<br>
          <b>Slope Tilt:</b> ${node.tilt.toFixed(1)}°
        </div>
      `);
    }
  });
}

function getRiskName(r) {
  if (r === 1) return "WARNING";
  if (r === 2) return "CRITICAL FLOOD";
  if (r === 3) return "CRITICAL LANDSLIDE";
  return "NORMAL";
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
    activeBadge.style.display = 'inline-block';
  } else {
    activeBadge.textContent = `0 CRITICAL`;
    activeBadge.className = 'risk-tag normal';
  }
}

function selectNode(nodeId) {
  selectedNodeId = nodeId;
  document.getElementById('chart-title').textContent = `Real-Time Sensor Telemetry: ${nodeId}`;
  renderNodeList();
  
  const targetNode = nodesData.find(n => n.id === nodeId);
  if (targetNode && map) {
    map.panTo([targetNode.lat, targetNode.lon]);
    if (nodeMarkers[nodeId]) {
      nodeMarkers[nodeId].openPopup();
    }
  }
}

// Chart.js Initialization
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
        x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: '#1e293b' } },
        y: { ticks: { color: '#06b6d4' }, grid: { color: '#1e293b' }, title: { display: true, text: 'Water Level (cm)', color: '#06b6d4' } },
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
        x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: '#1e293b' } },
        y: { ticks: { color: '#10b981' }, grid: { color: '#1e293b' }, title: { display: true, text: 'Soil Saturation (%)', color: '#10b981' } },
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

// Incident Management
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

// WebSocket Live Streaming
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
    node.water = msg.data.water_level_cm;
    node.rain = msg.data.rain_intensity_mm_hr;
    node.soil = msg.data.soil_moisture_pct;
    node.tilt = msg.data.tilt_angle_deg;
    node.vib = msg.data.vibration_rms_g;
    node.risk = msg.data.risk_level;

    updateMapMarkers();
    renderNodeList();

    if (msg.node_id === selectedNodeId) {
      updateCharts(node.water, node.rain, node.soil, node.tilt);
    }

    if (msg.data.risk_level >= 2) {
      addIncidentCard(msg.data.risk_name, "CRITICAL", node.location, msg.data.explanation);
    }
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
