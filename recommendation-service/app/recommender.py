import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.config import CONTENT_WEIGHT, COLLAB_WEIGHT, DEFAULT_LIMIT
from app.db import load_products, load_user_actions, load_order_items

ACTION_WEIGHTS = {
    'view': 1.0,
    'click': 1.5,
    'add_to_cart': 2.5,
    'favorite': 2.0,
    'purchase': 4.0
}


class RecommendationEngine:
    def __init__(self):
        self.products_df = None
        self.product_ids = None
        self.tfidf_matrix = None
        self.product_similarity = None
        self.user_item_matrix = None
        self.user_ids = None
        self.product_id_to_idx = None
        self._loaded = False

    def load_data(self):
        self.products_df = load_products()
        if self.products_df.empty:
            self._loaded = True
            return

        self.product_ids = self.products_df['id'].astype(int).tolist()
        self.product_id_to_idx = {pid: idx for idx, pid in enumerate(self.product_ids)}

        self.products_df['text_features'] = (
            self.products_df['category_name'].fillna('') + ' ' +
            self.products_df['brand'].fillna('') + ' ' +
            self.products_df['name'].fillna('') + ' ' +
            self.products_df['description'].fillna('') + ' ' +
            self.products_df['specs_text'].fillna('')
        )

        vectorizer = TfidfVectorizer(stop_words='english', max_features=5000)
        self.tfidf_matrix = vectorizer.fit_transform(self.products_df['text_features'])
        self.product_similarity = cosine_similarity(self.tfidf_matrix)

        self._build_user_item_matrix()
        self._loaded = True

    def _build_user_item_matrix(self):
        actions_df = load_user_actions()
        orders_df = load_order_items()

        scores = {}

        if not actions_df.empty:
            for _, row in actions_df.iterrows():
                uid = int(row['user_id'])
                pid = int(row['product_id'])
                weight = ACTION_WEIGHTS.get(row['action_type'], 1.0)
                scores[(uid, pid)] = scores.get((uid, pid), 0) + weight

        if not orders_df.empty:
            for _, row in orders_df.iterrows():
                uid = int(row['user_id'])
                pid = int(row['product_id'])
                qty = int(row['quantity'])
                scores[(uid, pid)] = scores.get((uid, pid), 0) + ACTION_WEIGHTS['purchase'] * qty

        if not scores:
            self.user_item_matrix = None
            self.user_ids = []
            return

        users = sorted({uid for uid, _ in scores.keys()})
        self.user_ids = users
        user_index = {uid: i for i, uid in enumerate(users)}

        matrix = np.zeros((len(users), len(self.product_ids)))

        for (uid, pid), value in scores.items():
            if pid in self.product_id_to_idx:
                matrix[user_index[uid], self.product_id_to_idx[pid]] = value

        self.user_item_matrix = matrix

    def _content_based_scores(self, user_id: int, exclude_ids: set) -> dict:
        if self.tfidf_matrix is None or self.products_df is None or self.products_df.empty:
            return {}

        actions_df = load_user_actions()
        orders_df = load_order_items()

        interacted = set()
        if not actions_df.empty:
            user_actions = actions_df[actions_df['user_id'] == user_id]
            interacted.update(user_actions['product_id'].astype(int).tolist())
        if not orders_df.empty:
            user_orders = orders_df[orders_df['user_id'] == user_id]
            interacted.update(user_orders['product_id'].astype(int).tolist())

        if not interacted:
            popular_idx = self.products_df['rating'].astype(float).nlargest(DEFAULT_LIMIT).index
            return {
                int(self.products_df.loc[idx, 'id']): float(self.products_df.loc[idx, 'rating']) / 5.0
                for idx in popular_idx
                if int(self.products_df.loc[idx, 'id']) not in exclude_ids
            }

        profile = np.zeros(self.tfidf_matrix.shape[1])
        count = 0
        for pid in interacted:
            if pid in self.product_id_to_idx:
                profile += self.tfidf_matrix[self.product_id_to_idx[pid]].toarray().flatten()
                count += 1

        if count == 0:
            return {}

        profile /= count
        similarities = cosine_similarity(profile.reshape(1, -1), self.tfidf_matrix).flatten()

        scores = {}
        for idx, sim in enumerate(similarities):
            pid = int(self.product_ids[idx])
            if pid not in interacted and pid not in exclude_ids and sim > 0:
                scores[pid] = float(sim)

        return scores

    def _collaborative_scores(self, user_id: int, exclude_ids: set) -> dict:
        if self.user_item_matrix is None or user_id not in self.user_ids:
            return {}

        user_idx = self.user_ids.index(user_id)
        user_vector = self.user_item_matrix[user_idx]

        if user_vector.sum() == 0:
            return {}

        user_similarity = cosine_similarity(user_vector.reshape(1, -1), self.user_item_matrix).flatten()
        user_similarity[user_idx] = 0

        if user_similarity.max() <= 0:
            return {}

        weighted_scores = user_similarity @ self.user_item_matrix
        scores = {}

        for pid_idx, score in enumerate(weighted_scores):
            pid = int(self.product_ids[pid_idx])
            if score > 0 and pid not in exclude_ids and user_vector[pid_idx] == 0:
                scores[pid] = float(score)

        if scores:
            max_score = max(scores.values())
            scores = {pid: val / max_score for pid, val in scores.items()}

        return scores

    def get_recommendations(self, user_id: int, limit: int = DEFAULT_LIMIT) -> list:
        if not self._loaded:
            self.load_data()

        if self.products_df is None or self.products_df.empty:
            return []

        exclude_ids = set()
        content_scores = self._content_based_scores(user_id, exclude_ids)
        collab_scores = self._collaborative_scores(user_id, exclude_ids)

        all_product_ids = set(content_scores.keys()) | set(collab_scores.keys())

        if not all_product_ids:
            return self._fallback_popular(limit)

        combined = {}
        for pid in all_product_ids:
            c_score = content_scores.get(pid, 0)
            col_score = collab_scores.get(pid, 0)
            method = 'hybrid'
            if c_score > 0 and col_score == 0:
                method = 'content_based'
            elif col_score > 0 and c_score == 0:
                method = 'collaborative'
            combined[pid] = {
                'product_id': pid,
                'score': round(CONTENT_WEIGHT * c_score + COLLAB_WEIGHT * col_score, 4),
                'method': method
            }

        ranked = sorted(combined.values(), key=lambda x: x['score'], reverse=True)[:limit]

        max_score = ranked[0]['score'] if ranked else 1
        if max_score > 0:
            for item in ranked:
                item['score'] = round(min(item['score'] / max_score, 1.0), 4)

        return ranked

    def _fallback_popular(self, limit: int) -> list:
        top = self.products_df.nlargest(limit, 'rating')
        return [
            {
                'product_id': int(row['id']),
                'score': round(float(row['rating']) / 5.0, 4),
                'method': 'popular'
            }
            for _, row in top.iterrows()
        ]


engine = RecommendationEngine()
