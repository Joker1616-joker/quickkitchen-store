const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const CJ_API_KEY = process.env.CJ_API_KEY || 'CJ5351378@api@8e2dd13a06394e66a19b5c38180f103d';
const orders = [];

function jsonResponse(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
  });
}

function httpsPost(hostname, reqPath, data, headers = {}) {
  return new Promise((resolve) => {
    const body = JSON.stringify(data);
    const options = { hostname, path: reqPath, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), ...headers } };
    const req = https.request(options, (res) => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.write(body); req.end();
  });
}

async function getCJToken() {
  const res = await httpsPost('developers.cjdropshipping.com', '/api2.0/v1/authentication/getAccessToken', { apiKey: CJ_API_KEY });
  return res?.data?.accessToken || null;
}

async function submitToCJ(order, token) {
  return httpsPost('developers.cjdropshipping.com', '/api2.0/v1/shopping/order/createOrder', {
    orderNumber: order.orderNumber,
    shippingCountry: order.shippingAddress.country,
    shippingAddress: order.shippingAddress.street,
    shippingZip: order.shippingAddress.zipCode,
    shippingPhone: order.shippingAddress.phone,
    shippingCustomerName: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
    shippingCity: order.shippingAddress.city,
    products: order.items.map(item => ({ vid: item.sku, quantity: item.quantity, shippingName: 'CJPacket Sensitive' }))
  }, { 'CJ-Access-Token': token });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end(); return;
  }

  if (req.method === 'POST' && pathname === '/api/orders') {
    const body = await readBody(req);
    const orderNumber = 'QK-' + Date.now();
    const order = { orderNumber, ...body, status: 'pending', createdAt: new Date().toISOString(), cjStatus: 'pending' };
    orders.push(order);
    console.log(`New order: ${orderNumber} - $${body.totalAmount}`);
    getCJToken().then(token => { if (token) submitToCJ(order, token).then(r => { if (r?.result) { order.cjStatus = 'submitted'; console.log('Forwarded to CJ'); } }); });
    jsonResponse(res, { success: true, orderNumber, status: 'pending' }); return;
  }

  if (req.method === 'GET' && pathname === '/api/orders') { jsonResponse(res, { orders, total: orders.length }); return; }
  if (req.method === 'GET' && pathname === '/api/agents/status') { jsonResponse(res, { agents: { order: 'running', payment: 'running', shipping: 'running', 'customer-service': 'running', inventory: 'running', analytics: 'running' }, uptime: process.uptime(), orders: orders.length }); return; }
  if (req.method === 'GET' && pathname === '/api/analytics/report') {
    const completed = orders.filter(o => o.paypalStatus === 'COMPLETED');
    const revenue = completed.reduce((s, o) => s + (o.totalAmount || 0), 0);
    jsonResponse(res, { sales: { totalOrders: orders.length, totalRevenue: revenue.toFixed(2), averageOrderValue: orders.length ? (revenue / orders.length).toFixed(2) : '0.00' }, payments: { totalTransactions: completed.length, successRate: orders.length ? ((completed.length / orders.length) * 100).toFixed(1) + '%' : '0%' }, topProducts: [] }); return;
  }
  if (req.method === 'GET' && pathname === '/api/inventory') { jsonResponse(res, [{ sku: 'PROD-001', productName: '12-in-1 Vegetable Chopper', quantity: 50, price: 34.99, reorderPoint: 10 }, { sku: 'PROD-002', productName: 'Clip-On Pot Strainer', quantity: 100, price: 14.99, reorderPoint: 20 }, { sku: 'PROD-003', productName: 'Handheld Bag Sealer', quantity: 75, price: 19.99, reorderPoint: 15 }, { sku: 'PROD-004', productName: 'Rotating Spice Rack', quantity: 45, price: 29.99, reorderPoint: 10 }, { sku: 'PROD-005', productName: 'Silicone Oven Gloves', quantity: 80, price: 19.99, reorderPoint: 20 }]); return; }
  if (req.method === 'GET' && pathname === '/health') { jsonResponse(res, { status: 'ok', orders: orders.length }); return; }

  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  if (!filePath.startsWith(__dirname)) { res.writeHead(403); res.end(); return; }
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
  fs.readFile(filePath, (err, data) => {
    if (err) { fs.readFile(path.join(__dirname, 'index.html'), (e2, html) => { if (e2) { res.writeHead(404); res.end('Not found'); return; } res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html); }); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(filePath)] || 'text/plain' }); res.end(data);
  });
});

server.listen(PORT, () => { console.log(`QuickKitchen running on port ${PORT}`); console.log(`http://localhost:${PORT}`); });
