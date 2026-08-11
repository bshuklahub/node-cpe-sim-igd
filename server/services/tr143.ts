import { storage } from "../storage";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { getLogger } from '../util/logutil';

import { TR069Service } from "./tr069";
import { eventService } from "server/routes";
import { EVENTS } from "./eventService";

const LOGGER = getLogger('TR143Service');

const SOAP_ENV_NS = "http://schemas.xmlsoap.org/soap/envelope/";
const CWMP_NS = "urn:dslforum-org:cwmp-1-0";
const ACS_SEND_TIMEOUT_MS = 5000; // 5 seconds
const DEVICE_TR069_DATA_MODEL_TYPE = process.env.DEVICE_TR069_DATA_MODEL_TYPE || "InternetGatewayDevice";
export class TR143Service {


    constructor(tr069: TR069Service) {
        console.log("TR143Service " + tr069);

    }

    async isTR143DiagnosticsSPV(params: any) {
        for (const param of params) {
            if (param.Name.startsWith(DEVICE_TR069_DATA_MODEL_TYPE + ".Diagnostics.DownloadDiagnostics.") || param.Name.startsWith(DEVICE_TR069_DATA_MODEL_TYPE + ".Diagnostics.UploadDiagnostics.")) {
                return true;
            }
        }
        return false;
    }
    /* TR143 Downoad SPV handle */
    async handleTR143DownloadSetParameterValues(params: any) {
        LOGGER.info(" handleTR143DownloadSetParameterValues --------------------------------");

        const updates = {
            diagnosticsState: "Requested",
            downloadUrl: "http://localhost:5000/download/file1Mb.txt",
            interface: DEVICE_TR069_DATA_MODEL_TYPE + '.DownloadDiagnostics.Interface',
            dscp: 0,
            ethernetPriority: 0,
            protocolVersion: "1.0",
            numberOfConnections: 1,
            enablePerConnectionResults: false,
            timeBasedTestDuration: 0
        };
        LOGGER.info("--------------------------------");
        LOGGER.info(params);
        LOGGER.info(JSON.stringify(params));
        for (const param of params) {
            //Update Data Model Values
            const dbParam = await storage.getParameter(param.Name);
            if (dbParam) {
                await storage.updateParameter(param.Name, param.Value["#text"] || param.Value);
            } else {
                var dataType = (param.type ? param.type.replace("xsd:", "") : "string");
                await storage.createParameter({ name: param.Name, value: param.Value["#text"], type: dataType, writable: true });
            }

            const name = param.Name.replace(DEVICE_TR069_DATA_MODEL_TYPE + ".Diagnostics.DownloadDiagnostics.", "");

            switch (name) {
                case "DiagnosticsState":
                    updates.diagnosticsState = param.Value["#text"] || param.Value;
                    break;
                case "DownloadURL":
                    updates.downloadUrl = param.Value["#text"] || param.Value;
                    break;
                case "Interface":
                    updates.interface = param.Value["#text"] || param.Value;
                    break;
                case "DSCP":
                    updates.dscp = Number(param.Value["#text"] || param.Value);
                    break;
                case "EthernetPriority":
                    updates.ethernetPriority = Number(param.Value["#text"] || param.Value);
                    break;
                case "ProtocolVersion":
                    updates.protocolVersion = param.Value["#text"] || param.Value;
                    break;
                case "NumberOfConnections":
                    updates.numberOfConnections = Number(param.Value["#text"] || param.Value);
                    break;
            }
        }
        LOGGER.info("Going to store tr143 download data .." + JSON.stringify(updates));
        LOGGER.info("Storing tr143 download data ..");
        const dbDownloadUpdated = await storage.updateDownloadDiagnostics({
            ...updates,
            diagnosticsState: updates.diagnosticsState as any
        });
        eventService.emit(EVENTS.DOWNLOAD_DIAGNOSTICS, dbDownloadUpdated, EVENTS.DOWNLOAD_DIAGNOSTICS);
        LOGGER.info("TR143 Download Diagnostics updated: " + JSON.stringify(dbDownloadUpdated));

    }

    /* TR143 Downoad SPV handle */
    async handleTR143UploadSetParameterValues(params: any) {
        LOGGER.info(" handleTR143UploadSetParameterValues --------------------------------");
        const updates: any = {};
        LOGGER.info(params);
        LOGGER.info(JSON.stringify(params));
        for (const param of params) {
            //Update Data Model Values
            const dbParam = await storage.getParameter(param.Name);
            if (dbParam) {
                await storage.updateParameter(param.Name, param.Value["#text"] || param.Value);
            } else {
                var dataType = (param.type ? param.type.replace("xsd:", "") : "string");
                await storage.createParameter({ name: param.Name, value: param.Value["#text"], type: dataType, writable: true });
            }

            const name = param.Name.replace(DEVICE_TR069_DATA_MODEL_TYPE + ".Diagnostics.UploadDiagnostics.", "");
            switch (name) {
                case "DiagnosticsState":
                    updates.diagnosticsState = param.Value["#text"] || param.Value;
                    break;
                case "UploadURL":
                    updates.uploadUrl = param.Value["#text"] || param.Value;
                    break;
                case "Interface":
                    updates.interface = param.Value["#text"] || param.Value;
                    break;
                case "DSCP":
                    updates.dscp = Number(param.Value["#text"] || param.Value);
                    break;
                case "EthernetPriority":
                    updates.ethernetPriority = Number(param.Value["#text"] || param.Value);
                    break;
                case "TestFileLength":
                    updates.testFileLength = Number(param.Value["#text"] || param.Value);
                    break;
                case "ProtocolVersion":
                    updates.protocolVersion = param.Value["#text"] || param.Value;
                    break;
                case "NumberOfConnections":
                    updates.numberOfConnections = Number(param.Value["#text"] || param.Value);
                    break;
            }
        }
        LOGGER.info("Storing tr143 upload data ..");
        const dbUploadUpdated = await storage.updateUploadDiagnostics(updates);
        eventService.emit(EVENTS.UPLOAD_DIAGNOSTICS, dbUploadUpdated, EVENTS.UPLOAD_DIAGNOSTICS);
        LOGGER.info("TR143 Upload Diagnostics updated: " + JSON.stringify(dbUploadUpdated));
    }
    /* TR143 GPV  handle */
}
