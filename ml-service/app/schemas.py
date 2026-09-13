from typing import List, Optional, Dict, Literal
from pydantic import BaseModel, Field

class MealPrepRequest(BaseModel):
    expectedAttendanceCount: int = Field(..., gt=0, description="Expected headcount for meal session")
    dayOfWeek: str = Field(..., description="Day of the week (e.g. Monday, Tuesday)")
    mealType: Literal['breakfast', 'lunch', 'dinner'] = Field(..., description="Type of meal")
    isHolidayOrEvent: bool = Field(default=False, description="Flag for institutional holiday or special gathering")
    historicalMealCounts: Optional[List[float]] = Field(default=[], description="Past 30 days actual meal counts")

class ConfidenceInterval(BaseModel):
    lowerKg: float
    upperKg: float

class MealPrepResponse(BaseModel):
    recommendedPrepKg: float
    expectedPlateWasteProb: float = Field(..., description="Predicted probability of elevated plate waste (0.0 to 1.0)")
    confidenceInterval: ConfidenceInterval
    modelNotes: Optional[str] = None
    modelMetrics: Optional[Dict[str, float]] = None

class ShelfLifeRequest(BaseModel):
    foodCategory: str = Field(..., description="Category: 'cooked grains', 'dairy', 'meat/gravy', 'raw produce', 'baked'")
    ambientTempC: float = Field(..., description="Ambient storage temperature in Celsius")
    initialPrepTime: Optional[str] = Field(default=None, description="ISO timestamp of food preparation")

class ShelfLifeResponse(BaseModel):
    estimatedSafeHours: float
    urgencyCategory: Literal['CRITICAL', 'MODERATE', 'STABLE']
    storageAdvice: str
    sourceStandard: str

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    modelsLoaded: Dict[str, bool]
