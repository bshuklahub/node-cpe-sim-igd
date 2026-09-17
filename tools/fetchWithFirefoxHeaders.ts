//To run ==> npx tsx fetchWithFirefoxHeaders.ts
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';


interface FetchOptions {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: string | object;
    token?: string;              // Bearer token if you have one
    basicAuth?: { user: string; pass: string }; // Basic auth if required
    extraHeaders?: Record<string, string>;
}

interface FetchResult {
    statusCode: number;
    statusMessage: string;
    headers: http.IncomingHttpHeaders;
    body: string;
}

/**
 * Fetches a URL emulating a Mozilla Firefox browser request.
 * Note: 401 responses require credentials — headers alone will not fix them.
 */
export function fetchWithFirefoxHeaders(options: FetchOptions): Promise<FetchResult> {
    const {
        url,
        method = 'GET',
        body,
        token,
        basicAuth,
        extraHeaders = {},
    } = options;

    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';
    const transport = isHttps ? https : http;

    // Mozilla Firefox headers
    const headers: Record<string, string> = {
        'User-Agent':
            'Node-DeviceClient/1.0.0',
        'Accept':
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'identity', // avoid gzip decoding complexity
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        ...extraHeaders,
    };

    // Auth handling — required for 401 responses
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    } else if (basicAuth) {
        const encoded = Buffer.from(`${basicAuth.user}:${basicAuth.pass}`).toString('base64');
        headers['Authorization'] = `Basic ${encoded}`;
    }

    let payload: string | undefined;
    if (body) {
        payload = typeof body === 'string' ? body : JSON.stringify(body);
        headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
        headers['Content-Length'] = Buffer.byteLength(payload).toString();
    }

    const reqOptions: https.RequestOptions = {
        method,
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        headers,
    };

    return new Promise((resolve, reject) => {
        const req = transport.request(reqOptions, (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (c: Buffer) => chunks.push(c));
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode ?? 0,
                    statusMessage: res.statusMessage ?? '',
                    headers: res.headers,
                    body: Buffer.concat(chunks).toString('utf-8'),
                });
            });
        });

        req.on('error', reject);

        if (payload) req.write(payload);
        req.end();
    });
}

// -------- Example usage --------
(async () => {
    const url =
        'https://devicetool-web-2aba4.containers.snapdeploy.app/crstatus/SIM00259EHG8145V5';

    try {
        const result = await fetchWithFirefoxHeaders({
            url,
            // Uncomment whichever auth type the server expects:
            // token: process.env.API_TOKEN,
            // basicAuth: { user: process.env.USER!, pass: process.env.PASS! },
        });

        console.log('Status:', result.statusCode, result.statusMessage);
        console.log('Headers:', result.headers);
        console.log('Body:', result.body.slice(0, 500));

        if (result.statusCode === 401) {
            console.warn('\n⚠️  401 Unauthorized — valid credentials are required.');
        }
    } catch (err) {
        console.error('Request failed:', err);
    }
})();