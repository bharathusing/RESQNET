#ifndef SENSORS_H
#define SENSORS_H

#include <Arduino.h>
#include "config.h"

struct SensorFaultFlags {
    bool ultrasonic_fault;
    bool rain_gauge_fault;
    bool soil_sensor_fault;
    bool mpu6050_fault;
    bool battery_fault;
};

struct RawSensorsOutput {
    float water_distance_cm;
    float water_level_cm;
    uint32_t rain_pulse_count;
    float soil_moisture_pct;
    float accel_x;
    float accel_y;
    float accel_z;
    float tilt_angle_deg;
    float vibration_rms_g;
    float battery_voltage;
    float battery_percentage;
    SensorFaultFlags faults;
    uint32_t timestamp_ms;
};

class SensorSubsystem {
public:
    SensorSubsystem();
    bool begin();
    RawSensorsOutput sampleAll();
    static void IRAM_ATTR isrRainPulse();
    uint32_t getAndResetRainPulses();

private:
    float readUltrasonicMedian5();
    float readSoilMoisture();
    void readMPU6050(float &tilt, float &vib, float &ax, float &ay, float &az, bool &fault);
    float readBatteryVoltage();
};

extern SensorSubsystem sensors;

#endif // SENSORS_H
