#ifndef EDGE_AI_INFERENCE_H
#define EDGE_AI_INFERENCE_H

#include <Arduino.h>
#include "sensors.h"
#include "model_weights.h"

struct RiskAssessment {
    ResqRiskClass risk_level;
    const char* risk_name;
    float confidence_score;
    bool is_flood_threat;
    bool is_landslide_threat;
    char explanation[128];
};

class EdgeAIInference {
public:
    EdgeAIInference();
    void reset();
    RiskAssessment evaluate(const RawSensorData &sensor_data);

private:
    float _prev_water_level;
    uint32_t _prev_water_timestamp;
    float _filtered_water_level;
    float _filtered_tilt;
};

#endif // EDGE_AI_INFERENCE_H
