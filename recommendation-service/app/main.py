from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.recommender import engine

app = FastAPI(
    title='Recommendation Service',
    description='Персонализированные рекомендации: Content-Based и Collaborative Filtering',
    version='1.0.0'
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


class RecommendationItem(BaseModel):
    product_id: int
    score: float
    method: str


class RecommendationResponse(BaseModel):
    user_id: int
    recommendations: list[RecommendationItem]
    count: int


@app.on_event('startup')
def startup():
    engine.load_data()


@app.get('/health')
def health():
    return {'status': 'ok', 'service': 'recommendation-service'}


@app.post('/api/v1/recommendations/reload')
def reload_data():
    engine.load_data()
    products_count = len(engine.products_df) if engine.products_df is not None else 0
    return {'status': 'reloaded', 'products_count': products_count}


@app.get('/api/v1/recommendations/{user_id}', response_model=RecommendationResponse)
def get_recommendations(
    user_id: int,
    limit: int = Query(default=8, ge=1, le=50)
):
    if user_id < 1:
        raise HTTPException(status_code=400, detail='Некорректный user_id')

    try:
        engine.load_data()
        items = engine.get_recommendations(user_id, limit)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return RecommendationResponse(
        user_id=user_id,
        recommendations=[RecommendationItem(**item) for item in items],
        count=len(items)
    )


@app.post('/api/v1/recommendations/{user_id}/generate', response_model=RecommendationResponse)
def generate_recommendations(
    user_id: int,
    limit: int = Query(default=8, ge=1, le=50)
):
    engine.load_data()
    return get_recommendations(user_id, limit)
