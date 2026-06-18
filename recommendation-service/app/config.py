import os
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'online_store_db')
DB_USER = os.getenv('DB_USER', 'admin')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'admin123')

DEFAULT_LIMIT = int(os.getenv('RECOMMENDATION_LIMIT', '8'))
CONTENT_WEIGHT = float(os.getenv('CONTENT_WEIGHT', '0.5'))
COLLAB_WEIGHT = float(os.getenv('COLLAB_WEIGHT', '0.5'))
