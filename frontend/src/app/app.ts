import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TimeoutError, finalize, timeout } from 'rxjs';

interface FlightForm {
  airline: string;
  source_city: string;
  departure_time: string;
  stops: string;
  arrival_time: string;
  destination_city: string;
  flight_class: string;
  duration: number;
  days_left: number;
}

interface PredictionModel {
  label: string;
  endpoint: string;
}

interface TrainingDataset {
  label: string;
  url: string;
  sha: string;
}

interface PredictionResponse {
  score: number;
}

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly http = inject(HttpClient);

  readonly predictionModels: PredictionModel[] = [
    {
      label: 'Modelo Entrenado al 100% Dataset',
      endpoint: 'https://flight-price-prediction-v1-0-flight-100.onrender.com/score',
    },
    {
      label: 'Modelo Entrenado al 50% Dataset',
      endpoint: 'https://flight-price-prediction-v1-0-flight-50.onrender.com/score',
    },
    {
      label: 'Modelo Entrenado al 25% Dataset',
      endpoint: 'https://flight-price-prediction-v1-0-flight-25.onrender.com/score',
    },
  ];

  readonly airlines = ['SpiceJet', 'Air_India', 'Vistara', 'GO_FIRST', 'AirAsia', 'Indigo'];
  readonly cities = ['Delhi', 'Mumbai', 'Bangalore', 'Kolkata', 'Hyderabad', 'Chennai'];
  readonly departureTimes = ['Evening', 'Early_Morning', 'Morning', 'Afternoon', 'Night', 'Late_Night'];
  readonly stopsOptions = ['zero', 'one', 'two_or_more'];
  readonly arrivalTimes = ['Night', 'Evening', 'Morning', 'Afternoon', 'Early_Morning', 'Late_Night'];
  readonly classes = ['Economy', 'Business'];
  readonly trainingDatasets: TrainingDataset[] = [
    {
      label: '25% Dataset',
      url: 'https://github.com/Yan25102309/deploy-flight-price-prediction/releases/download/v1.0-data/Clean_Dataset_25.csv',
      sha: 'v1.0-flight-25',
    },
    {
      label: '50% Dataset',
      url: 'https://github.com/Yan25102309/deploy-flight-price-prediction/releases/download/v1.0-data/Clean_Dataset_50.csv',
      sha: 'v1.0-flight-50',
    },
    {
      label: '100% Dataset',
      url: 'https://github.com/Yan25102309/deploy-flight-price-prediction/releases/download/v1.0-data/Clean_Dataset_100.csv',
      sha: 'v1.0-flight-100',
    },
  ];
  readonly githubDispatchUrl =
    'https://api.github.com/repos/Yan25102309/deploy-flight-price-prediction/dispatches';

  selectedModel = this.predictionModels[0];
  selectedDataset = this.trainingDatasets[0];
  retrainingSha = this.selectedDataset.sha;
  githubToken = '';
  flight: FlightForm = {
    airline: 'SpiceJet',
    source_city: 'Delhi',
    departure_time: 'Evening',
    stops: 'zero',
    arrival_time: 'Night',
    destination_city: 'Mumbai',
    flight_class: 'Economy',
    duration: 2.17,
    days_left: 1,
  };
  estimatedPrice: number | null = null;
  predictionLoading = false;
  retrainingLoading = false;
  predictionError = '';
  retrainingMessage = '';
  retrainingError = '';

  predictPrice(): void {
    this.predictionLoading = true;
    this.estimatedPrice = null;
    this.predictionError = '';

    const payload = {
      airline: this.flight.airline,
      source_city: this.flight.source_city,
      departure_time: this.flight.departure_time,
      stops: this.flight.stops,
      arrival_time: this.flight.arrival_time,
      destination_city: this.flight.destination_city,
      flight_class: this.flight.flight_class,
      duration: parseFloat(String(this.flight.duration)),
      days_left: parseInt(String(this.flight.days_left), 10),
    };

    this.http
      .post<PredictionResponse>(this.selectedModel.endpoint, payload)
      .pipe(
        timeout({ first: 30000 }),
        finalize(() => (this.predictionLoading = false)),
      )
      .subscribe({
        next: (response) => {
          if (typeof response.score !== 'number') {
            this.predictionError = 'La API respondió sin un precio válido.';
            return;
          }
          this.estimatedPrice = response.score;
        },
        error: (error: HttpErrorResponse) => {
          this.predictionError = this.getErrorMessage(
            error,
            'No fue posible obtener la predicción.',
          );
        },
      });
  }

  triggerRetraining(): void {
    this.retrainingLoading = true;
    this.retrainingMessage = '';
    this.retrainingError = '';

    const headers = {
      Authorization: `Bearer ${this.githubToken.trim()}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };
    const body = {
      event_type: 'ml_ci_cd',
      client_payload: {
        dataseturl: this.selectedDataset.url,
        sha: this.retrainingSha.trim(),
      },
    };

    this.http
      .post(this.githubDispatchUrl, body, { headers, observe: 'response' })
      .pipe(
        timeout({ first: 30000 }),
        finalize(() => (this.retrainingLoading = false)),
      )
      .subscribe({
        next: (response) => {
          if (response.status === 204) {
            this.retrainingMessage = 'Re-entrenamiento disparado correctamente en GitHub Actions.';
          }
        },
        error: (error: HttpErrorResponse) => {
          this.retrainingError = this.getErrorMessage(
            error,
            'No fue posible disparar el re-entrenamiento.',
          );
        },
      });
  }

  updateTrainingSha(): void {
    this.retrainingSha = this.selectedDataset.sha;
  }

  private getErrorMessage(error: HttpErrorResponse, fallback: string): string {
    if (error instanceof TimeoutError) {
      return 'El servicio tardó más de 30 segundos. Puede estar iniciándose; inténtalo de nuevo.';
    }
    if (error.status === 0) {
      return 'No se pudo conectar con el servicio. Verifica la URL y la configuración CORS.';
    }
    return error.error?.detail ?? error.error?.message ?? `${fallback} (HTTP ${error.status}).`;
  }
}
