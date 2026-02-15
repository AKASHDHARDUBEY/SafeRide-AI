# Project Idea: S4H-1 Ride-Share Intent Detection (Passive Safety)

## Problem Statement
Current ride-share safety features rely on "Panic Buttons" (SOS), which require the victim to be conscious, alert, and physically able to operate their phone. In kidnapping or abduction scenarios, victims are often threatened, frozen in fear, or the phone is taken away, making reactive safety measures useless.

## Proposed Solution
A passive, real-time background monitoring system that detects "kidnapping intent" by analyzing GPS deviations and driver behavior. Instead of waiting for a user to call for help, the system autonomously triggers a "Silent Dispatch" to authorities if the vehicle deviates from the safe corridor or stops in a high-risk zone.

## Scope
- **Real-time Tracking:** Continuous GPS streaming via WebSockets.
- **Route Monitoring:** Comparing live coordinates against a Google Maps Polyline.
- **Deviation Logic:** Detecting significant departures from the intended route.
- **Automated Alerting:** Silent notifications to emergency contacts/authorities via Firebase FCM.
- **Risk-Zone Awareness:** Identifying if the vehicle stops in secluded/high-risk areas.

## Key Features
1. **Passive Monitoring:** Works in the background without user intervention.
2. **Dynamic Safe Corridor:** Generates a buffer zone around the expected route.
3. **Silent Dispatch:** Alerts authorities without alerting the driver.
4. **Heartbeat Monitoring:** Detects signal loss (phone destroyed/Faraday bag) as a high-risk event.
5. **Low-Latency Pipeline:** Uses Redis for real-time coordinate processing to ensure instant detection.