"""
RESQNET MQTT Telemetry Receiver
Subscribes to cellular/gateway uplinks, decodes sensor payloads, and forwards to processing pipeline.
"""

import json
import logging
import paho.mqtt.client as mqtt
from datetime import datetime

logger = logging.getLogger("MQTTReceiver")

class MQTTTelemetryReceiver:
    def __init__(self, broker="broker.hivemq.com", port=1883, topic="resqnet/telemetry", on_telemetry_callback=None):
        self.broker = broker
        self.port = port
        self.topic = topic
        self.on_telemetry_callback = on_telemetry_callback
        try:
            # Paho MQTT 2.x
            self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1, client_id="resqnet_cloud_server")
        except AttributeError:
            # Paho MQTT 1.x
            self.client = mqtt.Client(client_id="resqnet_cloud_server")

    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logger.info(f"[MQTT] Connected successfully to {self.broker}:{self.port}")
            self.client.subscribe(self.topic)
            logger.info(f"[MQTT] Subscribed to topic '{self.topic}'")
        else:
            logger.error(f"[MQTT] Connection failed with error code {rc}")

    def on_message(self, client, userdata, msg):
        try:
            payload_str = msg.payload.decode("utf-8")
            logger.info(f"[MQTT RECEIVE] {msg.topic}: {payload_str}")
            data = json.loads(payload_str)
            
            if self.on_telemetry_callback:
                self.on_telemetry_callback(data)
        except Exception as e:
            logger.error(f"[MQTT] Failed to process payload: {e}")

    def start(self):
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        try:
            self.client.connect_async(self.broker, self.port, 60)
            self.client.loop_start()
            logger.info("[MQTT] Background loop started.")
        except Exception as e:
            logger.warning(f"[MQTT] Could not connect to remote MQTT broker: {e}. Running in local HTTP mode.")

    def stop(self):
        self.client.loop_stop()
        self.client.disconnect()
