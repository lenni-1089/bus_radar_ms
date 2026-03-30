from confluent_kafka import Producer
from config import config
import websockets
from websockets.exceptions import ConnectionClosed
import asyncio
import json
import logging

# --- Logging setup ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# --- Kafka producer ---
producer = Producer(config)

total_produced = 0
total_removals = 0
total_delivery_errors = 0


def delivery_callback(err, msg):
    global total_delivery_errors 
    if err is not None:
        total_delivery_errors +=1
        logger.error(f"Message delivery failed: {err}")


def send_message(topic: str, key: str, value: dict):
    """Send a single event to Kafka"""
    try:
        value_bytes = json.dumps(value).encode("utf-8")
        key_bytes = key.encode("utf-8")

        producer.produce(
            topic=topic,
            key=key_bytes,
            value=value_bytes,
            callback=delivery_callback,
        )
        producer.poll(0)

    except BufferError:
        logger.warning("Local producer queue is full, waiting...")
        producer.poll(1)
        producer.produce(
            topic=topic, key=key_bytes, value=value_bytes, callback=delivery_callback
        )


def flatten_and_extract_individual_bus_positions(raw_message: dict) -> list[dict]:
    bus_positions = []

    for feature in raw_message["features"]:
        bus_position = {}
        all_properties = feature["properties"]

        if all_properties["operation"] == "MODIFY":
            coordinates = feature["geometry"]["coordinates"]
            longitude = coordinates[0]
            latitude = coordinates[1]

            bus_position["latitude"] = latitude
            bus_position["longitude"] = longitude
            bus_position.update(all_properties)
            bus_positions.append(bus_position)
        else:
            bus_position.update(all_properties)
            bus_positions.append(bus_position)

    return bus_positions


async def websocket_receive():
    global total_produced, total_removals

    uri = "wss://websocket.busradar.conterra.de"
    logger.info("Connecting to WebSocket...")
    async for websocket in websockets.connect(uri):
        try:
            logger.info("Connected to WebSocket. Waiting for messages...")
            async for message in websocket:
                try:
                    message_json = json.loads(message)
                except json.JSONDecodeError:
                    logger.error(f"Error converting message to json: {message}")
                    continue

                message_list = flatten_and_extract_individual_bus_positions(message_json)

                batch_positions = 0
                batch_removals = 0

                for msg in message_list:
                    send_message(
                        topic="bus_locations_ms_raw",
                        key=msg["fahrtbezeichner"],
                        value=msg,
                    )
                    if msg.get("operation") == "REMOVE":
                        batch_removals += 1
                    else:
                        batch_positions += 1

                total_produced += len(message_list)
                total_removals += batch_removals

                logger.info(
                    f"Batch: {batch_positions} positions, {batch_removals} removals | "
                    f"Total produced: {total_produced} | Total failed msgs {total_delivery_errors} | Total removals: {total_removals}"
                )

        except ConnectionClosed:
            logger.error("Websocket connection lost, retrying to connect.")
            continue
           


if __name__ == "__main__":
    try:
        asyncio.run(websocket_receive())
    except KeyboardInterrupt:
        logger.info("User initiated shutdown.")
    finally:
        logger.info("Flushing remaining messages...")
        producer.flush()
        logger.info(f"Done. Total messages produced: {total_produced} | Failed deliveries: {total_delivery_errors}")