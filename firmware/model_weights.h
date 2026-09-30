// ============================================================================
// AUTO-GENERATED EMBEDDED EDGE AI MODEL FOR ESP32 MICROCONTROLLER
// Problem Statement: KH26-ECE-16 | Project RESQNET (Team 41)
// ============================================================================

#ifndef MODEL_WEIGHTS_H
#define MODEL_WEIGHTS_H

#include <stdint.h>

enum ResqRiskClass {
    RISK_NORMAL = 0,
    RISK_WARNING = 1,
    RISK_CRITICAL_FLOOD = 2,
    RISK_CRITICAL_LANDSLIDE = 3
};

struct SensorFeatures {
    float water_level_cm;
    float water_rate_cm_per_min;
    float rain_accum_10m_mm;
    float rain_accum_30m_mm;
    float rain_accum_60m_mm;
    float rain_intensity_mm_hr;
    float soil_moisture_pct;
    float soil_trend_pct_hr;
    float tilt_angle_deg;
    float tilt_change_deg;
    float vibration_rms_g;
};

inline ResqRiskClass predict_disaster_risk(const SensorFeatures* f) {
    if (f->rain_accum_30m_mm <= 8.74068f) {
        return (ResqRiskClass)0; // NORMAL
    } else {
        if (f->rain_accum_60m_mm <= 67.90673f) {
            return (ResqRiskClass)1; // WARNING
        } else {
            if (f->tilt_angle_deg <= 5.26089f) {
                return (ResqRiskClass)2; // CRITICAL_FLOOD
            } else {
                return (ResqRiskClass)3; // CRITICAL_LANDSLIDE
            }
        }
    }
}

inline const char* risk_class_to_string(ResqRiskClass c) {
    switch (c) {
        case RISK_NORMAL: return "NORMAL";
        case RISK_WARNING: return "WARNING";
        case RISK_CRITICAL_FLOOD: return "CRITICAL_FLOOD";
        case RISK_CRITICAL_LANDSLIDE: return "CRITICAL_LANDSLIDE";
        default: return "UNKNOWN";
    }
}

#endif // MODEL_WEIGHTS_H
