#include "alerts.h"

AlertActuationSubsystem alertSystem;

AlertActuationSubsystem::AlertActuationSubsystem() 
    : _state(FSM_NORMAL), _neighbor_alert(false), _last_toggle_time(0), _blink_flag(false), 
      _last_voice_play_time(0), _current_voice_lang(1) {}

void AlertActuationSubsystem::begin() {
    pinMode(PIN_RGB_RED, OUTPUT);
    pinMode(PIN_DFPLAYER_TX, OUTPUT);
    pinMode(PIN_DFPLAYER_BUSY, INPUT);

    // Setup LEDC PWM channel for piezo buzzer
    ledcSetup(0, 2400, 8); // Channel 0, 2.4kHz, 8-bit resolution
    ledcAttachPin(PIN_BUZZER_PWM, 0);
    ledcWrite(0, 0); // Start silent

    setRGB(false, true, false); // Initial Green (Safe)
}

void AlertActuationSubsystem::setRGB(bool red, bool green, bool blue) {
    digitalWrite(PIN_RGB_RED, red ? HIGH : LOW);
    // Note: If using RGB common cathode, other pins can be connected
}

void AlertActuationSubsystem::playDFPlayerTrack(uint8_t track_num) {
    // Standard DFPlayer Mini UART 10-byte command structure:
    // [0x7E, 0xFF, 0x06, 0x03, 0x00, 0x00, track_num, checksum_H, checksum_L, 0xEF]
    uint8_t cmd[10] = {0x7E, 0xFF, 0x06, 0x03, 0x00, 0x00, track_num, 0x00, 0x00, 0xEF};
    uint16_t sum = 0;
    for (int i = 1; i < 7; i++) sum += cmd[i];
    uint16_t checksum = -sum;
    cmd[7] = (uint8_t)(checksum >> 8);
    cmd[8] = (uint8_t)(checksum & 0xFF);

    Serial.printf("[VOICE BROADCAST] Triggering DFPlayer Track #%d (1=Telugu, 2=Hindi, 3=English)\n", track_num);
}

void AlertActuationSubsystem::playVoiceWarningSequence() {
    uint32_t now = millis();
    // Check if voice track finished and 4 seconds interval elapsed
    if (now - _last_voice_play_time > 8000) {
        _last_voice_play_time = now;
        playDFPlayerTrack(_current_voice_lang);
        _current_voice_lang = (_current_voice_lang % 3) + 1; // Cycle: Telugu -> Hindi -> English
    }
}

void AlertActuationSubsystem::setFSMState(NodeFSMState state, bool neighbor_alert) {
    _state = state;
    _neighbor_alert = neighbor_alert;

    switch (state) {
        case FSM_NORMAL:
            ledcWrite(0, 0); // Buzzer off
            setRGB(false, true, false); // Green
            break;
            
        case FSM_WARNING:
            setRGB(true, true, false); // Amber
            break;
            
        case FSM_CRITICAL:
            setRGB(true, false, false); // Red
            playVoiceWarningSequence();
            break;

        case FSM_SENSOR_FAULT:
            setRGB(true, false, true); // Magenta
            break;
    }
}

void AlertActuationSubsystem::update() {
    uint32_t now = millis();

    if (_state == FSM_WARNING || _neighbor_alert) {
        // Slow pulsing amber/yellow beep
        if (now - _last_toggle_time > 800) {
            _blink_flag = !_blink_flag;
            _last_toggle_time = now;
            if (_blink_flag) {
                ledcWriteTone(0, 1600); // 1.6kHz warning tone
                setRGB(true, true, false);
            } else {
                ledcWrite(0, 0);
                setRGB(false, false, false);
            }
        }
    } else if (_state == FSM_CRITICAL) {
        // Urgent alternating two-tone emergency siren + Voice Announcements
        if (now - _last_toggle_time > 300) {
            _blink_flag = !_blink_flag;
            _last_toggle_time = now;
            if (_blink_flag) {
                ledcWriteTone(0, 3200); // 3.2kHz high warble
                setRGB(true, false, false);
            } else {
                ledcWriteTone(0, 2200); // 2.2kHz low warble
                setRGB(false, false, true);
            }
        }
        playVoiceWarningSequence();
    }
}
