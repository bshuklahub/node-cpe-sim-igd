import { storage } from "../storage";
import { api } from "@shared/routes";
import { Readable } from "stream";
import { getLogger } from '../util/logutil';
import { performance } from 'node:perf_hooks';
import { EVENTS } from "./eventService";
import { eventService } from "server/routes";
import { defaults } from "pg";
const LOGGER = getLogger('DIAGNOSTICS_MANAGER');

//For TR181 it would be Device.IP.Diagnostics
const DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE = process.env.DEVICE_TR069_DATA_MODEL_TYPE || "InternetGatewayDevice";
// Helper: Format ISO date or null
const formatDateTime = (date: Date | null): string | null => {
    return date ? date.toISOString() : null;
};
// Helper: Calculate throughput from bytes and time
const calculateThroughput = (bytes: number, bomTime: Date | null, eomTime: Date | null) => {
    if (!bomTime || !eomTime || bytes === 0) {
        return { bps: 0, mbps: 0, durationMs: null };
    }
    const durationMs = eomTime.getTime() - bomTime.getTime();
    if (durationMs <= 0) return { bps: 0, mbps: 0, durationMs: 0 };

    const bps = (bytes * 8 * 1000) / durationMs; // bits per second
    const mbps = bps / 1000000;
    return { bps: Math.round(bps), mbps: parseFloat(mbps.toFixed(2)), durationMs };
};
// Simulation Manager
export class DiagnosticsManager {
    private isRunning = false;


    async checkAndRun(eventType: string) {
        LOGGER.info("Diagnostics Manager checking for requested tests...   EventType: " + eventType);
        if (this.isRunning) return;
        //LOGGER.info("Diagnostics Manager found no active tests, checking for new requests...");
        try {
            // Check Download
            if (EVENTS.UPLOAD_DIAGNOSTICS === eventType) {
                LOGGER.info("Diagnostics Manager processing UPLOAD_DIAGNOSTICS event...");
                // Check Upload
                const ul = await storage.getUploadDiagnostics();
                LOGGER.info(`Upload Diagnostics State: ${ul.diagnosticsState}`);
                LOGGER.info("Upload Diagnostics State:" + JSON.stringify(ul));
                if (ul.diagnosticsState === "Requested") {
                    this.isRunning = true;
                    await this.runUpload(ul);
                    this.isRunning = false;
                    return;
                }
            } else if (EVENTS.DOWNLOAD_DIAGNOSTICS === eventType) {
                LOGGER.info("Diagnostics Manager processing DOWNLOAD_DIAGNOSTICS event...");
                const dl = await storage.getDownloadDiagnostics();
                LOGGER.info(`Download Diagnostics State: ${dl.diagnosticsState}`);
                LOGGER.info("Download Diagnostics State:" + JSON.stringify(dl));
                if (dl.diagnosticsState === "Requested") {
                    this.isRunning = true;
                    await this.runDownload(dl);
                    this.isRunning = false;
                    return;
                }
            } else {
                LOGGER.info("Diagnostics Manager received unknown event type: " + eventType);
                throw new Error("Unknown event type: " + eventType);
            }



        } catch (e) {
            console.error("Error in diagnostics loop:", e);
            this.isRunning = false;
        }
    }

