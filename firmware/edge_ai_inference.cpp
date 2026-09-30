#include "edge_ai_inference.h"
#include <stdio.h>

EdgeAIInference::EdgeAIInference() 
    : _prev_water_level(0.0f), _prev_water_timestamp(0), _filtered_water_level(0.0f), _filtered_tilt(0.0f) {}

void EdgeAIInference::reset() {
    _prev_water_level = 0.0f;
    _prev_water_timestamp = millis();
    _filtered_water_level = 0.0f;
    _filtered_tilt = 0.0f;
}

RiskAssessment EdgeAIInference::evaluate(const RawSensorData &data) {
    RiskAssessment result;
    result.confidence_score = 0.95f;
    result.is_flood_threat = false;
    result.is_landslide_threat = false;

    // 1. Calculate water rate of change (cm/min)
    uint32_t now = millis();
    float dt_min = (float)(now - _prev_water_timestamp) / 60000.0f;
    float water_rate = 0.0f;
    if (dt_min > 0.01f && _prev_water_timestamp > 0) {
        water_rate = (data.water_level_cm - _prev_water_level) / dt_min;
    }
    _prev_water_level = data.water_level_cm;
    _prev_water_timestamp = now;

    // 2. Exponential Moving Average Low-Pass Filter to eliminate sensor noise
    _filtered_water_level = 0.7f * _filtered_water_level + 0.3f * data.water_level_cm;
    _filtered_tilt = 0.8f * _filtered_tilt + 0.2f * data.tilt_angle_deg;

    // 3. Assemble Feature Vector for Edge AI Decision Engine
    SensorFeatures feats;
    feats.water_level_cm = _filtered_water_level;
    feats.water_rate_cm_per_min = water_rate;
    feats.rain_intensity_mm_hr = data.rain_intensity_mm_hr;
    feats.rain_accum_1h_mm = data.rain_accum_1h_mm;
    feats.soil_moisture_pct = data.soil_moisture_pct;
    feats.tilt_angle_deg = _filtered_tilt;
    feats.vibration_rms_g = data.vibration_rms_g;

    // 4. Run Edge AI Model Inference
    ResqRiskClass ai_prediction = predict_disaster_risk(&feats);

    // 5. Hard threshold safety override check (Fail-Safe Defense in Depth)
    bool hard_flood_crit = (_filtered_water_level >= THRESHOLD_WATER_CRITICAL_CM) || 
                           (_filtered_water_level > 250.0f && feats.rain_intensity_mm_hr > 50.0f);
    bool hard_slide_crit = (_filtered_tilt >= THRESHOLD_SLOPE_TILT_DEG && feats.soil_moisture_pct > 80.0f) ||
                           (feats.vibration_rms_g >= THRESHOLD_VIBRATION_RMS_G && feats.soil_moisture_pct > 85.0f);

    if (hard_flood_crit) {
        ai_prediction = RISK_CRITICAL_FLOOD;
    } else if (hard_slide_crit) {
        ai_prediction = RISK_CRITICAL_LANDSLIDE;
    }

    // 6. Format Result
    result.risk_level = ai_prediction;
    result.risk_name = risk_class_to_string(ai_prediction);

    if (ai_prediction == RISK_CRITICAL_FLOOD) {
        result.is_flood_threat = true;
        snprintf(result.explanation, sizeof(result.explanation), 
                 "CRITICAL: Flash flood surge detected! Water=%.1fcm, Rain=%.1fmm/h", 
                 _filtered_water_level, feats.rain_intensity_mm_hr);
    } else if (ai_prediction == RISK_CRITICAL_LANDSLIDE) {
        result.is_landslide_threat = true;
        snprintf(result.explanation, sizeof(result.explanation), 
                 "CRITICAL: Slope failure imminent! Tilt=%.1f deg, Soil Sat=%.1f%%, Vib=%.2fg", 
                 _filtered_tilt, feats.soil_moisture_pct, feats.vibration_rms_g);
    } else if (ai_prediction == RISK_WARNING) {
        snprintf(result.explanation, sizeof(result.explanation), 
                 "WARNING: Elevated risk parameters. Rain=%.1fmm/h, Soil=%.1f%%", 
                 feats.rain_intensity_mm_hr, feats.soil_moisture_pct);
    } else {
        snprintf(result.explanation, sizeof(result.explanation), 
                 "NORMAL: Sensor parameters within baseline safety limits.");
    }

    return result;
}
