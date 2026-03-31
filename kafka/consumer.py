from confluent_kafka import Consumer, KafkaError, KafkaException
from config import config
import logging
import json

# --- Logging setup ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


total_received = 0
total_removals_received = 0

config["group.id"] = "test_consumer"
config['auto.offset.reset'] = 'latest'
config['enable.auto.commit'] = False

consumer = Consumer(config)

def process_message(msg):
    global total_received
    """Process single message"""
    # for now its just about demonstrating the receiving of the message
    key = msg.key().decode("utf8")
    bus_position = json.loads(msg.value().decode("utf8"))
    if bus_position["operation"] == "MODIFY":
        bus_id = bus_position["linienid"]
        lat = bus_position["latitude"]
        long = bus_position["longitude"]
        logger.info(f"Received message: Bus {bus_id} | Lat : {lat} | Long : {long} | Total messages received {total_received}")
    else:
        logger.info(f"Received message: Removed item {bus_position['fahrtbezeichner']}")


    total_received +=1

    

    return True

def consume_loop(topics:list):
    global total_received
    """Main consumer loop with proper shut down logic"""
    consumer.subscribe(topics)

    try: 
        while True:
            # poll blocks for up to 1 second wating for messages
            msg = consumer.poll(timeout= 5.0)

            if msg is None:
                # No message received within timeout
                logger.info("No messages received within last 5 seconds.")
                continue
            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    # End of partition - not an error, just no more messages
                    print(f'Reached end of {msg.topic()} [{msg.partition()}]')
                else:
                    raise KafkaException(msg.error())
            else:
                process_message(msg)
    except KeyboardInterrupt:
        logger.info("User initiated shutdown.")
    finally:
        logger.info("Closing Consumer..")
        consumer.close()
        logger.info(f"Done. Total nr. of messages received: {total_received}")


if __name__ == "__main__":
    consume_loop(["bus_locations_ms_raw"])
