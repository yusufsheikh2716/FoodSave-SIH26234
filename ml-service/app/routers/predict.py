from fastapi import APIRouter, HTTPException
from ..schemas import (
    MealPrepRequest,
    MealPrepResponse,
    ShelfLifeRequest,
    ShelfLifeResponse,
)
from ..models.meal_forecaster import MealForecaster
from ..models.shelf_life_estimator import ShelfLifeEstimator

router = APIRouter(prefix="/predict", tags=["Predictions"])

# Singleton model handlers
meal_forecaster = MealForecaster()
shelf_life_estimator = ShelfLifeEstimator()

@router.post("/meal-prep", response_model=MealPrepResponse)
async def predict_meal_prep(request: MealPrepRequest):
    """
    Demand & Waste Forecasting Endpoint.
    Predicts optimal preparation quantity in kg, probability of plate waste,
    and 90% confidence bounds based on attendance and historical parameters.
    """
    try:
        return meal_forecaster.predict(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@router.post("/shelf-life", response_model=ShelfLifeResponse)
async def predict_shelf_life(request: ShelfLifeRequest):
    """
    Dynamic Shelf-Life Estimator Endpoint.
    Estimates safe consumption window (hours remaining) and urgency risk category
    (CRITICAL <2h, MODERATE 2-5h, STABLE >5h) cross-referenced with USDA FoodKeeper.
    """
    try:
        return shelf_life_estimator.predict(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Shelf life estimation error: {str(e)}")
