import pathlib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from joblib import load

origins = ["*"]

app = FastAPI(title="Flight Price Prediction")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

ruta_artefacto = pathlib.Path("model/flight-price-rf-v1.joblib")
artefacto = load(ruta_artefacto)
modelo = artefacto["modelo"]
columnas = artefacto["columnas"]

class InputData(BaseModel):
    airline: str = "SpiceJet"
    source_city: str = "Delhi"
    departure_time: str = "Evening"
    stops: str = "zero"
    arrival_time: str = "Night"
    destination_city: str = "Mumbai"
    flight_class: str = "Economy"
    duration: float = 2.17
    days_left: int = 1

class OutputData(BaseModel):
    score: float

@app.post("/score", response_model=OutputData)
def score(data: InputData):
    try:
        input_dict = {
            "airline": data.airline,
            "source_city": data.source_city,
            "departure_time": data.departure_time,
            "stops": data.stops,
            "arrival_time": data.arrival_time,
            "destination_city": data.destination_city,
            "class": data.flight_class,
            "duration": float(data.duration),
            "days_left": int(data.days_left)
        }
        df_raw = pd.DataFrame([input_dict])

        df_encoded = pd.get_dummies(df_raw, drop_first=True)
        df_alineado = df_encoded.reindex(columns=columnas, fill_value=0)

        resultado = modelo.predict(df_alineado)

        precio_estimado = round(float(resultado.item()), 2)

        return {"score": precio_estimado}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
