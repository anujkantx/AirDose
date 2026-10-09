# AirDose API Specification

The AirDose backend exposes a REST API powered by FastAPI.

Base URL (Local): `http://localhost:8000`  
Interactive OpenAPI UI: `http://localhost:8000/docs`

---

## Authentication & Headers

Protected routes require a Bearer JWT passed in the HTTP Authorization header:
```http
Authorization: Bearer <token>
Content-Type: application/json
```

---

## 1. Authentication Endpoints

### Register User
`POST /api/auth/signup`
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "securepassword123"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "Jane Doe",
      "email": "jane@example.com"
    }
  }
  ```

### Sign In
`POST /api/auth/signin`
- **Request Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "securepassword123"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Signed in successfully",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "Jane Doe",
      "email": "jane@example.com"
    }
  }
  ```

---

## 2. Air Quality Telemetry

### Get Air Quality & AQI Matrix
`GET /api/air-quality?lat={lat}&lon={lon}&force_refresh={bool}`
- **Query Parameters**:
  - `lat` (float, required): Latitude (e.g. `28.6139`)
  - `lon` (float, required): Longitude (e.g. `77.2090`)
  - `force_refresh` (bool, optional): Bypass 30-min cache (default `false`)
- **Response** (`200 OK`):
  ```json
  {
    "aqi": 182,
    "category": "Unhealthy",
    "color": "#f97316",
    "dominant_pollutant": "pm25",
    "pollutants": {
      "pm25": { "value": 75.4, "unit": "µg/m³", "sub_index": 182 },
      "pm10": { "value": 120.0, "unit": "µg/m³", "sub_index": 110 }
    },
    "station": {
      "id": "delhi-central",
      "name": "Major Dhyan Chand National Stadium",
      "distance_meters": 820
    },
    "cached": true,
    "ttl_remaining_seconds": 1420
  }
  ```

---

## 3. Exposure Dosimeter Tracking

### Send Location Telemetry Tick
`POST /api/exposure/track`
- **Request Body**:
  ```json
  {
    "latitude": 28.6139,
    "longitude": 77.2090,
    "accuracy": 12.5,
    "speed": 1.4,
    "heading": 90.0,
    "breathing_factor": 1.8,
    "client_timestamp": 1728482400.0
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "total_exposure_ug": 42.85,
    "state": {
      "pm25": 75.4,
      "location_id": 1,
      "location_name": "Home Residence",
      "location_type": "home",
      "infiltration_factor": 0.5,
      "breathing_factor": 1.8,
      "base_breathing_rate_m3_s": 0.0001,
      "inhalation_rate_ug_s": 0.006786,
      "accumulated_exposure_ug": 0.407
    }
  }
  ```

### Get Today's Exposure Summary
`GET /api/exposure/today`
- **Response** (`200 OK`):
  ```json
  {
    "date": "2026-10-09",
    "total_exposure_ug": 42.85,
    "tracking": true,
    "clean_air_shield_saved_ug": 18.2,
    "current": {
      "pm25": 75.4,
      "environment": "home",
      "location_name": "Home Residence",
      "infiltration_factor": 0.5,
      "breathing_factor": 1.8,
      "inhalation_rate_ug_s": 0.006786
    },
    "contributions": {
      "home": 22.4,
      "office": 14.1,
      "outdoor": 6.35
    }
  }
  ```

### Stop / Pause Tracking
`POST /api/exposure/stop`
- **Response** (`200 OK`):
  ```json
  {
    "status": "stopped",
    "message": "Tracking stopped"
  }
  ```

### Simulate Commute Trip
`POST /api/exposure/simulate-trip`
- **Request Body**:
  ```json
  {
    "duration_minutes": 35,
    "ambient_pm25": 85.0
  }
  ```
- **Response** (`200 OK`): Returns comparison of estimated PM2.5 dosage across transit options (Metro, AC Bus, Walking, Cycling, Car).

---

## 4. User Locations Management

### List Saved Geofences
`GET /api/locations`
- **Response** (`200 OK`): Array of geofenced user locations with custom infiltration coefficients.

### Create Saved Geofence
`POST /api/locations`
- **Request Body**:
  ```json
  {
    "name": "Tech Hub Office",
    "location_type": "office",
    "latitude": 28.4595,
    "longitude": 77.0266,
    "radius_meters": 150,
    "indoor_coefficient": 0.4
  }
  ```

### Calibrate Indoor Infiltration Questionnaire
`POST /api/locations/{location_id}/calibrate`
- Calculates scientific $I_f$ coefficient based on building envelope, HVAC, AC fresh air intake, and HEPA air purification questions.
