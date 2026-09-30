#ifndef ALERTS_H
#define ALERTS_H

#include <Arduino.h>
#include "config.h"
#include "risk_fsm.h"

enum VoiceLanguageTrack {
    VOICE_TELUGU = 1,
    VOICE_HINDI = 2,
    VOICE_ENGLISH = 3
};

class AlertActuationSubsystem {
public:
    AlertActuationSubsystem();
    void begin();
    void setFSMState(NodeFSMState state, bool neighbor_alert = false);
    void playVoiceWarningSequence();
    void update();

private:
    NodeFSMState _state;
    bool _neighbor_alert;
    uint32_t _last_toggle_time;
    bool _blink_flag;
    uint32_t _last_voice_play_time;
    int _current_voice_lang;

    void setRGB(bool red, bool green, bool blue);
    void playDFPlayerTrack(uint8_t track_num);
};

extern AlertActuationSubsystem alertSystem;

#endif // ALERTS_H
