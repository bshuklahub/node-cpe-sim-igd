import type { EventService } from "./eventService";

// Indirect access to the EventService singleton so that service modules
// (tr143, diagnosticManager, etc.) do not need to import from server/routes,
// which previously created a circular dependency:
//   routes -> services/* -> routes
let _eventService: EventService | null = null;

export function setEventService(es: EventService): void {
  _eventService = es;
}

export function getEventService(): EventService {
  if (!_eventService) {
    throw new Error("EventService has not been initialized yet");
  }
  return _eventService;
}