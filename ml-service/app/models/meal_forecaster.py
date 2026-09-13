import os
import joblib
import pandas as pd
import numpy as np
from ..schemas import MealPrepRequest, MealPrepResponse, ConfidenceInterval

class MealForecaster:
    def __init__(self, model_path: str = None):
        if model_path is None:
            base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            model_path = os.path.join(base, '..', 'models', 'meal_prep_pipeline.joblib')

        self.model_path = model_path
        self.artifact = None
        self.load_model()

    def load_model(self):
        if os.path.exists(self.model_path):
            try:
                self.artifact = joblib.load(self.model_path)
                print(f"[MealForecaster] Successfully loaded model from {self.model_path}")
            except Exception as e:
                print(f"[MealForecaster] Failed to load model: {e}")
                self.artifact = None
        else:
            print(f"[MealForecaster] Warning: Model file not found at {self.model_path}. Will use heuristic fallback.")
            self.artifact = None

    def is_loaded(self) -> bool:
        return self.artifact is not None

    def predict(self, req: MealPrepRequest) -> MealPrepResponse:
        # If model is loaded, run trained XGBoost inference
        if self.artifact is not None:
            reg_pipeline = self.artifact['prep_regressor']
            clf_pipeline = self.artifact['waste_classifier']
            residual_margin = self.artifact.get('residual_margin_90', 6.5)
            metrics = self.artifact.get('metrics', {})

            input_df = pd.DataFrame([{
                'expected_attendance': req.expectedAttendanceCount,
                'day_of_week': req.dayOfWeek,
                'meal_type': req.mealType,
                'is_holiday_or_event': 1 if req.isHolidayOrEvent else 0,
            }])

            # Regression for optimal prep quantity
            pred_kg = float(reg_pipeline.predict(input_df)[0])
            pred_kg = max(5.0, round(pred_kg, 1))

            # Classification for plate waste risk probability
            waste_prob = float(clf_pipeline.predict_proba(input_df)[0][1])
            waste_prob = round(waste_prob, 3)

            lower_bound = max(1.0, round(pred_kg - residual_margin, 1))
            upper_bound = round(pred_kg + residual_margin, 1)

            return MealPrepResponse(
                recommendedPrepKg=pred_kg,
                expectedPlateWasteProb=waste_prob,
                confidenceInterval=ConfidenceInterval(
                    lowerKg=lower_bound,
                    upperKg=upper_bound,
                ),
                modelNotes="Inference from trained XGBoost regressor with 90% empirical error bounds",
                modelMetrics=metrics,
            )

        # Fallback heuristic if models have not yet been trained
        base_per_person = 0.28 if req.mealType == 'breakfast' else 0.42 if req.mealType == 'dinner' else 0.38
        est = round(req.expectedAttendanceCount * base_per_person, 1)
        prob = 0.22 if req.isHolidayOrEvent else 0.08
        return MealPrepResponse(
            recommendedPrepKg=est,
            expectedPlateWasteProb=prob,
            confidenceInterval=ConfidenceInterval(
                lowerKg=round(est * 0.9, 1),
                upperKg=round(est * 1.1, 1),
            ),
            modelNotes="Empirical baseline calculation (model uninitialized)",
        )
