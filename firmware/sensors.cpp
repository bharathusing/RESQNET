#include "sensors.h"
#include <Wire.h>
#include <algorithm>
#include <math.h>

SensorSubsystem sensors;

// Static ISR interrupt state
static volatile uint32_t s_rain_pulses = 0;
static volatile uint32_t s_last_rain_pulse_time = 0;

void IRAM_ATTR SensorSubsystem::isrRainPulse() {
    uint32_t now = millis();
    // 150ms debounce to prevent mechanical contact chatter
    if (now - s_last_rain_pulse_time > 150) {
        s_rain_pulses++;
        s_last_rain_pulse_time = now;
    }
}

SensorSubsystem::SensorSubsystem() {}

bool SensorSubsystem::begin() {
    // 1. Ultrasonic Pins
    pinMode(PIN_ULTRASONIC_TRIG, OUTPUT);
    pinMode(PIN_ULTRASONIC_ECHO, INPUT);
    digitalWrite(PIN_ULTRASONIC_TRIG, LOW);

    // 2. Rain Gauge Interrupt Pin
    pinMode(PIN_RAIN_GAUGE_PULSE, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(PIN_RAIN_GAUGE_PULSE), SensorSubsystem::isrRainPulse, FALLING);

    // 3. Analog ADC Pins
    pinMode(PIN_SOIL_MOISTURE_ADC, INPUT);
    pinMode(PIN_BATTERY_ADC, INPUT);

    // 4. MPU6050 I2C Interface
    Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL, 400000); // Fast 400kHz I2C
    Wire.beginTransmission(MPU6050_I2C_ADDR);
    Wire.write(0x6B); // Power Management 1
    Wire.write(0x00); // Wake up device
    byte err = Wire.endTransmission();

    return (err == 0);
}

uint32_t SensorSubsystem::getAndResetRainPulses() {
    noInterrupts();
    uint32_t count = s_rain_pulses;
    s_rain_pulses = 0;
    interrupts();
    return count;
}

float SensorSubsystem::readUltrasonicMedian5() {
    float samples[5];
    int valid_count = 0;

    for (int i = 0; i < 5; i++) {
        digitalWrite(PIN_ULTRASONIC_TRIG, LOW);
        delayMicroseconds(2);
        digitalWrite(PIN_ULTRASONIC_TRIG, HIGH);
        delayMicroseconds(10);
        digitalWrite(PIN_ULTRASONIC_TRIG, LOW);

        long duration = pulseIn(PIN_ULTRASONIC_ECHO, HIGH, 35000); // 35ms timeout (~5.5m max)
        if (duration > 0) {
            float dist = (duration * 0.0343f) / 2.0f;
            if (dist >= 20.0f && dist <= SENSOR_FAULT_WATER_MAX_CM) {
                samples[valid_count++] = dist;
            }
        }
        delay(15); // Small delay between sonic pings
    }

    if (valid_count == 0) {
        return -1.0f; // Fault signal
    }

    // Sort valid samples and take median
    std::sort(samples, samples + valid_count);
    return samples[valid_count / 2];
}

float SensorSubsystem::readSoilMoisture() {
    // Average 8 ADC readings for noise rejection
    int total_adc = 0;
    for (int i = 0; i < 8; i++) {
        total_adc += analogRead(PIN_SOIL_MOISTURE_ADC);
        delay(2);
    }
    int avg_adc = total_adc / 8;

    if (avg_adc < SENSOR_FAULT_SOIL_MIN_ADC || avg_adc > SENSOR_FAULT_SOIL_MAX_ADC) {
        return -1.0f; // Fault
    }

    avg_adc = constrain(avg_adc, SOIL_ADC_WATER_SAT, SOIL_ADC_AIR_DRY);
    float pct = (float)(SOIL_ADC_AIR_DRY - avg_adc) / (float)(SOIL_ADC_AIR_DRY - SOIL_ADC_WATER_SAT) * 100.0f;
    return constrain(pct, 0.0f, 100.0f);
}

void SensorSubsystem::readMPU6050(float &tilt, float &vib, float &ax, float &ay, float &az, bool &fault) {
    Wire.beginTransmission(MPU6050_I2C_ADDR);
    Wire.write(0x3B); // Starting register for accelerometer data
    if (Wire.endTransmission(false) != 0) {
        fault = true;
        tilt = 0; vib = 0; ax = 0; ay = 0; az = 1.0f;
        return;
    }

    Wire.requestFrom((uint8_t)MPU6050_I2C_ADDR, (uint8_t)6, (uint8_t)true);
    if (Wire.available() < 6) {
        fault = true;
        tilt = 0; vib = 0; ax = 0; ay = 0; az = 1.0f;
        return;
    }

    fault = false;
    int16_t raw_ax = (Wire.read() << 8) | Wire.read();
    int16_t raw_ay = (Wire.read() << 8) | Wire.read();
    int16_t raw_az = (Wire.read() << 8) | Wire.read();

    ax = (float)raw_ax / 16384.0f; // +-2g full scale
    ay = (float)raw_ay / 16384.0f;
    az = (float)raw_az / 16384.0f;

    float total_g = sqrtf(ax * ax + ay * ay + az * az);
    if (total_g > 0.001f) {
        float cos_theta = constrain(az / total_g, -1.0f, 1.0f);
        tilt = acosf(cos_theta) * (180.0f / 3.14159265f);
    } else {
        tilt = 0.0f;
    }

    vib = fabsf(total_g - 1.0f); // Dynamic vibration intensity
}

float SensorSubsystem::readBatteryVoltage() {
    int raw_adc = analogRead(PIN_BATTERY_ADC);
    float v_pin = (raw_adc / 4095.0f) * 3.3f;
    float v_batt = v_pin * ((BATT_DIVIDER_R1 + BATT_DIVIDER_R2) / BATT_DIVIDER_R2) * BATT_CALIBRATION_FACTOR;
    return v_batt;
}

RawSensorsOutput SensorSubsystem::sampleAll() {
    RawSensorsOutput out;
    out.timestamp_ms = millis();
    out.faults = {false, false, false, false, false};

    // 1. Water Level
    float dist = readUltrasonicMedian5();
    if (dist < 0) {
        out.faults.ultrasonic_fault = true;
        out.water_distance_cm = SENSOR_MOUNT_HEIGHT_CM;
        out.water_level_cm = 0.0f;
    } else {
        out.water_distance_cm = dist;
        out.water_level_cm = max(0.0f, SENSOR_MOUNT_HEIGHT_CM - dist);
    }

    // 2. Rain Gauge Pulses
    out.rain_pulse_count = getAndResetRainPulses();

    // 3. Soil Moisture
    float soil = readSoilMoisture();
    if (soil < 0) {
        out.faults.soil_sensor_fault = true;
        out.soil_moisture_pct = 0.0f;
    } else {
        out.soil_moisture_pct = soil;
    }

    // 4. MPU6050
    readMPU6050(out.tilt_angle_deg, out.vibration_rms_g, out.accel_x, out.accel_y, out.accel_z, out.faults.mpu6050_fault);

    // 5. Battery Monitoring
    out.battery_voltage = readBatteryVoltage();
    out.battery_percentage = constrain(((out.battery_voltage - 3.2f) / (4.2f - 3.2f)) * 100.0f, 0.0f, 100.0f);
    if (out.battery_voltage < 3.0f || out.battery_voltage > 4.5f) {
        out.faults.battery_fault = true;
    }

    return out;
}
