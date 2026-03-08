![alt text](<media/class Diagram .jpg>)
---

### 📄 4. `classDiagram.md`

*Note: This is designed to show OOP. I have used a Controller $\rightarrow$ Service $\rightarrow$ Repository structure.*

```markdown
# Class Diagram

```mermaid
classDiagram
    class TripController {
        +startTrip(req, res)
        +updateLocation(socket, data)
        +endTrip(req, res)
    }

    class TripService {
        -DeviationDetector detector
        -NotificationService notifier
        +processLocationUpdate(tripId, coords)
        +initiateTrip(userId, dest)
    }

    class DeviationDetector {
        +isDeviated(currentPos, polyline)
        +calculateDistance(p1, p2)
    }

    class TripRepository {
        -MongoModel tripModel
        +saveTrip(tripData)
        +updateIncidentLog(tripId, log)
    }

    class LocationCache {
        -RedisClient redis
        +setLatestLocation(tripId, coords)
        +getPolyline(tripId)
    }

    class NotificationService {
        +sendSilentAlert(userId, alertData)
    }

    TripController --> TripService
    TripService --> DeviationDetector
    TripService --> TripRepository
    TripService --> LocationCache
    TripService --> NotificationService

