#include "storage.h"

StorageManager storage;

StorageManager::StorageManager() : _write_head(0), _count(0) {}

bool StorageManager::begin() {
    if (!EEPROM.begin(EEPROM_SIZE)) {
        Serial.println(F("[STORAGE] EEPROM initialization failed!"));
        return false;
    }
    Serial.println(F("[STORAGE] Local offline circular flash storage ready."));
    return true;
}

bool StorageManager::saveRecord(const RawSensorsOutput &raw, NodeFSMState state) {
    OfflineLogRecord rec;
    rec.timestamp = millis() / 1000;
    rec.water_level_cm = raw.water_level_cm;
    rec.rain_accum_mm = raw.rain_pulse_count * RAIN_MM_PER_PULSE;
    rec.soil_moisture_pct = raw.soil_moisture_pct;
    rec.tilt_angle_deg = raw.tilt_angle_deg;
    rec.vibration_rms_g = raw.vibration_rms_g;
    rec.risk_level = (uint8_t)state;
    rec.synced = 0;

    int addr = sizeof(uint32_t) + (_write_head * sizeof(OfflineLogRecord));
    EEPROM.put(addr, rec);
    EEPROM.commit();

    _write_head = (_write_head + 1) % MAX_OFFLINE_RECORDS;
    if (_count < MAX_OFFLINE_RECORDS) _count++;

    Serial.printf("[STORAGE] Logged offline backup record #%d (Risk: %d)\n", _write_head, (int)state);
    return true;
}

int StorageManager::getUnsyncedCount() {
    int unsynced = 0;
    for (int i = 0; i < _count; i++) {
        OfflineLogRecord rec;
        int addr = sizeof(uint32_t) + (i * sizeof(OfflineLogRecord));
        EEPROM.get(addr, rec);
        if (rec.synced == 0) unsynced++;
    }
    return unsynced;
}

bool StorageManager::getRecord(int index, OfflineLogRecord &record) {
    if (index >= _count) return false;
    int addr = sizeof(uint32_t) + (index * sizeof(OfflineLogRecord));
    EEPROM.get(addr, record);
    return true;
}

void StorageManager::markRecordSynced(int index) {
    if (index >= _count) return;
    int addr = sizeof(uint32_t) + (index * sizeof(OfflineLogRecord));
    OfflineLogRecord rec;
    EEPROM.get(addr, rec);
    rec.synced = 1;
    EEPROM.put(addr, rec);
    EEPROM.commit();
}
