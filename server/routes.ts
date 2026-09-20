import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { tr069 } from "./services/tr069";
import { manager } from "./services/diagnosticManager";
import { EventService, EVENTS } from "./services/eventService";
import { setEventService } from "./services/eventBus";
import { api } from "@shared/routes";
import { z } from "zod";
import fs from "fs";
import multer, { memoryStorage } from 'multer';
import http from "http";
import https from "https";
import { SocksProxyAgent } from "socks-proxy-agent";
//Added for upload download
import path from 'path';
import { getLogger } from './util/logutil';
import { DataSeeder } from './seeder';

// Configure once at app startup
const LOGGER = getLogger('ROUTES');
export const eventService = new EventService(tr069, manager);
// Publish the singleton so service modules can emit events without
// creating a circular import with this routes module.
setEventService(eventService);
const PERIODIC_INTERVAL_SEC = parseInt(process.env.PERIODIC_SEC || "80", 0); // 5 minutes default
let DYNAMIC_PERIODIC_INTERVAL_SEC = parseInt(process.env.PERIODIC_SEC || "60", 0); // 5 minutes default
const DEVICE_TR069_DATA_MODEL_TYPE = process.env.DEVICE_TR069_DATA_MODEL_TYPE || "InternetGatewayDevice";
// Interface for uploaded file info
const defaultAcsUrl = process.env.DEFAULT_ACS_URL || "http://trm-wg.fibercop.local:7080/cwmpWeb/CPEMgt";
const skipSeed = process.env.SKIP_SEED;
// Create the agent
// SOCKS proxy URL (SOCKS5 example)
const proxy = process.env.CONNECTION_REQEUST_SOCKS_PROXY_URL || "socks5://127.0.0.1:65509";
const agent = new SocksProxyAgent(proxy);

