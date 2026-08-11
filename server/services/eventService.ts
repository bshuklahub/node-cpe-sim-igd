import { EventEmitter } from 'events';
import { TR069Service } from './tr069';
import { DiagnosticsManager } from './diagnosticManager';


// Define event types
export const EVENTS = {
  INFORM: 'Inform',
  INFORM_VALUE_CHANGE: 'INFORM_VALUE_CHANGE',
  ORDER_PLACED: 'ORDER_PLACED',
  TEST_EVENT: 'TEST_EVENT',
  DOWNLOAD_DIAGNOSTICS: 'DOWNLOAD_DIAGNOSTICS',
  UPLOAD_DIAGNOSTICS: 'UPLOAD_DIAGNOSTICS',
  DOWNLOAD_DIAGNOSTICS_COMPLETED: 'DOWNLOAD_DIAGNOSTICS_COMPLETED',
  UPLOAD_DIAGNOSTICS_COMPLETED: 'UPLOAD_DIAGNOSTICS_COMPLETED',
} as const;

export class EventService extends EventEmitter {

  constructor(public tr069: TR069Service, public manager: DiagnosticsManager) {
    super();
    console.log("EventService " + tr069);
    this.setupListeners(tr069);
  }

  private setupListeners(tr069: TR069Service) {

    // 1. Inform Event Handling.....
    this.on(EVENTS.INFORM, async (payload, eventName) => {
      console.log(`[EventService] from ${payload} ..Processing INFORM for eventName: ${eventName}`);

      // Simulate async processing (e.g., sending email)
      try {
        await this.simulateDelay(1000);
        tr069.sendInformToACS(eventName);

        console.log(eventName, 'processed', 'Inform event processed successfully. -->' + payload);
      } catch (error) {
        console.log(eventName, 'failed', 'Failed to send welcome email.');
      }
    });

    this.on(EVENTS.INFORM_VALUE_CHANGE, async (payload, eventName) => {
      console.log(`[EventService] from ${payload} ..Processing Value change INFORM for eventName: ${eventName}`);

      // Simulate async processing (e.g., sending email)
      try {
        await this.simulateDelay(1000);

        //tr069.sendInformToACS(eventName, payload);
        console.log(eventName, 'processed', 'Inform Value change  event processed successfully. -->' + payload);
      } catch (error) {
        console.log(eventName, 'failed', 'Failed to send welcome email.');
      }
    });

    // 2. Order Placed Handler
    this.on(EVENTS.DOWNLOAD_DIAGNOSTICS, async (payload, eventName) => {
      console.log(`[EventService] from ${payload} ..Processing DOWNLOAD_DIAGNOSTICS for eventName: ${eventName}`);

      // Simulate async processing (e.g., sending email)
      try {
        await this.simulateDelay(1000);
        this.manager.checkAndRun(EVENTS.DOWNLOAD_DIAGNOSTICS);
        console.log(eventName, 'processed', 'Inform event processed successfully. -->' + payload);
      } catch (error) {
        console.log(eventName, 'failed', 'Failed to send welcome email.');
      }
    });

    // 3. System Alert Handler
    this.on(EVENTS.UPLOAD_DIAGNOSTICS, async (payload, eventName) => {
      console.log(`[EventService] from ${payload} ..Processing UPLOAD_DIAGNOSTICS for eventName: ${eventName}`);

      // Simulate async processing (e.g., sending email)
      try {
        await this.simulateDelay(1000);
        this.manager.checkAndRun(EVENTS.UPLOAD_DIAGNOSTICS);
        console.log(eventName, 'processed', 'Inform event processed successfully. -->' + payload);
      } catch (error) {
        console.log(eventName, 'failed', 'Failed to send welcome email.');
      }
    });
    // 4. download diagnostics completed Order Placed Handler
    this.on(EVENTS.DOWNLOAD_DIAGNOSTICS_COMPLETED, async (payload, eventName) => {
      console.log(`[EventService] from ${payload} ..Processing DOWNLOAD_DIAGNOSTICS_COMPLETED for eventName: ${eventName}`);

      // Simulate async processing (e.g., sending email)
      try {
        await this.simulateDelay(1000);
        await this.manager.updateTR143DownloadCompletedParams(EVENTS.UPLOAD_DIAGNOSTICS);
        tr069.sendInformToACS("8 DIAGNOSTICS COMPLETE", payload);

        console.log(eventName, 'processed', 'Inform event processed successfully. -->' + payload);
      } catch (error) {
        console.log(eventName, 'failed', 'Failed to send welcome email.');
      }
    });

    // 3. System Alert Handler
    this.on(EVENTS.UPLOAD_DIAGNOSTICS_COMPLETED, async (payload, eventName) => {
      console.log(`[EventService] from ${payload} ..Processing UPLOAD_DIAGNOSTICS_COMPLETED for eventName: ${eventName}`);

      // Simulate async processing (e.g., sending email)
      try {
        await this.simulateDelay(1000);
        this.manager.updateTR143DownloadCompletedParams(EVENTS.UPLOAD_DIAGNOSTICS);
        tr069.sendInformToACS("8 DIAGNOSTICS COMPLETE", payload);
        console.log(eventName, 'processed', 'Inform event processed successfully. -->' + payload);
      } catch (error) {
        console.log(eventName, 'failed', 'Failed to send welcome email.');
      }
    });
  }

  private simulateDelay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

