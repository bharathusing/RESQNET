/**
 * ============================================================================
 * RESQNET: Distributed Flood & Landslide Early-Warning Network (KH26-ECE-16)
 * Complete System Hardware Pin Map, Operating Parameters, and Configuration
 * ============================================================================
 */

#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// ==========================================
// 1. NODE IDENTIFICATION & REGION SETTINGS
// ==========================================
#define NODE_ID                 "RESQ-NODE-01"
#define NODE_ZONE               "SECTOR-A-RIVERSIDE"
#define FIRMWARE_VERSION        "2.4.0-PROD"
#define MESH_NETWORK_ID         0x41                // Network Isolation (Team 41)
#define LORA_FREQUENCY_HZ       433E6               // 433MHz (or 865-867MHz for India ISM band)
#define LORA_SPREADING_FACTOR   10                  // SF10 for extended valley range
#define LORA_BANDWIDTH_HZ       125E3
#define LORA_CODING_RATE        5
#define LORA_TX_POWER_DBM       20                  // Maximum legal EIRP transmission

// Fallback GPS Coordinates
#define DEFAULT_LATITUDE        13.0827f
#define DEFAULT_LONGITUDE       80.2707f
#define DEFAULT_ALTITUDE        35.0f

// ==========================================
// 2. CONFLICT-FREE ESP32 PIN MAPPING
// ==========================================
// JSN-SR04T Waterproof Ultrasonic Sensor
#define PIN_ULTRASONIC_TRIG     5
#define PIN_ULTRASONIC_ECHO     18
#define SENSOR_MOUNT_HEIGHT_CM  450.0f              // Distance from sensor to empty riverbed

// Tipping-Bucket Rain Gauge
#define PIN_RAIN_GAUGE_PULSE    19                  // Reed Switch Interrupt (INPUT_PULLUP)
#define RAIN_MM_PER_PULSE       0.2794f             // Standard 0.2mm - 0.2794mm per tip

// Capacitive Soil Moisture Sensor (Strictly ADC1)
#define PIN_SOIL_MOISTURE_ADC   34                  // ADC1_CH6 (Analog Input Only)
#define SOIL_ADC_AIR_DRY        3150                // Raw ADC reading in completely dry soil
#define SOIL_ADC_WATER_SAT      1300                // Raw ADC reading in 100% water saturation

// MPU-6050 Accelerometer / Gyroscope (I2C)
#define PIN_I2C_SDA             21
#define PIN_I2C_SCL             22
#define MPU6050_I2C_ADDR        0x68

// LoRa SX1278 SPI Interface (HSPI)
#define LORA_SCK_PIN            14
#define LORA_MISO_PIN           12
#define LORA_MOSI_PIN           13
#define LORA_CS_PIN             15
#define LORA_RST_PIN            33
#define LORA_DIO0_PIN           32                  // Packet Interrupt pin

// GPS Module (NEO-6M UART2)
#define PIN_GPS_RX              16                  // Connected to GPS TX
#define PIN_GPS_TX              17                  // Connected to GPS RX
#define GPS_BAUD_RATE           9600

// Cellular Modem (SIM7600 4G UART1)
#define PIN_GSM_RX              25                  // Connected to SIM7600 TXD
#define PIN_GSM_TX              26                  // Connected to SIM7600 RXD
#define PIN_GSM_PWRKEY          27                  // Power key control pin
#define GSM_BAUD_RATE           115200
#define GSM_APN                 "airtelgprs.com"    // Change according to cellular carrier

// Battery Voltage Monitoring (Strictly ADC1)
#define PIN_BATTERY_ADC         36                  // ADC1_CH0 (Analog Input Only)
#define BATT_DIVIDER_R1         100000.0f           // 100k Ohm (Top Resistor)
#define BATT_DIVIDER_R2         33000.0f            // 33k Ohm (Bottom Resistor)
#define BATT_CALIBRATION_FACTOR 1.025f

// Alert Actuators
#define PIN_BUZZER_PWM          23                  // LEDC PWM Channel 0
#define PIN_RGB_RED             2                   // Red LED alert
#define PIN_DFPLAYER_TX         0                   // SoftwareSerial / UART to DFPlayer RX
#define PIN_DFPLAYER_BUSY       4                   // Low when playing audio

// ==========================================
// 3. THRESHOLDS & FALSE-ALARM PARAMETERS
// ==========================================
#define CONSECUTIVE_READINGS_CONFIRM 3              // Require 3 consecutive hazard samples to escalate
#define HYSTERESIS_DEESCALATE_MS    600000          // 10 Minutes (600,000 ms) of safe readings to de-escalate

// Physical Safety Fallback Hard Limits
#define THRESHOLD_WATER_WARN_CM     200.0f
#define THRESHOLD_WATER_CRIT_CM     320.0f
#define THRESHOLD_RAIN_WARN_MM_HR   25.0f
#define THRESHOLD_RAIN_CRIT_MM_HR   60.0f
#define THRESHOLD_SOIL_WARN_PCT     70.0f
#define THRESHOLD_SOIL_CRIT_PCT     85.0f
#define THRESHOLD_TILT_WARN_DEG     3.5f
#define THRESHOLD_TILT_CRIT_DEG     7.5f
#define THRESHOLD_VIB_CRIT_RMS_G    0.65f

// Sensor Health Plausibility Limits (Fault Detection)
#define SENSOR_FAULT_WATER_MIN_CM   0.0f
#define SENSOR_FAULT_WATER_MAX_CM   600.0f
#define SENSOR_FAULT_SOIL_MIN_ADC   800
#define SENSOR_FAULT_SOIL_MAX_ADC   3600

// ==========================================
// 4. TIMING & SLEEP SCHEDULES
// ==========================================
#define SAMPLE_INTERVAL_NORMAL_MS   5000            // 5 seconds in Normal mode
#define SAMPLE_INTERVAL_EMERG_MS    1000            // 1 second in Warning / Critical mode
#define CLOUD_HEARTBEAT_NORMAL_MS   900000          // 15 minutes cloud heartbeat
#define CLOUD_TELEMETRY_EMERG_MS    5000            // 5 seconds cloud uplink during hazard
#define MESH_MAX_HOPS               3               // Maximum LoRa packet hops

// Cloud Broker Settings
#define CLOUD_MQTT_SERVER           "broker.hivemq.com"
#define CLOUD_MQTT_PORT             1883
#define MQTT_TOPIC_TELEMETRY        "resqnet/" NODE_ID "/telemetry"
#define MQTT_TOPIC_ALERT            "resqnet/" NODE_ID "/alert"

#endif // CONFIG_H