interface UploadedFileInfo {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: string; // Buffer converted to base64 for display
  characterCount?: number;
  wordCount?: number;
}
// Configure multer for memory storage
const upload = multer({
  storage: memoryStorage(), // Store files in memory as Buffer
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept text files, images, PDFs
    const allowedTypes = [
      'text/plain',
      'image/jpeg',
      'image/png',
      'application/pdf'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});
/* This code added for TR143 tests*/
// Create downloads directory if it doesn't exist
const tr143DownloadFiles = 'tr143DownloadFiles';
if (!fs.existsSync(tr143DownloadFiles)) {
  fs.mkdirSync(tr143DownloadFiles, { recursive: true });
}
/* From Here route registration code starts */

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  //Reafctor Seeder code //
  const seeder = new DataSeeder(storage, eventService, defaultAcsUrl, console);
  //Seeder Ends
  // Sample data
  const mockDevice = {
    manufacturer: process.env.DEFAULT_MANUFACTURER || "ZTEEE Technologies",
    model: process.env.DEFAULT_CPE_PRODUCTCLASS || "H5745 V3",
    oui: process.env.DEFAULT_CPE_OUI || "00D0D0",
    //productClass: "H2640",
    productClass: process.env.DEFAULT_CPE_PRODUCTCLASS || "H5745 V3",
    serialNumber: process.env.DEFAULT_CPE_SERIALNUMBER || "SIMH26408877891",
    softwareVersion: "V5R019C00S125",
    hardwareVersion: "168D.A",
    connectionStatus: "online",
    lastContact: "2026-01-17T14:32:45Z",
    ipAddress: "192.168.1.1",
    macAddress: "00:1A:2B:3C:4D:6E",
    uptime: "15d 7h 23m 45s",
  };

  app.get("/api/auth/user", async (req: any, res) => {
    LOGGER.info("Fetching authenticated user info...");
    try {
      const userId = "1";//req.user.claims.sub;
      //get the user from database
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  // --- TR-069 Service Endpoints ---

  // SOAP Endpoint (ACS talks to this)
  app.post("/acs", async (req, res) => {
    LOGGER.info("--->>> /acs...");
    let data = "";
    req.on("data", chunk => data += chunk);
    req.on("end", async () => {
      const responseXML = await tr069.handleSoapRequest(data);
      res.set("Content-Type", "text/xml");
      res.send(responseXML);
    });
  });
  // code for upload and download tests
  // File download endpoint
  app.get('/download/:filename', (req, res) => {
    // Prevent path traversal: only ever use the basename of the requested file,
    // so requests like /download/../../etc/passwd cannot escape the download dir.
    const filename = path.basename(req.params.filename);
    const filePath = path.join(tr143DownloadFiles, filename);

    // Verify the resolved file actually lives inside the download directory
    const resolvedDownloadDir = path.resolve(tr143DownloadFiles);
    if (!path.resolve(filePath).startsWith(resolvedDownloadDir + path.sep)) {
      return res.status(400).send('Invalid filename');
    }

    const fileStream = fs.createReadStream(filePath);

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe the file stream to the response
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Stream error:', error);
      res.status(500).send('Error streaming file');
    });
  });
  // Single file upload endpoint
  app.post('/upload', upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const file = req.file;
      const fileInfo: UploadedFileInfo = {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer.toString('base64').slice(0, 100) + '...' // First 100 chars
      };

      // If it's a text file, do some analysis
      if (file.mimetype === 'text/plain') {
        const text = file.buffer.toString('utf-8');
        fileInfo.characterCount = text.length;
        fileInfo.wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
      }

      res.json({
        message: 'File uploaded successfully (stored in memory)',
        file: fileInfo
      });

    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  // code of upload and download ends here 
  // --- API Endpoints ---

  app.get(api.parameters.list.path, async (req, res) => {
    LOGGER.info("Parameters API Called...." + api.parameters.list.path);
    const params = await storage.getParameters();
    res.json(params);
  });

  app.get(api.parameters.notifications.path, async (req, res) => {
    LOGGER.info("Notifications API Called...." + api.parameters.notifications.path);
    const params = await storage.getParametersNotifications();
    res.json(params);
  });

  app.put(api.parameters.update.path, async (req, res) => {
    LOGGER.info("HTTP PUT....." + api.parameters.update.path);
    const { name } = req.params;
    LOGGER.info("name =" + name);
    const { value, notification } = req.body;
    try {

      const oldParam = await storage.getParameter(name);
      LOGGER.warn("-----------SEND INFORM- oldParam --------" + oldParam);
      const updated = await storage.updateParameter(name, value, notification);
      LOGGER.warn("-----------SEND INFORM- updated--------" + updated);
      // Trigger Inform if value changed and notification is enabled
      if (oldParam && oldParam.value !== value && updated.notification > 0) {
        LOGGER.warn("-----------SEND INFORM---------");
        //await tr069.log("INFO", `Value changed for ${name}: ${oldParam.value} -> ${value}. Triggering Inform (Code: 4 VALUE CHANGE)`);
        //tr069.sendInformToACS("4 VALUE CHANGE").catch(e => console.error("Auto Inform failed", e));
        eventService.emit(EVENTS.INFORM_VALUE_CHANGE, [name], "4 VALUE CHANGE");
      }
      res.json(updated);
    } catch (e) {
      LOGGER.error(e);
      res.status(404).json({ message: "Parameter not found" });
    }
  });

  app.post(api.parameters.bulkInsert.path, async (req, res) => {
    LOGGER.info("Bulk insert parameters API called...." + api.parameters.bulkInsert.path);
    try {
      const parsed = api.parameters.bulkInsert.input.safeParse(req.body);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        return res.status(400).json({
          message: first?.message ?? "Invalid parameter payload",
          field: first?.path?.join("."),
        });
      }
      const result = await storage.bulkUpsertParameters(parsed.data);
      LOGGER.info(`Bulk insert done: inserted=${result.inserted} updated=${result.updated}`);
      res.json(result);
    } catch (e: any) {
      LOGGER.error("Bulk insert failed: " + e.message);
      res.status(500).json({ message: e.message });
    }
  });

  app.get(api.settings.list.path, async (req, res) => {
    const settings = await storage.getSettings();
    res.json(settings);
  });

  app.post(api.settings.update.path, async (req, res) => {
    const updates = req.body;
    const result = [];
    LOGGER.info(`Settings update ${api.settings.update.path} with values ` + JSON.stringify(updates));
    for (const u of updates) {
      result.push(await storage.updateSetting(u.key, u.value));
      //we also need to update parameters table
      if (u.key == 'acsUrl') {
        await storage.updateParameter(DEVICE_TR069_DATA_MODEL_TYPE + ".ManagementServer.URL", u.value, 0);
      }
      if (u.key == 'username') {
        await storage.updateParameter(DEVICE_TR069_DATA_MODEL_TYPE + ".ManagementServer.Username", u.value, 0);
      }
      if (u.key == 'password') {
        await storage.updateParameter(DEVICE_TR069_DATA_MODEL_TYPE + ".ManagementServer.Password", u.value, 0);
      }
      if (u.key == 'connectionRequestURL') {
        const paramName = DEVICE_TR069_DATA_MODEL_TYPE + ".ManagementServer.ConnectionRequestURL";
        // Update the data model parameter (same value as the setting)
        await storage.updateParameter(paramName, u.value, 0);
        // Emit the Value Change event AFTER both the settings and
        // parameter table updates have completed.
        eventService.emit(EVENTS.INFORM_VALUE_CHANGE, [paramName], "4 VALUE CHANGE");
      }
    }
    res.json(result);
  });

  app.get(api.logs.list.path, async (req, res) => {
    const logs = await storage.getLogs();
    res.json(logs);
  });

  app.delete(api.logs.clear.path, async (req, res) => {
    await storage.clearLogs();
    res.status(204).send();
  });

  app.post(api.simulation.inform.path, async (req, res) => {
    LOGGER.info("Starting sending inform ....");
    try {
      LOGGER.info("Body to get Ebent Code ", req.body);
      //await tr069.sendInformToACS(req.body.eventCode);
      // We pass the log.id so the handler can update the specific log entry
      eventService.emit(EVENTS.INFORM, api.simulation.inform.path, req.body.eventCode);
      res.json({ success: true, message: "Inform sent" });
    } catch (e: any) {
      res.json({ success: false, message: e.message });
    }
  });

  app.get(api.transfers.list.path, async (req, res) => {
    const result = await storage.getTransfers();
    res.json(result);
  });

  app.get('/connectionReqeust', async (req, res) => {
    try {
      const datadataToSend = { eventCode: '7 CONNECTION REQUEST', message: 'Connection Reqeust' };
      eventService.emit(EVENTS.INFORM, datadataToSend.message, datadataToSend.eventCode);
      res.json({ success: true, message: "Connection Request sent successfully" });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  });
  app.post(api.simulation.transferComplete.path, async (req, res) => {
    const { transferId } = req.body;
    try {
      await tr069.sendTransferComplete(transferId);
      res.json({ success: true, message: "Transfer complete signal sent" });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  app.get(api.cpe.info.path, async (req, res) => {
    LOGGER.info("Routes called ..." + api.cpe.info.path);
    try {
      const params = await storage.getParameters();
      const find = (suffix: string) =>
        params.find(p => p.name === DEVICE_TR069_DATA_MODEL_TYPE + ".DeviceInfo." + suffix)?.value;
      const wanIp = params.find(p =>
        p.name.includes("WANConnectionDevice") && p.name.endsWith(".ExternalIPAddress")
      )?.value;

      res.json({
        manufacturer: find("Manufacturer") || mockDevice.manufacturer,
        model: find("ModelName") || mockDevice.model,
        oui: find("ManufacturerOUI") || mockDevice.oui,
        productClass: find("ProductClass") || mockDevice.productClass,
        serialNumber: find("SerialNumber") || mockDevice.serialNumber,
        softwareVersion: find("SoftwareVersion") || mockDevice.softwareVersion,
        hardwareVersion: find("HardwareVersion") || mockDevice.hardwareVersion,
        connectionStatus: "online",
        lastContact: new Date().toISOString(),
        ipAddress: wanIp || "192.168.1.1",
        macAddress: "00:1A:2B:3C:4D:6E",
        uptime: find("UpTime") || mockDevice.uptime,
      });
    } catch (e) {
      LOGGER.error("Failed to build CPE info, falling back to mock data:" + e);
      res.json(mockDevice);
    }
  });

  // -----------------------------
  // TR143 route definition starts here 
  // -----------------------------

  // API Routes
  app.get(api.download.get.path, async (req, res) => {
    const data = await storage.getDownloadDiagnostics();
    res.json(data);
  });

  app.post(api.download.update.path, async (req, res) => {
    try {
      LOGGER.info("EXPRESS Download Diagnostics update called....");
      const input = api.download.update.input.parse(req.body);
      if (!input.downloadUrl) {
        return res.status(400).json({ message: "download url is required" });
      }
      const updated = await storage.updateDownloadDiagnostics({
        ...input,
        diagnosticsState: input.diagnosticsState as any
      });
      eventService.emit(EVENTS.DOWNLOAD_DIAGNOSTICS, input, EVENTS.DOWNLOAD_DIAGNOSTICS);
      LOGGER.info("EXPRESS Download Diagnostics updated: " + JSON.stringify(updated));
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors });
      }
      throw err;
    }
  });

  app.get(api.upload.get.path, async (req, res) => {
    LOGGER.info("EXPRESS Upload Diagnostics get called....");
    const data = await storage.getUploadDiagnostics();
    LOGGER.info("EXPRESS Upload Diagnostics data: " + JSON.stringify(data));
    res.json(data);
  });

  app.post(api.upload.update.path, async (req, res) => {
    try {
      LOGGER.info("EXPRESS Upload Diagnostics update called....");
      const input = api.upload.update.input.parse(req.body);
      LOGGER.info("EXPRESS Upload Diagnostics input: " + JSON.stringify(input));
      if (!input.uploadUrl) {
        return res.status(400).json({ message: "upload url is required" });
      }
      const updated = await storage.updateUploadDiagnostics({
        ...input,
        diagnosticsState: input.diagnosticsState as any
      });
      eventService.emit(EVENTS.UPLOAD_DIAGNOSTICS, input, EVENTS.UPLOAD_DIAGNOSTICS);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors });
      }
      throw err;
    }
  });

  app.get(api.history.list.path, async (req, res) => {
    const history = await storage.getTestHistory();
    res.json(history);
  });


  //Added for TR143 
  // Initialize DB with singleton rows
  await storage.init();
  /*
  // Seed Data , this is first time population
  */
  // Seed everything (e.g., on first run)

  //check if seed is no
  if (process.env.SKIP_SEED === 'NO') {
    await seeder.seedInitialData();
    await seeder.seedWANData();
    await seeder.seedNotificationData();
    await seeder.seedDeviceData(mockDevice);
  } else {
    LOGGER.warn("Data Seeding Skipp");
  }

  //For testing comment and uncomments
  startPeriodicInform();
  // Pass the resolved mock-device serial so the CR URLs are always built with a
  // real serial number (never the literal string "undefined").
  startCRServer(mockDevice.serialNumber);
  //await startWebSocketClient(eventService);
  return httpServer;
} //Register route class ends here 


