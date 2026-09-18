import { storage } from "../storage";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { getLogger } from '../util/logutil';
import nodeFetch from 'node-fetch';
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import fetchCookieCustom from 'fetch-cookie';
const fetchCookie = (typeof fetchCookieCustom === 'function' ? fetchCookieCustom : (fetchCookieCustom as any).default);
import * as tough from "tough-cookie";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";
import http from "http";
import https from "https";
const DEVICE_TR069_DATA_MODEL_TYPE = process.env.DEVICE_TR069_DATA_MODEL_TYPE || "InternetGatewayDevice";
import { eventService } from "server/routes";
import { TR143Service } from "./tr143";
const cookieJar = new CookieJar();
import { SocksProxyAgent, type SocksProxyAgentOptions } from 'socks-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';

let latestUrl = process.env.CURRENT_BASE_URL || 'https://trm-wg-acscoll.azure.fibercop.local/cwmpWeb/WGCPEMgt';;
import type { ConnectionOptions } from 'tls';
//const fetchCookie = (typeof _fetchCookie === 'function' ? _fetchCookie : (_fetchCookie as any).default);
// Configure once at app startup
// Create a new fetch instance that automatically handles cookies
//let cookieEnabledFetch = fetchCookie(globalThis.fetch, new CookieJar());
let cookieEnabledFetch = fetchCookie(nodeFetch, cookieJar);
const LOGGER = getLogger('TR069');
const jar = new tough.CookieJar();
//AGENT 1: http Proxy - you need http proxy tunnel
// Code added for http and https proxy
// HTTPS agent (for https:// URLs)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const httpProxyUrl = process.env.HTTP_PROXY_URL || "http://127.0.0.1:18282";   // your HTTP proxy
const httpsProxyAgent = new HttpsProxyAgent(httpProxyUrl, {
  rejectUnauthorized: false, // ignore SSL errors from target server
  keepAlive: true
});
//AGENT 2:https agent
// Create keep‑alive agents
// Create the agent to ignore SSL certification errors
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({
  keepAlive: true,
  rejectUnauthorized: false // This ignores the self-signed or invalid certificate error
});

// AGENT 3: Initialize your SOCKS Proxy Agent (Supports SOCKS4, SOCKS4a, and SOCKS5)
// Format: socks://[username:password@]host:port
const socksProxyUrl = process.env.SOCKS_PROXY_URL || 'socks5h://127.0.0.1:65509';
// 2. Combine SOCKS routing and custom HTTPS options into a single agent
// Explicitly combine the SOCKS types with TLS connection types
const agentOptions: SocksProxyAgentOptions & ConnectionOptions = {
  keepAlive: true,
  rejectUnauthorized: false // ✅ Recognized perfectly by TypeScript now
};
const socksAgent = new SocksProxyAgent(socksProxyUrl, agentOptions);
// node-fetch will call this function with the parsed URL
function agentSelector(parsedURL: any) {
  return parsedURL.protocol === "http:"
    ? httpAgent
    : httpsAgent;
}

// Create axios instance WITH agents first
const client = axios.create({
  jar,
  withCredentials: true,
  httpsAgent,
  httpAgent,
  timeout: 15000
});

// Wrap AFTER creating axios instance
//export const client = wrapper(axiosInstance);
const messageTypeMap = {
  'Inform': 'Inform',
  'GetParameterValues': 'GetParameterValues',
  'SetParameterValues': 'SetParameterValues',
  'GetParameterNames': 'GetParameterNames',
  'GetParameterAttributes': 'GetParameterAttributes',
  'SetParameterAttributes': 'SetParameterAttributes',
  'AddObject': 'AddObject',
  'DeleteObject': 'DeleteObject',
  'Download': 'Download',
  'Upload': 'Upload',
  'Reboot': 'Reboot',
  'FactoryReset': 'FactoryReset',
  // Add more as needed (including responses if desired)
  'InformResponse': 'InformResponse',
  'GetParameterValuesResponse': 'GetParameterValuesResponse',
  // etc.
};

// Attach cookies before request
client.interceptors.request.use(async config => {
  const url = config.url!;
  const cookieHeader = await jar.getCookieString(url);
  LOGGER.info("[SOAP_OUT_FINAL]-----> REQEUST COOKIES-----")
  LOGGER.info(cookieHeader);
  if (cookieHeader) {
    config.headers = config.headers || {};
    config.headers["Cookie"] = cookieHeader;
  }
  return config;
});

// Store cookies after response
client.interceptors.response.use(async response => {
  const setCookie = response.headers["set-cookie"];
  // Clear cookies if server returns 204
  LOGGER.info("[SOAP_IN_FIRST]<-----RESPONSE SETCOOOKIE -----")

  if (response.status === 200 && response.data.length == 0) {
    LOGGER.info("Since its zero bytes end session clearing cookies!");
    jar.removeAllCookiesSync();
  }


  LOGGER.info(setCookie);
  if (setCookie) {
    const url = response.config.url!;
    for (const c of setCookie) {
      await jar.setCookie(c, url);
    }
  }
  return response;
});


/**
 * POST request with Bearer token support
 */
async function postAxiosWithToken<T = any>(
  url: string,
  data: any,
  token: string,
  config: AxiosRequestConfig = {}
) {
  const headers = {
    Authorization: `Basic ${token}`,
    "Content-Type": "application/xml",
    ...(config.headers || {})
  };

  return client.post<T>(url, data, { ...config, headers });
}


