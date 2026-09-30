#include "alert_actuators.h"

AlertActuators::AlertActuators() 
    : _current_state(RISK_NORMAL), _last_toggle_time(0), _blink_state(false) {}

void AlertActuators::begin() {
    pinMode(PIN_LED_RED, OUTPUT);
    pinMode(PIN_LED_GREEN, OUTPUT);
    pinMode(PIN_LED_BLUE, OUTPUT);
    pinMode(PIN_VOICE_TRIGGER, OUTPUT);
    digitalWrite(PIN_VOICE_TRIGGER, LOW);

    // Setup LEDC PWM channel for Piezo Siren
    ledcSetup(0, 2000, 8); // Channel 0, 2kHz, 8-bit resolution
    ledcAttachPin(PIN_BUZZER_PWM, 0);
    ledcWrite(0, 0); // Start silent

    setRGBColor(0, 255, 0); // Green (Safe)
}

void AlertActuators::setRGBColor(uint8_t r, uint8_t g, uint8_t b) {
    digitalWrite(PIN_LED_RED, r > 0 ? HIGH : LOW);
    digitalWrite(PIN_LED_GREEN, g > 0 ? HIGH : LOW);
    digitalWrite(PIN_LED_BLUE, b > 0 ? HIGH : LOW);
}

void AlertActuators::setRiskState(ResqRiskClass risk_level) {
    _current_state = risk_level;
    
    switch (risk_level) {
        case RISK_NORMAL:
            setRGBColor(0, 255, 0); // Steady Green
            ledcWrite(0, 0);        // Buzzer Off
            break;
            
        case RISK_WARNING:
            setRGBColor(255, 120, 0); // Yellow/Orange
            ledcWriteTone(0, 1500);   // Low warning beep
            break;
            
        case RISK_CRITICAL_FLOOD:
        case RISK_CRITICAL_LANDSLIDE:
            setRGBColor(255, 0, 0);   // Flashing Red
            ledcWriteTone(0, 3000);   // High-pitched siren
            triggerVoiceEvacuation();
            break;
    }
}

void AlertActuators::triggerVoiceEvacuation() {
    // Pulse voice trigger pin to activate pre-recorded audio on DFPlayer/Speaker
    digitalWrite(PIN_VOICE_TRIGGER, HIGH);
    delay(100);
    digitalWrite(PIN_VOICE_TRIGGER, LOW);
}

void AlertActuators::triggerLocalSiren(bool state) {
    if (state) {
        ledcWriteTone(0, 2800);
    } else {
        ledcWrite(0, 0);
    }
}

void AlertActuators::update() {
    uint32_t now = millis();

    // Flashing pattern during Warning & Critical
    if (_current_state == RISK_WARNING) {
        if (now - _last_toggle_time > 600) {
            _blink_state = !_blink_state;
            _last_toggle_time = now;
            if (_blink_state) {
                setRGBColor(255, 100, 0);
                ledcWriteTone(0, 1800);
            } else {
                setRGBColor(0, 0, 0);
                ledcWrite(0, 0);
            }
        }
    } else if (_current_state == RISK_CRITICAL_FLOOD || _current_state == RISK_CRITICAL_LANDSLIDE) {
        if (now - _last_toggle_time > 250) {
            _blink_state = !_blink_state;
            _last_toggle_time = now;
            if (_blink_state) {
                setRGBColor(255, 0, 0);
                ledcWriteTone(0, 3200); // Two-tone emergency siren
            } else {
                setRGBColor(0, 0, 255);
                ledcWriteTone(0, 2200);
            }
        }
    }
}
