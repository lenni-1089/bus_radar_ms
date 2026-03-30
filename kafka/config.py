import os
from dotenv import load_dotenv

load_dotenv()

config = {
     'bootstrap.servers': os.getenv('CONFLUENT_BOOTSRTRAP_SERVERS'),     
     'security.protocol': os.getenv('CONFLUENT_SASL_SSL'),
     'sasl.mechanisms': os.getenv('CONFLUENT_CONNECTION_METHOD'),
     'sasl.username': os.getenv('CONFLUENT_USERNAME'), 
     'sasl.password': os.getenv('CONFLUENT_API_KEY')}
