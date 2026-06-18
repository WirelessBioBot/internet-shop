"""Leave-one-out evaluation for the recommendation engine."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

import pandas as pd

from app.recommender import RecommendationEngine


@dataclass
class EvaluationCase:
    user_id: int
    held_out_product_id: int
    relevant_product_ids: set[int]
    train_actions_df: pd.DataFrame
    train_orders_df: pd.DataFrame


@dataclass
class MetricResult:
    k: int
    hit_rate: float
    precision: float
    recall: float
    mrr: float
    coverage: float
    num_cases: int
    hits: int


@dataclass
class EvaluationReport:
    k_values: list[int]
    metrics: list[MetricResult] = field(default_factory=list)
    cases: list[EvaluationCase] = field(default_factory=list)
    skipped_cases: int = 0


def _empty_actions_df() -> pd.DataFrame:
    return pd.DataFrame(columns=['user_id', 'product_id', 'action_type'])


def _empty_orders_df() -> pd.DataFrame:
    return pd.DataFrame(columns=['user_id', 'product_id', 'quantity'])


def load_dataset(path: str | Path) -> tuple[pd.DataFrame, pd.DataFrame, list[int]]:
    """Load interactions and orders from JSON; resolve product names to IDs."""
    with open(path, encoding='utf-8') as f:
        data = json.load(f)

    k_values = data.get('k_values', [4, 8])
    product_map = {p['name']: int(p['id']) for p in data.get('products', [])}

    actions_rows = []
    for row in data.get('interactions', []):
        product_id = row.get('product_id')
        if product_id is None:
            product_name = row.get('product_name')
            if product_name not in product_map:
                raise ValueError(f'Unknown product_name in dataset: {product_name}')
            product_id = product_map[product_name]
        actions_rows.append({
            'user_id': int(row['user_id']),
            'product_id': int(product_id),
            'action_type': row['action_type']
        })

    orders_rows = []
    for row in data.get('orders', []):
        product_id = row.get('product_id')
        if product_id is None:
            product_name = row.get('product_name')
            if product_name not in product_map:
                raise ValueError(f'Unknown product_name in orders: {product_name}')
            product_id = product_map[product_name]
        orders_rows.append({
            'user_id': int(row['user_id']),
            'product_id': int(product_id),
            'quantity': int(row.get('quantity', 1))
        })

    actions_df = pd.DataFrame(actions_rows) if actions_rows else _empty_actions_df()
    orders_df = pd.DataFrame(orders_rows) if orders_rows else _empty_orders_df()
    return actions_df, orders_df, k_values


def build_product_name_map(products_df: pd.DataFrame) -> dict[str, int]:
    return {
        str(row['name']): int(row['id'])
        for _, row in products_df.iterrows()
    }


def sync_dataset_product_ids(
    dataset_path: str | Path,
    products_df: pd.DataFrame
) -> tuple[pd.DataFrame, pd.DataFrame, list[int]]:
    """Load JSON dataset and resolve product_name via live catalog from DB."""
    with open(dataset_path, encoding='utf-8') as f:
        data = json.load(f)

    k_values = data.get('k_values', [4, 8])
    name_to_id = build_product_name_map(products_df)

    actions_rows = []
    for row in data.get('interactions', []):
        if 'product_id' in row:
            product_id = int(row['product_id'])
        else:
            product_id = name_to_id[row['product_name']]
        actions_rows.append({
            'user_id': int(row['user_id']),
            'product_id': product_id,
            'action_type': row['action_type']
        })

    orders_rows = []
    for row in data.get('orders', []):
        if 'product_id' in row:
            product_id = int(row['product_id'])
        else:
            product_id = name_to_id[row['product_name']]
        orders_rows.append({
            'user_id': int(row['user_id']),
            'product_id': product_id,
            'quantity': int(row.get('quantity', 1))
        })

    actions_df = pd.DataFrame(actions_rows) if actions_rows else _empty_actions_df()
    orders_df = pd.DataFrame(orders_rows) if orders_rows else _empty_orders_df()
    return actions_df, orders_df, k_values


def _category_neighbors(
    products_df: pd.DataFrame,
    product_id: int,
    exclude_ids: set[int]
) -> set[int]:
    row = products_df.loc[products_df['id'] == product_id]
    if row.empty:
        return {product_id}
    category_id = int(row.iloc[0]['category_id'])
    same_category = products_df.loc[
        products_df['category_id'] == category_id, 'id'
    ].astype(int).tolist()
    return {pid for pid in same_category if pid not in exclude_ids} or {product_id}


def build_leave_one_out_cases(
    actions_df: pd.DataFrame,
    orders_df: pd.DataFrame,
    products_df: pd.DataFrame,
    *,
    include_category_neighbors: bool = True
) -> tuple[list[EvaluationCase], int]:
    """Build test cases: hold out one (user, product) pair at a time."""
    if actions_df.empty and orders_df.empty:
        return [], 0

    pairs: set[tuple[int, int]] = set()
    if not actions_df.empty:
        for _, row in actions_df.iterrows():
            pairs.add((int(row['user_id']), int(row['product_id'])))
    if not orders_df.empty:
        for _, row in orders_df.iterrows():
            pairs.add((int(row['user_id']), int(row['product_id'])))

    cases: list[EvaluationCase] = []
    skipped = 0

    for user_id, product_id in sorted(pairs):
        train_actions = actions_df.copy()
        if not train_actions.empty:
            mask = ~(
                (train_actions['user_id'] == user_id) &
                (train_actions['product_id'] == product_id)
            )
            train_actions = train_actions.loc[mask]

        train_orders = orders_df.copy()
        if not train_orders.empty:
            mask = ~(
                (train_orders['user_id'] == user_id) &
                (train_orders['product_id'] == product_id)
            )
            train_orders = train_orders.loc[mask]

        interacted_in_train: set[int] = set()
        if not train_actions.empty:
            user_actions = train_actions[train_actions['user_id'] == user_id]
            interacted_in_train.update(user_actions['product_id'].astype(int).tolist())
        if not train_orders.empty:
            user_orders = train_orders[train_orders['user_id'] == user_id]
            interacted_in_train.update(user_orders['product_id'].astype(int).tolist())

        if product_id in interacted_in_train:
            skipped += 1
            continue

        if include_category_neighbors:
            relevant = _category_neighbors(products_df, product_id, interacted_in_train)
        else:
            relevant = {product_id}

        cases.append(EvaluationCase(
            user_id=user_id,
            held_out_product_id=product_id,
            relevant_product_ids=relevant,
            train_actions_df=train_actions.reset_index(drop=True),
            train_orders_df=train_orders.reset_index(drop=True)
        ))

    return cases, skipped


def _ranked_product_ids(recommendations: list[dict], k: int) -> list[int]:
    return [int(item['product_id']) for item in recommendations[:k]]


def _case_metrics(recommended_ids: list[int], relevant_ids: set[int], k: int) -> tuple[bool, float, float, float]:
    top_k = recommended_ids[:k]
    hits_in_top = [pid for pid in top_k if pid in relevant_ids]
    hit = len(hits_in_top) > 0
    precision = len(hits_in_top) / k if k > 0 else 0.0
    recall = len(hits_in_top) / len(relevant_ids) if relevant_ids else 0.0

    mrr = 0.0
    for rank, pid in enumerate(top_k, start=1):
        if pid in relevant_ids:
            mrr = 1.0 / rank
            break

    return hit, precision, recall, mrr


def compute_metrics(
    engine: RecommendationEngine,
    cases: Iterable[EvaluationCase],
    k_values: list[int],
    recommend_limit: int | None = None
) -> EvaluationReport:
    cases = list(cases)
    max_k = max(k_values) if k_values else 8
    limit = recommend_limit or max_k

    all_recommended: set[int] = set()
    per_k: dict[int, dict[str, list[float]]] = {
        k: {'hit': [], 'precision': [], 'recall': [], 'mrr': []}
        for k in k_values
    }

    for case in cases:
        recs = engine.get_recommendations(
            case.user_id,
            limit=limit,
            actions_df=case.train_actions_df,
            orders_df=case.train_orders_df
        )
        ranked_ids = _ranked_product_ids(recs, limit)
        all_recommended.update(ranked_ids)

        for k in k_values:
            hit, precision, recall, mrr = _case_metrics(ranked_ids, case.relevant_product_ids, k)
            per_k[k]['hit'].append(1.0 if hit else 0.0)
            per_k[k]['precision'].append(precision)
            per_k[k]['recall'].append(recall)
            per_k[k]['mrr'].append(mrr)

    catalog_size = len(engine.product_ids or [])
    metrics: list[MetricResult] = []
    for k in k_values:
        bucket = per_k[k]
        n = len(bucket['hit'])
        metrics.append(MetricResult(
            k=k,
            hit_rate=sum(bucket['hit']) / n if n else 0.0,
            precision=sum(bucket['precision']) / n if n else 0.0,
            recall=sum(bucket['recall']) / n if n else 0.0,
            mrr=sum(bucket['mrr']) / n if n else 0.0,
            coverage=len(all_recommended) / catalog_size if catalog_size else 0.0,
            num_cases=n,
            hits=int(sum(bucket['hit']))
        ))

    return EvaluationReport(k_values=k_values, metrics=metrics, cases=cases)


def run_leave_one_out_evaluation(
    engine: RecommendationEngine,
    actions_df: pd.DataFrame,
    orders_df: pd.DataFrame,
    k_values: list[int] | None = None
) -> EvaluationReport:
    if not engine._loaded:
        engine.load_data()

    if engine.products_df is None or engine.products_df.empty:
        return EvaluationReport(k_values=k_values or [4, 8])

    k_values = k_values or [4, 8]
    cases, skipped = build_leave_one_out_cases(actions_df, orders_df, engine.products_df)
    report = compute_metrics(engine, cases, k_values)
    report.skipped_cases = skipped
    return report
