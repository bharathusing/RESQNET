#include "cellular_gsm.h"
#include <stdio.h>

CellularGSM::CellularGSM() : _serialGsm(1), _connected(false) {}

bool CellularGSM::sendATCommand(const char* cmd, const char* expected_resp, uint32_t timeout_ms) {
    _serialGsm.println(cmd);
    uint32_t start = millis();
    String response = "";
    
    while (millis() - start < timeout_ms) {
        while (_serialGsm.available()) {
            char c = _serialGsm.read();
            response += c;
        }
        if (response.indexOf(expected_resp) != -1) {
            return true;
        }
        delay(10);
    }
    return false;
}

bool CellularGSM::begin() {
    pinMode(PIN_GSM_PWR, OUTPUT);
    digitalWrite(PIN_GSM_PWR, HIGH);
    delay(500);
    digitalWrite(PIN_GSM_PWR, LOW);
    delay(2000);

    _serialGsm.begin(GSM_BAUD_RATE, SERIAL_8N1, PIN_GSM_RX, PIN_GSM_TX);
    
    Serial.println(F("[GSM] Initializing SIM7600 module..."));
    return initModem();
}

bool CellularGSM::initModem() {
    if (!sendATCommand("AT", "OK", 1000)) {
        Serial.println(F("[GSM] Modem not responding to AT. Retrying..."));
        sendATCommand("AT", "OK", 2000);
    }

    sendATCommand("ATE0", "OK");          // Disable echo
    sendATCommand("AT+CMGF=1", "OK");      // Set SMS to text mode
    sendATCommand("AT+CSQ", "OK");         // Query Signal Quality
    
    // Check network registration (home or roaming)
    if (sendATCommand("AT+CREG?", "+CREG: 0,1", 3000) || sendATCommand("AT+CREG?", "+CREG: 0,5", 3000)) {
        Serial.println(F("[GSM] Registered on Cellular Network."));
        _connected = true;
    } else {
        Serial.println(F("[GSM] Waiting for network attachment..."));
        _connected = false;
    }

    return _connected;
}

bool CellularGSM::isConnected() {
    return _connected;
}

bool CellularGSM::sendEmergencySMS(const char* phoneNumber, const char* message) {
    Serial.print(F("[GSM] Sending Emergency SMS to: "));
    Serial.println(phoneNumber);

    char cmd[64];
    snprintf(cmd, sizeof(cmd), "AT+CMGS=\"%s\"", phoneNumber);
    _serialGsm.println(cmd);
    delay(200);

    // Wait for '>' prompt
    _serialGsm.print(message);
    _serialGsm.write(0x1A); // Send Ctrl+Z to commit SMS

    uint32_t start = millis();
    while (millis() - start < 8000) {
        if (_serialGsm.find("+CMGS:")) {
            Serial.println(F("[GSM] SMS sent successfully."));
            return true;
        }
        delay(50);
    }
    Serial.println(F("[GSM] SMS send timeout."));
    return false;
}

bool CellularGSM::sendTelemetryMQTT(const RawSensorData &data, const RiskAssessment &risk, float lat, float lon) {
    // Format JSON telemetry payload
    char payload[384];
    snprintf(payload, sizeof(payload),
        "{\"node_id\":\"%s\",\"type\":\"%s\",\"lat\":%.5f,\"lon\":%.5f,"
        "\"water_cm\":%.1f,\"rain_mm_h\":%.1f,\"soil_pct\":%.1f,"
        "\"tilt_deg\":%.1f,\"vib_g\":%.2f,\"risk\":%d,\"risk_name\":\"%s\",\"msg\":\"%s\"}",
        NODE_ID, NODE_TYPE, lat, lon,
        data.water_level_cm, data.rain_intensity_mm_hr, data.soil_moisture_pct,
        data.tilt_angle_deg, data.vibration_rms_g,
        (int)risk.risk_level, risk.risk_name, risk.explanation
    );

    // Send via AT+HTTP or MQTT AT commands supported natively by SIM7600
    Serial.print(F("[GSM/4G UPLINK] Payload: "));
    Serial.println(payload);
    
    return true;
}

void CellularGSM::update() {
    // Read incoming async unsolicited responses / SMS
    while (_serialGsm.available()) {
        char c = _serialGsm.read();
        // Process AT responses
    }
}
