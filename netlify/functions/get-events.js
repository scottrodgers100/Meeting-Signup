const https = require('https');

const MASTER_KEY = process.env.JSONBIN_MASTER_KEY;
const BIN_ID     = process.env.JSONBIN_BIN_ID;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET')     return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const result = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.jsonbin.io',
        path: `/v3/b/${BIN_ID}/latest`,
        method: 'GET',
        headers: { 'X-Master-Key': MASTER_KEY, 'X-Bin-Versioning': 'false' },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve({}); } });
      });
      req.on('error', reject);
      req.end();
    });

    const records = result.record || [];
    return { statusCode: 200, headers, body: JSON.stringify(records) };
  } catch (err) {
    console.error('get-events error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