// -----------------------------
// Periodic Inform scheduler
// -----------------------------

async function startPeriodicInform() {
  console.log(`[startPeriodicInform] Running task, interval (seconds): ${DYNAMIC_PERIODIC_INTERVAL_SEC}`);
  LOGGER.info(`[CPE] Periodic Inform every ${DYNAMIC_PERIODIC_INTERVAL_SEC} seconds.`);
  try {
    // Refresh the interval from the DB for the NEXT execution
    const intervalSetting = await storage.getSetting("interval");
    const newInterval = parseInt(intervalSetting?.value || "60", 10);
    if (!isNaN(newInterval) && newInterval > 0) {
      DYNAMIC_PERIODIC_INTERVAL_SEC = newInterval;
      console.log(`Updated dynamic periodic interval to: ${DYNAMIC_PERIODIC_INTERVAL_SEC} seconds`);
    } else {
      console.log(`Invalid periodicIntervalSec value: ${intervalSetting?.value}, keeping previous: ${DYNAMIC_PERIODIC_INTERVAL_SEC} seconds`);
    }

    const enabledSetting = await storage.getSetting("periodicInformEnabled");
    const periodicInformEnabled = enabledSetting?.value === "true";
    if (periodicInformEnabled) {
      LOGGER.info(`[CPE] Periodic Inform is enabled. Next inform in ${DYNAMIC_PERIODIC_INTERVAL_SEC} seconds.`);
      LOGGER.info(Date.now() + " :## Sending Periodic Inform ......" + DYNAMIC_PERIODIC_INTERVAL_SEC);
      eventService.emit(EVENTS.INFORM, "PERIODIC TIMER", "2 PERIODIC");
    } else {
      LOGGER.info(`[CPE] Periodic Inform is disabled. next check for further informs will be sent.`);
    }
  } catch (error) {
    // A DB failure here must NOT stop the periodic informs permanently.
    console.error("Error in startPeriodicInform:", error);
    LOGGER.error("Error in startPeriodicInform:", error);
  } finally {
    // Always re-arm the timer (both on success and on error) so the
    // periodic inform never silently stops.
    setTimeout(startPeriodicInform, DYNAMIC_PERIODIC_INTERVAL_SEC * 1000);
  }
}



