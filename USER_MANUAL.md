# 📖 RESQNET: Distributed Flood & Landslide Early-Warning Network
## 📑 Comprehensive System & Operational User Manual

**Document Version:** `v2.5.0-Production`  
**Problem Statement ID:** `KH26-ECE-16`  
**Problem Statement Title:** Distributed Flood and Landslide Early-Warning Network  
**Theme:** Disaster Management & Public Safety using IoT + AI  
**Category:** Hardware / AIoT / Embedded Systems | **Team ID:** `41`  
**Live Production URL:** [https://resqnet-rc9i.onrender.com/dashboard/](https://resqnet-rc9i.onrender.com/dashboard/)  

---

## 📑 Table of Contents
1. [Introduction & Purpose](#1-introduction--purpose)
2. [Real-World Deployment Topology (Wayanad High-Risk Corridor)](#2-real-world-deployment-topology-wayanad-high-risk-corridor)
3. [Control Room Command Center User Guide](#3-control-room-command-center-user-guide)
4. [One-Click Disaster Testing & Simulation Guide](#4-one-click-disaster-testing--simulation-guide)
5. [Field Hardware Assembly & Pinout Reference](#5-field-hardware-assembly--pinout-reference)
6. [Firmware Configuration & Flashing Instructions](#6-firmware-configuration--flashing-instructions)
7. [Emergency Incident Protocols & Multi-Channel Dispatch](#7-emergency-incident-protocols--multi-channel-dispatch)
8. [Maintenance, Diagnostics & Troubleshooting Guide](#8-maintenance-diagnostics--troubleshooting-guide)
9. [Quick Operator Reference Card](#9-quick-operator-reference-card)

---

## 1. Introduction & Purpose

### 1.1 Purpose of this Document
This User Manual provides complete operational instructions for operating and maintaining the **RESQNET** disaster early warning system. It is specifically written for:
* **District Emergency Operations Center (DEOC) Operators:** For day-to-day flood and landslide monitoring and emergency broadcast activation.
* **Disaster Response Teams (NDRF / SDRF):** For rapid interpretation of live telemetry and evacuation logs.
* **Field Installation Engineers:** For deploying, wiring, and maintaining physical sensor stations.
* **Evaluators & Judges:** For testing all disaster scenarios with 1-click simulations.

---

## 2. Real-World Deployment Topology (Wayanad High-Risk Corridor)

The physical and virtual sensor stations are mapped to critical risk zones in the **Wayanad Landslide & Flood Catchment (Kerala, India)**:

```text
                               [ Chembra Peak Gateway ]
                               (2,100m High Summit Mesh Repeater)
                                      ▲ (LoRa Mesh)
                                      │
          ┌───────────────────────────┴───────────────────────────┐
          │                                                       │
          ▼                                                       ▼
[ Chooralmala River Station ]                              [ Mundakkai Mountain Station ]
• Ultrasonic River Depth                                   • Capacitive Soil Moisture Saturation
• Tipping Rain Gauge                                       • MPU-6050 Slope Tilt & Vibration
• Flood Crest Warning: >280cm                              • Soil Saturation Alarm: >80%
          │                                                       │
          └───────────────────────────┬───────────────────────────┘
                                      ▼
                           [ Attamala Bridge Station ]
                           • Dual Hydrological & Geotechnical Station
                           • Bridge Deck Clearance & River Surge Monitor
```

---

## 3. Control Room Command Center User Guide

### 3.1 Accessing the Control Center
* **Online Cloud Dashboard:** Open [https://resqnet-rc9i.onrender.com/dashboard/](https://resqnet-rc9i.onrender.com/dashboard/)
* **Local Server:** Open [http://localhost:8000/dashboard](http://localhost:8000/dashboard)

---

### 3.2 Dashboard Components Explained

#### 1. Hero Status Banner (Top)
* **🟢 `✓ EVERYTHING NORMAL - Valley Conditions Safe`:** All water levels, rainfall rates, and slope stability metrics are within safe baseline limits.
* **🟡 `⚠️ WARNING - Rising Water / Saturated Soil`:** Pre-alert state. One or more parameters are approaching threshold levels.
* **🔴 `🚨 CRITICAL EMERGENCY - Evacuation Recommended`:** Severe flash flood surge or hillside slope shear detected. Siren and multi-channel dispatches active.

#### 2. Key Metrics Live Cards (Middle)
* **🌊 River Water Level:** Displays current water height ($cm$) with dynamic color-coded status badges (`Normal < 180cm`, `Warning 180–280cm`, `Critical > 280cm`).
* **🌧️ Rainfall Rate:** Displays current rainfall intensity ($mm/hr$) with cloudburst indicators (`Normal < 30mm/h`, `Warning 30–60mm/h`, `Cloudburst > 60mm/h`).
* **💧 Ground Moisture:** Displays soil volumetric saturation percentage ($\%$) with liquefaction warnings (`Normal < 60%`, `Warning 60–80%`, `Saturated > 80%`).
* **⛰️ Hillside Stability:** Displays slope tilt angle ($\theta$) and seismic vibration ($g$) (`Normal < 4°`, `Warning 4–12°`, `Landslide > 12°`).

#### 3. One-Click Disaster Testing Bar
Provides immediate one-click testing without requiring terminal commands or hardware simulators.

#### 4. Wayanad GIS Map (Center)
* **Interactive Map Pins:** Glowing radar pulse markers indicating each station's location and real-time health.
* **Basemap Layers:** Toggle between **Dark Mode Canvas**, **Standard Street Map**, and **High-Resolution Satellite View** in the top-right layer control.
* **Clicking any pin:** Automatically centers the map and displays the station's full telemetry snapshot.

#### 5. Station Roster (Left) & Incident Log (Right)
* **Station Roster:** Displays live battery percentage and online state for all 4 Wayanad monitoring stations.
* **Incident Log:** Chronological live audit feed showing all detected anomalies and automated emergency dispatches.

#### 6. Clean Non-Intrusive Toast Alerts
* Alerts appear strictly in the **bottom-right corner**.
* Maximum of **1 active popup** at any time to prevent screen clutter.
* Automatically dismisses after 4.5 seconds with a visual progress bar.

---

## 4. One-Click Disaster Testing & Simulation Guide

To test the system during demonstrations or reviews, use the testing bar located directly below the metric cards:

### 4.1 Available Scenarios

1. **`🌊 Test Flash Flood`**
   - **Simulated Event:** River water level surges to $365\text{ cm}$ with torrential rain ($78\text{ mm/h}$).
   - **System Reaction:** Hero banner turns Red, River Water card escalates to Critical, Chooralmala station marker turns pulsing red, water surge audio alert sounds.

2. **`⛰️ Test Landslide`**
   - **Simulated Event:** Soil saturation reaches $94\%$, slope tilt shifts to $26.5^\circ$, ground vibration registers $2.4g$.
   - **System Reaction:** Hero banner turns Red, Hillside Stability card escalates to Critical, Mundakkai station marker turns pulsing red, slope failure audio alert sounds.

3. **`🌧️ Test Heavy Rain`**
   - **Simulated Event:** Cloudburst rainfall of $65\text{ mm/h}$ with rising soil moisture ($72\%$).
   - **System Reaction:** Hero banner turns Amber Warning, Rainfall card displays warning alert.

4. **`🚨 Test Both Hazards`**
   - **Simulated Event:** Simultaneous extreme flood crest ($420\text{ cm}$) and hillside slope failure ($31.0^\circ$).
   - **System Reaction:** Full valley critical emergency. District evacuation siren broadcast initiated.

5. **`☀️ Reset to Normal`**
   - **Simulated Event:** Restores all sensors to calm baseline ($45\text{ cm}$ river depth, $2\text{ mm/h}$ rain, $35\%$ soil moisture).
   - **System Reaction:** Restores green status across all cards and map pins. Clears active warnings.

6. **`▶️ Auto Demo (1 min)`**
   - **Simulated Event:** Automatic 60-second end-to-end disaster progression.
   - **Progression:** Normal $\rightarrow$ Heavy Rain $\rightarrow$ Flash Flood Surge $\rightarrow$ Landslide $\rightarrow$ Recovery.

---

## 5. Field Hardware Assembly & Pinout Reference

### 5.1 Bill of Materials (Per Field Station)
* 1× ESP32 DevKit V1 Microcontroller
* 1× JSN-SR04T Waterproof Ultrasonic Distance Sensor
* 1× Tipping-Bucket Rain Gauge ($0.2794\text{ mm/tip}$)
* 1× Capacitive Soil Moisture Sensor v1.2
* 1× MPU-6050 6-Axis Accelerometer & Gyroscope
* 1× SX1278 LoRa 433/868MHz Transceiver Module
* 1× SIM7600 4G LTE Cellular Modem
* 1× 5V High-Decibel Piezo Siren & RGB Alert Beacon
* 1× DFPlayer Mini Voice Audio Module with 3W Horn Speaker
* 1× 6V Solar Panel + 2× 18650 Li-ion Battery Pack ($5200\text{ mAh}$)
* 1× IP66 Weatherproof Electrical Enclosure

### 5.2 Conflict-Free GPIO Mapping Table

```text
┌────────────────────────────────────────────────────────┐
│                   ESP32 PIN MAPPING                    │
├─────────────────────────┬──────────────────────────────┤
│ Sensor / Component      │ ESP32 Pin Assignment         │
├─────────────────────────┼──────────────────────────────┤
│ JSN-SR04T Trigger       │ GPIO 5                       │
│ JSN-SR04T Echo          │ GPIO 18 (via 1k/2k divider)  │
│ Rain Gauge Pulse        │ GPIO 19 (Hardware Interrupt) │
│ Capacitive Soil Sensor  │ GPIO 34 (ADC1_CH6 - Safe)    │
│ Battery Voltage Monitor │ GPIO 36 (ADC1_CH0 - Safe)    │
│ MPU-6050 I2C Data (SDA) │ GPIO 21                      │
│ MPU-6050 I2C Clock(SCL) │ GPIO 22                      │
│ LoRa SPI SCK            │ GPIO 14                      │
│ LoRa SPI MISO           │ GPIO 12                      │
│ LoRa SPI MOSI           │ GPIO 13                      │
│ LoRa SPI CS (NSS)       │ GPIO 15                      │
│ LoRa Reset (RST)        │ GPIO 33                      │
│ LoRa DIO0 (IRQ)         │ GPIO 32                      │
│ GSM Modem RX2 / TX2     │ GPIO 16 / GPIO 17 (UART2)    │
│ Piezo Siren (PWM)       │ GPIO 25                      │
│ RGB Alert LED           │ GPIO 26 (R), 27 (G), 4 (B)   │
│ DFPlayer Mini Voice     │ GPIO 2 (SoftwareSerial)      │
└─────────────────────────┴──────────────────────────────┘
```

---

## 6. Firmware Configuration & Flashing Instructions

1. Open **Arduino IDE** or **PlatformIO** and navigate to `firmware/`.
2. Install the necessary libraries:
   - `LoRa` by Sandeep Mistry
   - `Adafruit MPU6050` & `Adafruit Unified Sensor`
   - `ArduinoJson`
3. Edit `firmware/config.h` to assign the Station ID and coordinates:
   ```cpp
   #define NODE_ID "RESQ-NODE-01"
   #define STATION_NAME "Chooralmala River Station"
   #define SENSOR_MOUNT_HEIGHT_CM 450.0f
   ```
4. Connect the ESP32 via USB and upload `resqnet_esp32_node.ino`.

---

## 7. Emergency Incident Protocols & Multi-Channel Dispatch

When a Critical disaster threshold is confirmed:
1. **On-Device Siren & Voice Alarm:** Sounds immediate 110dB siren and plays local language evacuation instructions (Telugu, Hindi, English).
2. **LoRa Mesh Broadcast:** Relays disaster packet to upstream and downstream valley nodes within $<1\text{ ms}$.
3. **Cloud & Control Center Ingestion:** Uplinks event to FastAPI backend via 4G LTE/MQTT.
4. **Automated Multi-Channel Dispatch:**
   - District Operations (DEOC) screen alert & continuous chime.
   - Automated SMS dispatched to registered emergency contacts.
   - WhatsApp community broadcast sent to village heads.

---

## 8. Maintenance, Diagnostics & Troubleshooting Guide

| Issue | Probable Cause | Corrective Action |
| :--- | :--- | :--- |
| **No telemetry on dashboard** | Backend server is not running | Run `python app.py` or check Render cloud status. |
| **WebSocket disconnected** | Network interruption | Dashboard automatically polls fallback API until WebSocket reconnects. |
| **Ultrasonic reading -1 cm** | Cable loose or probe obscured | Inspect JSN-SR04T probe face and check 5V connection. |
| **Soil moisture reads 0%** | Sensor disconnected from ADC1 | Ensure sensor is wired to `GPIO 34` (ADC1) and grounded. |
| **LoRa radio not transmitting** | Antenna loose or SPI error | Check antenna connection and verify `NSS: GPIO 15` and `RST: GPIO 33`. |

---

## 9. Quick Operator Reference Card

```text
================================================================================
                    RESQNET OPERATOR QUICK CHEATSHEET
================================================================================
1. ACCESS DASHBOARD:
   • Cloud:  https://resqnet-rc9i.onrender.com/dashboard/
   • Local:  http://localhost:8000/dashboard

2. ONE-CLICK DISASTER TESTS:
   • Click [🌊 Test Flood]     -> Simulates Chooralmala flash flood surge
   • Click [⛰️ Test Landslide] -> Simulates Mundakkai slope shear failure
   • Click [☀️ Reset]          -> Restores green baseline across all stations

3. EMERGENCY ESCALATION ACTIONS:
   • Red Hero Banner -> Confirm affected station on GIS map
   • Verify automated SMS dispatch log in right-hand incident feed
   • Click "Broadcast District Siren" if mass evacuation is necessary
================================================================================
```
