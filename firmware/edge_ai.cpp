#include "edge_ai.h"
#include <stdio.h>

EdgeAIModule edgeAI;

EdgeAIModule::EdgeAIModule() {}

HazardRiskLevel EdgeAIModule::runRuleBasedSafetyNet(const FeatureVector &f) {
    // 1. Critical Hard Rules
    bool crit_flood = (f.water_level_cm >= THRESHOLD_WATER_CRIT_CM) || 
                      (f.water_level_cm >= THRESHOLD_WATER_WARN_CM && f.water_rate_cm_per_min >= 5.0f && f.rain_intensity_mm_hr >= 40.0f);
    
    bool crit_slide = (f.tilt_change_deg >= THRESHOLD_TILT_CRIT_DEG && f.soil_moisture_pct >= THRESHOLD_SOIL_CRIT_PCT) ||
                      (f.vibration_rms_g >= THRESHOLD_VIB_CRIT_RMS_G && f.soil_moisture_pct >= THRESHOLD_SOIL_CRIT_PCT);

    if (crit_flood || crit_slide) {
        return LEVEL_CRITICAL;
    }

    // 2. Warning Hard Rules
    bool warn_flood = (f.water_level_cm >= THRESHOLD_WATER_WARN_CM) || (f.rain_intensity_mm_hr >= THRESHOLD_RAIN_WARN_MM_HR);
    bool warn_slide = (f.soil_moisture_pct >= THRESHOLD_SOIL_WARN_PCT && f.tilt_change_deg >= THRESHOLD_TILT_WARN_DEG) ||
                      (f.soil_moisture_pct >= THRESHOLD_SOIL_WARN_PCT && f.rain_accum_60m_mm >= 30.0f);

    if (warn_flood || warn_slide) {
        return LEVEL_WARNING;
    }

    return LEVEL_NORMAL;
}

EdgeAIOutput EdgeAIModule::infer(const FeatureVector &features) {
    EdgeAIOutput out;
    out.confidence = 0.96f;
    out.flood_threat = false;
    out.landslide_threat = false;

    // 1. Convert to Model Input Struct
    SensorFeatures sf;
    sf.water_level_cm = features.water_level_cm;
    sf.water_rate_cm_per_min = features.water_rate_cm_per_min;
    sf.rain_intensity_mm_hr = features.rain_intensity_mm_hr;
    sf.rain_accum_1h_mm = features.rain_accum_60m_mm;
    sf.soil_moisture_pct = features.soil_moisture_pct;
    sf.tilt_angle_deg = features.tilt_angle_deg;
    sf.vibration_rms_g = features.vibration_rms_g;

    // 2. Run Embedded Tree / MLP Classifier
    ResqRiskClass ml_class = predict_disaster_risk(&sf);
    
    if (ml_class == RISK_CRITICAL_FLOOD) {
        out.ai_raw_risk = LEVEL_CRITICAL;
        out.flood_threat = true;
    } else if (ml_class == RISK_CRITICAL_LANDSLIDE) {
        out.ai_raw_risk = LEVEL_CRITICAL;
        out.landslide_threat = true;
    } else if (ml_class == RISK_WARNING) {
        out.ai_raw_risk = LEVEL_WARNING;
    } else {
        out.ai_raw_risk = LEVEL_NORMAL;
    }

    // 3. Run Parallel Rule-Based Safety Net
    out.rule_fallback_risk = runRuleBasedSafetyNet(features);

    // 4. Cautious-of-the-Two Arbitration: Take the more severe evaluation
    if (out.rule_fallback_risk > out.ai_raw_risk) {
        out.final_arbitrated_risk = out.rule_fallback_risk;
    } else {
        out.final_arbitrated_risk = out.ai_raw_risk;
    }

    // Format human-readable diagnostics
    if (out.final_arbitrated_risk == LEVEL_CRITICAL) {
        if (out.flood_threat || features.water_level_cm > THRESHOLD_WATER_WARN_CM) {
            snprintf(out.reason, sizeof(out.reason), "CRITICAL FLASH FLOOD: Water=%.1fcm, Rate=%.1fcm/min, Rain=%.1fmm/h",
                     features.water_level_cm, features.water_rate_cm_per_min, features.rain_intensity_mm_hr);
        } else {
            snprintf(out.reason, sizeof(out.reason), "CRITICAL LANDSLIDE: Soil=%.1f%%, Tilt=+%.1f deg, Vib=%.2fg",
                     features.soil_moisture_pct, features.tilt_change_deg, features.vibration_rms_g);
        }
    } else if (out.final_arbitrated_risk == LEVEL_WARNING) {
        snprintf(out.reason, sizeof(out.reason), "WARNING: Elevated precipitation/saturation. Rain=%.1fmm/h, Soil=%.1f%%",
                 features.rain_intensity_mm_hr, features.soil_moisture_pct);
    } else {
        snprintf(out.reason, sizeof(out.reason), "NORMAL: Sensor hydro-geotechnical parameters safe.");
    }

    return out;
}
