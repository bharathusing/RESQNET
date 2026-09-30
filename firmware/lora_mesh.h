#ifndef LORA_MESH_H
#define LORA_MESH_H

#include <Arduino.h>
#include <SPI.h>
#include "config.h"
#include "risk_fsm.h"
#include "preprocess.h"

enum MeshPacketType : uint8_t {
    PKT_HEARTBEAT = 0x01,
    PKT_HAZARD_ALERT = 0x02,
    PKT_NEIGHBOR_ACK = 0x03
};

#pragma pack(push, 1)
struct LoRaDisasterPacket {
    uint8_t network_id;             // Team 41 (0x41)
    uint8_t packet_type;            // Heartbeat / Hazard Alert
    char node_id[16];               // Origin Node ID (e.g. RESQ-NODE-01)
    uint16_t seq_num;               // Sequence counter
    uint8_t hop_count;              // Current hop depth (0 to 3)
    uint8_t risk_level;             // 0=Normal, 1=Warning, 2=Critical
    float latitude;                 // GPS Latitude
    float longitude;                // GPS Longitude
    float battery_pct;              // Battery %
    uint32_t timestamp;             // Timestamp in seconds
    float water_level_cm;           // Sensor data payload
    float rain_intensity_mm_hr;
    float soil_moisture_pct;
    float tilt_angle_deg;
    float vibration_rms_g;
    uint16_t crc16;                 // CRC-16 Checksum
};
#pragma pack(pop)

typedef void (*NeighborAlertCallback)(const LoRaDisasterPacket &pkt);

class LoRaMeshSubsystem {
public:
    LoRaMeshSubsystem();
    bool begin();
    bool broadcastHazard(const FeatureVector &features, NodeFSMState state, float lat, float lon, float batt);
    bool broadcastHeartbeat(float lat, float lon, float batt);
    void update();
    void setNeighborAlertCallback(NeighborAlertCallback cb);

private:
    uint16_t _seq_counter;
    NeighborAlertCallback _on_neighbor_alert;

    struct PacketCache {
        char origin[16];
        uint16_t seq;
        uint32_t expire_time;
    } _dedup_cache[24];
    uint8_t _cache_head;

    bool isDuplicate(const char* origin, uint16_t seq);
    void recordInCache(const char* origin, uint16_t seq);
    void relayPacket(LoRaDisasterPacket pkt);
    uint16_t computeCRC16(const uint8_t *data, size_t len);
};

extern LoRaMeshSubsystem loraMesh;

#endif // LORA_MESH_H
