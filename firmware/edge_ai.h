#ifndef EDGE_AI_H
#define EDGE_AI_H

#include <Arduino.h>
#include "config.h"
#include "preprocess.h"
#include "model_weights.h"

enum HazardRiskLevel : uint8_t {
    LEVEL_NORMAL = 0,
    LEVEL_WARNING = 1,
    LEVEL_CRITICAL = 2
};

struct EdgeAIOutput {
    HazardRiskLevel ai_raw_risk;
    HazardRiskLevel rule_fallback_risk;
    HazardRiskLevel final_arbitrated_risk;
    float confidence;
    bool flood_threat;
    bool landslide_threat;
    char reason[128];
};

class EdgeAIModule {
public:
    EdgeAIModule();
    EdgeAIOutput infer(const FeatureVector &features);

private:
    HazardRiskLevel runRuleBasedSafetyNet(const FeatureVector &f);
};

extern EdgeAIModule edgeAI;

#endif // EDGE_AI_H
