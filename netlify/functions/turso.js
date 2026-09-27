/* ==================================================================
   Netlify Function — Turso Proxy
   التوكن يبقى سري هنا فقط
   ================================================================== */
const { createClient } = require('@libsql/client');

let client = null;

function getClient() {
    if (!client) {
        client = createClient({
            url: process.env.TURSO_URL,
            authToken: process.env.TURSO_TOKEN
        });
    }
    return client;
}

exports.handler = async (event, context) => {
    // CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { statements } = body;

        if (!Array.isArray(statements) || statements.length === 0) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'statements required' }) };
        }

        const db = getClient();
        const results = [];

        for (const stmt of statements) {
            const { sql, args = [] } = stmt;
            const res = await db.execute({ sql, args });
            results.push({
                rows: res.rows.map(row => {
                    const obj = {};
                    for (const k of Object.keys(row)) {
                        obj[k] = typeof row[k] === 'bigint' ? Number(row[k]) : row[k];
                    }
                    return obj;
                }),
                cols: res.columns || []
            });
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, results })
        };
    } catch (err) {
        console.error('Turso error:', err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: err.message || 'Database error' })
        };
    }
};