    async runDownload(config: any) {
        const startTime = new Date();
        await storage.updateDownloadProgress(config.id, {
            romTime: startTime,
            bomTime: null,
            eomTime: null,
            testBytesReceived: 0,
            totalBytesReceived: 0,
            tcpOpenRequestTime: new Date(),
        });

        try {
            console.log(`Starting download from ${config.downloadUrl}`);
            // Define milestones
            performance.mark('A');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout safety

            const response = await fetch(config.downloadUrl, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            await storage.updateDownloadProgress(config.id, {
                tcpOpenResponseTime: new Date(),
                bomTime: new Date(),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            if (!response.body) throw new Error("No body");

            const reader = response.body.getReader();
            let received = 0;
            let lastUpdate = Date.now();

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    if (value) received += value.length;
                    break;
                }
                received += value.length;

                // Update DB every 500ms
                if (Date.now() - lastUpdate > 500) {
                    await storage.updateDownloadProgress(config.id, {
                        testBytesReceived: received,
                        totalBytesReceived: received, // Simplification
                    });
                    lastUpdate = Date.now();
                }
            }//While loop for reading file
            performance.mark('B');
            // Measure the difference between two marks
            performance.measure('DOWNLOAD_TIME', 'A', 'B');
            const endTime = new Date();
            const durationSec = (endTime.getTime() - startTime.getTime()) / 1000;
            LOGGER.info(`Download performance entries: ${durationSec} seconds for ${received} bytes`);
            const mbps = (received * 8) / (durationSec * 1000000);

            LOGGER.info(`Download completed: ${received} bytes in ${durationSec} seconds (${mbps.toFixed(2)} Mbps)`);
            const dbUpdated = await storage.updateDownloadDiagnostics({
                diagnosticsState: "Completed",
                timeBasedTestDuration: Math.round(durationSec * 1000), // ms
                // @ts-ignore
                eomTime: endTime,
                testBytesReceived: received,
                totalBytesReceived: received,
            });
            //Get parameters to notify ACS
            const parameterNames = await this.updateTR143DownloadCompletedParams({});
            // Notify event service
            eventService.emit(EVENTS.DOWNLOAD_DIAGNOSTICS_COMPLETED, parameterNames, "DOWNLOAD_DIAGNOSTICS_COMPLETED");
            //We now need to add these values in DB as well
            await storage.addTestHistory({
                testType: "Download",
                startTime,
                endTime,
                status: "Completed",
                url: config.downloadUrl,
                throughputMbps: Math.round(mbps),
                bytesTransferred: received
            });

        } catch (error: any) {
            console.error("Download failed:", error);
            await storage.updateDownloadDiagnostics({
                diagnosticsState: "Error_TransferFailed" // Generic error mapping
            });
            await storage.addTestHistory({
                testType: "Download",
                startTime,
                endTime: new Date(),
                status: "Error",
                url: config.downloadUrl,
                throughputMbps: 0,
                bytesTransferred: 0
            });
        }
    }

    async runUpload(config: any) {
        LOGGER.info("Diagnostics Manager starting upload test to " + config.uploadUrl);
        const startTime = new Date();
        await storage.updateUploadProgress(config.id, {
            romTime: startTime,
            bomTime: null,
            eomTime: null,
            testBytesSent: 0,
            tcpOpenRequestTime: new Date(),
        });

        try {
            console.log(`Starting upload to ${config.uploadUrl}`);

            // Simulate data generation
            const size = config.testFileLength || 1024 * 1024; // 1MB default
            const chunkSize = 64 * 1024; // 64KB chunks
            let sent = 0;

            // Create a readable stream that pushes data
            const stream = new Readable({
                read() {
                    if (sent >= size) {
                        this.push(null);
                    } else {
                        const remaining = size - sent;
                        const currentChunk = Math.min(chunkSize, remaining);
                        this.push(Buffer.alloc(currentChunk, 'x'));
                        sent += currentChunk;
                        // Hacky: update DB here? No, better to do it in a transform or just simulate
                        // Since we can't easily hook into fetch's upload progress in Node without custom agents,
                        // we'll just upload and assume success, or use a custom uploader.
                        // For TR-143 simulation, let's just push the whole buffer for now.
                    }
                }
            });

            // Fetch doesn't support Readable streams well in all node versions for body?
            // Node 18 fetch supports it.
            // But tracking progress is hard.
            // Let's create a buffer instead for simplicity unless it's huge.
            const buffer = Buffer.alloc(size, 'a');

            await storage.updateUploadProgress(config.id, {
                tcpOpenResponseTime: new Date(),
                bomTime: new Date(),
            });

            const response = await fetch(config.uploadUrl, {
                method: 'PUT',
                body: buffer
            });

            // Update sent bytes to full size if successful
            // In a real simulator we'd want progress hooks.

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const endTime = new Date();
            const durationSec = (endTime.getTime() - startTime.getTime()) / 1000;
            const mbps = (size * 8) / (durationSec * 1000000);
            LOGGER.info(`Upload completed: ${size} bytes in ${durationSec} seconds (${mbps.toFixed(2)} Mbps)`);
            const dbUpdate = await storage.updateUploadDiagnostics({
                diagnosticsState: "Completed",
                timeBasedTestDuration: Math.round(durationSec * 1000), // ms
                // @ts-ignore
                eomTime: endTime,
                testBytesSent: size,
                totalBytesSent: size + 200, // Headers approx
            });
            //Get parameters to notify ACS
            const parameterNames = await this.updateTR143UploadCompletedParams({});
            // Notify event service
            eventService.emit(EVENTS.UPLOAD_DIAGNOSTICS_COMPLETED, parameterNames, "UPLOAD_DIAGNOSTICS_COMPLETED");
            await storage.addTestHistory({
                testType: "Upload",
                startTime,
                endTime,
                status: "Completed",
                url: config.uploadUrl,
                throughputMbps: Math.round(mbps),
                bytesTransferred: size
            });

        } catch (error: any) {
            console.error("Upload failed:", error);
            await storage.updateUploadDiagnostics({
                diagnosticsState: "Error_TransferFailed"
            });
            await storage.addTestHistory({
                testType: "Upload",
                startTime,
                endTime: new Date(),
                status: "Error",
                url: config.uploadUrl,
                throughputMbps: 0,
                bytesTransferred: 0
            });
        }
    }

    async updateTR143DownloadCompletedParams(params: any) {
        const dl = await storage.getDownloadDiagnostics();
        const throughput = calculateThroughput(dl.testBytesReceived || 0, dl.bomTime, dl.eomTime);
        const parameterNames = [];
        const parameters = [
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".DownloadDiagnostics.DiagnosticsState", value: dl.diagnosticsState, type: "string" },
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".DownloadDiagnostics.Interface", value: dl.interface || "", type: "string" },
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".DownloadDiagnostics.DownloadURL", value: dl.downloadUrl, type: "string" },
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".DownloadDiagnostics.DSCP", value: dl.dscp || 0, type: "unsignedInt" },
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".DownloadDiagnostics.EthernetPriority", value: dl.ethernetPriority || 0, type: "unsignedInt" },
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".DownloadDiagnostics.ProtocolVersion", value: dl.protocolVersion || "Any", type: "string" },
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".DownloadDiagnostics.NumberOfConnections", value: dl.numberOfConnections || 1, type: "unsignedInt" },
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".DownloadDiagnostics.ROMTime", value: formatDateTime(dl.romTime), type: "dateTime" },
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".DownloadDiagnostics.BOMTime", value: formatDateTime(dl.bomTime), type: "dateTime" },
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".DownloadDiagnostics.EOMTime", value: formatDateTime(dl.eomTime), type: "dateTime" },
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".DownloadDiagnostics.TestBytesReceived", value: dl.testBytesReceived || 0, type: "unsignedInt" },
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".DownloadDiagnostics.TotalBytesReceived", value: dl.totalBytesReceived || 0, type: "unsignedInt" },
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".DownloadDiagnostics.TCPOpenRequestTime", value: formatDateTime(dl.tcpOpenRequestTime), type: "dateTime" },
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".DownloadDiagnostics.TCPOpenResponseTime", value: formatDateTime(dl.tcpOpenResponseTime), type: "dateTime" },
            // Calculated values for ACS convenience
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".DownloadDiagnostics.X_ThroughputBps", value: throughput.bps, type: "unsignedInt" },
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".DownloadDiagnostics.X_ThroughputMbps", value: throughput.mbps, type: "decimal" },
        ];
        //Update DB parameters
        for (const d of parameters) {
            parameterNames.push(d.name);
            const dbValue = await storage.getParameter(d.name);
            if (dbValue) {
                await storage.updateParameter(d.name, String(d.value ?? "NA"));
            } else {
                await storage.createParameter({ ...d, value: String(d.value ?? "NA") });
            }

        }
        return parameterNames;
    }

    async updateTR143UploadCompletedParams(params: any) {
        const ul = await storage.getUploadDiagnostics();
        const parameterNames = [];
        const throughput = calculateThroughput(ul.testBytesSent || 0, ul.bomTime, ul.eomTime);

        const parameters = [
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".UploadDiagnostics.DiagnosticsState", value: ul.diagnosticsState, type: "string" },
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".UploadDiagnostics.Interface", value: ul.interface || "", type: "string" },
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".UploadDiagnostics.UploadURL", value: ul.uploadUrl, type: "string" },
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".UploadDiagnostics.DSCP", value: ul.dscp || 0, type: "unsignedInt" },
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".UploadDiagnostics.EthernetPriority", value: ul.ethernetPriority || 0, type: "unsignedInt" },
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".UploadDiagnostics.TestFileLength", value: ul.testFileLength, type: "unsignedInt" },
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".UploadDiagnostics.ProtocolVersion", value: ul.protocolVersion || "Any", type: "string" },
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".UploadDiagnostics.NumberOfConnections", value: ul.numberOfConnections || 1, type: "unsignedInt" },
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".UploadDiagnostics.ROMTime", value: formatDateTime(ul.romTime), type: "dateTime" },
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".UploadDiagnostics.BOMTime", value: formatDateTime(ul.bomTime), type: "dateTime" },
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".UploadDiagnostics.EOMTime", value: formatDateTime(ul.eomTime), type: "dateTime" },
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".UploadDiagnostics.TestBytesSent", value: ul.testBytesSent || 0, type: "unsignedInt" },
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".UploadDiagnostics.TotalBytesSent", value: ul.totalBytesSent || 0, type: "unsignedInt" },
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".UploadDiagnostics.TotalBytesReceived", value: ul.totalBytesReceived || 0, type: "unsignedInt" },
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".UploadDiagnostics.TCPOpenRequestTime", value: formatDateTime(ul.tcpOpenRequestTime), type: "dateTime" },
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".UploadDiagnostics.TCPOpenResponseTime", value: formatDateTime(ul.tcpOpenResponseTime), type: "dateTime" },
            // Calculated values for ACS convenience
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".UploadDiagnostics.X_ThroughputBps", value: throughput.bps, type: "unsignedInt" },
            { name: DEVICE_TR069_DATA_DIAGNOSTICS_MODEL_TYPE + ".UploadDiagnostics.X_ThroughputMbps", value: throughput.mbps, type: "decimal" },
        ];
        //Update DB parameters
        for (const d of parameters) {
            parameterNames.push(d.name);
            const dbValue = await storage.getParameter(d.name);
            if (dbValue) {
                await storage.updateParameter(d.name, String(d.value ?? "NA"));
            } else {
                await storage.createParameter({ ...d, value: String(d.value ?? "NA") });
            }

        }
        return parameterNames;
    }
}

export const manager = new DiagnosticsManager();