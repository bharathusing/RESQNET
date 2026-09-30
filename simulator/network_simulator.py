"""
RESQNET Multi-Node Disaster Network Simulator
Simulates physical sensors, LoRa mesh propagation, and Edge AI risk classification
transmitting into the cloud backend and District Control Room dashboard.
"""

import time
import json
import random
import requests
import sys

# Ensure UTF-8 console output on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

API_ENDPOINT = "http://127.0.0.1:8000/api/telemetry"

NODES = [
    {
        "node_id": "RESQ-NODE-01",
        "name": "Riverside Basin Station",
        "type": "RIVER_ONLY",
        "lat": 13.0850,
        "lon": 80.2750,
        "water_level": 45.0,
        "rain_intensity": 0.0,
        "soil_moisture": 30.0,
        "tilt": 0.5,
        "vib": 0.04
    },
    {
        "node_id": "RESQ-NODE-02",
        "name": "Hillside Slope Monitor",
        "type": "SLOPE_ONLY",
        "lat": 13.0920,
        "lon": 80.2680,
        "water_level": 0.0,
        "rain_intensity": 0.0,
        "soil_moisture": 35.0,
        "tilt": 1.1,
        "vib": 0.05
    },
    {
        "node_id": "RESQ-NODE-03",
        "name": "Bridge Valley Checkpoint",
        "type": "DUAL",
        "lat": 13.0780,
        "lon": 80.2820,
        "water_level": 60.0,
        "rain_intensity": 0.0,
        "soil_moisture": 40.0,
        "tilt": 0.4,
        "vib": 0.03
    },
    {
        "node_id": "RESQ-NODE-04",
        "name": "High Ridge LoRa Gateway",
        "type": "REPEATER",
        "lat": 13.0990,
        "lon": 80.2600,
        "water_level": 0.0,
        "rain_intensity": 0.0,
        "soil_moisture": 18.0,
        "tilt": 0.2,
        "vib": 0.02
    }
]

def evaluate_edge_ai_risk(water, rain, soil, tilt, vib):
    """Mirror of on-device Edge AI decision engine."""
    if water >= 280.0 or (water > 200.0 and rain > 50.0):
        return 2, "CRITICAL_FLOOD", f"CRITICAL: Flash flood surge! Water={water:.1f}cm, Rain={rain:.1f}mm/h"
    elif (tilt >= 7.0 and soil > 80.0) or (vib >= 0.65 and soil > 85.0):
        return 3, "CRITICAL_LANDSLIDE", f"CRITICAL: Slope shear failure! Tilt={tilt:.1f}deg, Soil={soil:.1f}%, Vib={vib:.2f}g"
    elif rain > 30.0 or water > 180.0 or soil > 70.0 or tilt > 3.0:
        return 1, "WARNING", f"WARNING: Elevated hazard risk. Rain={rain:.1f}mm/h, Soil={soil:.1f}%"
    return 0, "NORMAL", "NORMAL: Baseline safety parameters."

def run_simulation(duration_cycles=100):
    print("==================================================================")
    print("   RESQNET: Distributed Disaster Sensor Network Simulator (Team 41) ")
    print("   Problem ID: KH26-ECE-16 | Simulating LoRa Mesh & Cloud Telemetry")
    print("==================================================================")
    print(f"Target Backend API: {API_ENDPOINT}\n")

    step = 0
    while step < duration_cycles:
        step += 1
        print(f"\n--- Simulation Cycle #{step} ---")

        # Dynamically inject progressive disaster conditions after cycle 5
        if step > 5 and step <= 15:
            # Phase 1: Heavy Rainfall Begins
            print("🌧️ [SCENARIO PHASE 1] Heavy cloudburst rain initiated across the valley.")
            for node in NODES:
                node["rain_intensity"] += random.uniform(8.0, 15.0)
                node["soil_moisture"] = min(100.0, node["soil_moisture"] + random.uniform(4.0, 7.0))
                if node["type"] in ["RIVER_ONLY", "DUAL"]:
                    node["water_level"] += random.uniform(12.0, 25.0)

        elif step > 15 and step <= 25:
            # Phase 2: Extreme Flood Surge + Hillside Soil Saturation
            print("🌊 [SCENARIO PHASE 2] Torrential rain cresting riverbanks & saturating hillside escarpment.")
            for node in NODES:
                if node["node_id"] == "RESQ-NODE-01":
                    node["water_level"] += random.uniform(30.0, 50.0)
                    node["rain_intensity"] = min(150.0, node["rain_intensity"] + 10.0)
                elif node["node_id"] == "RESQ-NODE-02":
                    node["soil_moisture"] = min(99.0, node["soil_moisture"] + 6.0)
                    node["tilt"] += random.uniform(1.2, 3.5)
                    node["vib"] += random.uniform(0.15, 0.35)
                elif node["node_id"] == "RESQ-NODE-03":
                    node["water_level"] += random.uniform(20.0, 35.0)

        elif step > 25:
            # Phase 3: Critical Landslide Shear at Node 2 & Flash Flood Peak at Node 1
            print("🚨 [SCENARIO PHASE 3] CRITICAL HAZARD: Imminent Landslide at Node-02, Flash Flood at Node-01!")
            for node in NODES:
                if node["node_id"] == "RESQ-NODE-02":
                    node["tilt"] = min(35.0, node["tilt"] + random.uniform(3.0, 6.0))
                    node["vib"] = min(3.0, node["vib"] + random.uniform(0.3, 0.7))
                    node["soil_moisture"] = 98.5
                elif node["node_id"] == "RESQ-NODE-01":
                    node["water_level"] = min(420.0, node["water_level"] + random.uniform(15.0, 30.0))

        # Sample and transmit for all nodes
        for node in NODES:
            # Add minor sensor noise
            current_water = max(0.0, node["water_level"] + random.uniform(-0.5, 0.5))
            current_rain = max(0.0, node["rain_intensity"] + random.uniform(-0.5, 0.5))
            current_soil = max(0.0, min(100.0, node["soil_moisture"] + random.uniform(-0.2, 0.2)))
            current_tilt = max(0.0, node["tilt"] + random.uniform(-0.05, 0.05))
            current_vib = max(0.01, node["vib"] + random.uniform(-0.01, 0.01))

            risk_code, risk_name, explanation = evaluate_edge_ai_risk(
                current_water, current_rain, current_soil, current_tilt, current_vib
            )

            payload = {
                "node_id": node["node_id"],
                "lat": node["lat"],
                "lon": node["lon"],
                "water_level_cm": round(current_water, 1),
                "rain_intensity_mm_hr": round(current_rain, 1),
                "soil_moisture_pct": round(current_soil, 1),
                "tilt_angle_deg": round(current_tilt, 1),
                "vibration_rms_g": round(current_vib, 2),
                "risk": risk_code,
                "risk_name": risk_name,
                "msg": explanation
            }

            # Transmit to Backend API
            try:
                resp = requests.post(API_ENDPOINT, json=payload, timeout=2.0)
                status_icon = "🟢" if risk_code == 0 else ("🟡" if risk_code == 1 else "🔴")
                print(f"  {status_icon} [{node['node_id']}] {risk_name:18} | Water: {current_water:5.1f}cm | Rain: {current_rain:5.1f}mm/h | Soil: {current_soil:5.1f}% | Tilt: {current_tilt:4.1f}° | Vib: {current_vib:4.2f}g")
            except Exception as e:
                print(f"  ⚪ [{node['node_id']}] (Standalone LoRa Mesh Relay simulation - Backend offline)")

        time.sleep(2.0)

if __name__ == "__main__":
    run_simulation(100)
