import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.engine import URL

from app.config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

_engine = None


def get_engine():
    global _engine
    if _engine is None:
        url = URL.create(
            drivername='postgresql+psycopg2',
            username=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=int(DB_PORT),
            database=DB_NAME
        )
        _engine = create_engine(url, pool_pre_ping=True)
    return _engine


def load_products() -> pd.DataFrame:
    query = """
        SELECT
            p.id,
            p.name,
            p.description,
            p.brand,
            p.category_id,
            p.rating,
            p.stock_quantity,
            c.name AS category_name,
            COALESCE(specs.specs_text, '') AS specs_text
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN (
            SELECT
                product_id,
                STRING_AGG(name || ' ' || value, ' ' ORDER BY sort_order, name) AS specs_text
            FROM product_specs
            GROUP BY product_id
        ) specs ON specs.product_id = p.id
        WHERE p.stock_quantity > 0
    """
    return pd.read_sql(query, get_engine())


def load_user_actions() -> pd.DataFrame:
    query = """
        SELECT user_id, product_id, action_type
        FROM user_actions
    """
    return pd.read_sql(query, get_engine())


def load_order_items() -> pd.DataFrame:
    query = """
        SELECT o.user_id, oi.product_id, oi.quantity
        FROM orders_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status != 'cancelled'
    """
    return pd.read_sql(query, get_engine())
