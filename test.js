const urls = `https://10.190.23.213:11101/cwmpWeb/WGCPEMgt%%https://10.190.23.213:11100/cwmpWeb/CPEMgt,http://trm-wg.fibercop.local:7080/cwmpWeb/CPEMgt%%http://trm-dm.fibercop.local:7080/cwmpWeb/CPEMgt,http://trm-wg.fibercop.local:7080/cwmpWeb/WGCPEMgt%%http://trm-dm.fibercop.local:7080/cwmpWeb/CPEMgt,http://acs.fibercop.local:7080/cwmpWeb/WGCPEMgt%%http://acs.fibercop.local:7080/cwmpWeb/CPEMgt,https://acsfe.edge.fibercop.local:11101/cwmpWeb/WGCPEMgt%%https://acsfe.edge.fibercop.local:11100/cwmpWeb/CPEMgt,https://whs.acs.tim.it:11301/cwmpWeb/WGCPEMgt%%https://acsfe.edge.fibercop.local:11100/cwmpWeb/CPEMgt,https://hdm1.acsolo.tim.it:10380/cwmpWeb/WGCPEMgt%%https://acsfe.edge.fibercop.local:11100/cwmpWeb/CPEMgt,https://regman-olo.tim.it:10502/acs%%https://acsfe.edge.fibercop.local:11100/cwmpWeb/CPEMgt,https://regman-olo.tim.it:10502/acs%%https://acsfe.edge.fibercop.local:11100/cwmpWeb/CPEMgt`;
const pairs = urls.split(",").map(entry => {
    const [wg, dm] = entry.split("%%");
    return { wg, dm };
});

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
const xml = `
<SOAP-ENV:Header>
  <cwmp:ID SOAP-ENV:mustUnderstand="1">141799423</cwmp:ID>
 </SOAP-ENV:Header>
 <SOAP-ENV:Body>
  <cwmp:GetParameterValuesResponse>
   <ParameterList SOAP-ENC:arrayType="cwmp:ParameterValueStruct[12]">
    <ParameterValueStruct>
     <Name>InternetGatewayDevice.WANDevice.3.WANConnectionDevice.1.WANIPConnection.1.SubnetMask</Name>
     <Value xsi:type="xsd:string"></Value>
    </ParameterValueStruct>
    <ParameterValueStruct>
     <Name>InternetGatewayDevice.WANDevice.3.WANConnectionDevice.1.WANIPConnection.1.DNSEnabled</Name>
     <Value xsi:type="xsd:boolean">1</Value>
    </ParameterValueStruct>
    <ParameterValueStruct>
     <Name>InternetGatewayDevice.WANDevice.3.WANConnectionDevice.1.WANIPConnection.1.LastConnectionError</Name>
     <Value xsi:type="xsd:string">ERROR_NONE</Value>
    </ParameterValueStruct>
    <ParameterValueStruct>
     <Name>InternetGatewayDevice.WANDevice.3.WANConnectionDevice.1.WANIPConnection.1.Uptime</Name>
     <Value xsi:type="xsd:unsignedInt">50</Value>
    </ParameterValueStruct>
    <ParameterValueStruct>
     <Name>InternetGatewayDevice.WANDevice.3.WANConnectionDevice.1.WANIPConnection.1.DNSServers</Name>
     <Value xsi:type="xsd:string"></Value>
    </ParameterValueStruct>
    <ParameterValueStruct>
     <Name>InternetGatewayDevice.WANDevice.3.WANConnectionDevice.1.WANIPConnection.1.Name</Name>
     <Value xsi:type="xsd:string">IPTV</Value>
    </ParameterValueStruct>
    <ParameterValueStruct>
     <Name>InternetGatewayDevice.WANDevice.3.WANConnectionDevice.1.WANIPConnection.1.DefaultGateway</Name>
     <Value xsi:type="xsd:string"></Value>
    </ParameterValueStruct>
    <ParameterValueStruct>
     <Name>InternetGatewayDevice.WANDevice.3.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress</Name>
     <Value xsi:type="xsd:string"></Value>
    </ParameterValueStruct>
    <ParameterValueStruct>
     <Name>InternetGatewayDevice.WANDevice.3.WANConnectionDevice.1.WANIPConnection.1.NATEnabled</Name>
     <Value xsi:type="xsd:boolean">0</Value>
    </ParameterValueStruct>
    <ParameterValueStruct>
     <Name>InternetGatewayDevice.WANDevice.3.WANConnectionDevice.1.WANIPConnection.1.ConnectionType</Name>
     <Value xsi:type="xsd:string">IP_Bridged</Value>
    </ParameterValueStruct>
    <ParameterValueStruct>
     <Name>InternetGatewayDevice.WANDevice.3.WANConnectionDevice.1.WANIPConnection.1.MACAddress</Name>
     <Value xsi:type="xsd:string">98:0d:67:2c:45:a4</Value>
    </ParameterValueStruct>
    <ParameterValueStruct>
     <Name>InternetGatewayDevice.WANDevice.3.WANConnectionDevice.1.WANIPConnection.1.AddressingType</Name>
     <Value xsi:type="xsd:string"></Value>
    </ParameterValueStruct>
   </ParameterList>
  </cwmp:GetParameterValuesResponse>
 </SOAP-ENV:Body>
</SOAP-ENV:Envelope>
`;

console.log(getTr069MessageType(xml));

const xmlString = xml;

// 1. Get the list of values to search for
const tokens = Object.values(messageTypeMap);

// 2. Find the first token that exists in the string
const foundToken = tokens.find(token => xmlString.includes(token));

if (foundToken) {
    console.log(`The message type is: ${foundToken}`);
} else {
    console.log("No matching token found.");
}

//console.log(hasToken); // true if any token exists

//console.log(pairs);


function getTr069MessageType(xml) {
    const match = xml.match(/<cwmp:(\w+)/);
    console.log(match[1]);
    console.log(match[2]);
    return match ? match[1] : null;
}



