"""
RESQNET Cloud Server & Control Room API
FastAPI Backend with Real-Time WebSockets, SQLite Persistence, and Emergency Dispatching.
"""

import os
import asyncio
import json
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import init_db, SessionLocal, SensorNode, TelemetryRecord, AlertIncident
from alert_dispatcher import alert_dispatcher
from mqtt_receiver import MQTTTelemetryReceiver

app = FastAPI(title="RESQNET Disaster Management Server", version="1.0.0")

# Enable CORS for dashboard access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency for DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)

manager = ConnectionManager()

# Pydantic Ingestion Schema
class TelemetryInput(BaseModel):
    node_id: str
    water_level_cm: float = 0.0
    rain_intensity_mm_hr: float = 0.0
    soil_moisture_pct: float = 0.0
    tilt_angle_deg: float = 0.0
    vibration_rms_g: float = 0.0
    risk: int = 0
    risk_name: str = "NORMAL"
    msg: Optional[str] = "Normal monitoring"
    lat: Optional[float] = None
    lon: Optional[float] = None

class EmergencyBroadcastInput(BaseModel):
    hazard_type: str
    message: str
    node_id: Optional[str] = "SYSTEM"

def process_telemetry_payload(data: dict):
    """Processes incoming telemetry from HTTP, MQTT, or Simulator and stores it."""
    db = SessionLocal()
    try:
        node_id = data.get("node_id", "RESQ-NODE-01")
        node = db.query(SensorNode).filter(SensorNode.id == node_id).first()
        
        if not node:
            node = SensorNode(
                id=node_id,
                name=f"Field Node {node_id}",
                latitude=data.get("lat", 13.0827),
                longitude=data.get("lon", 80.2707),
                location_name="Remote Monitoring Sector"
            )
            db.add(node)
            db.commit()
            db.refresh(node)

        # Update node live status
        node.is_online = True
        node.last_seen = datetime.utcnow()
        node.current_risk = data.get("risk", 0)
        if data.get("lat"): node.latitude = data.get("lat")
        if data.get("lon"): node.longitude = data.get("lon")

        # Create telemetry record
        record = TelemetryRecord(
            node_id=node.id,
            water_level_cm=data.get("water_level_cm", 0.0),
            rain_intensity_mm_hr=data.get("rain_intensity_mm_hr", 0.0),
            soil_moisture_pct=data.get("soil_moisture_pct", 0.0),
            tilt_angle_deg=data.get("tilt_angle_deg", 0.0),
            vibration_rms_g=data.get("vibration_rms_g", 0.0),
            risk_level=data.get("risk", 0),
            risk_name=data.get("risk_name", "NORMAL"),
            explanation=data.get("msg", "")
        )
        db.add(record)

        # Check for Critical Incident creation
        if data.get("risk", 0) >= 2: # Critical Flood or Landslide
            hazard = "FLASH_FLOOD" if data.get("risk") == 2 else "SLOPE_FAILURE"
            incident = AlertIncident(
                node_id=node.id,
                hazard_type=hazard,
                severity="CRITICAL",
                status="ACTIVE",
                details=data.get("msg", "Critical risk detected by on-device Edge AI."),
                sms_dispatched=True,
                whatsapp_dispatched=True
            )
            db.add(incident)
            
            # Trigger external alerts
            alert_dispatcher.broadcast_emergency(
                node_id=node.id,
                location=node.location_name,
                hazard_type=hazard,
                risk_level_name=data.get("risk_name", "CRITICAL"),
                telemetry=data
            )

        db.commit()

        # Broadcast via WebSockets to connected Control Room screens
        asyncio.create_task(manager.broadcast({
            "type": "TELEMETRY_UPDATE",
            "node_id": node.id,
            "node_name": node.name,
            "lat": node.latitude,
            "lon": node.longitude,
            "location": node.location_name,
            "data": {
                "water_level_cm": record.water_level_cm,
                "rain_intensity_mm_hr": record.rain_intensity_mm_hr,
                "soil_moisture_pct": record.soil_moisture_pct,
                "tilt_angle_deg": record.tilt_angle_deg,
                "vibration_rms_g": record.vibration_rms_g,
                "risk_level": record.risk_level,
                "risk_name": record.risk_name,
                "explanation": record.explanation,
                "timestamp": record.timestamp.isoformat()
            }
        }))
    finally:
        db.close()

