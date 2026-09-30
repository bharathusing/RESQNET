#ifndef GSM_CLOUD_H
#define GSM_CLOUD_H

#include <Arduino.h>
#include "config.h"
#include "preprocess.h"
#include "risk_fsm.h"

class GSMCloudSubsystem {
public:
    GSMCloudSubsystem();
    bool begin();
    bool isConnected();
    int getSignalQualityCSQ();
    bool publishTelemetryMQTT(const FeatureVector &f, NodeFSMState state, float lat, float lon, float batt);
    bool publishAlertMQTT(const FeatureVector &f, NodeFSMState state, const char* reason, float lat, float lon);
    bool sendDirectEmergencySMS(const char* recipient_phone, const char* message);
    void update();

private:
    HardwareSerial _serialModem;
    bool _is_connected;
    int _csq_rssi;

    bool sendAT(const char* cmd, const char* expected, uint32_t timeout_ms = 2000);
    bool setupGPRSAndMQTT();
};

extern GSMCloudSubsystem gsmCloud;

#endif // GSM_CLOUD_H
