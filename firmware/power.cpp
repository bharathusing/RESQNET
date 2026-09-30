#include "power.h"
#include <esp_sleep.h>

PowerManagementSubsystem powerSystem;

PowerManagementSubsystem::PowerManagementSubsystem() {}

void PowerManagementSubsystem::begin() {
    // Configure wake-up sources for rain gauge interrupt even during sleep
    gpio_wakeup_enable((gpio_num_t)PIN_RAIN_GAUGE_PULSE, GPIO_INTR_LOW_LEVEL);
    esp_sleep_enable_gpio_wakeup();
}

bool PowerManagementSubsystem::isLowBattery(float battery_pct) {
    return (battery_pct < 15.0f);
}

void PowerManagementSubsystem::enterLightSleep(uint32_t sleep_duration_ms) {
    if (sleep_duration_ms < 100) return;
    esp_sleep_enable_timer_wakeup(sleep_duration_ms * 1000ULL);
    Serial.printf("[POWER] Entering light sleep for %u ms...\n", sleep_duration_ms);
    esp_light_sleep_start();
    Serial.println(F("[POWER] Woke up from light sleep."));
}

void PowerManagementSubsystem::evaluateSleepSchedule(NodeFSMState current_state, uint32_t active_duration_ms) {
    // 1. In Emergency states, DO NOT sleep (maintain real-time sirens and 1s sampling)
    if (current_state == FSM_WARNING || current_state == FSM_CRITICAL) {
        return;
    }

    // 2. In Normal state, sleep the remainder of the 5-second sampling interval
    if (active_duration_ms < SAMPLE_INTERVAL_NORMAL_MS) {
        uint32_t sleep_time = SAMPLE_INTERVAL_NORMAL_MS - active_duration_ms;
        enterLightSleep(sleep_time);
    }
}
