import requests

body = {
    "airline": "SpiceJet",
    "source_city": "Delhi",
    "departure_time": "Evening",
    "stops": "zero",
    "arrival_time": "Night",
    "destination_city": "Mumbai",
    "flight_class": "Economy",
    "duration": 2.17,
    "days_left": 1
}

response = requests.post(
    url='http://127.0.0.1:8000/score',
    json=body
)

print(f"Status code: {response.status_code}") 
print(f"Respuesta del servidor: {response.text}") 

if response.status_code == 200: 
    print("Prediccion:", response.json()) 
else: print("El servidor devolvió un error.")
