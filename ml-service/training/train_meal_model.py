"""
Training pipeline for Institutional Kitchen Demand & Waste Forecasting.
Trains:
1. Scikit-learn HistGradientBoostingRegressor for optimal recommended prep quantity (kg).
2. GradientBoostingClassifier for plate waste risk probability (%).
3. Computes residual distribution for 90% confidence interval.
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.ensemble import HistGradientBoostingRegressor, GradientBoostingClassifier

from generate_dataset import generate_institutional_kitchen_dataset

def train_and_save_meal_models():
    base_dir = os.path.join(os.path.dirname(__file__), '..')
    data_dir = os.path.join(base_dir, 'data')
    model_dir = os.path.join(base_dir, 'models')
    os.makedirs(data_dir, exist_ok=True)
    os.makedirs(model_dir, exist_ok=True)

    csv_path = os.path.join(data_dir, 'institutional_kitchen_waste_logs.csv')
    if not os.path.exists(csv_path):
        print("Data file not found, generating dataset first...")
        df = generate_institutional_kitchen_dataset(365)
        df.to_csv(csv_path, index=False)
    else:
        df = pd.read_csv(csv_path)

    print(f"Loaded training data: {len(df)} records")

    # Features
    feature_cols = ['expected_attendance', 'day_of_week', 'meal_type', 'is_holiday_or_event']
    categorical_features = ['day_of_week', 'meal_type']
    numerical_features = ['expected_attendance', 'is_holiday_or_event']

    X = df[feature_cols]
    y_prep = df['optimal_prep_kg']
    y_waste_prob = df['is_high_waste']

    X_train, X_test, y_prep_train, y_prep_test, y_waste_train, y_waste_test = train_test_split(
        X, y_prep, y_waste_prob, test_size=0.2, random_state=42
    )

    # Preprocessing
    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_features),
            ('num', StandardScaler(), numerical_features),
        ]
    )

    # 1. Regressor Pipeline for Prep Quantity
    reg_pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('regressor', HistGradientBoostingRegressor(max_iter=150, max_depth=5, learning_rate=0.08, random_state=42))
    ])

    print("Training HistGradientBoosting meal prep forecasting model...")
    reg_pipeline.fit(X_train, y_prep_train)

    y_prep_pred = reg_pipeline.predict(X_test)
    mae = mean_absolute_error(y_prep_test, y_prep_pred)
    r2 = r2_score(y_prep_test, y_prep_pred)
    print(f"Prep Regressor Performance -> MAE: {mae:.2f} kg, R2: {r2:.4f}")

    # Calculate 90% confidence residual margin (~1.645 * std of residuals)
    residuals = y_prep_test - y_prep_pred
    residual_margin = float(np.percentile(np.abs(residuals), 90))

    # 2. Classifier Pipeline for Plate Waste Risk Probability
    clf_pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', GradientBoostingClassifier(n_estimators=100, max_depth=3, random_state=42))
    ])

    print("Training waste probability classifier...")
    clf_pipeline.fit(X_train, y_waste_train)

    # Save artifacts together
    artifact = {
        'prep_regressor': reg_pipeline,
        'waste_classifier': clf_pipeline,
        'residual_margin_90': residual_margin,
        'feature_cols': feature_cols,
        'metrics': {
            'mae': round(float(mae), 2),
            'r2': round(float(r2), 4),
        }
    }

    model_path = os.path.join(model_dir, 'meal_prep_pipeline.joblib')
    joblib.dump(artifact, model_path)
    print(f"Successfully serialized meal prep ML artifact to: {model_path}")

if __name__ == '__main__':
    train_and_save_meal_models()
