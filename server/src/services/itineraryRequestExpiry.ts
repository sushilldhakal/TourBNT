import { ItineraryRequestService } from '../api/tours/services/itineraryRequestService';

let intervalHandle: ReturnType<typeof setInterval> | undefined;

/**
 * Periodically sweeps stale itinerary partner requests — a `held` row past
 * its holdExpiresAt, or a `pending`/`countered` row past its respondByAt —
 * to `expired`, freeing whatever capacity they had reserved (see
 * ItineraryRequestService.getAvailableCapacity, which counts pending/held
 * requests against a partner's pool). Without this sweep, an unanswered
 * request would lock up capacity indefinitely. Call once at server boot.
 */
export function startItineraryRequestExpirySweep(intervalMs = 15 * 60 * 1000): void {
  if (intervalHandle) return;
  intervalHandle = setInterval(() => {
    ItineraryRequestService.expireStaleRequests().catch((err) => console.error('Itinerary request expiry sweep tick failed:', err.message));
  }, intervalMs);
  intervalHandle.unref?.();
}

export function stopItineraryRequestExpirySweep(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = undefined;
  }
}
