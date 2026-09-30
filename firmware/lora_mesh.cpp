#include "lora_mesh.h"
#include <LoRa.h>

LoRaMeshSubsystem loraMesh;

LoRaMeshSubsystem::LoRaMeshSubsystem() 
    : _seq_counter(0), _on_neighbor_alert(nullptr), _cache_head(0) {
    memset(_dedup_cache, 0, sizeof(_dedup_cache));
}

bool LoRaMeshSubsystem::begin() {
    SPI.begin(LORA_SCK_PIN, LORA_MISO_PIN, LORA_MOSI_PIN, LORA_CS_PIN);
    LoRa.setPins(LORA_CS_PIN, LORA_RST_PIN, LORA_DIO0_PIN);

    if (!LoRa.begin(LORA_FREQUENCY_HZ)) {
        Serial.println(F("[LoRa] SX1278 initialization failed!"));
        return false;
    }

    LoRa.setSyncWord(MESH_NETWORK_ID);
    LoRa.setSpreadingFactor(LORA_SPREADING_FACTOR);
    LoRa.setSignalBandwidth(LORA_BANDWIDTH_HZ);
    LoRa.setCodingRate4(LORA_CODING_RATE);
    LoRa.setTxPower(LORA_TX_POWER_DBM);
    LoRa.enableCrc();

    Serial.println(F("[LoRa] SX1278 Mesh Subsystem Initialized."));
    return true;
}

uint16_t LoRaMeshSubsystem::computeCRC16(const uint8_t *data, size_t len) {
    uint16_t crc = 0xFFFF;
    for (size_t i = 0; i < len; i++) {
        crc ^= (uint16_t)data[i];
        for (uint8_t j = 0; j < 8; j++) {
            if (crc & 0x0001) {
                crc = (crc >> 1) ^ 0xA001;
            } else {
                crc = crc >> 1;
            }
        }
    }
    return crc;
}

bool LoRaMeshSubsystem::isDuplicate(const char* origin, uint16_t seq) {
    uint32_t now = millis();
    for (int i = 0; i < 24; i++) {
        if (_dedup_cache[i].expire_time > now &&
            _dedup_cache[i].seq == seq &&
            strncmp(_dedup_cache[i].origin, origin, 15) == 0) {
            return true;
        }
    }
    return false;
}

void LoRaMeshSubsystem::recordInCache(const char* origin, uint16_t seq) {
    strncpy(_dedup_cache[_cache_head].origin, origin, 15);
    _dedup_cache[_cache_head].origin[15] = '\0';
    _dedup_cache[_cache_head].seq = seq;
    _dedup_cache[_cache_head].expire_time = millis() + 30000; // 30s cache retention
    _cache_head = (_cache_head + 1) % 24;
}

bool LoRaMeshSubsystem::broadcastHazard(const FeatureVector &features, NodeFSMState state, float lat, float lon, float batt) {
    LoRaDisasterPacket pkt;
    memset(&pkt, 0, sizeof(pkt));

    pkt.network_id = MESH_NETWORK_ID;
    pkt.packet_type = PKT_HAZARD_ALERT;
    strncpy(pkt.node_id, NODE_ID, 15);
    pkt.seq_num = ++_seq_counter;
    pkt.hop_count = 0;
    pkt.risk_level = (uint8_t)state;
    pkt.latitude = lat;
    pkt.longitude = lon;
    pkt.battery_pct = batt;
    pkt.timestamp = millis() / 1000;

    pkt.water_level_cm = features.water_level_cm;
    pkt.rain_intensity_mm_hr = features.rain_intensity_mm_hr;
    pkt.soil_moisture_pct = features.soil_moisture_pct;
    pkt.tilt_angle_deg = features.tilt_angle_deg;
    pkt.vibration_rms_g = features.vibration_rms_g;

    pkt.crc16 = 0;
    pkt.crc16 = computeCRC16((const uint8_t*)&pkt, sizeof(LoRaDisasterPacket) - sizeof(uint16_t));

    recordInCache(NODE_ID, pkt.seq_num);

    LoRa.beginPacket();
    LoRa.write((const uint8_t*)&pkt, sizeof(LoRaDisasterPacket));
    int res = LoRa.endPacket();
    Serial.printf("[LORA TX] Broadcasted Hazard Packet #%d (Risk: %d, Hop: 0)\n", pkt.seq_num, (int)state);
    return (res == 1);
}

