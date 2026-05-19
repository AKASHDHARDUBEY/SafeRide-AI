import * as TaskManager from 'expo-task-manager';
import SocketService from '../services/SocketService';

export const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) {
    console.error('Task error: ', error);
    return;
  }
  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      const { latitude, longitude } = locations[0].coords;

      if (SocketService.activeTripId) {
        SocketService.emitLocationUpdate({
          tripId: SocketService.activeTripId,
          latitude,
          longitude
        });
        console.log(`[Background Task] Location update sent for ${SocketService.activeTripId}: lat ${latitude}, lng ${longitude}`);
      } else {
        console.log(`[Background Task] No active trip, ignoring location update.`);
      }
    }
  }
});
