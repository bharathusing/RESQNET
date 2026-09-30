#ifndef PREPROCESS_H
#define PREPROCESS_H

#include <Arduino.h>
#include "sensors.h"

struct FeatureVector {
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

class PreprocessEngine {
public:
    PreprocessEngine();
    void reset();
    FeatureVector process(const RawSensorsOutput &raw);

private:
    // Circular rain history buffer (60 buckets of 1-minute rain totals)
    float _rain_buckets_1m[60];
    int _current_bucket_idx;
    uint32_t _last_bucket_time;

    // Rate calculation history
    float _prev_water_level;
    uint32_t _prev_water_time;
    float _prev_soil_moisture;
    uint32_t _prev_soil_time;
    float _baseline_tilt;

    // Filtered internal values
    float _filtered_water;
    float _filtered_tilt;
    float _filtered_vib;
};

extern PreprocessEngine preprocessor;

#endif // PREPROCESS_H
