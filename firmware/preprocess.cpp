#include "preprocess.h"

PreprocessEngine preprocessor;

PreprocessEngine::PreprocessEngine() {
    reset();
}

void PreprocessEngine::reset() {
    for (int i = 0; i < 60; i++) _rain_buckets_1m[i] = 0.0f;
    _current_bucket_idx = 0;
    _last_bucket_time = millis();
    _prev_water_level = 0.0f;
    _prev_water_time = 0;
    _prev_soil_moisture = 0.0f;
    _prev_soil_time = 0;
    _baseline_tilt = 0.0f;
    _filtered_water = 0.0f;
    _filtered_tilt = 0.0f;
    _filtered_vib = 0.0f;
}

FeatureVector PreprocessEngine::process(const RawSensorsOutput &raw) {
    uint32_t now = millis();
    FeatureVector fv;

    // 1. Rain Gauge Minute-Bucket Aggregation
    float rain_added_mm = raw.rain_pulse_count * RAIN_MM_PER_PULSE;
    _rain_buckets_1m[_current_bucket_idx] += rain_added_mm;

    // Advance 1-minute bucket
    if (now - _last_bucket_time >= 60000) {
        _current_bucket_idx = (_current_bucket_idx + 1) % 60;
        _rain_buckets_1m[_current_bucket_idx] = 0.0f; // Clear new active bucket
        _last_bucket_time = now;
    }

    // Compute 10m, 30m, 60m sliding sums
    float r10 = 0.0f, r30 = 0.0f, r60 = 0.0f;
    for (int i = 0; i < 60; i++) {
        int idx = (_current_bucket_idx - i + 60) % 60;
        float val = _rain_buckets_1m[idx];
        if (i < 10) r10 += val;
        if (i < 30) r30 += val;
        r60 += val;
    }
    fv.rain_accum_10m_mm = r10;
    fv.rain_accum_30m_mm = r30;
    fv.rain_accum_60m_mm = r60;
    fv.rain_intensity_mm_hr = r10 * 6.0f; // Extrapolated from past 10 minutes

    // 2. Exponential Moving Average Filter on Water Level & Rate of Rise
    _filtered_water = 0.75f * _filtered_water + 0.25f * raw.water_level_cm;
    fv.water_level_cm = _filtered_water;

    if (_prev_water_time > 0) {
        float dt_min = (float)(now - _prev_water_time) / 60000.0f;
        if (dt_min > 0.05f) {
            fv.water_rate_cm_per_min = (fv.water_level_cm - _prev_water_level) / dt_min;
            _prev_water_level = fv.water_level_cm;
            _prev_water_time = now;
        } else {
            fv.water_rate_cm_per_min = 0.0f;
        }
    } else {
        _prev_water_level = fv.water_level_cm;
        _prev_water_time = now;
        fv.water_rate_cm_per_min = 0.0f;
    }

    // 3. Soil Moisture & Rate of Saturation Trend
    fv.soil_moisture_pct = raw.soil_moisture_pct;
    if (_prev_soil_time > 0) {
        float dt_hr = (float)(now - _prev_soil_time) / 3600000.0f;
        if (dt_hr > 0.01f) {
            fv.soil_trend_pct_hr = (raw.soil_moisture_pct - _prev_soil_moisture) / dt_hr;
            _prev_soil_moisture = raw.soil_moisture_pct;
            _prev_soil_time = now;
        } else {
            fv.soil_trend_pct_hr = 0.0f;
        }
    } else {
        _prev_soil_moisture = raw.soil_moisture_pct;
        _prev_soil_time = now;
        fv.soil_trend_pct_hr = 0.0f;
    }

    // 4. MPU6050 Tilt & Vibration Filtering
    if (_baseline_tilt < 0.001f && raw.tilt_angle_deg > 0.1f) {
        _baseline_tilt = raw.tilt_angle_deg; // Set initial baseline
    }
    _filtered_tilt = 0.8f * _filtered_tilt + 0.2f * raw.tilt_angle_deg;
    _filtered_vib = 0.7f * _filtered_vib + 0.3f * raw.vibration_rms_g;

    fv.tilt_angle_deg = _filtered_tilt;
    fv.tilt_change_deg = fabsf(_filtered_tilt - _baseline_tilt);
    fv.vibration_rms_g = _filtered_vib;

    return fv;
}
