import os
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class PredictRequest(BaseModel):
    x: float

@app.get("/")
def root():
    return {"ok": True, "message": "Cloud Run is running"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/predict")
def predict(req: PredictRequest):
    return {"prediction": req.x * 2}
