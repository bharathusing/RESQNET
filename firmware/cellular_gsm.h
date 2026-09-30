#ifndef CELLULAR_GSM_H
#define CELLULAR_GSM_H

#include <Arduino.h>
#include "config.h"
#include "sensors.h"
#include "edge_ai_inference.h"

class CellularGSM {
public:
    CellularGSM();
    bool begin();
    bool isConnected();
    bool sendTelemetryMQTT(const RawSensorData &data, const RiskAssessment &risk, float lat, float lon);
    bool sendEmergencySMS(const char* phoneNumber, const char* message);
    void update();

private:
    HardwareSerial _serialGsm;
    bool sendATCommand(const char* cmd, const char* expected_resp, uint32_t timeout_ms = 2000);
    bool initModem();
    bool _connected;
};

#endif // CELLULAR_GSM_H
