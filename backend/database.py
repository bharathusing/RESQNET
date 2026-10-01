"""
RESQNET Cloud Backend Database Layer
SQLAlchemy models for sensor nodes, real-time telemetry, incidents, and alert history.
"""

from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime
import os

DATABASE_URL = "sqlite:///./resqnet.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class SensorNode(Base):
    __tablename__ = "sensor_nodes"

    id = Column(String, primary_key=True, index=True) # e.g. RESQ-NODE-01
    name = Column(String, nullable=False)
    node_type = Column(String, default="DUAL")        # RIVER_ONLY, SLOPE_ONLY, DUAL, REPEATER
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_name = Column(String, default="Sector A")
    battery_level_pct = Column(Float, default=100.0)
    solar_charging = Column(Boolean, default=True)
    is_online = Column(Boolean, default=True)
    last_seen = Column(DateTime, default=datetime.utcnow)
    current_risk = Column(Integer, default=0)         # 0=NORMAL, 1=WARNING, 2=CRITICAL_FLOOD, 3=CRITICAL_LANDSLIDE

    telemetries = relationship("TelemetryRecord", back_populates="node", cascade="all, delete-orphan")
    alerts = relationship("AlertIncident", back_populates="node", cascade="all, delete-orphan")

class TelemetryRecord(Base):
    __tablename__ = "telemetry_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    node_id = Column(String, ForeignKey("sensor_nodes.id"), index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    water_level_cm = Column(Float, default=0.0)
    rain_intensity_mm_hr = Column(Float, default=0.0)
    soil_moisture_pct = Column(Float, default=0.0)
    tilt_angle_deg = Column(Float, default=0.0)
    vibration_rms_g = Column(Float, default=0.0)
    risk_level = Column(Integer, default=0)
    risk_name = Column(String, default="NORMAL")
    explanation = Column(Text, nullable=True)

    node = relationship("SensorNode", back_populates="telemetries")

class AlertIncident(Base):
    __tablename__ = "alert_incidents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    node_id = Column(String, ForeignKey("sensor_nodes.id"), index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    hazard_type = Column(String, nullable=False) # FLASH_FLOOD, SLOPE_FAILURE, HEAVY_RAIN
    severity = Column(String, default="CRITICAL") # WARNING, CRITICAL
    status = Column(String, default="ACTIVE")     # ACTIVE, ACKNOWLEDGED, RESOLVED
    details = Column(Text, nullable=True)
    sms_dispatched = Column(Boolean, default=False)
    whatsapp_dispatched = Column(Boolean, default=False)

    node = relationship("SensorNode", back_populates="alerts")

def init_db():
    Base.metadata.create_all(bind=engine)
    
    # Pre-populate default nodes with real-world disaster monitoring coordinates (Wayanad High-Risk Corridor)
    db = SessionLocal()
    if db.query(SensorNode).count() == 0:
        default_nodes = [
            SensorNode(id="RESQ-NODE-01", name="Chooralmala River Station", node_type="RIVER_ONLY", 
                       latitude=11.5450, longitude=76.1280, location_name="Chooralmala River Catchment"),
            SensorNode(id="RESQ-NODE-02", name="Mundakkai Mountain Station", node_type="SLOPE_ONLY", 
                       latitude=11.5360, longitude=76.1480, location_name="Mundakkai Hillside Slope"),
            SensorNode(id="RESQ-NODE-03", name="Attamala Bridge Station", node_type="DUAL", 
                       latitude=11.5280, longitude=76.1620, location_name="Attamala Causeway Checkpoint"),
            SensorNode(id="RESQ-NODE-04", name="Chembra Peak Gateway", node_type="REPEATER", 
                       latitude=11.5120, longitude=76.0880, location_name="Chembra Peak Summit Tower (2,100m)")
        ]
        db.add_all(default_nodes)
        db.commit()
    db.close()
