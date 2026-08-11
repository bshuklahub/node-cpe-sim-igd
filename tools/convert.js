import fs from "fs";

// Input and output file paths
//const inputFile = "./input.json";
//const outputFile = "./output.json";

const inputFile = "./igw-input.json";
const outputFile = "./igw-output.json";


// Read input file
const raw = fs.readFileSync(inputFile, "utf8");
const data = JSON.parse(raw);

// Transform array
const transformed = data.map(item => ({
    name: item.name,
    value: String(item.value),   // convert ANY value to string
    type: item.type,
    writable: true
}));

// Write to output file
fs.writeFileSync(outputFile, JSON.stringify(transformed, null, 2), "utf8");

console.log("Transformation complete. Output written to", outputFile);