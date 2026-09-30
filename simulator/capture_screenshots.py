"""
RESQNET Automated Dashboard Screenshot Capture Tool
Runs the server, seeds realistic disaster scenarios, and captures high-res UI screenshots using Headless Chrome/Edge.
"""

import os
import sys
import time
import subprocess
import requests

# Ensure UTF-8 output
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

EDGE_PATH = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
CHROME_PATH = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
BROWSER_EXE = CHROME_PATH if os.path.exists(CHROME_PATH) else EDGE_PATH

DASHBOARD_URL = "http://127.0.0.1:8000/dashboard"
API_URL = "http://127.0.0.1:8000/api/telemetry"
SCREENS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "screens"))

os.makedirs(SCREENS_DIR, exist_ok=True)

def take_screenshot(filename, wait_seconds=2):
    output_path = os.path.join(SCREENS_DIR, filename)
    time.sleep(wait_seconds)
    
    cmd = [
        BROWSER_EXE,
        "--headless=new",
        "--hide-scrollbars",
        "--window-size=1600,900",
        f"--screenshot={output_path}",
        DASHBOARD_URL
    ]
    subprocess.run(cmd, capture_output=True)
    if os.path.exists(output_path):
        print(f"📸 Captured screenshot: {output_path} ({os.path.getsize(output_path)} bytes)")
    else:
        print(f"❌ Failed to capture screenshot: {filename}")

def send_node_telemetry(node_id, lat, lon, water, rain, soil, tilt, vib, risk, risk_name, msg):
    payload = {
        "node_id": node_id,
        "lat": lat,
        "lon": lon,
        "water_level_cm": water,
        "rain_intensity_mm_hr": rain,
        "soil_moisture_pct": soil,
        "tilt_angle_deg": tilt,
        "vibration_rms_g": vib,
        "risk": risk,
        "risk_name": risk_name,
        "msg": msg
    }
    try:
        requests.post(API_URL, json=payload, timeout=2.0)
    except Exception as e:
        print(f"Error sending telemetry for {node_id}: {e}")

def main():
    print("==================================================================")
    print("   RESQNET: Automated High-Resolution Dashboard Screenshot Suite   ")
    print("==================================================================")
    print(f"Using Browser: {BROWSER_EXE}")
    print(f"Screenshots Output Folder: {SCREENS_DIR}\n")

    # 1. SCENARIO 1: NORMAL MONITORING STATE
    print("Step 1: Ingesting Normal Baseline Conditions...")
    send_node_telemetry("RESQ-NODE-01", 13.0850, 80.2750, 42.0, 0.0, 32.0, 0.4, 0.03, 0, "NORMAL", "NORMAL: Baseline safety parameters.")
    send_node_telemetry("RESQ-NODE-02", 13.0920, 80.2680, 0.0, 0.0, 35.0, 1.1, 0.04, 0, "NORMAL", "NORMAL: Slope geotechnical stability confirmed.")
    send_node_telemetry("RESQ-NODE-03", 13.0780, 80.2820, 58.0, 0.0, 41.0, 0.3, 0.02, 0, "NORMAL", "NORMAL: Stream discharge rate normal.")
    send_node_telemetry("RESQ-NODE-04", 13.0990, 80.2600, 0.0, 0.0, 18.0, 0.2, 0.01, 0, "NORMAL", "NORMAL: LoRa mesh repeater link healthy.")
    take_screenshot("01_normal_baseline_dashboard.png", wait_seconds=3)

    # 2. SCENARIO 2: HEAVY MONSOON STORM / WARNING STATE
    print("\nStep 2: Ingesting Torrential Downpour & Rising Thresholds (WARNING)...")
    for _ in range(3):
        send_node_telemetry("RESQ-NODE-01", 13.0850, 80.2750, 185.0, 42.0, 68.0, 0.8, 0.08, 1, "WARNING", "WARNING: Elevated river level and high precipitation rate.")
        send_node_telemetry("RESQ-NODE-02", 13.0920, 80.2680, 0.0, 48.0, 74.0, 3.2, 0.22, 1, "WARNING", "WARNING: Soil moisture saturation rising on north escarpment.")
        send_node_telemetry("RESQ-NODE-03", 13.0780, 80.2820, 195.0, 45.0, 72.0, 0.6, 0.06, 1, "WARNING", "WARNING: Water level approaching causeway clearance.")
        send_node_telemetry("RESQ-NODE-04", 13.0990, 80.2600, 0.0, 38.0, 45.0, 0.3, 0.03, 0, "NORMAL", "NORMAL: Gateway operating on battery.")
        time.sleep(1)
    take_screenshot("02_elevated_warning_state.png", wait_seconds=3)

    # 3. SCENARIO 3: CRITICAL FLASH FLOOD & LANDSLIDE DISASTER INUNDATION
    print("\nStep 3: Ingesting Critical Flash Flood & Landslide Hazards (CRITICAL)...")
    for _ in range(4):
        send_node_telemetry("RESQ-NODE-01", 13.0850, 80.2750, 425.0, 145.0, 88.5, 0.5, 0.04, 2, "CRITICAL_FLOOD", "CRITICAL FLASH FLOOD: River cresting at 4.25m! Upstream cloudburst surge.")
        send_node_telemetry("RESQ-NODE-02", 13.0920, 80.2680, 0.0, 120.0, 98.6, 28.5, 2.85, 3, "CRITICAL_LANDSLIDE", "CRITICAL LANDSLIDE: Slope shear failure! Tilt=28.5 deg, Soil=98.6%, Vib=2.85g")
        send_node_telemetry("RESQ-NODE-03", 13.0780, 80.2820, 520.0, 130.0, 99.0, 0.4, 0.03, 2, "CRITICAL_FLOOD", "CRITICAL FLASH FLOOD: Bridge causeway fully submerged! Immediate evacuation.")
        send_node_telemetry("RESQ-NODE-04", 13.0990, 80.2600, 0.0, 95.0, 75.0, 0.2, 0.02, 1, "WARNING", "WARNING: High rainfall detected at ridge summit.")
        time.sleep(1)
    take_screenshot("03_critical_disaster_dashboard.png", wait_seconds=3)

    # 4. SCENARIO 4: MANUAL DISTRICT EMERGENCY DISPATCH TRIGGER
    print("\nStep 4: Triggering District-Wide Emergency Evacuation Broadcast...")
    try:
        requests.post("http://127.0.0.1:8000/api/broadcast-alert", json={
            "hazard_type": "DISTRICT_EVACUATION_ORDER",
            "message": "URGENT EVACUATION: Flash Flood & Landslide imminent in Sectors A & B. Move to relief shelters immediately.",
            "node_id": "DEOC-COMMAND"
        }, timeout=2.0)
    except Exception as e:
        print(f"Error broadcasting emergency: {e}")
    take_screenshot("04_emergency_evacuation_broadcast.png", wait_seconds=3)

    print("\n🎯 All Dashboard Screenshots Captured Successfully in 'code/screens/'!")

if __name__ == "__main__":
    main()
