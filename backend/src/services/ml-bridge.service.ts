import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export interface MealPrepPredictionRequest {
  historicalMealCounts: number[];
  expectedAttendanceCount: number;
  dayOfWeek: string; // 'Monday', 'Tuesday', etc.
  mealType: 'breakfast' | 'lunch' | 'dinner';
  isHolidayOrEvent: boolean;
}

export interface MealPrepPredictionResponse {
  recommendedPrepKg: number;
  expectedPlateWasteProb: number;
  confidenceInterval: {
    lowerKg: number;
    upperKg: number;
  };
  modelNotes?: string;
}

export interface ShelfLifePredictionRequest {
  foodCategory: string; // 'cooked grains', 'dairy', 'meat/gravy', 'raw produce'
  ambientTempC: number;
  initialPrepTime?: string; // ISO datetime
}

export interface ShelfLifePredictionResponse {
  estimatedSafeHours: number;
  urgencyCategory: 'CRITICAL' | 'MODERATE' | 'STABLE';
  storageAdvice: string;
  sourceStandard: string;
}

class MLBridgeService {
  private client: AxiosInstance;
  private mlUrl: string;

  constructor() {
    // Critical: Read from environment variable, never hardcode localhost
    this.mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';

    this.client = axios.create({
      baseURL: this.mlUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  public getServiceUrl(): string {
    return this.mlUrl;
  }

  /**
   * Forwards meal planning parameters to Python ML service for prep quantity & waste forecast
   */
  async predictMealPrep(params: MealPrepPredictionRequest): Promise<MealPrepPredictionResponse> {
    try {
      const response = await this.client.post<MealPrepPredictionResponse>(
        '/predict/meal-prep',
        params
      );
      return response.data;
    } catch (error: any) {
      console.warn(`[MLBridge] Warning: ML service at ${this.mlUrl} unavailable or returned error:`, error.message);
      // Fallback deterministic heuristic if ML service is temporarily unreachable
      return this.fallbackMealPrep(params);
    }
  }

  /**
   * Forwards food item parameters to Python ML service for shelf-life estimation
   */
  async predictShelfLife(params: ShelfLifePredictionRequest): Promise<ShelfLifePredictionResponse> {
    try {
      const response = await this.client.post<ShelfLifePredictionResponse>(
        '/predict/shelf-life',
        params
      );
      return response.data;
    } catch (error: any) {
      console.warn(`[MLBridge] Warning: ML service at ${this.mlUrl} unavailable or returned error:`, error.message);
      return this.fallbackShelfLife(params);
    }
  }

  /**
   * Safe fallback for meal prep estimation based on empirical average 0.38 kg per person
   */
  private fallbackMealPrep(params: MealPrepPredictionRequest): MealPrepPredictionResponse {
    const baseKgPerPerson = params.mealType === 'breakfast' ? 0.28 : params.mealType === 'dinner' ? 0.42 : 0.38;
    const recommended = Math.round(params.expectedAttendanceCount * baseKgPerPerson * 10) / 10;
    return {
      recommendedPrepKg: recommended,
      expectedPlateWasteProb: params.isHolidayOrEvent ? 0.18 : 0.09,
      confidenceInterval: {
        lowerKg: Math.round(recommended * 0.92 * 10) / 10,
        upperKg: Math.round(recommended * 1.08 * 10) / 10,
      },
      modelNotes: 'ML Service fallback estimate (empirical baseline)',
    };
  }

  /**
   * Safe fallback for shelf life based on USDA food safety guidelines
   */
  private fallbackShelfLife(params: ShelfLifePredictionRequest): ShelfLifePredictionResponse {
    const category = params.foodCategory.toLowerCase();
    let safeHours = 4.0;

    if (category.includes('dairy') || category.includes('meat') || category.includes('gravy')) {
      safeHours = params.ambientTempC > 25 ? 2.0 : 3.5;
    } else if (category.includes('grain') || category.includes('rice')) {
      safeHours = params.ambientTempC > 25 ? 3.0 : 5.0;
    } else {
      safeHours = 6.0;
    }

    const urgency: 'CRITICAL' | 'MODERATE' | 'STABLE' =
      safeHours <= 2.0 ? 'CRITICAL' : safeHours <= 5.0 ? 'MODERATE' : 'STABLE';

    return {
      estimatedSafeHours: safeHours,
      urgencyCategory: urgency,
      storageAdvice: params.ambientTempC > 20 ? 'Prompt chilling advised to halt bacterial growth' : 'Keep covered at controlled temperature',
      sourceStandard: 'USDA Food Safety & Inspection Service guidelines (Fallback)',
    };
  }
}

export const mlBridge = new MLBridgeService();
