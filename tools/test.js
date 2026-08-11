import { parseArgs } from 'node:util';

const options = {
    acsUrl: { type: 'boolean', short: 'u' },
    serialNumber: { type: 'string', short: 's' },
    oui: { type: 'string', short: 'o' }, // Can be used multiple times
    productClass: { type: 'string', short: 'p' }
};

const { values, positionals } = parseArgs({ options, allowPositionals: true });

console.log('Flags:', values);       // { verbose: true, output: './dist', count: ['5'] }
console.log('Remaining:', positionals); // ['extra-arg1', 'extra-arg2']