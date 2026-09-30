#ifndef RISK_FSM_H
#define RISK_FSM_H

#include <Arduino.h>
#include "config.h"
#include "edge_ai.h"
#include "sensors.h"

enum NodeFSMState {
    FSM_NORMAL = 0,
    FSM_WARNING = 1,
    FSM_CRITICAL = 2,
    FSM_SENSOR_FAULT = 3
};

class RiskFSM {
public:
    RiskFSM();
    void reset();
    NodeFSMState update(HazardRiskLevel instantaneous_risk, const SensorFaultFlags &faults);
    NodeFSMState getCurrentState() const { return _current_state; }
    const char* getStateString() const;
    uint32_t getTimeInCurrentState() const;

private:
    NodeFSMState _current_state;
    uint8_t _consecutive_elevated_count;
    uint32_t _safe_condition_start_time;
    uint32_t _last_state_change_time;
};

extern RiskFSM riskFSM;

#endif // RISK_FSM_H
