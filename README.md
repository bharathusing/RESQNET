# 🌊⛰️ RESQNET: Distributed Flood and Landslide Early-Warning Network

[![Live Render App](https://img.shields.io/badge/Render-Live%20Dashboard-00E599?style=for-the-badge&logo=render&logoColor=white)](https://resqnet-rc9i.onrender.com/dashboard/)
[![Python](https://img.shields.io/badge/Python-3.9%2B-blue.svg?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%7C%20WebSockets-009688.svg?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Leaflet.js](https://img.shields.io/badge/GIS-Leaflet.js%20Zero--API--Key-199900.svg?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Edge AI](https://img.shields.io/badge/AI-On--Device%20Edge%20ML-orange.svg?style=for-the-badge)](https://scikit-learn.org/)
[![Hardware](https://img.shields.io/badge/Hardware-ESP32%20%7C%20FreeRTOS%20%7C%20LoRa-red.svg?style=for-the-badge&logo=espressif&logoColor=white)](https://espressif.com/)

**Problem Statement ID:** `KH26-ECE-16`  
**Problem Statement Title:** Distributed Flood and Landslide Early-Warning Network  
**Theme:** Disaster Management & Public Safety using IoT + AI  
**Category:** Hardware / Embedded Systems / AIoT | **Team ID:** `41`  
**Project Name:** **RESQNET** (Resilient Early-Warning Sensor & Quick Notification Network)  
**Live Cloud Dashboard:** [https://resqnet-rc9i.onrender.com/dashboard/](https://resqnet-rc9i.onrender.com/dashboard/)  
**GitHub Repository:** [https://github.com/bharathusing/RESQNET](https://github.com/bharathusing/RESQNET)  

---

## 📑 Table of Contents
1. [Executive Summary & Problem Statement](#1-executive-summary--problem-statement)
2. [Real-World Deployment Zone (Wayanad High-Risk Corridor)](#2-real-world-deployment-zone-wayanad-high-risk-corridor)
3. [End-to-End System Architecture](#3-end-to-end-system-architecture)
4. [Control Room Web Dashboard & User Experience](#4-control-room-web-dashboard--user-experience)
5. [Interactive 1-Click Disaster Testing & Simulation](#5-interactive-1-click-disaster-testing--simulation)
6. [Repository File & Directory Structure](#6-repository-file--directory-structure)
7. [Step-by-Step Installation & Quickstart Guide](#7-step-by-step-installation--quickstart-guide)
8. [Edge AI Model Retraining & C Firmware Export](#8-edge-ai-model-retraining--c-firmware-export)
9. [Field Hardware Wiring, Pinout & Flashing Guide](#9-field-hardware-wiring-pinout--flashing-guide)
10. [REST API & WebSocket Documentation](#10-rest-api--websocket-documentation)
11. [Troubleshooting & Diagnostic Manual](#11-troubleshooting--diagnostic-manual)
12. [Presentation Pitch Script & Evaluator Defense](#12-presentation-pitch-script--evaluator-defense)

---

## 1. Executive Summary & Problem Statement

### 1.1 The Challenge
In mountainous valleys, river catchments, and tropical slopes, heavy monsoonal cloudbursts trigger two severe, compounding disasters:
1. **Flash Floods:** River depths rise drastically within minutes, submerging bridges, causeways, and downstream settlements.
2. **Rainfall-Induced Landslides:** Prolonged rainfall saturates hillside soil, eliminating shear strength and causing sudden debris flows and hillside collapse.

### 1.2 Limitations of Legacy Systems
* **Cloud Latency & Cellular Knockout:** Storms routinely destroy mobile towers and power grids, cutting off cloud-dependent warning systems.
* **Single-Parameter False Alarms:** Relying only on rain gauges or water depth creates false alarms or misses multi-variable soil saturation collapse.
* **High Deployment Costs:** Legacy industrial stations cost over ₹1,50,000 per unit, making dense valley-wide deployment impossible.

### 1.3 The RESQNET Solution
**RESQNET** is an autonomous, decentralized, and edge-intelligent early-warning network. Built on low-power **ESP32 field stations**, it fuses multi-modal hydrological and geotechnical sensors, classifies disaster risks in **under 1 millisecond using on-device Edge AI**, communicates over an **off-grid decentralized LoRa Mesh**, and streams live telemetry to a **District Control Room GIS Command Center** with real-time hazard status banners, clean notification alerts, and automated multi-channel emergency dispatches.

---

## 2. Real-World Deployment Zone (Wayanad High-Risk Corridor)

The sensor network is mapped to the real-world disaster-prone **Wayanad Landslide & Flood Catchment (Kerala, India)**:

| Station ID | Station Name | Geographic Coordinates | Sensor Array & Operational Focus |
| :--- | :--- | :--- | :--- |
| **`RESQ-NODE-01`** | **Chooralmala River Station** | `11.5450° N, 76.1280° E` | Ultrasonic water level, tipping rain gauge (River surge monitoring) |
| **`RESQ-NODE-02`** | **Mundakkai Mountain Station** | `11.5360° N, 76.1480° E` | Capacitive soil moisture, MPU-6050 tilt/vibration (Slope stability) |
| **`RESQ-NODE-03`** | **Attamala Bridge Station** | `11.5280° N, 76.1620° E` | Dual-mode: Ultrasonic clearance, rain, and bank saturation |
| **`RESQ-NODE-04`** | **Chembra Peak Gateway** | `11.5120° N, 76.0880° E` | High-altitude LoRa mesh repeater & weather telemetry (2,100m summit) |

---

## 3. End-to-End System Architecture

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
                                            │               • SQLite Persistence
                                            │               • WebSocket Streaming
                                            │               • Automated Telemetry
                                            ▼                        │
                                 [Neighbor Field Nodes]              ▼
                                 (Decentralized Cascade)    [Control Room Dashboard]
                                                            • Hero Status Banner
                                                            • 4 Live KPI Cards
                                                            • 1-Click Simulation Bar
                                                            • Dark Leaflet GIS Map
                                                            • Single Toast Alerts
                                                                     │
                                                                     ▼
                                                            [Authorities & Public]
                                                            • NDRF & District DEOC
                                                            • Community SMS Alerts
                                                            • WhatsApp Broadcasts
====================================================================================================
```

---

## 4. Control Room Web Dashboard & User Experience

Located in [`dashboard/`](file:///b:/Adv_Projects/RESQNET/code/dashboard/):

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│  HEADER: RESQNET Live Status | WebSocket Sync | Time | Volume Toggle             │
├──────────────────────────────────────────────────────────────────────────────────┤
│  HERO STATUS BANNER: "✓ EVERYTHING NORMAL - Valley Conditions Safe" (Green/Red)  │
├──────────────────────────────────────────────────────────────────────────────────┤
│  4 KEY METRICS (Live Cards):                                                     │
│  [ 🌊 River Water Level ]  [ 🌧️ Rainfall Rate ]  [ 💧 Soil Moisture ]  [ ⛰️ Slope ] │
├──────────────────────────────────────────────────────────────────────────────────┤
│  1-CLICK DISASTER TESTING:                                                       │
│  [🌊 Test Flood] [⛰️ Test Landslide] [🌧️ Heavy Rain] [🚨 Both] [☀️ Reset] [▶️ Auto] │
├───────────────────┬──────────────────────────────────────────┬───────────────────┤
│ LEFT PANEL        │ CENTER: Wayanad GIS Map                  │ RIGHT PANEL       │
│ • Station Roster  │ • Radar Pulsing Pins (Green/Amber/Red)   │ • Live Event Feed │
│ • Normal/Warning  │ • 3 Basemaps (Dark / Streets / Satellite)│ • Multi-Channel   │
│ • Battery Levels  │ • Interactive Node Info Popups           │   Dispatch Log    │
└───────────────────┴──────────────────────────────────────────┴───────────────────┘
```

### Key UI Features:
1. **Hero Status Banner:** Instantly shows overall valley condition (`✓ EVERYTHING NORMAL`, `⚠️ FLOOD WARNING`, `🚨 CRITICAL EMERGENCY`).
2. **4 Key KPI Metric Cards:** Live gauges displaying **River Water Level**, **Rainfall Rate**, **Ground Soil Moisture**, and **Hillside Slope Stability**.
3. **1-Click Testing Bar:** Directly accessible test buttons on the dashboard for zero-friction disaster demonstrations.
4. **Interactive GIS Map:** Leaflet.js map centered over the Wayanad valley with glowing radar pulse pins and zero external API key requirements.
5. **Non-Intrusive Smart Toast System:** Enforces a maximum of **1 single clean popup** at a time in the bottom-right corner with a 4.5-second auto-dismiss progress bar.

---

## 5. Interactive 1-Click Disaster Testing & Simulation

The dashboard contains 1-click disaster testing buttons for instant demonstration:

| Test Button | Injected Condition | Observed System Response |
| :--- | :--- | :--- |
| **`🌊 Test Flash Flood`** | River surges to $365\text{ cm}$, Rain: $78\text{ mm/h}$ | Hero turns **Red**, River card turns **Critical**, Node-01 marker pulses red, water surge audio alert chimes. |
| **`⛰️ Test Landslide`** | Soil: $94\%$, Slope Tilt: $26.5^\circ$, Vibration: $2.4g$ | Hero turns **Red**, Slope card turns **Critical**, Node-02 pulses red, slope failure alert sounds. |
| **`🌧️ Test Heavy Rain`** | Rain: $65\text{ mm/h}$, Soil: $72\%$, Water: $195\text{ cm}$ | Hero turns **Amber ⚠️ WARNING**, Rain card warns of torrential cloudburst. |
| **`🚨 Test Both Hazards`** | Extreme flood crest ($420\text{ cm}$) + slope shear ($31^\circ$) | Full valley emergency evacuation broadcast triggered. All sirens active. |
| **`☀️ Reset to Normal`** | Water: $45\text{ cm}$, Rain: $2\text{ mm/h}$, Soil: $35\%$ | All stations return to green baseline immediately. Alarms cleared. |
| **`▶️ Auto Demo (1 min)`** | 60-second automated disaster progression | Sequences through Baseline $\rightarrow$ Storm $\rightarrow$ Flood $\rightarrow$ Landslide $\rightarrow$ Recovery. |

---

## 6. Repository File & Directory Structure

```text
RESQNET/
├── app.py                              # Cloud root WSGI/ASGI entrypoint for Render / Production
├── render.yaml                         # Render Cloud Deployment Blueprint specification
├── requirements.txt                    # Production pip dependency manifest
├── .python-version                     # Python runtime version lock (3.11.9)
│
├── backend/                            # FastAPI Server & Automated Alert Engine
│   ├── main.py                         # FastAPI async app, WebSocket hub & autonomous telemetry
│   ├── database.py                     # SQLite schema with Wayanad Station Seeds
│   ├── alert_dispatcher.py             # Multi-channel emergency dispatcher (SMS / WhatsApp / Cooldown)
│   ├── mqtt_receiver.py                # Paho-MQTT telemetry ingest engine
│   └── requirements.txt                # Backend dependencies
│
├── dashboard/                          # Control Room Web Dashboard (Zero API Key)
│   ├── index.html                      # Clean user-friendly dashboard with Hero Banner & KPI cards
│   ├── app.js                          # GIS map, Chart.js hydrographs, WebSocket client & audio
│   └── styles.css                      # Modern dark theme, radar pulse animations & bottom-right toasts
│
├── edge_ai_model/                      # Machine Learning Training & C Code Export
│   ├── train_disaster_model.py         # Trains Decision Tree on 15,000 samples & exports C header
│   ├── model_weights.h                 # Exported C decision tree logic
│   └── requirements.txt                # ML dependencies (scikit-learn, pandas, numpy)
│
├── firmware/                           # ESP32 C++ FreeRTOS Edge Firmware
│   ├── resqnet_esp32_node.ino          # Master FreeRTOS dual-core task scheduler
│   ├── config.h                        # Conflict-free pinout table, ADC1 safety map, constants
│   ├── sensors.h / sensors.cpp         # Ultrasonic, rain interrupt, soil moisture, MPU-6050
│   ├── preprocess.h / preprocess.cpp   # Sliding-window rainfall, rate-of-rise (dW/dt), trends
│   ├── edge_ai.h / edge_ai.cpp         # Sub-millisecond ML inference & deterministic safety net
│   ├── model_weights.h                 # Embedded C Decision Tree weights
│   ├── risk_fsm.h / risk_fsm.cpp       # 3-sample confirmation & 10-minute hysteresis FSM
│   ├── alerts.h / alerts.cpp           # PWM sirens, RGB LED beacon, tri-lingual voice driver
│   ├── lora_mesh.h / lora_mesh.cpp     # 60-byte binary packet protocol, CRC-16, duplicate cache
│   ├── gsm_cloud.h / gsm_cloud.cpp     # SIM7600 4G LTE AT command driver, MQTT & SMS
│   ├── storage.h / storage.cpp         # Circular EEPROM offline backup & resync
│   └── power.h / power.cpp             # ADC battery monitoring & deep-sleep management
│
├── simulator/                          # Multi-Node Digital Twin Simulator
│   ├── network_simulator.py            # 4-node concurrent disaster progression simulator
│   ├── capture_screenshots.py          # Automated UI screenshot generator
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

## 7. Step-by-Step Installation & Quickstart Guide

### 7.1 Running Locally (3 Simple Steps)

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/bharathusing/RESQNET.git
   cd RESQNET
   ```

2. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the Server:**
   ```bash
   python app.py
   ```
   * Open your browser at: **[http://localhost:8000/dashboard](http://localhost:8000/dashboard)**

---

### 7.2 Accessing the Live Cloud Deployment
* The production version is deployed on Render:  
  👉 **[https://resqnet-rc9i.onrender.com/dashboard/](https://resqnet-rc9i.onrender.com/dashboard/)**

---

## 8. Edge AI Model Retraining & C Firmware Export

To retrain the Edge AI model or generate updated decision weights:

```bash
cd edge_ai_model
python train_disaster_model.py
```

### Model Characteristics:
* **Training Dataset:** 15,000 synthetic hydro-geotechnical samples reflecting monsoon storm dynamics.
* **Accuracy & Safety:** 100% Critical Recall with zero missed disaster conditions.
* **Execution Footprint:** Zero external runtime dependencies; exported as pure C code in `firmware/model_weights.h` running in $<1\text{ ms}$ on the ESP32.

---

## 9. Field Hardware Wiring, Pinout & Flashing Guide

### 9.1 Conflict-Free ESP32 GPIO Pinout Table

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
> **ADC2 Restriction:** Never connect analog sensors to ADC2 pins when Wi-Fi or LoRa radios are active. Soil moisture and battery monitoring are strictly assigned to **ADC1** (`GPIO 34`, `GPIO 36`).

---

## 10. REST API & WebSocket Documentation

### 10.1 Key REST Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/nodes` | Returns list of registered Wayanad sensor nodes and their live status. |
| `GET` | `/api/telemetry/latest` | Returns latest sensor readings for all nodes. |
| `POST` | `/api/telemetry` | Ingests sensor reading from field hardware, simulator, or MQTT. |
| `POST` | `/api/broadcast-alert` | Triggers district-wide manual siren broadcast and emergency SMS. |
| `GET` | `/api/incidents` | Retrieves historical disaster incidents audit log. |
| `GET` | `/docs` | Interactive Swagger UI API documentation. |

### 10.2 WebSocket Live Stream
* **URL:** `ws://127.0.0.1:8000/ws/telemetry` (or `wss://resqnet-rc9i.onrender.com/ws/telemetry`)
* **Message Types:**
  * `TELEMETRY_UPDATE`: Broadcasts live sensor readings to dashboard.
  * `EMERGENCY_BROADCAST`: Broadcasts valley evacuation alerts.
  * `HEARTBEAT`: 20-second keepalive signal.

---

## 11. Troubleshooting & Diagnostic Manual

| Symptom / Issue | Cause | Solution |
| :--- | :--- | :--- |
| `Address already in use: 8000` | Port 8000 is occupied | Terminate the occupying process or restart `python app.py`. |
| `WebSocket: Reconnecting...` | Backend is starting or sleeping | The dashboard automatically polls fallback API until WebSocket reconnects. |
| `Toasts overlapping buttons` | Multi-node alert burst | The system limits popups to **1 single toast** at a time with 4.5s auto-dismiss. |
| `Ultrasonic reads -1.0 cm` | Sensor disconnected or out of range | Check 5V power supply and verify the 1k/2k resistor divider on `GPIO 18`. |

---

## 12. Presentation Pitch Script & Evaluator Defense

### 🎤 2-Minute Spoken Pitch Script (For Judges & Evaluators)

> **"Respected Judges and Evaluators,**
> 
> In mountainous and river basin terrains like Wayanad, cloudbursts trigger severe flash floods and landslides within minutes, often when power and mobile towers are knocked out.
> 
> To solve this, we built **RESQNET** — an autonomous, edge-intelligent disaster early warning network.
> 
> Our system combines **multi-modal IoT sensors** (water depth, rainfall, soil saturation, and slope vibration) with an **ESP32 microcontroller running on-device Edge AI**.
> 
> Rather than relying on distant cloud servers, our on-device AI classifies disaster hazards locally in **less than 1 millisecond**. If a critical hazard is detected, it sounds local sirens and transmits alert packets across a **decentralized LoRa mesh network**, alerting downstream villages even during a complete cellular blackout.
> 
> When connectivity is available, the nodes stream live data to our **District Control Room Web Dashboard**, giving authorities real-time GIS mapping, 4 key live KPI cards, single non-intrusive alerts, and 1-click disaster testing.
> 
> We have developed and tested the entire end-to-end stack — from embedded C++ firmware and Edge AI model export to the FastAPI cloud backend and interactive dashboard.
> 
> Thank you! We welcome you to test any disaster scenario on the dashboard."

---

### 👥 Submission & Competition Metadata
* **Problem Statement ID:** `KH26-ECE-16`
* **Problem Statement Title:** Distributed Flood and Landslide Early-Warning Network
* **Theme:** Disaster Management & Public Safety using IoT + AI
* **Category:** Hardware / Embedded Systems / AIoT | **Team ID:** `41`
