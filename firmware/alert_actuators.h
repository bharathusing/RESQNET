#ifndef ALERT_ACTUATORS_H
#define ALERT_ACTUATORS_H

#include <Arduino.h>
#include "config.h"
#include "edge_ai_inference.h"

class AlertActuators {
public:
    AlertActuators();
    void begin();
    void setRiskState(ResqRiskClass risk_level);
    void triggerLocalSiren(bool state);
    void triggerVoiceEvacuation();
    void update();

private:
    ResqRiskClass _current_state;
    uint32_t _last_toggle_time;
    bool _blink_state;
    void setRGBColor(uint8_t r, uint8_t g, uint8_t b);
};

#endif // ALERT_ACTUATORS_H
