import os
import joblib
import pandas as pd
import numpy as np
from ..schemas import ShelfLifeRequest, ShelfLifeResponse

class ShelfLifeEstimator:
    def __init__(self, model_path: str = None):
        if model_path is None:
            base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            model_path = os.path.join(base, '..', 'models', 'shelf_life_model.joblib')

        self.model_path = model_path
        self.artifact = None
        self.load_model()

    def load_model(self):
        if os.path.exists(self.model_path):
            try:
                self.artifact = joblib.load(self.model_path)
                print(f"[ShelfLifeEstimator] Successfully loaded model from {self.model_path}")
            except Exception as e:
                print(f"[ShelfLifeEstimator] Failed to load model: {e}")
                self.artifact = None
        else:
            print(f"[ShelfLifeEstimator] Warning: Model file not found at {self.model_path}. Using FoodKeeper formula.")
            self.artifact = None

    def is_loaded(self) -> bool:
        return self.artifact is not None

    def predict(self, req: ShelfLifeRequest) -> ShelfLifeResponse:
        cat_lower = req.foodCategory.lower()
        temp = req.ambientTempC

        # Map fuzzy category to standardized food category
        std_cat = 'cooked grains'
        if any(w in cat_lower for w in ['meat', 'gravy', 'chicken', 'fish', 'curry', 'egg']):
            std_cat = 'meat/gravy'
        elif any(w in cat_lower for w in ['dairy', 'milk', 'paneer', 'cheese', 'yogurt', 'curd']):
            std_cat = 'dairy'
        elif any(w in cat_lower for w in ['vegetable', 'fruit', 'salad', 'produce']):
            std_cat = 'raw produce'
        elif any(w in cat_lower for w in ['bread', 'bun', 'baked', 'roti', 'cake', 'cookie']):
            std_cat = 'baked'

        # USDA FoodKeeper base hours at reference 22°C ambient
        base_hours_map = {
            'meat/gravy': 3.5,
            'dairy': 3.0,
            'cooked grains': 5.0,
            'raw produce': 14.0,
            'baked': 24.0,
        }
        sens_map = {
            'meat/gravy': 0.12,
            'dairy': 0.14,
            'cooked grains': 0.10,
            'raw produce': 0.05,
            'baked': 0.03,
        }

        base_h = base_hours_map.get(std_cat, 4.0)
        sens = sens_map.get(std_cat, 0.10)

        # Arrhenius microbial decay: Safe hours shorten exponentially with temperature
        temp_delta = temp - 22.0
        decay = np.exp(-sens * temp_delta)
        safe_hours = max(0.5, round(float(base_h * decay), 1))

        # Check model classification if loaded, otherwise apply exact SIH risk thresholds
        if self.artifact is not None:
            try:
                clf = self.artifact['urgency_classifier']
                input_df = pd.DataFrame([{'food_category': std_cat, 'ambient_temp_c': temp}])
                urgency = clf.predict(input_df)[0]
            except Exception:
                urgency = 'CRITICAL' if safe_hours < 2.0 else 'MODERATE' if safe_hours <= 5.0 else 'STABLE'
        else:
            urgency = 'CRITICAL' if safe_hours < 2.0 else 'MODERATE' if safe_hours <= 5.0 else 'STABLE'

        advice = (
            "CRITICAL: Immediate redistribution or thermal chilling (<4°C) required to prevent pathogen bloom."
            if urgency == 'CRITICAL'
            else "MODERATE: Safe for transfer within next 2-4 hours; keep insulated and covered."
            if urgency == 'MODERATE'
            else "STABLE: Standard safe redistribution window. Maintain hygienic storage conditions."
        )

        return ShelfLifeResponse(
            estimatedSafeHours=safe_hours,
            urgencyCategory=urgency,
            storageAdvice=advice,
            sourceStandard="USDA FoodKeeper & FSIS Danger Zone Temperature Standards",
        )
