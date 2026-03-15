const https = require('https');

const MASTER_KEY = process.env.JSONBIN_MASTER_KEY;
const BIN_ID     = process.env.JSONBIN_BIN_ID;

function jsonbinGet() {
  return new Promise((resolve, reject) => {
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
}

function jsonbinPut(body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname: 'api.jsonbin.io',
      path: `/v3/b/${BIN_ID}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'X-Master-Key': MASTER_KEY,
        'X-Bin-Versioning': 'false',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve({}); } });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const ev = JSON.parse(event.body);
    if (!ev || !ev.id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid data' }) };

    // Get current events array
    const current = await jsonbinGet();
    const records = current.record || [];

    // Upsert: replace existing event with same id, or add to front
    const idx = records.findIndex(r => r.id === ev.id);
    if (idx !== -1) {
      records[idx] = ev;
    } else {
      records.unshift(ev);
    }

    await jsonbinPut(records);
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('save-event error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
