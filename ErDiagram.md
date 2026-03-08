
![alt text](<media/er .jpg>)
---

### 📄 5. `ErDiagram.md`
```markdown
# ER Diagram

```mermaid
erDiagram
    USER ||--o{ TRIP : initiates
    TRIP ||--o{ INCIDENT : triggers
    USER {
        string userId PK
        string name
        string phone
        string emergencyContact
    }
    TRIP {
        string tripId PK
        string userId FK
        string driverId
        string startLocation
        string destination
        string polyline
        datetime startTime
        string status "Active/Completed/Incident"
    }
    INCIDENT {
        string incidentId PK
        string tripId FK
        datetime timestamp
        float deviationDistance
        string coordinates
        string alertStatus "Sent/Acknowledged"
    }