async def autonomous_telemetry_generator():
    """Background continuous telemetry generator to ensure live streaming on Cloud & Render."""
    import random
    base_state = {
        "RESQ-NODE-01": {"water": 45.0, "rain": 2.0, "soil": 35.0, "tilt": 0.5, "vib": 0.05, "risk": 0},
        "RESQ-NODE-02": {"water": 0.0, "rain": 1.5, "soil": 40.0, "tilt": 1.2, "vib": 0.08, "risk": 0},
        "RESQ-NODE-03": {"water": 62.0, "rain": 2.5, "soil": 48.0, "tilt": 0.4, "vib": 0.04, "risk": 0},
        "RESQ-NODE-04": {"water": 0.0, "rain": 0.5, "soil": 22.0, "tilt": 0.2, "vib": 0.02, "risk": 0},
    }
    
    while True:
        await asyncio.sleep(2.5)
        for node_id, state in base_state.items():
            # Apply subtle real-time natural drifting if not in critical state
            if state["risk"] == 0:
                state["water"] = max(10.0, min(90.0, state["water"] + random.uniform(-0.8, 0.9)))
                state["rain"] = max(0.0, min(15.0, state["rain"] + random.uniform(-0.3, 0.4)))
                state["soil"] = max(20.0, min(55.0, state["soil"] + random.uniform(-0.4, 0.5)))
                state["tilt"] = max(0.1, min(2.0, state["tilt"] + random.uniform(-0.05, 0.05)))
                state["vib"] = max(0.01, min(0.12, state["vib"] + random.uniform(-0.01, 0.01)))

            payload = {
                "node_id": node_id,
                "water_level_cm": round(state["water"], 1),
                "rain_intensity_mm_hr": round(state["rain"], 1),
                "soil_moisture_pct": round(state["soil"], 1),
                "tilt_angle_deg": round(state["tilt"], 1),
                "vibration_rms_g": round(state["vib"], 2),
                "risk": state["risk"],
                "risk_name": "NORMAL" if state["risk"] == 0 else ("WARNING" if state["risk"] == 1 else "CRITICAL"),
                "msg": "Autonomous live mesh telemetry sync"
            }
            process_telemetry_payload(payload)

# Startup Event
@app.on_event("startup")
def on_startup():
    init_db()
    mqtt_client = MQTTTelemetryReceiver(on_telemetry_callback=process_telemetry_payload)
    mqtt_client.start()
    # Launch continuous telemetry loop
    asyncio.create_task(autonomous_telemetry_generator())

# REST Endpoints
@app.get("/api/nodes")
def get_all_nodes(db: Session = Depends(get_db)):
    nodes = db.query(SensorNode).all()
    return nodes

@app.get("/api/telemetry/latest")
def get_latest_telemetry(db: Session = Depends(get_db)):
    nodes = db.query(SensorNode).all()
    results = []
    for node in nodes:
        latest = db.query(TelemetryRecord).filter(TelemetryRecord.node_id == node.id).order_by(TelemetryRecord.timestamp.desc()).first()
        results.append({
            "node": node,
            "latest_reading": latest
        })
    return results

@app.get("/api/telemetry/history/{node_id}")
def get_telemetry_history(node_id: str, limit: int = 50, db: Session = Depends(get_db)):
    records = db.query(TelemetryRecord).filter(TelemetryRecord.node_id == node_id).order_by(TelemetryRecord.timestamp.desc()).limit(limit).all()
    return records[::-1] # Return chronological

@app.get("/api/alerts")
def get_active_alerts(db: Session = Depends(get_db)):
    alerts = db.query(AlertIncident).order_by(AlertIncident.timestamp.desc()).limit(20).all()
    return alerts

@app.post("/api/telemetry")
async def ingest_telemetry(telemetry: TelemetryInput):
    process_telemetry_payload(telemetry.dict())
    return {"status": "success", "message": "Telemetry processed & broadcast"}

@app.post("/api/broadcast-alert")
async def broadcast_manual_emergency(alert_in: EmergencyBroadcastInput, db: Session = Depends(get_db)):
    incident = AlertIncident(
        node_id=alert_in.node_id,
        hazard_type=alert_in.hazard_type,
        severity="CRITICAL",
        status="ACTIVE",
        details=alert_in.message,
        sms_dispatched=True,
        whatsapp_dispatched=True
    )
    db.add(incident)
    db.commit()

    alert_dispatcher.broadcast_emergency(
        node_id=alert_in.node_id,
        location="District-wide Command",
        hazard_type=alert_in.hazard_type,
        risk_level_name="MANUAL_COMMAND_ALERT",
        telemetry={"details": alert_in.message}
    )

    await manager.broadcast({
        "type": "EMERGENCY_BROADCAST",
        "hazard_type": alert_in.hazard_type,
        "message": alert_in.message,
        "timestamp": datetime.utcnow().isoformat()
    })

    return {"status": "broadcast_sent"}

@app.post("/api/acknowledge-alert/{alert_id}")
def acknowledge_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(AlertIncident).filter(AlertIncident.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = "ACKNOWLEDGED"
    db.commit()
    return {"status": "acknowledged"}

# WebSocket Endpoint with Robust Cloud Keep-Alive
@app.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            try:
                # Wait for client message with 20s timeout
                data = await asyncio.wait_for(websocket.receive_text(), timeout=20.0)
                if data == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                # Send server heartbeat to prevent Render reverse-proxy timeouts
                await websocket.send_json({"type": "HEARTBEAT", "status": "ALIVE"})
    except (WebSocketDisconnect, Exception):
        manager.disconnect(websocket)

# Mount Dashboard Static Files
dashboard_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dashboard"))
if os.path.exists(dashboard_path):
    app.mount("/dashboard", StaticFiles(directory=dashboard_path, html=True), name="dashboard")

@app.get("/")
def root():
    return RedirectResponse(url="/dashboard")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
