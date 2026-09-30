# 🌊⛰️ RESQNET: Distributed Flood and Landslide Early-Warning Network

[![Python](https://img.shields.io/badge/Python-3.9%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%7C%20WebSockets-009688.svg)](https://fastapi.tiangolo.com/)
[![Leaflet.js](https://img.shields.io/badge/GIS-Leaflet.js%20Zero--API--Key-199900.svg)](https://leafletjs.com/)
[![Edge AI](https://img.shields.io/badge/AI-On--Device%20Edge%20ML-orange.svg)](https://scikit-learn.org/)
[![Hardware](https://img.shields.io/badge/Hardware-ESP32%20%7C%20FreeRTOS%20%7C%20LoRa-red.svg)](https://espressif.com/)

**Problem Statement ID:** `KH26-ECE-16`  
**Problem Statement Title:** Distributed Flood and Landslide Early-Warning Network  
**Theme:** Disaster Management & Public Safety using IoT + AI  
**Category:** Hardware / Embedded Systems / AIoT | **Team ID:** `41`  
**Project Name:** **RESQNET** (Resilient Early-Warning Sensor & Quick Notification Network)  
**GitHub Repository:** [https://github.com/bharathusing/RESQNET](https://github.com/bharathusing/RESQNET)

---

## 📑 Table of Contents
1. [Executive Summary & Problem Statement](#1-executive-summary--problem-statement)
2. [End-to-End System Architecture](#2-end-to-end-system-architecture)
3. [Key Innovations & Technical Highlights](#3-key-innovations--technical-highlights)
4. [Control Room Web Dashboard & App Features](#4-control-room-web-dashboard--app-features)
5. [In-App Real-Time Alert & Audio System](#5-in-app-real-time-alert--audio-system)
6. [Interactive Simulation Studio & Disaster Injector](#6-interactive-simulation-studio--disaster-injector)
7. [Repository File & Directory Structure](#7-repository-file--directory-structure)
8. [Step-by-Step Installation & Local Setup Guide](#8-step-by-step-installation--local-setup-guide)
9. [Edge AI Model Retraining & C Firmware Export](#9-edge-ai-model-retraining--c-firmware-export)
10. [Field Hardware Wiring, Pinout & Flashing Guide](#10-field-hardware-wiring-pinout--flashing-guide)
11. [REST API & WebSocket Documentation](#11-rest-api--websocket-documentation)
12. [Troubleshooting & Diagnostic Manual](#12-troubleshooting--diagnostic-manual)
13. [Presentation Pitch Script & Evaluator Defense](#13-presentation-pitch-script--evaluator-defense)

---

## 1. Executive Summary & Problem Statement

### 1.1 The Challenge
In mountainous valleys, river basins, and coastal foothills, torrential cloudbursts trigger two severe, compounding disasters:
1. **Flash Floods:** River levels surge within minutes, submerging bridges, causeways, and low-lying settlements.
2. **Rainfall-Induced Landslides:** Prolonged precipitation saturates hillside soils, eliminating shear strength and causing sudden slope collapse and mudslides.

### 1.2 Limitations of Legacy Early-Warning Systems
* **Cloud Latency & Network Vulnerability:** Severe storms frequently knock out cell towers and electrical grids, rendering purely cloud-dependent systems blind.
* **Single-Parameter False Alarms:** Relying only on river water depth or simple rain gauges leads to frequent false alarms or missed compound disaster signals.
* **Prohibitive Cost:** Industrial hydrometric stations cost upwards of ₹1,50,000 per unit, making dense geographical deployment impractical for local administrations.

### 1.3 The RESQNET Solution
**RESQNET** is an autonomous, decentralized, and edge-intelligent early warning network. Built on low-power **ESP32 field stations**, it fuses multi-modal hydrological and geotechnical sensors, classifies disaster risk in **sub-millisecond time using on-device Edge AI**, communicates over an **off-grid decentralized LoRa Mesh**, and streams telemetry to a **District Control Room GIS Command Center** with real-time in-app hazard popups, audio chimes, and automated SMS/WhatsApp emergency dispatching.

---

## 2. End-to-End System Architecture

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
                                                            • In-App Popup Toasts
                                                            • Incident Management
                                                                     │
                                                                     ▼
                                                            [Authorities & Public]
                                                            • NDRF & District Ops (DEOC)
                                                            • Community SMS Alerts
                                                            • WhatsApp Broadcasts
====================================================================================================
```

---

## 3. Key Innovations & Technical Highlights

* **Multi-Modal Sensor Fusion:** Simultaneously correlates Water Depth ($cm$), Rate of Rise ($cm/min$), 10/30/60-minute Rain Accumulation ($mm$), Soil Moisture Saturation ($\%$), Slope Tilt ($\theta$), and Seismic Vibration Energy ($g$).
* **Autonomous On-Device Edge AI:** Zero cloud dependency for local hazard detection. The microcontroller makes autonomous safety decisions and sounds sirens in $<1\text{ ms}$ even during complete cellular blackout.
* **Decentralized LoRa Mesh Resilience:** Multi-hop packet relaying with CRC-16 integrity checks, 3-hop depth, and duplicate packet suppression.
* **Fail-Safe Defense-in-Depth:** Parallel execution of on-device Machine Learning and deterministic hard-threshold safety rules with cautious-of-the-two arbitration.
* **False-Alarm Reduction & Hysteresis:** Requires 3 consecutive elevated readings to escalate risk, and enforces a strict 10-minute hysteresis window before de-escalating.
* **Tri-Lingual Voice Evacuation:** On-board DFPlayer Mini module broadcasts spoken warnings in **Telugu, Hindi, and English**.

---

## 4. Control Room Web Dashboard & App Features

Located in [`code/dashboard/`](file:///b:/Adv_Projects/PPT/code/dashboard/):

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│  HEADER: Live Network Status | Notification Bell 🔔 | Audio 🔊 | Sim Studio 🎮  │
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

1. **Zero-API-Key Multi-Layer GIS Map:**
   * High-contrast **Dark Mode Canvas** (Esri World Dark Gray Canvas).
   * **Street Map** (OpenStreetMap Standard vector layer).
   * High-resolution **Satellite View** (Esri World Imagery).
   * Custom HTML/SVG glowing status markers (`L.divIcon`) with expanding CSS `@keyframes` radar pulse shockwaves.
2. **Real-Time Telemetry Hydrographs:**
   * **Hydrograph 1:** Live River Water Level ($cm$) paired with Rain Intensity ($mm/hr$).
   * **Hydrograph 2:** Soil Saturation ($\%$) paired with Geotechnical Slope Tilt ($\theta$).
3. **Live Incident Feed & Dispatch Log:**
   * Automated audit feed tracking disaster escalations, SMS/WhatsApp dispatch status, and district evacuation orders.

---

## 5. In-App Real-Time Alert & Audio System

### 5.1 Real-Time Floating Popup Toasts
Whenever an environmental threshold or rate-of-change spike is detected, an interactive floating popup card slides into the top-right corner:
* **🌊 Rapid Water Level Rise Alert:** Triggers immediately when water rises rapidly ($\ge 15\text{ cm}$ surge) or crosses flood warning lines ($>180\text{ cm}$ or $>280\text{ cm}$). Displays instantaneous depth, delta increase ($\Delta W$), and riverbed clearance advisory.
* **⛰️ Slope Instability & Shear Alert:** Triggers when slope tilt exceeds $4.0^\circ$ or changes rapidly under saturated ground conditions ($>70\%$ soil moisture).
* **🌧️ Cloudburst Rainfall Warning:** Triggers when rainfall rate exceeds $45\text{ mm/hr}$.
* **🚨 Critical Disaster Emergency Popup:** High-visibility pulsing red alert with sound chime when on-device Edge AI classifies a Critical Flash Flood or Landslide.
* **📍 View on Map Button:** Centers the map directly onto the alerting sensor node and opens its metadata popup with one click.
* **Countdown Progress Bar:** Shows visual auto-dismiss timer.

### 5.2 Synthesized Web Audio API Chimes (No External Audio Files)
* **Ascending Water Chime:** Gentle melodic tone when water level surge is detected.
* **Urgent Alarm Chime:** Triple rapid warning tone during Critical events.
* **`🔊 Sound: ON/OFF` Header Toggle:** Allows operators to mute/unmute audio alerts at any time.

### 5.3 Notification Center & Activity Drawer
* **Header Notification Bell (`🔔`)** with an animated unread badge counter.
* Clicking opens a slide-down **Alert Activity Drawer** to review past alerts with timestamps, node details, and one-click map focusing.

---

## 6. Interactive Simulation Studio & Disaster Injector

Click the purple **`🎮 Simulation Studio & Disaster Injector`** button in the dashboard header:

1. **One-Click Disaster Scenario Presets:**
   * `☀️ Normal Baseline`: Water 40cm, Rain 0mm, Soil 30%.
   * `🌧️ Heavy Rain (Warning)`: Rain 55mm/h, Soil 75%, Water 190cm.
   * `🌊 Flash Flood Surge`: Upstream flood cresting at 425cm.
   * `⛰️ Landslide Shear Failure`: Slope tilt 28.5°, Soil 99%, Vibration 2.85g.
   * `🚨 Compound Multi-Hazard`: Simultaneous flash flood and hillside collapse.
2. **Dynamic Manual Sensor Sliders:**
   * Adjust **Water Depth (0–500 cm)**, **Rainfall Rate (0–150 mm/h)**, **Soil Saturation (0–100%)**, **Slope Tilt (0–45°)**, and **Vibration (0–3.5g)**.
   * Click **`🚀 Inject Custom Sensor Reading`** to test custom thresholds.
3. **Automated 1-Minute Live Sequence:**
   * Click **`▶️ Run 1-Minute Live Disaster Sequence`** to execute a realistic progression (Normal $\rightarrow$ Heavy Storm $\rightarrow$ Flood Surge $\rightarrow$ Landslide $\rightarrow$ Recovery).

---

## 7. Repository File & Directory Structure

```text
RESQNET/
├── firmware/                           # ESP32 C++ FreeRTOS Edge Firmware
│   ├── config.h                        # Pinout table, ADC1 safety map, threshold constants
│   ├── sensors.h / sensors.cpp         # JSN-SR04T, rain gauge interrupt, soil moisture, MPU-6050
│   ├── preprocess.h / preprocess.cpp   # Sliding-window rainfall, rate-of-rise (dW/dt), soil trend
│   ├── edge_ai.h / edge_ai.cpp         # Sub-microsecond ML inference & rule-based safety net
│   ├── model_weights.h                 # Exported C decision tree weights
│   ├── risk_fsm.h / risk_fsm.cpp       # 3-sample confirmation & 10-minute hysteresis FSM
│   ├── alerts.h / alerts.cpp           # PWM sirens, RGB LED beacon, tri-lingual DFPlayer voice
│   ├── lora_mesh.h / lora_mesh.cpp     # 60-byte binary packet protocol, CRC-16, duplicate cache
│   ├── gsm_cloud.h / gsm_cloud.cpp     # SIM7600 4G LTE AT command driver, MQTT publisher, SMS
│   ├── storage.h / storage.cpp         # Circular EEPROM/Flash offline logging & resync
│   ├── power.h / power.cpp             # Battery ADC monitoring & adaptive deep-sleep scheduling
│   └── resqnet_esp32_node.ino          # Master FreeRTOS dual-core task scheduler
│
├── edge_ai_model/                      # Machine Learning Training & C Code Export
│   ├── train_disaster_model.py         # Generates 15k hydro samples, trains model, exports C header
│   └── requirements.txt                # ML dependencies (scikit-learn, pandas, numpy)
│
├── backend/                            # Cloud Server & Emergency Alert Dispatcher
│   ├── main.py                         # FastAPI async REST API & WebSocket live streaming
│   ├── database.py                     # SQLite / SQLAlchemy persistence schema
│   ├── alert_dispatcher.py             # Automated multi-channel dispatch (SMS, WhatsApp, Cooldown)
│   ├── mqtt_receiver.py                # Paho-MQTT v1/v2 compatible telemetry receiver
│   └── requirements.txt                # Backend dependencies (fastapi, uvicorn, pydantic, etc.)
│
├── dashboard/                          # Control Room Web Dashboard (Zero-API-Key Setup)
│   ├── index.html                      # Control room UI layout & simulation modal
│   ├── app.js                          # Leaflet GIS mapping, Chart.js hydrographs, in-app alerts
│   └── styles.css                      # Deep dark theme (#0b0f19), glowing radar markers, toasts
│
├── simulator/                          # Multi-Node Digital Twin Simulator
│   ├── network_simulator.py            # 4-node concurrent disaster progression simulator
│   ├── capture_screenshots.py          # Headless Chrome automated screenshot generator
│   └── test_scenarios.json             # Pre-configured scenario profiles
│
├── screens/                            # High-Resolution UI Screenshots
│   ├── 01_normal_baseline_dashboard.png
│   ├── 02_elevated_warning_state.png
│   ├── 03_critical_disaster_dashboard.png
│   ├── 04_emergency_evacuation_broadcast.png
│   └── 05_simulation_studio_active.png
│
├── README.md                           # Master Technical & Setup Documentation
└── USER_MANUAL.md                      # Comprehensive Operational & Troubleshooting Manual
```

---

## 8. Step-by-Step Installation & Local Setup Guide

### 8.1 Prerequisites
* **Python 3.9+** ([Download Python](https://www.python.org/downloads/))
* **Git** ([Download Git](https://git-scm.com/))
* A modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox)

---

### 8.2 Step 1: Clone the Repository
```bash
git clone https://github.com/bharathusing/RESQNET.git
cd RESQNET
```

---

### 8.3 Step 2: Set Up Python Virtual Environment (Recommended)
```bash
# Create virtual environment
python -m venv venv

# Activate on Windows (PowerShell):
.\venv\Scripts\Activate.ps1

# Activate on Linux / macOS:
source venv/bin/activate
```

---

### 8.4 Step 3: Install Dependencies
```bash
# Install backend requirements
pip install -r backend/requirements.txt

# Install Edge AI training requirements
pip install -r edge_ai_model/requirements.txt
```

---

### 8.5 Step 4: Launch Cloud Backend Server & Dashboard
```bash
cd backend
python main.py
```
* The FastAPI server will start on: **`http://127.0.0.1:8000`**
* Open your browser and navigate to: **[http://localhost:8000/dashboard](http://localhost:8000/dashboard)**
* You will see the live dark-themed Control Room Command Center with GIS map, hydrographs, and notification center.

---

### 8.6 Step 5: Run Multi-Node Simulator (In a New Terminal)
Open a **second terminal window** and run:
```bash
cd simulator
python network_simulator.py
```
* Telemetry from all 4 virtual nodes will stream into the FastAPI backend and update the dashboard in real time over WebSockets!

---

## 9. Edge AI Model Retraining & C Firmware Export

To retrain the Edge AI model or customize disaster threshold weights:

```bash
cd edge_ai_model
python train_disaster_model.py
```

### What this script does:
1. Generates 15,000 synthetic hydro-geotechnical samples reflecting realistic monsoonal dynamics.
2. Trains a high-precision Decision Tree classifier with **100% Critical Recall**.
3. Exports the trained model as pure, zero-dependency C source code in [`firmware/model_weights.h`](file:///b:/Adv_Projects/PPT/code/firmware/model_weights.h) for sub-microsecond microcontroller execution.

---

## 10. Field Hardware Wiring, Pinout & Flashing Guide

### 10.1 Conflict-Free ESP32 GPIO Pinout Table

| ESP32 Pin | Connected Hardware | Function / Protocol | Notes & Safety Rules |
| :--- | :--- | :--- | :--- |
| **GPIO 5** | JSN-SR04T Ultrasonic | `TRIG_PIN` (Trigger) | 10µs pulse output |
| **GPIO 18** | JSN-SR04T Ultrasonic | `ECHO_PIN` (Echo Input) | **1kΩ / 2kΩ voltage divider required** (5V $\rightarrow$ 3.3V) |
| **GPIO 19** | Rain Gauge | `RAIN_PIN` (Reed Switch) | Hardware interrupt on `FALLING` edge + 50ms debounce |
| **GPIO 34** | Capacitive Soil Sensor | `SOIL_PIN` (Analog Input) | **ADC1 Only** (Safe during Wi-Fi/LoRa operations) |
| **GPIO 36 (VP)**| Battery Voltage Divider | `BATT_PIN` (Analog Input) | **ADC1 Only** (100kΩ / 100kΩ voltage divider) |
| **GPIO 21** | MPU-6050 Accelerometer | `SDA` (I2C Data) | 400kHz Fast-mode I2C bus |
| **GPIO 22** | MPU-6050 Accelerometer | `SCL` (I2C Clock) | 400kHz Fast-mode I2C bus |
| **GPIO 14** | SX1278 LoRa Module | `SCK` (SPI Clock) | VSPI Bus |
| **GPIO 12** | SX1278 LoRa Module | `MISO` (SPI Data Out) | VSPI Bus |
| **GPIO 13** | SX1278 LoRa Module | `MOSI` (SPI Data In) | VSPI Bus |
| **GPIO 15** | SX1278 LoRa Module | `NSS / CS` (Chip Select) | VSPI Bus |
| **GPIO 33** | SX1278 LoRa Module | `RST` (Hardware Reset) | Active LOW |
| **GPIO 32** | SX1278 LoRa Module | `DIO0` (Rx/Tx Done IRQ) | Hardware interrupt |
| **GPIO 16 (RX2)**| SIM7600 4G LTE | `GSM_TXD` $\rightarrow$ ESP32 RX | Hardware UART2 |
| **GPIO 17 (TX2)**| SIM7600 4G LTE | `GSM_RXD` $\rightarrow$ ESP32 TX | Hardware UART2 |
| **GPIO 25** | Piezo Siren Driver | `SIREN_PIN` (PWM Audio) | LEDC PWM channel 0 (2.7kHz resonant frequency) |
| **GPIO 26** | RGB Alert Beacon | `LED_RED_PIN` | Active HIGH |
| **GPIO 27** | RGB Alert Beacon | `LED_GREEN_PIN` | Active HIGH |
| **GPIO 4** | RGB Alert Beacon | `LED_BLUE_PIN` | Active HIGH |
| **GPIO 2** | DFPlayer Mini Voice | `DFPLAYER_TX` (SoftwareSerial) | Tri-lingual voice broadcasts (Telugu, Hindi, English) |

> [!CAUTION]
> **ADC2 Restriction:** Never connect analog sensors to ADC2 pins (`GPIO 0, 2, 4, 12-15, 25-27`) when Wi-Fi or radio modules are in use. Soil moisture and battery monitoring are strictly assigned to **ADC1** (`GPIO 34`, `GPIO 36`).

### 10.2 Flashing Instructions (Arduino IDE / PlatformIO)
1. Open Arduino IDE and install required libraries via Library Manager:
   * `LoRa` (by Sandeep Mistry)
   * `Adafruit MPU6050` & `Adafruit Sensor`
   * `ArduinoJson`
2. Connect ESP32 via Micro-USB cable.
3. Open [`firmware/resqnet_esp32_node.ino`](file:///b:/Adv_Projects/PPT/code/firmware/resqnet_esp32_node.ino).
4. Configure `NODE_ID` and cellular APN in `config.h`.
5. Select Board: `ESP32 Dev Module`, choose your COM port, and click **Upload**.

---

## 11. REST API & WebSocket Documentation

### 11.1 Key REST Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/nodes` | Returns list of all registered sensor nodes and their live status. |
| `GET` | `/api/telemetry/latest` | Returns latest sensor readings for all nodes. |
| `POST` | `/api/telemetry` | Ingests sensor reading from field hardware, simulator, or MQTT. |
| `POST` | `/api/broadcast-alert` | Triggers district-wide manual siren broadcast and emergency SMS. |
| `GET` | `/api/incidents` | Retrieves historical disaster incidents audit log. |
| `GET` | `/docs` | Interactive Swagger UI API documentation. |

### 11.2 WebSocket Live Stream
* **URL:** `ws://127.0.0.1:8000/ws/telemetry`
* **Message Types:**
  * `TELEMETRY_UPDATE`: Broadcasts live sensor values to dashboard every 2 seconds.
  * `EMERGENCY_BROADCAST`: Broadcasts district-wide evacuation alerts.

---

## 12. Troubleshooting & Diagnostic Manual

| Symptom / Error | Root Cause | Solution |
| :--- | :--- | :--- |
| `Address already in use: 8000` | Port 8000 is occupied by another process | Stop the old process or change port in `backend/main.py`. |
| `WebSocket: Reconnecting...` | Backend server is offline | Ensure `python main.py` is running in your backend terminal. |
| `LoRa initialization failed` | Incorrect SPI wiring or missing SX1278 module | Verify SPI pins (`SCK: 14`, `MISO: 12`, `MOSI: 13`, `NSS: 15`, `RST: 33`, `DIO0: 32`). |
| Ultrasonic reads `-1.0 cm` (Fault) | Echo timeout or sensor unplugged | Check 5V power supply and verify the 1k/2k resistor divider on `GPIO 18`. |
| MPU-6050 I2C Error | Missing pullup resistors or bad connection | Add $4.7\text{k}\Omega$ pullups on `GPIO 21 (SDA)` and `GPIO 22 (SCL)` to 3.3V. |

---

## 13. Presentation Pitch Script & Evaluator Defense

### 🎤 2-Minute Spoken Pitch Script (For Judges / Evaluators)

> **"Respected Judges and Evaluators,**
> 
> In hilly and river basin regions, sudden cloudbursts cause devastating flash floods and landslides within minutes, often when power and mobile networks are completely knocked out.
> 
> To solve this, we developed **RESQNET** — a distributed, edge-intelligent early-warning network.
> 
> Our system combines **multi-modal IoT sensors** (water depth, tipping rainfall, soil saturation, and slope vibration) connected to an **ESP32 microcontroller running on-device Edge AI**. 
> 
> Rather than sending raw data to the cloud for processing, our on-device AI evaluates disaster risk locally in less than a millisecond. If a critical hazard is detected, it triggers local sirens and broadcasts warning packets across a **decentralized LoRa mesh network** to neighboring villages, ensuring warnings are delivered even during total cellular blackout.
> 
> When connectivity is available, the nodes uplink telemetry to our **District Control Room Web Dashboard**, giving authorities real-time GIS mapping, predictive hydrographs, in-app hazard popup toasts, and automated SMS/WhatsApp alerts for swift evacuation.
> 
> We have developed and validated the complete end-to-end software stack — from the embedded C++ firmware and Edge AI model to the FastAPI cloud backend and interactive control room UI.
> 
> Thank you! We are excited to demonstrate the live system."**

---

### 👥 Submission & Competition Metadata
* **Problem Statement ID:** `KH26-ECE-16`
* **Problem Statement Title:** Distributed Flood and Landslide Early-Warning Network
* **Theme:** Disaster Management & Public Safety using IoT + AI
* **Category:** Hardware / Embedded Systems / AIoT | **Team ID:** `41`
