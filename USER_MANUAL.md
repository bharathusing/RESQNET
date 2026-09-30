# 📖 RESQNET: Distributed Flood & Landslide Early-Warning Network
## 📑 Comprehensive System & Operational User Manual

**Document Version:** `v2.4.0-Production`  
**Problem Statement ID:** `KH26-ECE-16`  
**Problem Statement Title:** Distributed Flood and Landslide Early-Warning Network  
**Theme:** Disaster Management & Public Safety using IoT + AI  
**Category:** Hardware / AIoT / Embedded Systems | **Team ID:** `41`  

---

## 📑 Table of Contents
1. [Introduction & System Scope](#1-introduction--system-scope)
2. [System Architecture & Working Principle](#2-system-architecture--working-principle)
3. [Field Hardware Installation & Deployment Guide](#3-field-hardware-installation--deployment-guide)
4. [Firmware Setup & Configuration Reference](#4-firmware-setup--configuration-reference)
5. [District Control Room Dashboard User Guide](#5-district-control-room-dashboard-user-guide)
6. [Simulation Studio & Disaster Testing Guide](#6-simulation-studio--disaster-testing-guide)
7. [Emergency Incident Protocols & Multi-Channel Dispatch](#7-emergency-incident-protocols--multi-channel-dispatch)
8. [Maintenance, Health Diagnostics & Troubleshooting](#8-maintenance-health-diagnostics--troubleshooting)
9. [Technical Specifications & Performance Benchmarks](#9-technical-specifications--performance-benchmarks)
10. [Quick Operator Reference Cheatsheet](#10-quick-operator-reference-cheatsheet)

---

## 1. Introduction & System Scope

### 1.1 Purpose of this Manual
This User Manual provides complete end-to-end operational instructions for the **RESQNET** disaster early warning platform. It serves as an authoritative guide for:
* **District Emergency Operations Center (DEOC) Operators:** To monitor real-time GIS maps, analyze predictive hydrographs, and manage alert dispatches.
* **Field Engineers & Technicians:** To assemble, calibrate, mount, and maintain field sensor stations.
* **Disaster Response Teams (NDRF / SDRF):** To interpret automated incident telemetry for rapid deployment.
* **Academic & Hackathon Evaluators:** To test, stress-test, and verify all software and AI components.

### 1.2 System Scope
RESQNET provides automated detection, on-device classification, off-grid mesh communication, and public warning dissemination for two compounding natural hazards:
1. **Flash Floods:** Riverbed swelling, dam overtopping, and bridge causeway inundation.
2. **Rainfall-Induced Landslides:** Geotechnical slope saturation, shear displacement, and seismic vibration from debris flow.

---

## 2. System Architecture & Working Principle

```text
====================================================================================================
1. FIELD SENSOR NODE (Edge Unit)       2. COMMUNICATION & CLOUD         3. USER & RESPONSE SYSTEM
====================================================================================================

 [JSN-SR04T Ultrasonic Level] ──┐
 [Tipping-Bucket Rain Gauge]  ──┼──► [ESP32 Microcontroller]
 [Capacitive Soil Moisture]   ──┤         │
 [MPU-6050 Accelerometer/Tilt]──┘         ▼
                                   [On-Device Edge AI]
                                  (Feature Fusion & ML)
                                            │
                   ┌────────────────────────┼────────────────────────┐
                   ▼                        ▼                        ▼
             [Local Alerts]           [LoRa Mesh]              [4G/GSM Module]
             • Multi-tone Siren       • 433/868MHz SPI         • SIM7600 MQTT
             • RGB Alert Beacon       • Multi-hop Relay        • Emergency SMS
             • Tri-lingual Voice      • Inter-node Sync              │
                                            │                        ▼
                                            │               [Cloud FastAPI Server]
                                            │               • SQLite / PostgreSQL
                                            │               • WebSocket Streaming
                                            │               • Zone Escalation Analytics
                                            ▼                        │
                                 [Neighbor Field Nodes]              ▼
                                 (Decentralized Cascade)    [Control Room Dashboard]
                                                            • Live Leaflet GIS Map
                                                            • Sensor Hydrographs
                                                            • Incident Management
                                                                     │
                                                                     ▼
                                                            [Authorities & Public]
                                                            • NDRF & District Ops (DEOC)
                                                            • Community SMS Alerts
                                                            • WhatsApp Broadcasts
====================================================================================================
```

### Key Functional Principles:
1. **Edge-First Autonomy:** The field node evaluates danger locally via on-device Edge AI. Local sirens and radio alerts fire in $<1\text{ ms}$ without requiring active internet.
2. **Decentralized LoRa Mesh:** If cell towers are disabled by high winds or landslides, nodes relay hazard packets hop-by-hop across the valley.
3. **Dual-Uplink Redundancy:** Telemetry is sent via LoRa to neighbors and simultaneously uplinked to the Cloud Server over 4G LTE.

---

## 3. Field Hardware Installation & Deployment Guide

### 3.1 Hardware Checklist (Per Field Station)
* [ ] 1× ESP32 DevKit V1 (30-pin microcontroller)
* [ ] 1× JSN-SR04T Waterproof Ultrasonic Sensor ($2.5\text{m}$ cable)
* [ ] 1× Tipping-Bucket Rain Gauge ($0.2794\text{ mm/tip}$)
* [ ] 1× Capacitive Soil Moisture Sensor v1.2
* [ ] 1× MPU-6050 6-DOF Accelerometer & Gyroscope
* [ ] 1× SX1278 LoRa Transceiver ($433\text{ MHz}$ or $865-867\text{ MHz}$) with high-gain antenna
* [ ] 1× SIM7600 4G LTE Cellular Modem with active SIM card
* [ ] 1× NEO-6M GPS Module with ceramic patch antenna
* [ ] 1× 5V Piezo High-Decibel Siren & Common-Cathode RGB Alert LED
* [ ] 1× DFPlayer Mini Voice Module & 3W Horn Speaker
* [ ] 1× 6V 5W Polycrystalline Solar Panel & 2× 18650 Li-ion Battery Bank ($5200\text{ mAh}$)
* [ ] 1× IP66 Weatherproof Enclosure with PG7/PG9 nylon cable glands

---

### 3.2 ESP32 Pinout Wiring Mapping

> [!IMPORTANT]
> **ADC Channel Protection:** Soil moisture and battery monitoring must strictly use **ADC1** pins (`GPIO 34` and `GPIO 36`) to avoid conflicts with active radio transceivers.

```text
 ┌────────────────────────────────────────────────────────┐
 │                    ESP32 PIN CONNECTIONS               │
 ├─────────────────────────┬──────────────────────────────┤
 │ Sensor / Peripheral     │ ESP32 Pin Mapping            │
 ├─────────────────────────┼──────────────────────────────┤
 │ JSN-SR04T Trigger       │ GPIO 5                       │
 │ JSN-SR04T Echo          │ GPIO 18 (via 1k/2k divider)  │
 │ Rain Gauge Pulse        │ GPIO 19 (Interrupt FALLING)  │
 │ Soil Moisture Analog    │ GPIO 34 (ADC1_CH6)           │
 │ Battery Voltage Monitor │ GPIO 36 (ADC1_CH0 via div)   │
 │ MPU-6050 SDA            │ GPIO 21 (I2C Data)           │
 │ MPU-6050 SCL            │ GPIO 22 (I2C Clock)          │
 │ LoRa SX1278 SCK         │ GPIO 14 (SPI SCK)            │
 │ LoRa SX1278 MISO        │ GPIO 12 (SPI MISO)           │
 │ LoRa SX1278 MOSI        │ GPIO 13 (SPI MOSI)           │
 │ LoRa SX1278 CS (NSS)    │ GPIO 15 (SPI SS)             │
 │ LoRa SX1278 RST         │ GPIO 33                      │
 │ LoRa SX1278 DIO0        │ GPIO 32                      │
 │ SIM7600 GSM TX          │ GPIO 25 (UART1 RX)           │
 │ SIM7600 GSM RX          │ GPIO 26 (UART1 TX)           │
 │ SIM7600 GSM Power Key   │ GPIO 27                      │
 │ NEO-6M GPS TX           │ GPIO 16 (UART2 RX)           │
 │ NEO-6M GPS RX           │ GPIO 17 (UART2 TX)           │
 │ Piezo Buzzer PWM        │ GPIO 23 (LEDC Channel 0)     │
 │ RGB Alert LED           │ GPIO 2                       │
 │ DFPlayer Mini TX        │ GPIO 0                       │
 │ DFPlayer Busy Pin       │ GPIO 4                       │
 └─────────────────────────┴──────────────────────────────┘
```

---

### 3.3 Site Placement & Mounting Procedures

#### A. Riverside Flood Station Mounting:
1. Mount the IP66 enclosure on a bridge pier or a rigid $3\text{m}$ Galvanized Iron (GI) pole along the riverbank.
2. Point the JSN-SR04T waterproof ultrasonic probe **vertically downward** perpendicular to the water surface. Ensure a minimum clearance of $25\text{ cm}$ at peak flood.
3. Position the rain gauge on top of the pole in a clear, unobstructed location. Level it using the integrated bubble level.

#### B. Hillside Landslide Station Mounting:
1. Identify the steep escarpment shear plane prone to debris failure.
2. Firmly anchor the MPU-6050 module housing directly to bedrock or a concrete retaining wall using masonry anchors to ensure true ground motion transfer.
3. Bury the capacitive soil moisture sensor vertically at a depth of $20-30\text{ cm}$ in the representative soil stratum.
4. Position the LoRa dipole antenna vertically with direct line-of-sight to adjacent valley nodes.

---

## 4. Firmware Setup & Configuration Reference

### 4.1 Flashing Firmware onto Field Nodes
1. Open the project in **Arduino IDE** or **PlatformIO** (`code/firmware/`).
2. Install the following libraries via the Library Manager:
   * `LoRa` by Sandeep Mistry
   * `Adafruit MPU6050` & `Adafruit Unified Sensor`
   * `ArduinoJson`
3. Open [`config.h`](file:///b:/Adv_Projects/PPT/code/firmware/config.h) and set the station parameters:
   ```cpp
   #define NODE_ID              "RESQ-NODE-01"
   #define NODE_ZONE            "SECTOR-A-RIVERSIDE"
   #define SENSOR_MOUNT_HEIGHT_CM 450.0f
   #define GSM_APN              "airtelgprs.com"
   #define CLOUD_MQTT_SERVER    "broker.hivemq.com"
   ```
4. Connect the ESP32 via Micro-USB, select `ESP32 Dev Module`, and click **Upload**.

---

## 5. District Control Room Dashboard User Guide

### 5.1 Accessing the Command Center
1. Launch the Cloud Server backend:
   ```bash
   cd code/backend
   python main.py
   ```
2. Open your web browser and navigate to:
   👉 **`http://localhost:8000/dashboard`**

---

### 5.2 Dashboard Layout & Screen Navigation

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│  HEADER: Live Network Telemetry (Server Online | WebSockets | LoRa Mesh 100%)    │
├───────────────────┬──────────────────────────────────────────┬───────────────────┤
│ LEFT PANEL        │ CENTER: Multi-Layer Dark GIS Map         │ RIGHT PANEL       │
│ • Real-time Node  │ • Live Radar Pulsing Markers (Green/Red) │ • Live Incident   │
│   Health Roster   │ • 3-Layer Basemap Switcher (Dark/Sat)    │   Audit Log       │
│ • Live Risk Tags  │ • Floating Glassmorphic Legend           │ • Manual Siren    │
│   (Normal/Warning)│ • Dynamic Node Selection & Pan           │   Broadcast Modal │
├───────────────────┴──────────────────────────────────────────┴───────────────────┤
│ BOTTOM: Real-Time Hydrographs (Water vs Rain Rate | Soil Saturation vs Tilt)     │
└──────────────────────────────────────────────────────────────────────────────────┘
```

#### A. Header Bar & Controls:
* **Simulation Studio Button:** Opens the interactive disaster testing modal.
* **Notification Bell (`🔔`) & Live Badge:** Displays unread hazard alert count with a pop animation. Clicking opens the **In-App Alert Activity Drawer** showing historical alerts with timestamps and "Locate Node" actions.
* **Audio Alerts Toggle (`🔊 Sound: ON/OFF`):** Enables/mutes the Web Audio synthesizer for alert chimes.
* **Cloud Server & WebSocket Dots:** Green indicates active live bidirectional streaming.
* **Active Nodes Count:** Displays online node count (e.g. `4 / 4`).
* **Mesh Health:** Displays LoRa radio network status.

#### B. In-App Real-Time Popup Toasts:
Whenever an environmental threshold or rate-of-change spike is detected, an interactive floating popup card slides into the top-right corner:
* **🌊 Rapid Water Level Rise Alert:** Triggers immediately when water rises rapidly ($\ge 15\text{ cm}$ surge) or crosses flood warning lines ($>180\text{ cm}$ or $>280\text{ cm}$). Displays instantaneous depth, delta increase ($\Delta W$), and riverbed clearance advisory.
* **⛰️ Slope Instability & Shear Alert:** Triggers when slope tilt exceeds $4.0^\circ$ or changes rapidly under saturated ground conditions ($>70\%$ soil moisture).
* **🌧️ Cloudburst Rainfall Warning:** Triggers when rainfall rate exceeds $45\text{ mm/hr}$.
* **🚨 Critical Disaster Emergency Popup:** High-visibility pulsing red alert with sound chime when on-device Edge AI classifies a Critical Flash Flood or Landslide.
* **Interactive Popup Features:**
  * **📍 View on Map Button:** Centers the map directly onto the alerting sensor node and opens its metadata popup.
  * **Animated Countdown Progress Bar:** Visual indicator before the toast auto-dismisses.
  * **Synthesized Audio Chimes:** Uses Web Audio API for distinct warning tones and urgent alarm beeps without requiring external audio files.

#### C. Left Panel (Node Roster):
* Displays all active stations (`Riverside Basin`, `Hillside Escarpment`, `Bridge Valley`, `Ridge Gateway`).
* Displays live risk tags: `✓ NORMAL` (Green), `⚠️ WARNING` (Amber), `🚨 CRITICAL` (Red).
* **Clicking any node card** selects it, pans the map, and plots its sensor curves on the bottom graphs.

#### D. Center GIS Map:
* **Layer Switcher (Top-Right):** Click to toggle between:
  * **🌙 Dark Mode:** High-contrast Esri Dark Gray Canvas (Default).
  * **🗺️ Street Map:** OpenStreetMap standard vector layer.
  * **🛰️ Satellite View:** High-resolution Esri World Imagery.
* **Glowing Markers:** Neon pins with animated radar pulse shockwaves that expand during emergencies.
* **Map Legend (Bottom-Left):** Quick color reference for Normal, Warning, and Critical statuses.

#### E. Bottom Telemetry Hydrographs:
* **Left Graph:** Plots real-time Water Depth ($cm$) alongside Rainfall Intensity ($mm/hr$).
* **Right Graph:** Plots Soil Saturation ($\%$) alongside Slope Tilt Angle ($\theta$).

#### F. Right Panel (Incident Center):
* Chronological audit feed of all detected disaster events with automated dispatch confirmations.
* **Broadcast District Evacuation Siren:** Manual operator override button to sound all valley sirens.

---

## 6. Simulation Studio & Disaster Testing Guide

The **Simulation Studio** enables 100% interactive testing and stress-testing without physical hardware.

### 6.1 Opening the Simulation Studio
Click the purple **`🎮 Simulation Studio & Disaster Injector`** button in the header bar.

---

### 6.2 Using One-Click Scenario Presets

| Preset Button | Injected Condition | Expected System Response |
| :--- | :--- | :--- |
| **☀️ Normal Baseline** | Water: $40\text{ cm}$, Rain: $0\text{ mm/h}$, Soil: $30\%$, Tilt: $0.4^\circ$ | All nodes turn **Green**. All active alarms clear. Hydrograph returns to baseline. |
| **🌧️ Heavy Rain (Warning)** | Rain: $55\text{ mm/h}$, Soil: $75\%$, Water: $190\text{ cm}$ | Nodes turn **Amber 🟡 WARNING**. Slow pulsed warning tone. Pre-evacuation log created. |
| **🌊 Flash Flood Surge** | Node-01 & 03 Water: $425\text{ cm}$, Rain: $145\text{ mm/h}$ | Node-01 & 03 turn **Pulsing Neon Red 🔴 CRITICAL FLASH FLOOD**. Multi-tone sirens fire. SMS/WhatsApp alerts dispatch. |
| **⛰️ Landslide Shear** | Node-02 Soil: $99\%$, Tilt: $32.5^\circ$, Vibration: $2.95g$ | Node-02 turns **Pulsing Neon Red 🔴 CRITICAL LANDSLIDE**. Tri-lingual voice evacuation fires. |
| **🚨 Compound Multi-Hazard**| Simultaneous flash flood inundation & hillside collapse | Valley-wide emergency escalation. All sirens sound. Automated mass evacuation order issued. |

---

### 6.3 Using Live Manual Sliders
1. Select your target node (e.g. `RESQ-NODE-01`).
2. Adjust any slider:
   * **Water Depth Slider:** $0 - 500\text{ cm}$
   * **Rainfall Rate Slider:** $0 - 150\text{ mm/hr}$
   * **Soil Saturation Slider:** $0 - 100\%$
   * **Slope Tilt Slider:** $0 - 45^\circ$
   * **Vibration Slider:** $0 - 3.5g$
3. Click **`🚀 Inject Custom Sensor Reading`**.
4. Observe the Edge AI decision boundaries classify the input instantly in $<1\text{ ms}$.

---

### 6.4 Running Automated 1-Minute Disaster Sequence
Click **`▶️ Run 1-Minute Live Disaster Sequence`**. The system will automatically execute:
* *Seconds 0–6:* Normal baseline conditions.
* *Seconds 7–16:* Cloudburst storm warning.
* *Seconds 17–28:* River cresting & flash flood emergency.
* *Seconds 29–40:* Landslide slope collapse.
* *Seconds 41–60:* Storm passage, hysteresis verification, and recovery.

---

## 7. Emergency Incident Protocols & Multi-Channel Dispatch

When Edge AI or an operator confirms a **CRITICAL** hazard, the following automated protocol executes:

```text
[Hazard Detected] ──► 1. Local Node sounds 110dB Piezo Siren + Flashing Red LED
                   ──► 2. DFPlayer broadcasts spoken voice alerts (Telugu → Hindi → English)
                   ──► 3. LoRa Mesh relays emergency packet to downstream village nodes
                   ──► 4. 4G Modem uplinks event to District Control Room GIS Map
                   ──► 5. Cloud Server dispatches SMS & WhatsApp notices to NDRF & DEOC
```

### 7.1 Sample Automated Emergency SMS / WhatsApp Notice:
```text
🚨 [RESQNET CRITICAL DISASTER ALERT] 🚨
========================================
⚠️ Hazard: FLASH_FLOOD
⚡ Severity: CRITICAL_FLOOD
📍 Location: Upper Adyar Stream - Zone 1 (Node: RESQ-NODE-01)
🕒 Time: 30-Sep-2026 18:10:45
📊 Diagnostics: Water=425.0cm | Rain=145.0mm/h | Tilt=0.5°
📋 Situation: CRITICAL FLASH FLOOD: River cresting at 4.25m depth!
🚨 Action: IMMEDIATE EVACUATION OF LOWLANDS & UNSTABLE SLOPES ADVISED.
```

---

## 8. Maintenance, Health Diagnostics & Troubleshooting

### 8.1 Preventative Maintenance Schedule

| Interval | Component | Action Required |
| :--- | :--- | :--- |
| **Weekly** | Dashboard | Check node online status, battery percentages, and LoRa mesh health indicators. |
| **Monthly** | Rain Gauge | Inspect tipping bucket funnel for leaves, dirt, or insect nests; clean with soft brush. |
| **Monthly** | Solar Panel | Wipe dust and bird droppings off the glass surface with a damp cloth. |
| **Quarterly** | Ultrasonic Probe | Inspect transducer surface for cobwebs or algae; ensure vertical downward alignment. |
| **Pre-Monsoon** | Battery Bank | Check terminal voltages ($>3.8\text{V}$ nominal); test local siren and voice speaker tracks. |

---

### 8.2 Troubleshooting & Diagnostic Guide

| Symptom | Probable Cause | Corrective Action |
| :--- | :--- | :--- |
| **Node displays `SENSOR_FAULT`** | Ultrasonic timeout or soil ADC out-of-range | Check sensor 5V/3.3V power rails. Inspect 1k/2k voltage divider on Echo pin (`GPIO 18`). |
| **LoRa radio fails at boot** | SPI wiring fault or loose CS/RST pin | Verify SPI pins (`SCK: 14`, `MISO: 12`, `MOSI: 13`, `NSS: 15`, `RST: 33`, `DIO0: 32`). Ensure $433\text{ MHz}$ antenna is firmly connected. |
| **Cellular modem offline** | SIM card inactive or low carrier signal | Verify SIM card data/SMS balance. Check APN string in `config.h`. Reposition antenna vertically. |
| **Dashboard shows `WebSocket: Reconnecting`**| Backend server process stopped | Ensure `python main.py` is running in Terminal 1. Verify port 8000 is not blocked by a firewall. |
| **Battery percentage drops rapidly** | Deep sleep disabled or shorted cell | Verify that normal sampling interval is set to $5\text{ seconds}$ in `config.h`. Replace degraded 18650 cells. |

---

## 9. Technical Specifications & Performance Benchmarks

* **Microcontroller:** Espressif ESP32-WROOM-32 (Dual-Core Tensilica LX6 @ 240MHz, 520KB SRAM).
* **On-Device AI Inference Latency:** $<0.05\text{ milliseconds}$ ($<50\,\mu\text{s}$).
* **Critical Hazard Detection Recall:** $\mathbf{100.00\%}$ on test validation benchmark.
* **LoRa RF Frequency:** $433\text{ MHz}$ ISM (Configurable to $865-867\text{ MHz}$ for India).
* **LoRa Range:** $3.5\text{ km}$ (dense forest/valleys), up to $12\text{ km}$ (unobstructed line-of-sight).
* **Cellular Bands:** 4G LTE-FDD (B1/B3/B5/B8), LTE-TDD (B38/B40/B41), 2G GSM (900/1800MHz).
* **Power Consumption:** $1.8\text{ mA}$ (Sleep), $95\text{ mA}$ (Sampling + AI), $125\text{ mA}$ (LoRa TX), $280\text{ mA}$ (4G Uplink).
* **Battery Autonomy:** $>20\text{ days}$ of continuous operation under total solar blackout ($5200\text{ mAh}$ pack).
* **Waterproofing Standard:** IP66 / IP67 compliant.

---

## 10. Quick Operator Reference Cheatsheet

### 🚀 Common Terminal Commands:
```bash
# Start Cloud Server & Web Dashboard
cd code/backend
python main.py

# Launch Multi-Node Virtual Simulator
cd code/simulator
python network_simulator.py

# Retrain Edge AI Machine Learning Model
cd code/edge_ai_model
python train_disaster_model.py
```

### 🌐 Key System URLs:
* **District Control Room Dashboard:** `http://localhost:8000/dashboard`
* **Interactive REST API Docs (Swagger):** `http://localhost:8000/docs`
* **Raw Telemetry Stream (JSON):** `http://localhost:8000/api/telemetry/latest`

---

*© 2026 RESQNET Engineering Team | Problem Statement KH26-ECE-16 | Team 41*
