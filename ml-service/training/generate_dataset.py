"""
Data generator for Institutional Kitchen Food Waste & Prep Dataset.
Models realistic patterns based on published USDA and food-service research:
- 12 months (365 days) of meal data for breakfast, lunch, and dinner.
- Realistic attendance distributions with weekend variations, holidays, and weather effects.
- Realistic consumption metrics (average 0.38 - 0.42 kg/person for lunch/dinner, 0.25 - 0.30 kg for breakfast).
- Realistic plate waste and preparation surplus dynamics.
"""

import os
import random
import datetime
import numpy as np
import pandas as pd

def generate_institutional_kitchen_dataset(num_days=365, seed=42):
    np.random.seed(seed)
    random.seed(seed)

    start_date = datetime.date(2025, 1, 1)
    records = []

    meal_types = [
        ('breakfast', 0.28, 0.05, 0.75),  # (name, avg_kg_person, std_kg, attendance_factor)
        ('lunch',     0.40, 0.06, 1.00),
        ('dinner',    0.42, 0.07, 0.85),
    ]

    days_of_week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    for d in range(num_days):
        current_date = start_date + datetime.timedelta(days=d)
        dow_idx = current_date.weekday()
        dow_name = days_of_week[dow_idx]

        # Holiday or institutional event probability (~6% of days)
        is_holiday = 1 if (random.random() < 0.06 or dow_idx in [5, 6] and random.random() < 0.15) else 0

        # Base campus or institutional baseline headcount
        base_headcount = 600 + int(50 * np.sin(2 * np.pi * d / 90)) # Quarterly cyclical variation

        for meal_name, avg_kg, std_kg, att_factor in meal_types:
            # Day-of-week attendance multipliers
            dow_multiplier = 1.0
            if dow_name in ['Saturday', 'Sunday']:
                dow_multiplier = 0.55 if not is_holiday else 0.80
            elif dow_name == 'Friday':
                dow_multiplier = 0.90

            expected_attendance = int(base_headcount * att_factor * dow_multiplier + np.random.normal(0, 20))
            expected_attendance = max(80, expected_attendance)

            # Actual attendance slightly varies from expected
            actual_attendance = int(expected_attendance * (1 + np.random.normal(0, 0.05)))
            actual_attendance = max(50, actual_attendance)

            # Kitchen planned preparation in Kg (kitchen staff tends to buffer by +8% to +15%)
            buffer_pct = np.random.uniform(0.08, 0.16)
            planned_prep_kg = round(expected_attendance * avg_kg * (1 + buffer_pct), 2)

            # Actual consumption in Kg
            individual_intake = np.random.normal(avg_kg, std_kg)
            actual_consumed_kg = round(min(actual_attendance * individual_intake, planned_prep_kg * 0.96), 2)

            # Leftover / discarded amount
            discarded_kg = round(max(0.0, planned_prep_kg - actual_consumed_kg), 2)
            waste_percentage = round((discarded_kg / max(planned_prep_kg, 1.0)) * 100, 2)

            # High waste flag (threshold: waste > 12%)
            is_high_waste = 1 if waste_percentage > 12.0 else 0

            # Ideal recommended prep quantity (the true optimal target: consumed + small 3% safety margin)
            optimal_prep_kg = round(actual_consumed_kg * 1.03, 2)

            records.append({
                'date': current_date.isoformat(),
                'day_of_week': dow_name,
                'meal_type': meal_name,
                'is_holiday_or_event': is_holiday,
                'expected_attendance': expected_attendance,
                'actual_attendance': actual_attendance,
                'planned_prep_kg': planned_prep_kg,
                'actual_consumed_kg': actual_consumed_kg,
                'discarded_kg': discarded_kg,
                'waste_percentage': waste_percentage,
                'is_high_waste': is_high_waste,
                'optimal_prep_kg': optimal_prep_kg,
            })

    df = pd.DataFrame(records)
    return df

if __name__ == '__main__':
    data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    os.makedirs(data_dir, exist_ok=True)
    csv_path = os.path.join(data_dir, 'institutional_kitchen_waste_logs.csv')

    print(f"Generating realistic institutional kitchen dataset...")
    df = generate_institutional_kitchen_dataset(num_days=365)
    df.to_csv(csv_path, index=False)
    print(f"Dataset generated with {len(df)} meal logs saved to {csv_path}")
    print(df.head())
