import os
import pathlib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from joblib import dump  # Importado para guardar el modelo como en las diapositivas

class EntrenadorRandomForest:
    def __init__(self, ruta_csv: str, ruta_modelo: str = "model/flight-price-rf-v1.joblib"):
        self.ruta_csv = ruta_csv
        self.ruta_modelo = ruta_modelo
        self.modelo = RandomForestRegressor(
            n_estimators=100,
            max_depth=15,
            random_state=42,
            n_jobs=-1
        )
        self.columnas_entrenamiento = []

    def cargar_datos(self):
        df = pd.read_csv(self.ruta_csv)
        columnas_a_eliminar = ['Unnamed: 0', 'flight']
        return df.drop(columns=[col for col in columnas_a_eliminar if col in df.columns])

    def ejecutar(self):
        print("Cargando y procesando dataset...")
        df = self.cargar_datos()

        y = df['price']
        X_raw = df.drop(columns=['price'])

        # Transformación de variables categóricas
        X = pd.get_dummies(X_raw, drop_first=True)
        self.columnas_entrenamiento = list(X.columns)

        train_X, val_X, train_y, val_y = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        print("Entrenando modelo Random Forest...")
        self.modelo.fit(train_X, train_y)

        predicciones = self.modelo.predict(val_X)
        mae = mean_absolute_error(val_y, predicciones)
        r2 = r2_score(val_y, predicciones)

        print(f"Métricas de evaluación:")
        print(f"  MAE: {mae:.2f}")
        print(f"  R²:  {r2:.4f}")

        # Guardado del modelo en disco (siguiendo el flujo de las diapositivas)
        self.guardar_modelo()

    def guardar_modelo(self):
        print("Saving model...")
        # Aseguramos que exista la carpeta de destino
        destino = pathlib.Path(self.ruta_modelo)
        destino.parent.mkdir(parents=True, exist_ok=True)

        # Guardamos un diccionario con el modelo y las columnas esperadas
        dump(
            {
                "modelo": self.modelo,
                "columnas": self.columnas_entrenamiento
            },
            destino
        )
        print(f"Modelo guardado exitosamente en: {destino}")

if __name__ == "__main__":
    # Convención de rutas de la estructura del proyecto: data/ y model/
    ruta_datos = os.path.join("data", "Clean_Dataset.csv")
    entrenador = EntrenadorRandomForest(ruta_csv=ruta_datos)
    entrenador.ejecutar()