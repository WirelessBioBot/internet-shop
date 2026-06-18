#!/usr/bin/env python3
"""CLI: leave-one-out evaluation of the recommendation engine."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.evaluation import (  # noqa: E402
    build_leave_one_out_cases,
    compute_metrics,
    run_leave_one_out_evaluation,
    sync_dataset_product_ids,
)
from app.recommender import RecommendationEngine  # noqa: E402


def _default_dataset_path() -> Path:
    return ROOT / 'data' / 'eval_seed.json'


def _format_pct(value: float) -> str:
    return f'{value * 100:.2f}%'


def print_report(report, products_df, verbose: bool = False) -> None:
    print('\n' + '=' * 60)
    print('ОТЧЁТ: Leave-One-Out оценка рекомендательной системы')
    print('=' * 60)

    if report.skipped_cases:
        print(f'\nПропущено кейсов (товар остаётся в train): {report.skipped_cases}')

    print(f'\nТестовых кейсов (user x product): {len(report.cases)}')

    if verbose and report.cases:
        name_map = {int(row['id']): row['name'] for _, row in products_df.iterrows()}
        print('\n--- Детализация кейсов ---')
        engine = RecommendationEngine()
        engine.load_data()
        for i, case in enumerate(report.cases, 1):
            recs = engine.get_recommendations(
                case.user_id,
                limit=max(report.k_values),
                actions_df=case.train_actions_df,
                orders_df=case.train_orders_df
            )
            rec_names = [
                name_map.get(int(r['product_id']), f'#{r["product_id"]}')
                for r in recs[:max(report.k_values)]
            ]
            held_name = name_map.get(case.held_out_product_id, f'#{case.held_out_product_id}')
            rel_names = [name_map.get(pid, f'#{pid}') for pid in sorted(case.relevant_product_ids)]
            print(f'\n  [{i}] user={case.user_id}, скрыт: {held_name}')
            print(f'      релевантные: {", ".join(rel_names)}')
            print(f'      топ-{max(report.k_values)}: {", ".join(rec_names) or "—"}')

    print('\n--- Метрики ---')
    print(f'{"K":>4}  {"Hit Rate":>10}  {"Precision":>10}  {"Recall":>10}  {"MRR":>10}  {"Coverage":>10}')
    print('-' * 60)
    for m in report.metrics:
        print(
            f'{m.k:>4}  '
            f'{_format_pct(m.hit_rate):>10}  '
            f'{_format_pct(m.precision):>10}  '
            f'{_format_pct(m.recall):>10}  '
            f'{_format_pct(m.mrr):>10}  '
            f'{_format_pct(m.coverage):>10}  '
            f'({m.hits}/{m.num_cases})'
        )

    print('\n--- Пояснение метрик ---')
    print('Hit Rate@K  — доля кейсов, где хотя бы один релевантный товар в топ-K.')
    print('Precision@K — средняя доля релевантных среди K рекомендаций.')
    print('Recall@K    — средняя доля найденных релевантных от всех релевантных.')
    print('MRR@K       — средний обратный ранг первого релевантного (1/rank).')
    print('Coverage    — доля каталога, попавшая в рекомендации за все кейсы.')
    print('\nРелевантность: товары той же категории, что и скрытый (исключая train).')
    print('=' * 60 + '\n')


def main() -> int:
    parser = argparse.ArgumentParser(
        description='Leave-one-out evaluation for recommendation engine'
    )
    parser.add_argument(
        '--dataset',
        type=Path,
        default=_default_dataset_path(),
        help='Path to JSON dataset (default: data/eval_seed.json)'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Print per-case recommendations'
    )
    args = parser.parse_args()

    if not args.dataset.exists():
        print(f'Dataset not found: {args.dataset}', file=sys.stderr)
        return 1

    engine = RecommendationEngine()
    engine.load_data()

    if engine.products_df is None or engine.products_df.empty:
        print(
            'Каталог товаров пуст. Запустите seed БД: npm run db:seed',
            file=sys.stderr
        )
        return 1

    actions_df, orders_df, k_values = sync_dataset_product_ids(
        args.dataset, engine.products_df
    )
    report = run_leave_one_out_evaluation(engine, actions_df, orders_df, k_values)
    print_report(report, engine.products_df, verbose=args.verbose)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