bool LoRaMeshSubsystem::broadcastHeartbeat(float lat, float lon, float batt) {
    LoRaDisasterPacket pkt;
    memset(&pkt, 0, sizeof(pkt));

    pkt.network_id = MESH_NETWORK_ID;
    pkt.packet_type = PKT_HEARTBEAT;
    strncpy(pkt.node_id, NODE_ID, 15);
    pkt.seq_num = ++_seq_counter;
    pkt.hop_count = 0;
    pkt.risk_level = (uint8_t)FSM_NORMAL;
    pkt.latitude = lat;
    pkt.longitude = lon;
    pkt.battery_pct = batt;
    pkt.timestamp = millis() / 1000;

    pkt.crc16 = 0;
    pkt.crc16 = computeCRC16((const uint8_t*)&pkt, sizeof(LoRaDisasterPacket) - sizeof(uint16_t));

    recordInCache(NODE_ID, pkt.seq_num);

    LoRa.beginPacket();
    LoRa.write((const uint8_t*)&pkt, sizeof(LoRaDisasterPacket));
    return (LoRa.endPacket() == 1);
}

void LoRaMeshSubsystem::relayPacket(LoRaDisasterPacket pkt) {
    if (pkt.hop_count >= MESH_MAX_HOPS) {
        return; // Hop limit exceeded
    }

    pkt.hop_count++;
    pkt.crc16 = 0;
    pkt.crc16 = computeCRC16((const uint8_t*)&pkt, sizeof(LoRaDisasterPacket) - sizeof(uint16_t));

    // Jitter delay (10-70ms) to avoid simultaneous channel collisions
    delay(random(10, 70));

    LoRa.beginPacket();
    LoRa.write((const uint8_t*)&pkt, sizeof(LoRaDisasterPacket));
    LoRa.endPacket();

    Serial.printf("[LORA RELAY] Relayed packet #%d from %s (Hop depth: %d)\n", pkt.seq_num, pkt.node_id, pkt.hop_count);
}

void LoRaMeshSubsystem::setNeighborAlertCallback(NeighborAlertCallback cb) {
    _on_neighbor_alert = cb;
}

void LoRaMeshSubsystem::update() {
    int packetSize = LoRa.parsePacket();
    if (packetSize == sizeof(LoRaDisasterPacket)) {
        LoRaDisasterPacket pkt;
        LoRa.readBytes((uint8_t*)&pkt, sizeof(LoRaDisasterPacket));

        // 1. Network ID filter
        if (pkt.network_id != MESH_NETWORK_ID) return;

        // 2. CRC16 Integrity Verification
        uint16_t expected_crc = computeCRC16((const uint8_t*)&pkt, sizeof(LoRaDisasterPacket) - sizeof(uint16_t));
        if (pkt.crc16 != expected_crc) {
            Serial.println(F("[LORA RX] Corrupted CRC. Dropping packet."));
            return;
        }

        // 3. Self-Packet Filter
        if (strncmp(pkt.node_id, NODE_ID, 15) == 0) return;

        // 4. Duplicate Suppression Check
        if (isDuplicate(pkt.node_id, pkt.seq_num)) return;
        recordInCache(pkt.node_id, pkt.seq_num);

        Serial.printf("[LORA RX] Received valid packet from %s | Seq: %d | Risk: %d | Hops: %d\n",
                      pkt.node_id, pkt.seq_num, pkt.risk_level, pkt.hop_count);

        // 5. Trigger Neighbor Alert if neighbor reports Critical/Warning
        if (pkt.risk_level >= (uint8_t)FSM_WARNING) {
            if (_on_neighbor_alert != nullptr) {
                _on_neighbor_alert(pkt);
            }
        }

        // 6. Mesh Packet Relay
        relayPacket(pkt);
    }
}
