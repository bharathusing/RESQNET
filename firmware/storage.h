#ifndef STORAGE_H
#define STORAGE_H

#include <Arduino.h>
#include <EEPROM.h>
#include "config.h"
#include "sensors.h"
#include "risk_fsm.h"

#define EEPROM_SIZE             4096
#define MAX_OFFLINE_RECORDS     64

#pragma pack(push, 1)
struct OfflineLogRecord {
    uint32_t timestamp;
    float water_level_cm;
    float rain_accum_mm;
    float soil_moisture_pct;
    float tilt_angle_deg;
    float vibration_rms_g;
    uint8_t risk_level;
    uint8_t synced;
};
#pragma pack(pop)

class StorageManager {
public:
    StorageManager();
    bool begin();
    bool saveRecord(const RawSensorsOutput &raw, NodeFSMState state);
    int getUnsyncedCount();
    bool getRecord(int index, OfflineLogRecord &record);
    void markRecordSynced(int index);

private:
    uint16_t _write_head;
    uint16_t _count;
};

extern StorageManager storage;

#endif // STORAGE_H