async function startCRServer(serialNumber?: string) {
  try {
    // The CPE serial number is appended to every CR URL. If it is missing the
    // URL would end with the literal text "undefined" (e.g.
    // .../crstatus/undefined). Resolve it in the same way as the mock device
    // (env var first, then the default), and bail out if it is still empty.
    const serial = (serialNumber ?? process.env.DEFAULT_CPE_SERIALNUMBER ?? "").trim();
    if (!serial) {
      LOGGER.error("startCRServer: CPE serial number is not set (DEFAULT_CPE_SERIALNUMBER). Skipping CR registration/status polling.");
      return;
    }

    //set the CR url 
    const connReqUrlOnDeviceBase = (process.env.CONNECTION_REQEUST_URL_ON_DEVICE ?? "").trim();
    const connReqUrlBase = (process.env.CONNECTION_REQEUST_URL ?? "").trim();
    const registerUrlBase = (process.env.CONNECTION_REQEUST_REGISTER_URL ?? "").trim();
    const crStatusUrlBase = (process.env.CONNECTION_REQEUST_CR_STATUS_URL ?? "").trim();

    // Don't send bogus requests like /crstatus/undefined when the CR server
    // URLs are not configured.
    if (!registerUrlBase || !crStatusUrlBase) {
      LOGGER.warn(`startCRServer: CONNECTION_REQEUST_REGISTER_URL / CONNECTION_REQEUST_CR_STATUS_URL not configured (got '${registerUrlBase}' / '${crStatusUrlBase}'). Skipping CR registration/status polling.`);
      return;
    }

    const CONNECTION_REQEUST_URL_ON_DEVICE = `${connReqUrlOnDeviceBase}${serial}`;
    const CONNECTION_REQEUST_URL = `${connReqUrlBase}${serial}`;
    const CONNECTION_REQEUST_REGISTER_URL = `${registerUrlBase}${serial}`;
    const CONNECTION_REQEUST_CR_STATUS_URL = `${crStatusUrlBase}${serial}`;

    LOGGER.info("Starting CR server , and setting CR url to --> " + CONNECTION_REQEUST_URL);
    const regUrl = `${CONNECTION_REQEUST_REGISTER_URL}`;
    LOGGER.info("startCRServer regurl -->" + regUrl);
    await storage.updateParameter(DEVICE_TR069_DATA_MODEL_TYPE + ".ManagementServer.ConnectionRequestURL", CONNECTION_REQEUST_URL_ON_DEVICE);
    const result: any = (process.env.CONNECTION_REQEUST_AGENT_ENABLED === 'true') ? await registerCRRequest(regUrl) : await registerCRRequestNoSocksAgent(regUrl);
    LOGGER.info("Registration Status Code:", result.statusCode);
    LOGGER.info("Response Body:", result.body);
    const isHttps = CONNECTION_REQEUST_URL_ON_DEVICE.startsWith("https");
    const crClient = isHttps ? https : http;
    setInterval(() => {

      //LOGGER.info('CR interval timer !!');
      //cr url http://10.190.23.233:8080/connectionRequest/1
      //console.log("Task running at", new Date().toISOString());
      // Target URL
      let crStatusUrl = CONNECTION_REQEUST_CR_STATUS_URL;// + (process.env.DEFAULT_CPE_SERIALNUMBER || "SIMH26408877791");
      //check CR status
      console.log("CR Status Code url -->:", crStatusUrl);
      if (process.env.CONNECTION_REQEUST_AGENT_ENABLED === 'true') {
        console.log("CR Status Code url -->:", crStatusUrl);
        crClient.get(crStatusUrl, { agent }, (res) => {
          let body = "";
          res.on("data", (chunk) => {
            body += chunk.toString();
          });
          //console.log("CR Status Code from CR Server-->:", res.statusCode);
          LOGGER.info("CR Status Code from CR Server-->:", res.statusCode);
          LOGGER.info("CR Status Code from body -->:", body);
          if (res.statusCode == 200) {
            //Send CR  inform
            try {
              //tr069.sendInformToACS("2 PERIODIC");
              // 2. Emit the event to the Node.js EventEmitter
              // We pass the log.id so the handler can update the specific log entry

              //Commented out for troubleshooting 401-SPV
              LOGGER.info("Sending CR inform....");
              eventService.emit(EVENTS.INFORM, "CR TIMER-1 from routes.ts", "7 CONNECTION REQUEST");

            } catch (error) {

              console.log(error);
            }
          }
          res.on("data", (chunk) => {
            //console.log("Body:", chunk.toString());
          });
        });
      } else {
        console.log("CR Status Code url -->:", crStatusUrl);
        // 1. Generate the Base64 Auth header value
        const authHeader = 'Basic ' + Buffer.from('admin:admin1234').toString('base64');
        // 2. Add Firefox spoofing elements and Auth parameters
        const requestOptions = {
          headers: {
            'Authorization': authHeader,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/png,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive'
          }
        };

        crClient.get(crStatusUrl, requestOptions, (res) => {
          //console.log("CR Status Code from CR Server-->:", res.statusCode);
          LOGGER.info("CR Status Code from CR Server-->:", res.statusCode);
          //print response
          LOGGER.info("CR Status  RESPONSE from CR Server-->:", res.rawBody);
          if (res.statusCode == 200) {
            //Send CR  inform
            try {
              //tr069.sendInformToACS("2 PERIODIC");
              // 2. Emit the event to the Node.js EventEmitter
              // We pass the log.id so the handler can update the specific log entry

              //Commented out for troubleshooting 401-SPV
              LOGGER.info("Sending CR inform....");
              eventService.emit(EVENTS.INFORM, "CR TIMER-1 from routes.ts", "7 CONNECTION REQUEST");

            } catch (error) {

              console.log(error);
            }
          }
          res.on("data", (chunk) => {
            //console.log("Body:", chunk.toString());
          });
        });

      }

      // your logic here
    }, 1 * 5000); // 30 seconds
  } catch (error) {
    LOGGER.error("CR Requests may not work CR Server  error:", error);
    console.error("--IGNORING----");
  }

}

