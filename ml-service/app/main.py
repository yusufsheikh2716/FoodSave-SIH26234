import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .schemas import HealthResponse
from .routers.predict import router as predict_router, meal_forecaster, shelf_life_estimator

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Reload/confirm model weights
    meal_forecaster.load_model()
    shelf_life_estimator.load_model()
    print("[FastAPI] Microservice initialized. Ready to receive inference queries.")
    yield
    # Shutdown
    print("[FastAPI] Microservice shutting down.")

app = FastAPI(
    title="FoodSave AI/ML Microservice",
    description="Predictive Demand Forecasting & Dynamic Shelf-Life Estimation (SIH26234)",
    version="1.0.0",
    lifespan=lifespan,
)

# Open CORS so Node.js backend and cloud services can communicate seamlessly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict_router)

@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """
    Health check endpoint for Node backend and uptime monitoring pings.
    """
    return HealthResponse(
        status="healthy",
        service="foodsave-ml-microservice",
        version="1.0.0",
        modelsLoaded={
            "mealPrepPipeline": meal_forecaster.is_loaded(),
            "shelfLifeEstimator": shelf_life_estimator.is_loaded(),
        }
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
