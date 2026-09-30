#include "gsm_cloud.h"
#include <stdio.h>

GSMCloudSubsystem gsmCloud;

GSMCloudSubsystem::GSMCloudSubsystem() : _serialModem(1), _is_connected(false), _csq_rssi(0) {}

bool GSMCloudSubsystem::sendAT(const char* cmd, const char* expected, uint32_t timeout_ms) {
    _serialModem.println(cmd);
    uint32_t start = millis();
    String resp = "";

    while (millis() - start < timeout_ms) {
        while (_serialModem.available()) {
            char c = _serialModem.read();
            resp += c;
        }
        if (resp.indexOf(expected) != -1) {
            return true;
        }
        delay(10);
    }
    return false;
}

bool GSMCloudSubsystem::begin() {
    pinMode(PIN_GSM_PWRKEY, OUTPUT);
    digitalWrite(PIN_GSM_PWRKEY, HIGH);
    delay(500);
    digitalWrite(PIN_GSM_PWRKEY, LOW);
    delay(2500);

    _serialModem.begin(GSM_BAUD_RATE, SERIAL_8N1, PIN_GSM_RX, PIN_GSM_TX);
    
    Serial.println(F("[GSM] Powering up SIM7600 modem..."));
    return setupGPRSAndMQTT();
}

bool GSMCloudSubsystem::setupGPRSAndMQTT() {
    if (!sendAT("AT", "OK", 1500)) {
        sendAT("AT", "OK", 2000);
    }

    sendAT("ATE0", "OK");          // Echo off
    sendAT("AT+CMGF=1", "OK");      // SMS text mode
    sendAT("AT+CSQ", "OK");         // Signal Quality

    // Check cellular network registration
    if (sendAT("AT+CREG?", "+CREG: 0,1", 3000) || sendAT("AT+CREG?", "+CREG: 0,5", 3000)) {
        Serial.println(F("[GSM] Cellular Network Attached (Home/Roaming)."));
        _is_connected = true;
    } else {
        Serial.println(F("[GSM] Searching for 4G cellular signal..."));
        _is_connected = false;
    }

    return _is_connected;
}

bool GSMCloudSubsystem::isConnected() {
    return _is_connected;
}

int GSMCloudSubsystem::getSignalQualityCSQ() {
    _serialModem.println("AT+CSQ");
    uint32_t start = millis();
    while (millis() - start < 1000) {
        if (_serialModem.find("+CSQ: ")) {
            int csq = _serialModem.parseInt();
            _csq_rssi = csq;
            return csq;
        }
    }
    return _csq_rssi;
}

bool GSMCloudSubsystem::publishTelemetryMQTT(const FeatureVector &f, NodeFSMState state, float lat, float lon, float batt) {
    char payload[384];
    snprintf(payload, sizeof(payload),
        "{\"node_id\":\"%s\",\"zone\":\"%s\",\"lat\":%.5f,\"lon\":%.5f,\"batt\":%.1f,"
        "\"water_cm\":%.1f,\"water_rate\":%.1f,\"rain_10m\":%.1f,\"rain_60m\":%.1f,\"rain_rate\":%.1f,"
        "\"soil_pct\":%.1f,\"tilt_deg\":%.1f,\"vib_g\":%.2f,\"risk\":%d}",
        NODE_ID, NODE_ZONE, lat, lon, batt,
        f.water_level_cm, f.water_rate_cm_per_min, f.rain_accum_10m_mm, f.rain_accum_60m_mm, f.rain_intensity_mm_hr,
        f.soil_moisture_pct, f.tilt_angle_deg, f.vibration_rms_g, (int)state
    );

    Serial.printf("[MQTT TELEMETRY] Topic: %s | Payload: %s\n", MQTT_TOPIC_TELEMETRY, payload);
    return true;
}

bool GSMCloudSubsystem::publishAlertMQTT(const FeatureVector &f, NodeFSMState state, const char* reason, float lat, float lon) {
    char payload[384];
    snprintf(payload, sizeof(payload),
        "{\"node_id\":\"%s\",\"zone\":\"%s\",\"severity\":\"CRITICAL\",\"lat\":%.5f,\"lon\":%.5f,"
        "\"water_cm\":%.1f,\"rain_rate\":%.1f,\"tilt_deg\":%.1f,\"soil_pct\":%.1f,\"reason\":\"%s\"}",
        NODE_ID, NODE_ZONE, lat, lon,
        f.water_level_cm, f.rain_intensity_mm_hr, f.tilt_angle_deg, f.soil_moisture_pct, reason
    );

    Serial.printf("[MQTT ALERT] Topic: %s | Payload: %s\n", MQTT_TOPIC_ALERT, payload);
    return true;
}

bool GSMCloudSubsystem::sendDirectEmergencySMS(const char* recipient_phone, const char* message) {
    Serial.printf("[GSM SMS] Dispatching to %s: %s\n", recipient_phone, message);
    char cmd[64];
    snprintf(cmd, sizeof(cmd), "AT+CMGS=\"%s\"", recipient_phone);
    _serialModem.println(cmd);
    delay(200);

    _serialModem.print(message);
    _serialModem.write(0x1A); // Send Ctrl+Z to send message

    return true;
}

void GSMCloudSubsystem::update() {
    while (_serialModem.available()) {
        char c = _serialModem.read();
    }
}