const SOAP_ENV_NS = "http://schemas.xmlsoap.org/soap/envelope/";
const CWMP_NS = "urn:dslforum-org:cwmp-1-0";
const ACS_SEND_TIMEOUT_MS = 5000; // 50 seconds
export class TR069Service {
  private tr143Service: TR143Service;
  private parser: XMLParser;
  private builder: XMLBuilder;
  private isRebooting = false;
  private isSendingDataToAcs = false;
  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      removeNSPrefix: true

    });
    this.builder = new XMLBuilder({
      ignoreAttributes: false,
      format: true,
    });
    this.tr143Service = new TR143Service(this);
  }

  public async log(type: "INFO" | "ERROR" | "SOAP_IN" | "SOAP_OUT", message: string, details?: string) {
    console.log("~~~~~~~~~~~~~~~~~LOGGING~~~~~~~~~~~~~~~")
    //console.log(`[${type}] ${message}`);
    if (type === "ERROR") {
      LOGGER.error('Something went wrong', new Error(message));
      LOGGER.error(details);
    } else {
      //LOGGER.info(`[${type}] ${message}`);
      //LOGGER.info(details);
    }

    await storage.createLog({ type, message, details });
  }
  public async communicationsLog(type: "INFO" | "ERROR" | "SOAP_IN" | "SOAP_OUT", message: string, details?: string) {
    console.log("~~~~~~~~~~~~~~~~~LOGGING~~~~~~~~~~~~~~~")
    //console.log(`[${type}] ${message}`);
    if (type === "ERROR") {
      LOGGER.error('Something went wrong', new Error(message));
      LOGGER.error(details);
    } else {
      //LOGGER.info(`[${type}] ${message}`);
      //LOGGER.info(details);
    }

    await storage.createLog({ type, message, details });
  }

  // --- XML Building Helpers ---

  public buildEnvelope(bodyContent: any, headerContent?: any) {
    const envelope = {
      "SOAP-ENV:Envelope": {
        "@_xmlns:SOAP-ENV": SOAP_ENV_NS,
        "@_xmlns:SOAP-ENC": "http://schemas.xmlsoap.org/soap/encoding/",
        "@_xmlns:cwmp": CWMP_NS,
        "@_xmlns:xsd": "http://www.w3.org/2001/XMLSchema",
        "@_xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
        "SOAP-ENV:Header": headerContent || {},
        "SOAP-ENV:Body": bodyContent,
      },
    };
    //LOGGER.info("Building SOAP Envelope :" + this.builder.build(envelope));
    return this.builder.build(envelope);
  }

  async generateInform(eventCode: string = "2 PERIODIC", paramName?: string[]) {
    const params = await storage.getParameters();
    const settingsList = await storage.getSettings();
    const serialNumber = params.find(p => p.name === DEVICE_TR069_DATA_MODEL_TYPE + ".DeviceInfo.SerialNumber")?.value || "000001";
    const oui = params.find(p => p.name === DEVICE_TR069_DATA_MODEL_TYPE + ".DeviceInfo.ManufacturerOUI")?.value || "000000";
    const productClass = params.find(p => p.name === DEVICE_TR069_DATA_MODEL_TYPE + ".DeviceInfo.ProductClass")?.value || "Generic";
    //
    // Always include these parameters in inform
    const mandatoryParams = [
      DEVICE_TR069_DATA_MODEL_TYPE + '.DeviceInfo.SpecVersion',
      DEVICE_TR069_DATA_MODEL_TYPE + '.DeviceInfo.HardwareVersion',
      DEVICE_TR069_DATA_MODEL_TYPE + '.DeviceInfo.SoftwareVersion',
      DEVICE_TR069_DATA_MODEL_TYPE + '.DeviceInfo.ProvisioningCode',
      DEVICE_TR069_DATA_MODEL_TYPE + '.ManagementServer.ParameterKey',
      DEVICE_TR069_DATA_MODEL_TYPE + '.ManagementServer.ConnectionRequestURL',
      (DEVICE_TR069_DATA_MODEL_TYPE == 'Device.') ? 'Device.IP.Interface.1.IPv4Address.1.IPAddress' : 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ExternalIPAddress',
      DEVICE_TR069_DATA_MODEL_TYPE + '.ManagementServer.AliasBasedAddressing'

    ];
    //Add IP address


    var filteredParams = [];
    for (var i = 0; i < params.length; i++) {
      if (mandatoryParams.includes(params[i].name)) {
        filteredParams.push(params[i]);
      }
    }

    //Now add any parameter passed from value change
    if (paramName) {
      for (const d of paramName) {
        const vcParam = await storage.getParameter(d);
        filteredParams.push(vcParam);
      }

    }
    if (filteredParams.length < 8) {
      LOGGER.error("Missing parameters! from Mandatory Paremets to be checked why");
    }

    //Now add IP address if present 

    // Construct ParameterList
    const parameterList = filteredParams.map(p => {
      if (!p) return null;
      return {
        ParameterValueStruct: {
          Name: p.name,
          Value: {
            "#text": p.value,
            "@_xsi:type": this.getXsiType(p.type)
          }
        }
      };
    }).filter(item => item !== null);


    const body = {
      "cwmp:Inform": {
        DeviceId: {
          "@_xmlns": "urn:dslforum-org:cwmp-1-0",
          Manufacturer: params.find(p => p.name === DEVICE_TR069_DATA_MODEL_TYPE + ".DeviceInfo.Manufacturer")?.value || "Replit",
          OUI: oui,
          ProductClass: productClass,
          SerialNumber: serialNumber,
        },
        Event: {
          "@_SOAP-ENC:arrayType": "cwmp:EventStruct[1]",
          EventStruct: {
            EventCode: eventCode,
            CommandKey: "",
          },
        },
        MaxEnvelopes: 1,
        CurrentTime: new Date().toISOString(),
        RetryCount: 0,
        ParameterList: {
          "@_SOAP-ENC:arrayType": `cwmp:ParameterValueStruct[${parameterList.length}]`,
          // In fast-xml-parser, array of same key
          ParameterValueStruct: parameterList.map(p => p.ParameterValueStruct)
        }
      },
    };

    const xml = this.buildEnvelope(body, {
      "cwmp:ID": {
        "#text": Math.floor(Math.random() * 10000).toString(),
        "@_SOAP-ENV:mustUnderstand": "1"
      }
    });

    return xml;
  }

  public getXsiType(type: string): string {
    switch (type) {
      case 'int': return 'xsd:int';
      case 'unsignedInt': return 'xsd:unsignedInt';
      case 'boolean': return 'xsd:boolean';
      case 'dateTime': return 'xsd:dateTime';
      default: return 'xsd:string';
    }
  }

  // --- SOAP Handling ---

  async handleSoapRequest(xmlRaw: string): Promise<string> {
    try {
      await this.log("SOAP_IN", "Received SOAP Request", xmlRaw);
      //remove all instances of soapenv cwmp etc
      const unwanted = ["soapenv:", "cwmp:", "@xsi:"]; // Substrings to remove
      // Create a regex like /world|!|is/g
      const regex = new RegExp(unwanted.join('|'), 'g');
      const xml = xmlRaw.replace(regex, ''); // Replace with empty string
      const parsed = this.parser.parse(xml);
      const body = parsed.Envelope?.Body;
      LOGGER.info("===parsed====");
      LOGGER.info(parsed);
      LOGGER.info("===body====");
      LOGGER.info(body);
      //LOGGER.info(body.InformResponse);
      if (!body) throw new Error("Invalid SOAP Envelope");

      if (body.GetParameterValues) {
        return await this.handleGetParameterValues(body.GetParameterValues);
      } else if (body.SetParameterValues) {
        return await this.handleSetParameterValues(body.SetParameterValues);
      } else if (body.SetParameterAttributes) {
        return await this.handleSetParameterAttribute(body.SetParameterAttributes);
      } else if (body.GetParameterNames) {
        return await this.handleGetParameterNames(body.GetParameterNames);
      } else if (body.Reboot) {
        return await this.handleReboot(body.Reboot);
      } else if (body.InformResponse) {
        // ACS acknowledged our Inform.
        // Usually we return an empty request to signal we have no more to send, 
        // or we wait for their requests. 
        // For this simulation, receiving an InformResponse means we are 'connected'.
        await this.log("INFO", "ACS acknowledged Inform");
        return ""; // Return empty to close or keep alive depending on server impl.
      } else if (body.Download) {
        return await this.handleDownload(body.Download);
      } else if (body.Upload) {
        return await this.handleUpload(body.Upload);
      } else if (body.TransferCompleteResponse) {
        await this.log("INFO", "ACS acknowledged TransferComplete");
        return "";
      }

      await this.log("ERROR", "Unknown SOAP Method", JSON.stringify(body));
      return this.buildFault("8000", "Method not supported");

    } catch (err: any) {
      console.log(err);
      await this.log("ERROR", "Error handling SOAP", err.message);
      LOGGER.error(xmlRaw);
      return this.buildFault("9000", "Internal Error");
    }
  }

  async handleReboot(request: any) {
    LOGGER.info("handleReboot called");
    //const body = `< cwmp: RebootResponse /> `;
    const body = {
      "cwmp:RebootResponse": {

      }
    };
    const xml = this.buildEnvelope(body, {
      "cwmp:ID": {
        "#text": request.CommandKey,
        "@_SOAP-ENV:mustUnderstand": "1"
      }
    });
    this.performReboot();
    await this.log("SOAP_OUT", "Sending Reboot", xml);
    return xml;

  }

  async handleGetParameterValues(request: any) {
    // 1. Correct Data Extraction
    // Based on your note: namesRootArr[0] contains the object with the "string" array
    const paramNamesRoot = request.ParameterNames;
    const namesRootArr = Array.isArray(paramNamesRoot) ? paramNamesRoot : [paramNamesRoot];

    // Extract the actual strings from the nested property
    const namesData = namesRootArr[0]?.string;
    const names: string[] = Array.isArray(namesData) ? namesData : (namesData ? [namesData] : []);

    LOGGER.info(`handleGetParameterValues names: ${JSON.stringify(names)}`);

    let filteredParams: any[] = [];

    // 2. Optimized Database Retrieval
    if (names.length === 1 && names[0].includes('config.ConfigFile')) {
      LOGGER.info("GPV for config file - backup command from ACS");
      filteredParams = await storage.getParameters();
    } else {
      // Fire all DB queries in parallel for better performance
      const tasks = names.map(async (name) => {
        if (!name.endsWith(".")) {
          const singleParam = await storage.getParameter(name);
          return singleParam ? [singleParam] : [];
        } else {
          return await storage.getMatchingParameters(name);
        }
      });

      const results = await Promise.all(tasks);
      // Flatten array of arrays into a single list
      filteredParams = results.flat();
    }

    // 3. Map to SOAP/CWMP Structure
    const responseList = filteredParams.map(p => ({
      Name: p.name,
      Value: {
        "#text": p.value,
        "@_xsi:type": this.getXsiType(p.type)
      }
    }));

    // 4. Build Response Envelope
    const body = {
      "cwmp:GetParameterValuesResponse": {
        ParameterList: {
          "@_SOAP-ENC:arrayType": `cwmp:ParameterValueStruct[${responseList.length}]`,
          ParameterValueStruct: responseList
        }
      }
    };

    const xml = this.buildEnvelope(body, {
      "cwmp:ID": {
        "#text": Math.floor(Math.random() * 10000).toString(),
        "@_SOAP-ENV:mustUnderstand": "1"
      }
    });

    await this.log("SOAP_OUT", "Sending GetParameterValuesResponse", xml);
    return xml;
  }


  async handleSetParameterValues(request: any) {
    LOGGER.info("handleSetParameterValues starting....")
    const paramList = request.ParameterList.ParameterValueStruct;
    const params = Array.isArray(paramList) ? paramList : [paramList];
    console.log("--------------------------------");
    console.log(paramList);
    console.log(JSON.stringify(params));
    for (const p of params) {
      //first check if parameter exists 
      const dbParam = await storage.getParameter(p.Name);
      LOGGER.info("handleSetParameterValues(ACS) :" + p)
      LOGGER.info("handleSetParameterValues before update (CPE) :" + dbParam)
      LOGGER.info(dbParam);
      //Check if acs parameter is set 
      LOGGER.info("SPV checking is ACS parameters to be updated !!");
      if (p.Name.indexOf('ManagementServer.URL') != -1) {
        //Update ACS url settings
        await storage.updateSetting('acsUrl', p.Value["#text"]);
        LOGGER.info("SPV Updating ACS URL to :" + p.Value["#text"]);
        latestUrl = p.Value["#text"];
      }
      if (p.Name.indexOf('ManagementServer.Username') != -1) {
        //Update ACS url settings
        await storage.updateSetting('username', p.Value["#text"]);
        LOGGER.info("SPV Updating ACS Username to :" + p.Value["#text"]);

      }
      if (p.Name.indexOf('ManagementServer.Password') != -1) {
        //Update ACS url settings
        await storage.updateSetting('password', p.Value["#text"]);
        LOGGER.info("SPV Updating ACS Password to :" + p.Value["#text"]);

      }
      if (p.Name.indexOf('ManagementServer.PeriodicInformInterval') != -1) {
        //Update ACS url settings
        await storage.updateSetting('interval', p.Value["#text"]);
        LOGGER.info("SPV Updating ACS PeriodicInformInterval to :" + p.Value["#text"]);

      }
      const settingsList = await storage.getSettings();
      LOGGER.info("---------handleSetParameterValues  after (CPE) :-----------")
      LOGGER.info(settingsList);
      if (dbParam) {
        LOGGER.warn("@@@@@@@@@ before " + JSON.stringify(dbParam));
        LOGGER.warn("@@@@@@@@@ value " + p.Value["#text"]);
        const dbReturnValue = await storage.updateParameter(p.Name, p.Value["#text"] || p.Value);
        LOGGER.warn("@@@@@@@@@ After " + JSON.stringify(dbReturnValue));
      } else {
        var dataType = (p.type ? p.type.replace("xsd:", "") : "string");
        await storage.createParameter({ name: p.Name, value: p.Value["#text"], type: dataType, writable: true });
      }

    }//end of for loop

    const body = {
      "cwmp:SetParameterValuesResponse": {
        Status: 0
      }
    };

    const xml = this.buildEnvelope(body, {
      "cwmp:ID": {
        "#text": Math.floor(Math.random() * 10000).toString(),
        "@_SOAP-ENV:mustUnderstand": "1"
      }
    });
    await this.log("SOAP_OUT", "Sending SetParameterValuesResponse", xml);
    //check if its TR143 DownloadDiagnostics SetParameterValues
    setImmediate(async () => {
      // Check if it's a Download or Upload Diagnostics SPV
      const isDownload = params.some(param => param.Name.startsWith(DEVICE_TR069_DATA_MODEL_TYPE + ".Diagnostics.DownloadDiagnostics."));
      const isUpload = params.some(param => param.Name.startsWith(DEVICE_TR069_DATA_MODEL_TYPE + ".Diagnostics.UploadDiagnostics."));
      if (isDownload) {
        await this.tr143Service.handleTR143DownloadSetParameterValues(params);
      } else if (isUpload) {
        await this.tr143Service.handleTR143UploadSetParameterValues(params);
      }
    });
    return xml;
  }



  async handleSetParameterAttribute(request: any) {
    LOGGER.info("---------handleSetParameterAttribute-----------------------" + JSON.stringify(request));
    const paramList = request.ParameterList.SetParameterAttributesStruct;
    const params = Array.isArray(paramList) ? paramList : [paramList];
    LOGGER.info(JSON.stringify(params));
    for (const p of params) {
      //first check if parameter exists 
      const dbParam = await storage.getParameter(p.Name);
      LOGGER.info("handleSetParameterAttribute(ACS) :" + p)
      LOGGER.info("handleSetParameterAttribute(CPE) :" + dbParam)
      LOGGER.info(dbParam);
      //Check if acs parameter is set 
      LOGGER.info("SPV checking is ACS parameters to be updated !!");
      if (p.name == null || p.name.length() == 0) {
        return await this.buildFault("9005", "Parameter Name Missing");
      }
      //Notification =0(DISABLE) ,1(PASSIVE),2(ACTIVE) 
      if (dbParam) {
        await storage.updateParameter(p.Name, dbParam.value, p.Notification);
      } else {
        //var dataType = (p.type ? p.type.replace("xsd:", "") : "string");
        //await storage.createParameter({ name: p.Name, value: 'NA', type: dataType, writable: true });
        LOGGER.warn("handleSetParameterAttribute : Parameter not found and would not be inserted!!");
      }

    }//end of for loop
    const body = {
      "cwmp:SetParameterAttributesResponse": {}
    };
    const xml = this.buildEnvelope(body);
    await this.log("SOAP_OUT", "Sending SetParameterAttributesResponse", xml);
    return xml;
  }

  async handleDownload(request: any) {
    const transfer = await storage.createTransfer({
      commandKey: request.CommandKey || "",
      fileType: request.FileType || "1 Firmware Upgrade Image",
      url: request.URL,
      username: request.Username,
      password: request.Password,
      fileSize: request.FileSize,
      targetFileName: request.TargetFileName,
      status: "PENDING",
      isUpload: false,
    });

    await this.log("INFO", `Download requested: ${request.URL} `, JSON.stringify(request));

    const body = {
      "cwmp:DownloadResponse": {
        Status: 0, // 1 means it's not finished yet (async)
        StartTime: new Date().toISOString(),
        CompleteTime: "0001-01-01T00:00:00Z"
      }
    };

    const xml = this.buildEnvelope(body);
    await this.log("SOAP_OUT", "Sending DownloadResponse", xml);
    return xml;
  }

  async handleUpload(request: any) {
    const transfer = await storage.createTransfer({
      commandKey: request.CommandKey || "",
      fileType: request.FileType || "1 Vendor Configuration File",
      url: request.URL,
      username: request.Username,
      password: request.Password,
      status: "PENDING",
      isUpload: true,
    });

    await this.log("INFO", `Upload requested: ${request.URL} `, JSON.stringify(request));

    const body = {
      "cwmp:UploadResponse": {
        Status: 1,
        StartTime: new Date().toISOString(),
        CompleteTime: "0001-01-01T00:00:00Z"
      }
    };

    const xml = this.buildEnvelope(body);
    await this.log("SOAP_OUT", "Sending UploadResponse", xml);
    return xml;
  }

  async sendTransferComplete(transferId: number) {
    const transfer = await storage.getTransfer(transferId);
    if (!transfer) throw new Error("Transfer not found");

    // Simulate transfer work
    await storage.updateTransfer(transferId, { status: "IN_PROGRESS" });
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay

    const now = new Date();
    await storage.updateTransfer(transferId, {
      status: "COMPLETED",
      completeTime: now
    });

    const body = {
      "cwmp:TransferComplete": {
        CommandKey: transfer.commandKey,
        FaultStruct: {
          FaultCode: 0,
          FaultString: ""
        },
        StartTime: transfer.startTime?.toISOString(),
        CompleteTime: now.toISOString()
      }
    };

    const xml = this.buildEnvelope(body);
    await this.log("SOAP_OUT", "Sending TransferComplete", xml);

    const settingsList = await storage.getSettings();
    const acsUrl = settingsList.find(s => s.key === "acsUrl")?.value;
    LOGGER.info("sendTransferComplete agent selection based on ENDPOINT_CONNECTION_AGENT: " + process.env.ENDPOINT_CONNECTION_AGENT);
    LOGGER.info("selected agent is " + (process.env.ENDPOINT_CONNECTION_AGENT === "1") ? "HTTP Proxy" : ((process.env.ENDPOINT_CONNECTION_AGENT === "2") ? "HTTPS Agent" : "SOCKS Agent"));
    if (acsUrl) {
      try {
        const response = await cookieEnabledFetch(acsUrl, {
          method: 'POST',
          agent: (process.env.ENDPOINT_CONNECTION_AGENT === "1") ? httpsProxyAgent : ((process.env.ENDPOINT_CONNECTION_AGENT === "2") ? httpsAgent : socksAgent), // All traffic routes via SOCKS; cookies are intercepted and saved
          headers: {
            'Content-Type': 'text/xml; charset="utf-8"',
            'SOAPAction': '',
          },
          body: xml
        });
        const text = await response.text();
        await this.log("SOAP_IN", "Received response from TransferComplete", text);
        return text;
      } catch (e: any) {
        await this.log("ERROR", "Failed to send TransferComplete", e.message);
      }
    }
  }



  // Simulator RPC endpoint for GetParameterNames
  async handleGetParameterNames(request: any) {
    // 1. Correct Data Extraction
    // Based on your note: namesRootArr[0] contains the object with the "string" array
    const paramNamesRoot = request.ParameterPath;
    const namesRootArr = Array.isArray(paramNamesRoot) ? paramNamesRoot : [paramNamesRoot];
    const nextLevel = request.NextLevel;
    LOGGER.info("handleGetParameterNames request.ParameterPath :" + JSON.stringify(request.ParameterPath));
    LOGGER.info("handleGetParameterNames namesRootArr :" + JSON.stringify(namesRootArr));
    LOGGER.info("handleGetParameterNames NextLevel :" + JSON.stringify(nextLevel));
    // Extract the actual strings from the nested property
    const namesData = namesRootArr;
    const names: string[] = Array.isArray(namesData) ? namesData : (namesData ? [namesData] : []);

    LOGGER.info(`handleGetParameterNames names: ${JSON.stringify(names)}`);

    let filteredParams: any[] = [];

    // 2. Optimized Database Retrieval
    if (names.length === 1 && names[0].includes('config.ConfigFile')) {
      LOGGER.info("GPV for config file - backup command from ACS");
      filteredParams = await storage.getParameters();
    } else {
      // Fire all DB queries in parallel for better performance
      const tasks = names.map(async (name) => {
        LOGGER.info("handleGetParameterNames processing name: " + name);
        if (nextLevel === "1") {
          return await storage.getMatchingParameters(name);
        } else {
          return await storage.getMatchingParameterParentOnly(name);
        }


      });

      const results = await Promise.all(tasks);
      // Flatten array of arrays into a single list
      filteredParams = results.flat();
    }

    // 3. Map to SOAP/CWMP Structure
    const responseList = filteredParams.map(p => ({
      Name: p.name,
      Writable: "1"
    }));

    // 4. Build Response Envelope
    const body = {
      "cwmp:GetParameterNamesResponse": {
        ParameterList: {
          "@_SOAP-ENC:arrayType": `cwmp:ParameterInfoStruct[${responseList.length}]`,
          ParameterInfoStruct: responseList
        }
      }
    };

    const xml = this.buildEnvelope(body, {
      "cwmp:ID": {
        "#text": Math.floor(Math.random() * 10000).toString(),
        "@_SOAP-ENV:mustUnderstand": "1"
      }
    });

    await this.log("SOAP_OUT", "Sending GetParameterValuesResponse", xml);
    return xml;
  }

  //All message handling ends here 

  private buildFault(code: string, string: string) {
    const body = {
      "SOAP-ENV:Fault": {
        faultcode: "Client",
        faultstring: "CWMP Fault",
        detail: {
          "cwmp:Fault": {
            FaultCode: code,
            FaultString: string
          }
        }
      }
    };
    return this.buildEnvelope(body);
  }

  // --- Client Actions ---
  async isCode200AndFault(statusCode: number, text: string) {
    var retVal = false;
    if (statusCode === 200) {
      if (text && text.length > 0) {
        LOGGER.info("ACS response length is " + text.length);
        //Also check if its fault than also we need to exit
        if (text.indexOf('cwmp:Fault') != -1) {
          LOGGER.warn("Since error response recieved and code 200 recieved from ACS setting this up");
          statusCode = 500;
          LOGGER.warn("Closing Session!");
          retVal = true;
        }
      }
    }//if for 200 and fault and empty check
    LOGGER.warn(" isCode200AndFault::" + retVal);
    return retVal;
  }

  // --- Client Actions ---
  async isCode200AndEmptyResponse(statusCode: number, text: string) {
    var retVal = false;
    if (statusCode === 200) {
      if (!text || text.length == 0) {
        //Either text empty or length 0
        LOGGER.warn("Strange Since empty packet and code 200 recieved from ACS setting this up");
        retVal = true;
      }
    }//if for 200 and fault and empty check
    LOGGER.warn(" isCode200AndEmptyResponse::" + retVal);
    return retVal;
  }

  // --- Client Actions ---
  async isCode200And401SPVEmptyResponse(statusCode: number, text: string) {
    var retVal = false;
    if (statusCode === 200) {
      if (text && text.length > 0) {
        //Either text empty or length 0
        if (text === "401_SPV_ON") {
          LOGGER.warn("401_SPV_ON Since empty packet and code 200 recieved from ACS setting this up");
          retVal = true;
        }

      }
    }//if for 200 and fault and empty check
    LOGGER.warn(" isCode200AndEmptyResponse::" + retVal);
    return retVal;
  }

  // --- Client Actions ---

  //Manage cookies
  // Rewrite cookie domain manually


  //async sendToAcs_axios(acsUrl: string, token: string, xmlBody: string) {
  async sendToAcs(acsUrl: string, token: string, xmlBody: string) {
    try {
      LOGGER.info("Sending SOAP to Token & ACS URL: " + token + " acsUrl " + acsUrl);
      const response = await postAxiosWithToken(acsUrl, xmlBody, token);
      // THIS is how you get the response body
      LOGGER.info("Response body:", response.data);
      // Status code
      LOGGER.info("Status:", response.status);
      // Cookies persisted automatically
      const statusCode = response.status;
      LOGGER.info("START==========HEADER DETAILS============ statusCode=" + statusCode);
      //MCWMP_401_SPV_ON=1
      if (statusCode === 401) {
        LOGGER.info("401 Unauthorized from ACS server");
        return { statusCode: 401, text: "Unauthorized" };
      }
      const text = await response.data;
      const ok = response.status >= 200 && response.status < 300;
      LOGGER.info("END==========HEADER DETAILS============ statusCode=" + statusCode);
      if (!ok) {
        // Log the raw text response for debugging
        const errorText = response.data || "<No response body>";
        console.error(`HTTP error! status: ${response.status}, body: ${errorText} `);
        throw new Error(`HTTP error! status: ${response.status} `);
      }
      LOGGER.info("END==========END HEADER DETAILS=========");
      return { statusCode, text };
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        // Token expired or not authenticated
        console.log('Authentication failed');
        return { statusCode: 401, text: "Unauthorized" };
      }
      LOGGER.error(error);
      if ((error as any).name === 'AbortError') {
        LOGGER.error("Request to ACS timed out in " + ACS_SEND_TIMEOUT_MS + " ms");
      }
      console.error(error);
    }
    return { statusCode: 500, text: "Failed to connect to ACS server" };
  }

  //This is for not-fetch based code currently not used
  async sendToAcsNodeFetch(acsUrl: string, token: string, xmlBody: string) {
    //async sendToAcs(acsUrl: string, token: string, xmlBody: string) {
    try {
      LOGGER.info("[sendToAcs] Sending SOAP to Token & ACS URL: " + token + " acsUrl " + acsUrl);
      LOGGER.info("[sendToAcs] agent selection based on ENDPOINT_CONNECTION_AGENT: " + process.env.ENDPOINT_CONNECTION_AGENT);

      var response;
      switch (process.env.ENDPOINT_CONNECTION_AGENT) {
        case "0":
          LOGGER.info("[sendToAcs] Using HTTPS Agent");
          response = await cookieEnabledFetch(acsUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/xml; charset="utf-8"',
              'SOAPAction': '',
              'Authorization': `Basic ${token} `
            },
            signal: AbortSignal.timeout(ACS_SEND_TIMEOUT_MS),
            body: xmlBody,
            /// THIS IS THE FIX
            agent: httpAgent,

          });
          break;
        case "1":
          LOGGER.info("[sendToAcs] Using HTTP Proxy Agent");
          response = await cookieEnabledFetch(acsUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/xml; charset="utf-8"',
              'SOAPAction': '',
              'Authorization': `Basic ${token} `
            },
            signal: AbortSignal.timeout(ACS_SEND_TIMEOUT_MS),
            body: xmlBody,
            /// THIS IS THE FIX
            agent: httpsProxyAgent,

          });
          break;
        case "2":
          LOGGER.info("[sendToAcs] Using HTTPS Agent");
          response = await cookieEnabledFetch(acsUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/xml; charset="utf-8"',
              'SOAPAction': '',
              'Authorization': `Basic ${token} `
            },
            signal: AbortSignal.timeout(ACS_SEND_TIMEOUT_MS),
            body: xmlBody,
            /// THIS IS THE FIX
            agent: httpsAgent,

          });
          break;
        default:
          LOGGER.info("[sendToAcs] Using SOCKS Agent");
          response = await cookieEnabledFetch(acsUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/xml; charset="utf-8"',
              'SOAPAction': '',
              'Authorization': `Basic ${token} `
            },
            signal: AbortSignal.timeout(ACS_SEND_TIMEOUT_MS),
            body: xmlBody,
            /// THIS IS THE FIX
            agent: socksAgent,

          });
      }

      const statusCode = response.status;
      LOGGER.info("START==========HEADER DETAILS============ statusCode=" + statusCode);
      //MCWMP_401_SPV_ON=1
      if (statusCode === 401) {
        LOGGER.info("401 Unauthorized from ACS server");
        return { statusCode: 401, text: "Unauthorized" };
      }
      for (const [name, value] of response.headers) {
        console.log(`${name}: ${value} `);
        //check for MCWMP_401_SPV_ON=1
        if (value && value.toLowerCase().indexOf('mcwmp_401_spv_on') !== -1) {
          LOGGER.info("Found MCWMP_401_SPV_ON header in response :" + value);
          //This code was added for TRM issue bigbucket issue not sending response
          //Comment it to check if R&D fix is working
          //return { statusCode: 200, text: "401_SPV_ON" };
        }
        if (response.headers.get("content-length") === "0") {
          console.log("Empty body!!!!");//actually we can return here only
        }
      }
      LOGGER.info("END==========HEADER DETAILS============ statusCode=" + statusCode);

      if (!response.ok) {
        // Log the raw text response for debugging
        const errorText = response.text() || "<No response body>";
        console.error(`HTTP error! status: ${response.status}, body: ${errorText} `);
        throw new Error(`HTTP error! status: ${response.status} `);
      }
      const text = await response.text();

      LOGGER.info("END==========END HEADER DETAILS=========");


      return { statusCode, text };
    } catch (error) {
      LOGGER.error(error);
      if ((error as any).name === 'AbortError') {
        LOGGER.error("Request to ACS timed out in " + ACS_SEND_TIMEOUT_MS + " ms");
      }
      console.error(error);
    }
    return { statusCode: 500, text: "Failed to connect to ACS server" };
  }

  async sendInformToACS(eventCode: string, paramName?: string[]) {
    if (this.isSendingDataToAcs) {
      LOGGER.warn("Already sending data to ACS , skipping this inform ");
      this.log("INFO", "Already sending data to ACS , skipping this inform ");
      return "Already sending data to ACS , skipping this inform ";
    }
    //now clear all jars first
    // Using async/await
    LOGGER.info("Clearing cookies before sending inform to ACS...");
    await cookieJar.removeAllCookies();

    //We have added code to clear cookei for each inform message
    //cookieEnabledFetch = fetchCookie(globalThis.fetch, new CookieJar());
    this.isSendingDataToAcs = true;
    console.log("[TR069] sendInformToACS...." + eventCode);
    console.log("[TR069] paramName length...." + (paramName ? paramName?.length : -1));
    const settingsList = await storage.getSettings();
    var acsUrl = settingsList.find(s => s.key === "acsUrl")?.value;
    var acsUsername = settingsList.find(s => s.key === "username")?.value;
    var acsPassword = settingsList.find(s => s.key === "password")?.value;
    console.log("[TR069] acsUrl=" + acsUrl);
    if (!acsUrl) {
      await this.log("ERROR", "No ACS URL configured");
      throw new Error("No ACS URL");
    }
    if (!acsUsername) {
      await this.log("ERROR", "No ACS acsUsername configured");
      throw new Error("No ACS acsUsername");
    }
    if (!acsPassword) {
      await this.log("ERROR", "No ACS acsPassword configured");
      throw new Error("No ACS acsPassword");
    }


    var xml = await this.generateInform(eventCode, paramName);
    var statusCode = 200;
    var text;
    var counter = 0;
    try {
      if (this.isRebooting) {
        LOGGER.info("Device is rebooting , cannot send inform to ACS now...");
        await this.log("ERROR", "Device is rebooting , cannot send inform to ACS now...");
        const message = "Device is rebooting , cannot send inform to ACS now...";
        throw new Error(message);
      }
      //You shouldnot update ACS url in the middle of session
      //We have to update AcsUrl username password if its changed from ACS SetParameterValues
      const updatedSettingsList = await storage.getSettings();
      acsUrl = updatedSettingsList.find(s => s.key === "acsUrl")?.value || acsUrl;
      acsUsername = updatedSettingsList.find(s => s.key === "username")?.value || acsUsername;
      acsPassword = updatedSettingsList.find(s => s.key === "password")?.value || acsPassword;
      const token = Buffer.from(`${acsUsername}:${acsPassword}`).toString("base64");

      while (statusCode === 200) {
        LOGGER.info("^^^^^^^^^^^^^^^^^^^^^^^^^^^");
        LOGGER.info(acsUrl + " " + acsUsername + " " + acsPassword);
        LOGGER.info("^^^^^^^^^^^^^^^^^^^^^^^^^^^");
        const msgType = await this.getMessageType(xml);
        var eventType: string | null = "-";
        if (msgType === 'Inform') {
          eventType = await this.getInformEventType(xml);
        }
        await this.log("SOAP_OUT", `Sending ${msgType} ${eventType} to ${acsUrl} `, xml);
        LOGGER.info("--------->[SOAP_OUT] " + acsUsername + "---->>>>>>: counter is " + counter + " ACS url " + acsUrl);
        LOGGER.info((xml.length == 0 ? "<Sending Empty>" : xml));
        const response = await this.sendToAcs(acsUrl, token, xml);
        statusCode = response.statusCode;
        text = response.text;
        LOGGER.info("<-----------[statusCode]:" + statusCode);
        LOGGER.info("<-----------[SOAP IN]:");
        LOGGER.info(text);
        LOGGER.info("<<END>>-1234");
        const msgTypeRes = await this.getMessageType(text);
        await this.log("SOAP_IN", `Recieved response ${msgTypeRes} from HDM ${acsUrl} `, text);
        if (statusCode === 401) {
          await this.log("ERROR", "401 UnAuthorized", text);
          LOGGER.warn("401 Unauthorized from ACS !!");
          LOGGER.warn(text);
          LOGGER.warn("Closing Session!");
          await this.log("SOAP_IN", `401 UnAuthorized Respone from ${acsUrl} `, text);
          break;
        }
        if (statusCode === 204) {
          LOGGER.warn("204 code recieved Closing Session...");
          LOGGER.warn("Closing Session!");
          break;
        }
        if (statusCode >= 500) {
          LOGGER.warn("50X error  code from ACS , ACS down !!!");
          LOGGER.warn("Closing Session!");
          await this.log("ERROR", "50X error  code from ACS , ACS down !!!", text);
          break;
        }
        LOGGER.info("parsing response....");
        if (await this.isCode200AndFault(statusCode, text)) {
          LOGGER.warn("isCode200AndFault closing connection");
          LOGGER.warn("2--> Closing Session!");
          await this.log("ERROR", "200 and fault code received", text);
          break;
        }
        if (await this.isCode200And401SPVEmptyResponse(statusCode, text)) {
          LOGGER.warn("isCode200AndEmptyResponse continue to send final inform connection");
          LOGGER.info("401_SPV_ON continue to send final inform connection");
          xml = "";//await this.generateInform("2 PERIODIC");
          //continue till we get 204
          await this.log("SOAP_IN", "SPV 401  sending empty message", text);
          continue;
        }
        if (await this.isCode200AndEmptyResponse(statusCode, text)) {
          LOGGER.warn("isCode200AndEmptyResponse ending session inform connection");
          xml = "";//await this.generateInform("2 PERIODIC");
          //continue till we get 204
          await this.log("SOAP_IN", "code 200 and Empty response ending session!!! ", "<EMPTY MESSAGE>");
          break;
        }
        xml = await this.handleSoapRequest(text);
        counter++;
        if (counter > 20) {
          LOGGER.warn("Something wrong happening , exiting!!!");
          break;
        }
      }//while true loop
      LOGGER.warn("~~~~~~~~~~~FINAL Status code ~~~~~~~~~~~~~~" + statusCode);
      return text;
    } catch (e: any) {
      await this.log("ERROR", "Failed to send Inform", e.message);
      //throw e;
      return "Failed to send Inform: " + e.message;
    } finally {
      this.isSendingDataToAcs = false;
    }
  }//send inform to acs ends
  // Simulated Reboot Logic

  async performReboot() {
    LOGGER.info("performReboot called");
    if (this.isRebooting) return;
    this.isRebooting = true;
    await this.log("INFO", "Reboot sequence started...");
    LOGGER.info("Device is rebooting..." + this.isRebooting);
    setTimeout(async () => {
      // "Reboot" complete
      // In a real app, we would POST to ACS here. 
      // For now, we just log that we would send '1 BOOT'
      try {
        await this.log("INFO", "Sending '1 BOOT' Inform to ACS (Simulated)");
        LOGGER.info("Sending '1 BOOT' Inform to ACS (Simulated)");
        this.isRebooting = false;
        LOGGER.info("performReboot: ACS response to BOOT Inform:... ");
        const response = await this.sendInformToACS("1 BOOT");
        LOGGER.info("Device successfully rebooted..." + this.isRebooting);
      } catch (error) {
        this.isRebooting = false;
        LOGGER.error("Error during reboot Inform: " + error);
      }
    }, 50000); // 50 second reboot
  }

  async getMessageType(xml: string): Promise<string | null> {
    try {
      if (!xml || xml.length == 0) return "<EMPTY>";
      const xmlString = xml;
      // 1. Get the list of values to search for
      const tokens = Object.values(messageTypeMap);
      // 2. Find the first token that exists in the string
      const foundToken = tokens.find(token => xmlString.includes(token));
      if (foundToken) {
        //console.log(`The message type is: ${foundToken}`);
        return foundToken;
      } else {
        return "Inform";
      }
    } catch (e) {
      return "Inform";
    }
  }

  async getInformEventType(xml: string): Promise<string | null> {
    try {
      if (!xml || xml.length == 0) return "<EMPTY>";
      const startTag = "<EventCode>";
      const endTag = "</EventCode>";

      const start = xml.indexOf(startTag);
      if (start === -1) return "NA";

      const end = xml.indexOf(endTag, start);
      if (end === -1) return "NA";

      return xml.substring(start + startTag.length, end).trim();

    } catch (e) {
      return "Inform";
    }
  }


}//Class ends



export const tr069 = new TR069Service();
