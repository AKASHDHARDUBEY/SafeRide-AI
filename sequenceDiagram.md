![alt text](<media/sequence Diagram.jpg>)

---

### 📄 3. `sequenceDiagram.md`
```markdown
# Sequence Diagram (Deviation Detection Flow)

```mermaid
sequenceDiagram
    participant P as Passenger App
    participant S as Node.js Server
    participant R as Redis Cache
    participant G as Google Maps API
    participant F as Firebase FCM
    participant A as Authorities

    P->>S: Initialize Trip (Destination)
    S->>G: Request Route Polyline
    G-->>S: Return Encoded Polyline
    S->>R: Store Polyline & TripID

    loop Every 5 Seconds
        P->>S: Stream GPS Coordinates (WebSocket)
        S->>R: Fetch Polyline for TripID
        S->>S: LogicEngine.calculateDeviation(currentPos, polyline)
        
        alt Deviation Detected > Threshold
            S->>F: Send Silent Push Notification
            F-->>A: Dispatch Live Coordinates & Driver ID
            S->>S: Log Incident in MongoDB
        else On Route
            S->>R: Update Last Known Location
        end
    end