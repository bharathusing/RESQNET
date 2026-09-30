#include "risk_fsm.h"

RiskFSM riskFSM;

RiskFSM::RiskFSM() {
    reset();
}

void RiskFSM::reset() {
    _current_state = FSM_NORMAL;
    _consecutive_elevated_count = 0;
    _safe_condition_start_time = 0;
    _last_state_change_time = millis();
}

const char* RiskFSM::getStateString() const {
    switch (_current_state) {
        case FSM_NORMAL: return "NORMAL";
        case FSM_WARNING: return "WARNING";
        case FSM_CRITICAL: return "CRITICAL";
        case FSM_SENSOR_FAULT: return "SENSOR_FAULT";
        default: return "UNKNOWN";
    }
}

uint32_t RiskFSM::getTimeInCurrentState() const {
    return millis() - _last_state_change_time;
}

NodeFSMState RiskFSM::update(HazardRiskLevel instantaneous_risk, const SensorFaultFlags &faults) {
    uint32_t now = millis();

    // 1. Hardware Fault Detection Check
    if (faults.ultrasonic_fault && faults.mpu6050_fault) {
        if (_current_state != FSM_SENSOR_FAULT) {
            _current_state = FSM_SENSOR_FAULT;
            _last_state_change_time = now;
        }
        return _current_state;
    }

    // 2. Escalation Logic with Consecutive Reading Confirmation
    if (instantaneous_risk > (HazardRiskLevel)_current_state) {
        _consecutive_elevated_count++;
        _safe_condition_start_time = 0; // Reset de-escalation timer

        if (_consecutive_elevated_count >= CONSECUTIVE_READINGS_CONFIRM) {
            // Confirm escalation to higher severity state
            _current_state = (NodeFSMState)instantaneous_risk;
            _consecutive_elevated_count = 0;
            _last_state_change_time = now;
            Serial.printf("[FSM ESCALATION] -> State shifted to: %s\n", getStateString());
        }
    } 
    // 3. De-escalation Logic with Strict Hysteresis Timing
    else if (instantaneous_risk < (HazardRiskLevel)_current_state && _current_state != FSM_NORMAL) {
        _consecutive_elevated_count = 0;

        if (_safe_condition_start_time == 0) {
            _safe_condition_start_time = now; // Start 10-minute hysteresis countdown
        } else if (now - _safe_condition_start_time >= HYSTERESIS_DEESCALATE_MS) {
            // Step down one level after 10 minutes of uninterrupted safe readings
            if (_current_state == FSM_CRITICAL) {
                _current_state = FSM_WARNING;
            } else if (_current_state == FSM_WARNING) {
                _current_state = FSM_NORMAL;
            }
            _safe_condition_start_time = 0;
            _last_state_change_time = now;
            Serial.printf("[FSM DE-ESCALATION] -> Hysteresis satisfied. State shifted to: %s\n", getStateString());
        }
    } else {
        // Steady state
        _consecutive_elevated_count = 0;
        _safe_condition_start_time = 0;
    }

    return _current_state;
}
