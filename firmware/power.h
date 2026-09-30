#ifndef POWER_H
#define POWER_H

#include <Arduino.h>
#include "config.h"
#include "risk_fsm.h"

class PowerManagementSubsystem {
public:
    PowerManagementSubsystem();
    void begin();
    void evaluateSleepSchedule(NodeFSMState current_state, uint32_t active_duration_ms);
    void enterLightSleep(uint32_t sleep_duration_ms);
    bool isLowBattery(float battery_pct);
};

extern PowerManagementSubsystem powerSystem;

#endif // POWER_H
