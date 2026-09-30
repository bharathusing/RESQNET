/**
 * ============================================================================
 * RESQNET: Distributed Flood & Landslide Early-Warning Node Firmware
 * Problem Statement: KH26-ECE-16 | Theme: Disaster Management using IoT + AI
 * Platform: ESP32 DevKit V1 (FreeRTOS Multi-Tasking Architecture)
 * ============================================================================
 */

#include <Arduino.h>
#include "config.h"
#include "sensors.h"
#include "preprocess.h"
#include "edge_ai.h"
#include "risk_fsm.h"
#include "alerts.h"
#include "lora_mesh.h"
#include "gsm_cloud.h"
#include "storage.h"
#include "power.h"

// System Shared State Variables
static float g_latitude = DEFAULT_LATITUDE;
static float g_longitude = DEFAULT_LONGITUDE;
static RawSensorsOutput g_last_raw_sensors;
static FeatureVector g_last_features;
static EdgeAIOutput g_last_ai_out;
static NodeFSMState g_current_state = FSM_NORMAL;
static bool g_neighbor_alert_active = false;

// Task Handles
TaskHandle_t hTaskSensorAI = NULL;
TaskHandle_t hTaskMeshComms = NULL;
TaskHandle_t hTaskActuators = NULL;

/**
 * LoRa Mesh Callback: Executed when a neighbor node broadcasts an alert
 */
void onNeighborHazardReceived(const LoRaDisasterPacket &pkt) {
    Serial.printf("[NEIGHBOR ALERT] From: %s | Risk: %d | Hops: %d | Lat: %.4f, Lon: %.4f\n",
                  pkt.node_id, pkt.risk_level, pkt.hop_count, pkt.latitude, pkt.longitude);
    
    g_neighbor_alert_active = true;
    alertSystem.setFSMState((NodeFSMState)pkt.risk_level, true);
}

/**
 * FreeRTOS Task 1: Sensor Acquisition, Preprocessing & Edge AI Inference
 */
void TaskSensorProcessing(void *pvParameters) {
    TickType_t xLastWakeTime = xTaskGetTickCount();

    for (;;) {
        uint32_t start_ms = millis();

        // 1. Sample all sensors with median-5 ultrasonic & ADC noise rejection
        g_last_raw_sensors = sensors.sampleAll();

        // 2. Multi-window Feature Extraction (10m/30m/60m rain, rate of rise, tilt delta)
        g_last_features = preprocessor.process(g_last_raw_sensors);

        // 3. Run On-Device Edge AI + Parallel Rule-Based Safety Net
        g_last_ai_out = edgeAI.infer(g_last_features);

        // 4. Update Risk FSM with Consecutive Confirmations & Hysteresis
        NodeFSMState prev_state = g_current_state;
        g_current_state = riskFSM.update(g_last_ai_out.final_arbitrated_risk, g_last_raw_sensors.faults);

        // 5. Update Local Actuator State
        alertSystem.setFSMState(g_current_state, g_neighbor_alert_active);

        // 6. Diagnostics Logging
        Serial.printf("[EDGE AI] State: %s | Water: %.1fcm (%.1f/min) | Rain: %.1fmm/h | Soil: %.1f%% | Tilt: %.1f deg (d:%.1f) | Vib: %.2fg\n",
                      riskFSM.getStateString(),
                      g_last_features.water_level_cm, g_last_features.water_rate_cm_per_min,
                      g_last_features.rain_intensity_mm_hr,
                      g_last_features.soil_moisture_pct,
                      g_last_features.tilt_angle_deg, g_last_features.tilt_change_deg,
                      g_last_features.vibration_rms_g);

        // 7. If state escalated or is critical, trigger immediate broadcast
        if (g_current_state >= FSM_WARNING) {
            loraMesh.broadcastHazard(g_last_features, g_current_state, g_latitude, g_longitude, g_last_raw_sensors.battery_percentage);
            
            if (gsmCloud.isConnected()) {
                gsmCloud.publishAlertMQTT(g_last_features, g_current_state, g_last_ai_out.reason, g_latitude, g_longitude);
            } else {
                // Offline fallback: Save in circular EEPROM
                storage.saveRecord(g_last_raw_sensors, g_current_state);
            }
        }

        // Adaptive Task Delay: 1s during Emergency/Warning, 5s during Normal
        uint32_t delay_ms = (g_current_state >= FSM_WARNING) ? SAMPLE_INTERVAL_EMERG_MS : SAMPLE_INTERVAL_NORMAL_MS;
        vTaskDelayUntil(&xLastWakeTime, pdMS_TO_TICKS(delay_ms));
    }
}

/**
 * FreeRTOS Task 2: LoRa Mesh Radio Listener & Packet Relay
 */
void TaskMeshRadio(void *pvParameters) {
    for (;;) {
        loraMesh.update();
        vTaskDelay(pdMS_TO_TICKS(20)); // High-frequency packet polling
    }
}

/**
 * FreeRTOS Task 3: Local Alert Actuators (Sirens, RGB Beacons, Multilingual Voice)
 */
void TaskActuators(void *pvParameters) {
    for (;;) {
        alertSystem.update();
        vTaskDelay(pdMS_TO_TICKS(50));
    }
}

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println(F("=================================================================="));
    Serial.println(F("   RESQNET: Distributed Flood & Landslide Early Warning Node      "));
    Serial.println(F("   Problem Statement: KH26-ECE-16 | Team 41 | Edge AI + LoRa Mesh "));
    Serial.println(F("=================================================================="));

    // 1. Initialize Power & Wakeup Subsystem
    powerSystem.begin();

    // 2. Initialize Local Storage (EEPROM)
    storage.begin();

    // 3. Initialize Actuator Hardware (Buzzer, LEDs, DFPlayer)
    alertSystem.begin();
    alertSystem.setFSMState(FSM_NORMAL);

    // 4. Initialize Sensors
    if (!sensors.begin()) {
        Serial.println(F("[ERROR] Sensors initialization encountered warnings."));
    }

    // 5. Initialize LoRa Mesh Radio
    if (loraMesh.begin()) {
        loraMesh.setNeighborAlertCallback(onNeighborHazardReceived);
    }

    // 6. Initialize Cellular 4G Modem
    gsmCloud.begin();

    // 7. Spawn FreeRTOS Tasks across ESP32 Dual Cores
    xTaskCreatePinnedToCore(TaskSensorProcessing, "TaskSensorAI", 8192, NULL, 3, &hTaskSensorAI, 1); // Core 1
    xTaskCreatePinnedToCore(TaskMeshRadio,        "TaskMeshRadio", 4096, NULL, 2, &hTaskMeshComms, 0); // Core 0
    xTaskCreatePinnedToCore(TaskActuators,        "TaskActuators", 2048, NULL, 1, &hTaskActuators, 1); // Core 1

    Serial.println(F("[SYSTEM] Multi-tasking FreeRTOS scheduler active. Node monitoring started."));
}

void loop() {
    // FreeRTOS handles task scheduling. Main loop sleeps to save power.
    vTaskDelay(pdMS_TO_TICKS(10000));
}
