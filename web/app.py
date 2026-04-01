"""
Flask SSE dashboard for Busradar Münster.

Architecture:
  1. Background thread: single Kafka consumer polls from Confluent Cloud,
     writes to a shared dict keyed by fahrtbezeichner.
  2. /stream endpoint: SSE generator snapshots the dict every ~1s,
     sends JSON to all connected browser clients.
  3. / endpoint: serves the Leaflet map HTML.

Staleness: buses that haven't reported in >120 seconds are evicted from
the dict before each SSE tick, so the map only shows currently active buses.
"""

import json
import logging
import os
import threading
import time

from flask import Flask, Response, render_template
from confluent_kafka import Consumer, KafkaError
from dotenv import load_dotenv

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("busradar-web")

# ── Config ───────────────────────────────────────────────────────────────────
load_dotenv()

kafka_config = {
    "bootstrap.servers": os.getenv("CONFLUENT_BOOTSTRAP_SERVERS"),
    "security.protocol": os.getenv("CONFLUENT_SASL_SSL"),
    "sasl.mechanisms":   os.getenv("CONFLUENT_CONNECTION_METHOD"),
    "sasl.username":     os.getenv("CONFLUENT_USERNAME"),
    "sasl.password":     os.getenv("CONFLUENT_API_KEY"),
    "group.id":          "busradar-flask-sse",
    "auto.offset.reset": "latest",
    "enable.auto.commit": True,
}

TOPIC = "bus_locations_ms_raw"
STALE_THRESHOLD_SECONDS = 600   # remove buses not seen for 10 minutes

# ── Shared state ─────────────────────────────────────────────────────────────
bus_positions = {}          # fahrtbezeichner → latest position dict
bus_lock = threading.Lock()
consumer_stats = {"total_received": 0, "total_removals": 0}

# ── Background Kafka consumer ────────────────────────────────────────────────

def kafka_consumer_loop():
    """
    Runs in a daemon thread. Polls Kafka and maintains bus_positions dict.
    MODIFY → upsert (with timestamp), REMOVE → delete.
    """
    consumer = Consumer(kafka_config)
    consumer.subscribe([TOPIC])
    logger.info("Background Kafka consumer started on topic '%s'", TOPIC)

    try:
        while True:
            msg = consumer.poll(timeout=1.0)
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue
                logger.error("Kafka error: %s", msg.error())
                continue

            try:
                value = json.loads(msg.value().decode("utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError) as exc:
                logger.warning("Bad message skipped: %s", exc)
                continue

            key = value.get("fahrtbezeichner")
            if not key:
                key = msg.key().decode("utf-8") if msg.key() else None
            if not key:
                continue

            operation = value.get("operation", "MODIFY")

            with bus_lock:
                if operation == "REMOVE":
                    bus_positions.pop(key, None)
                    consumer_stats["total_removals"] += 1
                else:
                    value["_last_seen"] = time.time()
                    bus_positions[key] = value
                consumer_stats["total_received"] += 1

    except Exception as exc:
        logger.exception("Kafka consumer crashed: %s", exc)
    finally:
        consumer.close()
        logger.info("Kafka consumer closed.")


# ── Flask app ────────────────────────────────────────────────────────────────
app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/stream")
def stream():
    """
    SSE endpoint. Every ~1s, evicts stale buses and yields the remaining
    bus_positions snapshot as JSON.
    """
    def generate():
        while True:
            now = time.time()
            with bus_lock:
                # Evict buses that haven't reported in STALE_THRESHOLD_SECONDS
                stale_keys = [
                    k for k, v in bus_positions.items()
                    if now - v.get("_last_seen", 0) > STALE_THRESHOLD_SECONDS
                ]
                for k in stale_keys:
                    del bus_positions[k]

                snapshot = dict(bus_positions)

            if stale_keys:
                logger.info("Evicted %d stale buses", len(stale_keys))

            payload = json.dumps(snapshot)
            yield f"data: {payload}\n\n"
            time.sleep(1)

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── Entrypoint ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    consumer_thread = threading.Thread(target=kafka_consumer_loop, daemon=True)
    consumer_thread.start()
    logger.info("Background consumer thread started.")

    # threaded=True so multiple SSE clients can connect simultaneously
    app.run(host="0.0.0.0", port=8050, threaded=True)