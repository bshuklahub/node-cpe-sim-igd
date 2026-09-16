/*
* How to run this ts file 
npm install -D ts-node typescript @types/node
node --loader ts-node/esm ./tools/gpvtodata.ts
*/
import * as fs from 'fs';
import { XMLParser } from 'fast-xml-parser';

// 1. Define types for the output JSON
interface CWMPParameter {
    name: string;
    value: string | number | boolean;
    type: string;
    writable: boolean;
}

/**
 * Provides a logical default value if the XML tag was empty
 */
function fillEmptyValue(type: string): string | number | boolean {
    switch (type.toLowerCase()) {
        case 'boolean':
            return "0"; // or "false" depending on your system requirements
        case 'int':
        case 'unsignedint':
        case 'long':
        case 'unsignedlong':
            return "0";
        case 'datetime':
            return "0001-01-01T00:00:00Z";
        default:
            return ""; // Default for string or unknown
    }
}

async function convertCwmpXmlToJson(inputPath: string, outputPath: string): Promise<void> {
    try {
        const xmlData: string = fs.readFileSync(inputPath, 'utf-8');

        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            removeNSPrefix: true,
            parseTagValue: false, // Ensures we control the parsing logic
        });

        const jsonObj = parser.parse(xmlData);

        const parameterList = jsonObj?.Envelope?.Body?.GetParameterValuesResponse?.ParameterList?.ParameterValueStruct;

        if (!Array.isArray(parameterList)) {
            throw new Error("Invalid XML structure: Could not find ParameterValueStruct array.");
        }

        const formattedData: CWMPParameter[] = parameterList.map((item: any) => {
            const rawType: string = item.Value?.['@_type'] || 'xsd:string';
            const cleanType = rawType.split(':').pop() || 'string';

            // Extract text content
            let extractedValue: string = "";
            if (typeof item.Value === 'object' && item.Value !== null) {
                extractedValue = item.Value['#text']?.toString() ?? "";
            } else {
                extractedValue = item.Value?.toString() ?? "";
            }

            // If value is empty, fill it based on the type
            const finalValue = extractedValue.trim() === ""
                ? fillEmptyValue(cleanType)
                : extractedValue;

            return {
                name: item.Name,
                value: finalValue,
                type: cleanType,
                writable: true
            };
        });

        // Sort by Name (Natural Alphanumeric Sort)
        formattedData.sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
        );

        fs.writeFileSync(outputPath, JSON.stringify(formattedData, null, 2), 'utf-8');

        console.log(`✅ Success: Processed ${formattedData.length} parameters with default value filling.`);
    } catch (err) {
        const error = err as Error;
        console.error("❌ Conversion failed:", error.message);
    }
}

// Execution
//convertCwmpXmlToJson('input.xml', 'output.json');
convertCwmpXmlToJson('igw-gpv.xml', 'igw-output.json');