async function registerCRRequest(url: any) {
  return new Promise((resolve, reject) => {
    // Always send browser-like headers (Cloudflare bypass)
    const options: { headers: Record<string, string>; agent?: http.Agent | https.Agent } = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9"
      }

    };
    const isHttps = url.startsWith("https");
    if (process.env.CONNECTION_REQEUST_AGENT_ENABLED === "true") {
      options.agent = isHttps
        ? new https.Agent({ keepAlive: true })
        : new http.Agent({ keepAlive: true });
    }
    const req = http.get(url, { agent }, (res) => {
      let body = "";

      res.on("data", (chunk) => {
        body += chunk.toString();
      });

      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          body
        });
      });
    });

    req.on("error", (err) => {
      reject(err);
    });
  });
}



async function registerCRRequestNoSocksAgent(url: any) {
  LOGGER.info("registerCRRequestNoSocksAgent url -->" + url);

  // 1. Generate the Base64 Auth header value
  const authHeader = 'Basic ' + Buffer.from('admin:admin1234').toString('base64');
  // 2. Add Firefox spoofing elements and Auth parameters
  const requestOptions = {
    headers: {
      'Authorization': authHeader,
      'User-Agent': 'Node-DeviceClient/1.0.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/png,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Connection': 'keep-alive'
    }
  };
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith("https");
    const crClient = isHttps ? https : http;

    const req = crClient.get(url, requestOptions, (res) => {
      let body = "";

      res.on("data", (chunk) => {
        body += chunk.toString();
      });

      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          body
        });
      });
    });

    req.on("error", (err) => {
      reject(err);
    });
  });
}
