/**
 * RESQNET District Control Room Dashboard Logic
 * Real-time GIS Mapping, WebSocket Streaming, Chart.js Hydrographs, and Interactive Simulation Studio
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

// Initial Node Database Fallback
let nodesData = [
  { id: "RESQ-NODE-01", name: "Riverside Basin Station", type: "RIVER_ONLY", lat: 13.0850, lon: 80.2750, location: "Upper Stream - Sector 1", risk: 0, water: 45.2, rain: 2.1, soil: 35.0, tilt: 0.5, vib: 0.05 },
  { id: "RESQ-NODE-02", name: "Hillside Slope Monitor", type: "SLOPE_ONLY", lat: 13.0920, lon: 80.2680, location: "North Ridge Escarpment", risk: 0, water: 0.0, rain: 1.8, soil: 42.0, tilt: 1.2, vib: 0.08 },
  { id: "RESQ-NODE-03", name: "Bridge Valley Checkpoint", type: "DUAL", lat: 13.0780, lon: 80.2820, location: "Main Causeway Bridge", risk: 0, water: 60.5, rain: 2.5, soil: 50.0, tilt: 0.4, vib: 0.04 },
  { id: "RESQ-NODE-04", name: "High Ridge LoRa Gateway", type: "REPEATER", lat: 13.0990, lon: 80.2600, location: "Ridge Summit Tower", risk: 0, water: 0.0, rain: 0.5, soil: 20.0, tilt: 0.2, vib: 0.02 }
];

// Initialize Map
function initMap() {
  map = L.map('map-container').setView([13.0860, 80.2720], 14);

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
    map.panTo([targetNode.lat, targetNode.lon]);
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

// ==========================================
// SIMULATION STUDIO & INJECTION FUNCTIONS
// ==========================================
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

  // Evaluate risk level on the fly
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
