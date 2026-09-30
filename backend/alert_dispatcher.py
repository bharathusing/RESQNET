"""
RESQNET Multi-Channel Disaster Alert Dispatcher & Zone Analytics
Handles alert deduplication, cooldown timers, zone-level escalation, and SMS/WhatsApp dispatching.
"""

import time
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AlertDispatcher")

class AlertDispatcher:
    def __init__(self, cooldown_seconds=600): # 10-minute alert cooldown per node/hazard
        self.cooldown_seconds = cooldown_seconds
        self._recent_dispatches = {} # Key: (node_id, hazard_type) -> last_dispatch_timestamp
        
        # Emergency Contact Registry (District Control Room, NDRF, Village Leaders)
        self.emergency_contacts = [
            {"name": "District Emergency Operations Center (DEOC)", "phone": "+919876543210", "role": "DISTRICT_AUTHORITY", "channels": ["SMS", "WHATSAPP"]},
            {"name": "NDRF 4th Battalion Quick Response Unit", "phone": "+919876543211", "role": "FIRST_RESPONDERS", "channels": ["SMS", "WHATSAPP"]},
            {"name": "Village Panchayat Council - Lowland Sector", "phone": "+919876543212", "role": "COMMUNITY_LEADER", "channels": ["SMS", "WHATSAPP"]}
        ]

    def _is_rate_limited(self, node_id: str, hazard_type: str) -> bool:
        """Deduplicates rapid alert triggers within cooldown window."""
        key = (node_id, hazard_type)
        now = time.time()
        last_sent = self._recent_dispatches.get(key, 0)
        if now - last_sent < self.cooldown_seconds:
            return True
        self._recent_dispatches[key] = now
        return False

    def format_alert_text(self, node_id: str, zone: str, hazard_type: str, severity: str, details: str, telemetry: dict) -> str:
        timestamp_str = datetime.now().strftime("%d-%b-%Y %H:%M:%S")
        msg = (
            f"🚨 [RESQNET CRITICAL DISASTER ALERT] 🚨\n"
            f"========================================\n"
            f"⚠️ Hazard: {hazard_type}\n"
            f"⚡ Severity: {severity}\n"
            f"📍 Location: {zone} (Sensor Node: {node_id})\n"
            f"🕒 Time: {timestamp_str}\n"
            f"📊 Diagnostics: Water={telemetry.get('water_level_cm', 0):.1f}cm | Rain={telemetry.get('rain_intensity_mm_hr', 0):.1f}mm/h | Tilt={telemetry.get('tilt_angle_deg', 0):.1f}°\n"
            f"📋 Situation: {details}\n"
            f"🚨 Action: IMMEDIATE EVACUATION OF LOWLANDS & UNSTABLE SLOPES ADVISED."
        )
        return msg

    def dispatch_sms(self, phone: str, text: str) -> bool:
        logger.info(f"📱 [SMS GATEWAY DISPATCH] -> To: {phone}\n{text}\n")
        return True

    def dispatch_whatsapp(self, phone: str, text: str) -> bool:
        logger.info(f"💬 [WHATSAPP BUSINESS API] -> To: {phone}\n{text}\n")
        return True

    def broadcast_emergency(self, node_id: str, zone: str, hazard_type: str, severity: str, details: str, telemetry: dict) -> dict:
        """Evaluates rate limits and broadcasts to all registered disaster response agencies."""
        if self._is_rate_limited(node_id, hazard_type):
            logger.info(f"[ALERT DEDUP] Alert for {node_id} ({hazard_type}) suppressed due to active cooldown.")
            return {"status": "suppressed_cooldown", "sms_sent": 0, "whatsapp_sent": 0}

        alert_text = self.format_alert_text(node_id, zone, hazard_type, severity, details, telemetry)
        sent_sms = 0
        sent_wa = 0

        for contact in self.emergency_contacts:
            if "SMS" in contact["channels"]:
                self.dispatch_sms(contact["phone"], alert_text)
                sent_sms += 1
            if "WHATSAPP" in contact["channels"]:
                self.dispatch_whatsapp(contact["phone"], alert_text)
                sent_wa += 1

        logger.info(f"✅ [ALERT BROADCAST COMPLETE] {sent_sms} SMS and {sent_wa} WhatsApp notices dispatched.")
        return {"status": "broadcast_dispatched", "sms_sent": sent_sms, "whatsapp_sent": sent_wa}

    def broadcast_zone_escalation(self, zone_name: str, active_warning_nodes: list) -> dict:
        """Triggered when multiple nearby nodes detect rising danger across the same river/slope corridor."""
        alert_text = (
            f"🚨 [RESQNET ZONE-WIDE DISASTER ESCALATION] 🚨\n"
            f"========================================\n"
            f"📍 Sector: {zone_name}\n"
            f"⚠️ Multiple nodes ({', '.join(active_warning_nodes)}) report simultaneous hazard escalation!\n"
            f"⚡ System Status: ZONE-WIDE PRE-EVACUATION ADVISORY ACTIVE.\n"
            f"Action: Emergency Response Teams mobilize to designated sector immediately."
        )
        for contact in self.emergency_contacts:
            self.dispatch_sms(contact["phone"], alert_text)
            self.dispatch_whatsapp(contact["phone"], alert_text)

        return {"status": "zone_escalated", "zone": zone_name}

alert_dispatcher = AlertDispatcher()
