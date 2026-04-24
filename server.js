const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const CJ_API_KEY = process.env.CJ_API_KEY || 'CJ5351378@api@8e2dd13a06394e66a19b5c38180f103d';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'AQ-fT07NPLvC922L5-8MKNIqa64g2UvkrdF_12Wn-HSBPMkTAbYWoMZizsL_ZD3oE4LX0XInrNpNr9yQ';

// ─── IN-MEMORY STORE ──────────────────────────────────────────────────────────
const orders = [];
const agentLogs = [];
let cjToken = null;
let tokenExpiry = 0;

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────
const PRODUCTS = [
  {
    id: 'PROD-001', sku: 'CJCJ105384101AZ',
    name: '12-in-1 Vegetable Chopper',
    desc: 'Chop, dice, slice & grate in seconds. The meal prep gadget TikTok cant stop talking about.',
    price: 34.99, originalPrice: 49.99,
    badge: 'VIRAL',
    cjSearch: 'vegetable chopper 4 in 1',
    images: [
      'https://cbu01.alicdn.com/img/ibank/O1CN01mGCiZi1G7LzXiGMqe_!!2214236764163-0-cib.jpg',
      'https://cbu01.alicdn.com/img/ibank/O1CN01k2Wd2L1G7LzY3gNAz_!!2214236764163-0-cib.jpg'
    ]
  },
  {
    id: 'PROD-002', sku: 'CJ-STRAINER-001',
    name: 'Clip-On Pot Strainer',
    desc: 'Drain pasta, rice and veggies without carrying a heavy pot. Clips on any pan instantly.',
    price: 14.99, originalPrice: 24.99,
    badge: 'BESTSELLER',
    cjSearch: 'silicone pot strainer clip',
    images: [
      'https://cbu01.alicdn.com/img/ibank/O1CN01WBKO1T1ejfbMj0pFn_!!2200693736904-0-cib.jpg'
    ]
  },
  {
    id: 'PROD-003', sku: 'CJ-SEALER-001',
    name: 'Handheld Bag Sealer',
    desc: 'Keep food fresh 3x longer. Rechargeable USB mini sealer that fits in your drawer.',
    price: 19.99, originalPrice: 29.99,
    badge: 'HOT',
    cjSearch: 'USB bag sealer portable',
    images: [
      'https://cbu01.alicdn.com/img/ibank/O1CN011YJgqO1aFmKDXkS8e_!!2213796855985-0-cib.jpg'
    ]
  },
  {
    id: 'PROD-004', sku: 'CJ-SPICERACK-001',
    name: 'Rotating Spice Rack',
    desc: '360° rotating organizer. Transform your messy spice cabinet into an organized dream.',
    price: 29.99, originalPrice: 44.99,
    badge: 'NEW',
    cjSearch: '360 rotating spice rack turntable',
    images: [
      'https://cbu01.alicdn.com/img/ibank/O1CN01mZjnaZ1G7LzWxgX2n_!!2214236764163-0-cib.jpg'
    ]
  },
  {
    id: 'PROD-005', sku: 'CJ-GLOVES-001',
    name: 'Silicone Oven Gloves',
    desc: 'Heat-resistant up to 500°F. Waterproof, non-slip grip. The last oven gloves you\'ll ever buy.',
    price: 19.99, originalPrice: 34.99,
    badge: 'ESSENTIAL',
    cjSearch: 'silicone oven gloves heat resistant',
    images: [
      'https://cbu01.alicdn.com/img/ibank/O1CN01k2Wd2L1G7LzY3gNAz_!!2214236764163-0-cib.jpg'
    ]
  }
];

// ─── CONTENT SCRIPTS ─────────────────────────────────────────────────────────
const CONTENT_SCRIPTS = {
  'PROD-001': {
    hook: {
      script: `SCENE 1 (0-3s): Show messy vegetables on cutting board\nTEXT OVERLAY: "spending 30 mins chopping vegetables?"\n\nSCENE 2 (3-6s): Show chopper in action, fast cuts\nTEXT OVERLAY: "this does it in 10 seconds"\n\nSCENE 3 (6-9s): Show perfectly chopped result\nTEXT OVERLAY: "get yours → link in bio 🔥"`,
      caption: `POV: you just found the only kitchen gadget you actually need 🔪 This 12-in-1 chopper cuts, dices, slices AND stores everything in one unit. Meal prep used to take me 45 minutes. Now? 10 minutes flat. Link in bio.`,
      hashtags: `#kitchengadgets #mealprep #kitchenhacks #vegetablechopper #cookingtips #kitchentools #foodprep #tiktokshop #viralproducts #kitchentok`,
      capcut: `1. Import CJ video\n2. Set ratio to 9:16\n3. Add Text at 0:00-0:03: "spending 30 mins chopping vegetables?" — white, size 65, top center\n4. Add Text at 0:03-0:06: "this does it in 10 seconds" — white, size 65, middle\n5. Add Text at 0:06-end: "get yours → link in bio 🔥" — orange, size 60, bottom\n6. Audio → Sounds → search "upbeat kitchen" → add first result\n7. Export 1080p → Post to TikTok`
    },
    demo: {
      script: `SCENE 1 (0-5s): Messy cutting board, whole vegetables\nVOICEOVER: "I used to spend 30 minutes prepping vegetables every night"\n\nSCENE 2 (5-15s): Show all 12 chopper functions\nVOICEOVER: "This 12-in-1 chopper does everything in one device"\n\nSCENE 3 (15-25s): Fast montage of chopping results\nVOICEOVER: "Chop, dice, slice, grate, spiralize — all in seconds"\n\nSCENE 4 (25-30s): Clean result, price reveal\nTEXT: "Only $34.99 — link in bio"`,
      caption: `Meal prep changed completely when I found this. 12 different cutting functions in one gadget. No more messy boards, no more wasted time. Ships worldwide 🌍 Link in bio.`,
      hashtags: `#kitchengadgets #mealprep #kitchenhacks #vegetablechopper #cookingtips #quickmeals #kitchentools #foodhack #tiktokfinds #musthavekitchen`,
      capcut: `1. Import CJ video, set 9:16\n2. Trim video to 30 seconds\n3. Add Text 0:00-0:05: "30 mins of chopping every night..." — white, size 55\n4. Add Text 0:05-0:15: "12-in-1 Vegetable Chopper" — white bold, size 70\n5. Add Text 0:15-0:25: "Chop. Dice. Slice. Grate." — white, size 60, animate IN\n6. Add Text 0:25-end: "$34.99 → Link in bio" — orange, size 65\n7. Effects → add "zoom in" on scene transitions\n8. Audio → Sounds → "cooking motivation" → add\n9. Export 1080p`
    }
  },
  'PROD-002': {
    hook: {
      script: `SCENE 1 (0-3s): Show carrying heavy boiling pot to sink\nTEXT: "why do we still do this?"\n\nSCENE 2 (3-6s): Clip-on strainer draining right in the pot\nTEXT: "this clips on and drains for you"\n\nSCENE 3 (6-9s): Perfect drained pasta\nTEXT: "only $14.99 — link in bio"`,
      caption: `The fact that I carried heavy boiling pots to the sink for 10 years before finding this... 🤦 Clips onto ANY pot. Drains perfectly every time. Link in bio.`,
      hashtags: `#kitchenhack #pastahack #kitchengadgets #cookingtips #kitchentools #strainer #tiktokshop #kitchentok`,
      capcut: `1. Import CJ video, set 9:16\n2. Add Text 0:00-0:03: "why do we still do this?" — white, size 65, top\n3. Add Text 0:03-0:06: "clips on. drains. done." — white, size 70, middle\n4. Add Text 0:06-end: "$14.99 → link in bio" — orange, size 65, bottom\n5. Audio → "satisfying kitchen sounds"\n6. Export 1080p`
    },
    demo: {
      script: `SCENE 1 (0-5s): Old way — carrying heavy pot to sink, dangerous\nVOICEOVER: "carrying boiling hot pots to the sink is genuinely dangerous"\n\nSCENE 2 (5-15s): Clip the strainer on the pot edge\nVOICEOVER: "this clip-on strainer fixes that completely"\n\nSCENE 3 (15-25s): Tilt and drain perfectly\nVOICEOVER: "clip it, tilt, done — no burns, no spills, no mess"\n\nSCENE 4 (25-30s): Store flat in drawer\nTEXT: "$14.99 — link in bio"`,
      caption: `Genuinely can't believe I didn't have this sooner. Clips onto any pot or pan, drains pasta, rice, vegetables perfectly every time. Link in bio 🍝`,
      hashtags: `#kitchengadgets #kitchenhack #pastalovers #cookingtips #kitchenessentials #strainer #foodhacks #tiktokshop`,
      capcut: `1. Import CJ video, set 9:16, trim to 30s\n2. Add Text 0:00-0:05: "carrying boiling pots to the sink..." — white, size 55\n3. Add Text 0:05-0:15: "Clip-On Pot Strainer" — white bold, size 70\n4. Add Text 0:15-0:25: "Clip it. Tilt. Done." — white, size 65\n5. Add Text 0:25-end: "$14.99 → Link in bio" — orange, size 65\n6. Audio → upbeat cooking track\n7. Export 1080p`
    }
  },
  'PROD-003': {
    hook: {
      script: `SCENE 1 (0-3s): Open bag of chips going stale\nTEXT: "food going bad in 2 days?"\n\nSCENE 2 (3-6s): Mini sealer gliding across bag\nTEXT: "this seals it in 1 second"\n\nSCENE 3 (6-9s): Fresh food, happy kitchen\nTEXT: "$19.99 — link in bio"`,
      caption: `Stopped wasting food the moment I got this. Rechargeable USB mini sealer — works on any bag. Link in bio 🫙`,
      hashtags: `#foodhack #kitchengadgets #foodstorage #zerowaste #kitchentok #mealprep #tiktokshop`,
      capcut: `1. Import CJ video, set 9:16\n2. Add Text 0:00-0:03: "food going bad in 2 days?" — white, size 65\n3. Add Text 0:03-0:06: "seals in 1 second" — white, size 70\n4. Add Text 0:06-end: "$19.99 → link in bio" — orange, size 65\n5. Audio → satisfying ASMR sound\n6. Export 1080p`
    },
    demo: {
      script: `SCENE 1 (0-5s): Food going stale, throwing it away\nVOICEOVER: "I was throwing away so much food every week"\n\nSCENE 2 (5-15s): Show USB sealer, charge it\nVOICEOVER: "this rechargeable sealer changed that completely"\n\nSCENE 3 (15-25s): Demo sealing chips, coffee, rice bags\nVOICEOVER: "one swipe across any bag, sealed in one second"\n\nSCENE 4 (25-30s): Fresh food after days\nTEXT: "$19.99 — link in bio"`,
      caption: `Saving so much money on groceries since I got this. Works on any bag — chips, coffee, cereal, frozen food. USB rechargeable. Link in bio.`,
      hashtags: `#kitchengadgets #foodhack #zerowaste #groceryhack #foodstorage #mealprep #kitchentok #tiktokfinds`,
      capcut: `1. Import CJ video, set 9:16, trim to 30s\n2. Add Text 0:00-0:05: "throwing away food every week..." — white, size 55\n3. Add Text 0:05-0:15: "Handheld Bag Sealer" — white bold, size 70\n4. Add Text 0:15-0:25: "Any bag. 1 second. Done." — white, size 65\n5. Add Text 0:25-end: "$19.99 → Link in bio" — orange, size 65\n6. Audio → upbeat track\n7. Export 1080p`
    }
  },
  'PROD-004': {
    hook: {
      script: `SCENE 1 (0-3s): Messy disorganized spice cabinet\nTEXT: "my spice cabinet was embarrassing"\n\nSCENE 2 (3-6s): Rotating rack spinning 360°\nTEXT: "one rack fixed everything"\n\nSCENE 3 (6-9s): Satisfying spin of organized rack\nTEXT: "$29.99 — link in bio"`,
      caption: `Spice cabinet went from chaos to chef's kitchen in 5 minutes. 360° rotating rack. Link in bio 🌶️`,
      hashtags: `#organization #kitchenorganization #spicerack #organizedkitchen #kitchenmakeover #tiktokshop`,
      capcut: `1. Import CJ video, set 9:16\n2. Add Text 0:00-0:03: "my spice cabinet was embarrassing" — white, size 60\n3. Add Text 0:03-0:06: "360° rotating rack fixed it" — white, size 65\n4. Add Text 0:06-end: "$29.99 → link in bio" — orange, size 65\n5. Audio → satisfying organizational music\n6. Export 1080p`
    },
    demo: {
      script: `SCENE 1 (0-5s): Messy spice drawer, can't find anything\nVOICEOVER: "I could never find the spice I needed"\n\nSCENE 2 (5-15s): Install the rotating rack\nVOICEOVER: "set this up in 5 minutes"\n\nSCENE 3 (15-25s): Spin 360°, every spice visible\nVOICEOVER: "360 degrees, see every spice instantly"\n\nSCENE 4 (25-30s): Cooking montage with easy access\nTEXT: "$29.99 — link in bio"`,
      caption: `Kitchen organization arc complete. This rotating spice rack is the single best thing I've added to my kitchen. Link in bio.`,
      hashtags: `#kitchenorganization #spicerack #kitchenmakeover #organizationtok #cleankitchen #tiktokshop #kitchengadgets`,
      capcut: `1. Import CJ video, set 9:16, trim to 30s\n2. Add Text 0:00-0:05: "can never find the right spice..." — white, size 55\n3. Add Text 0:05-0:15: "Rotating Spice Rack" — white bold, size 70\n4. Add Text 0:15-0:25: "360°. See everything. Instantly." — white, size 65\n5. Add Text 0:25-end: "$29.99 → Link in bio" — orange, size 65\n6. Export 1080p`
    }
  },
  'PROD-005': {
    hook: {
      script: `SCENE 1 (0-3s): Show burn from regular oven glove\nTEXT: "regular oven gloves are a scam"\n\nSCENE 2 (3-6s): Silicone gloves grabbing hot pan\nTEXT: "these handle 500°F"\n\nSCENE 3 (6-9s): Safe confident cooking\nTEXT: "$19.99 — link in bio"`,
      caption: `Burned myself with regular oven gloves one too many times. These silicone ones handle 500°F, waterproof, and actually grip. Link in bio 🧤`,
      hashtags: `#kitchensafety #ovengloves #kitchengadgets #cookingtips #grilling #kitchentools #tiktokshop`,
      capcut: `1. Import CJ video, set 9:16\n2. Add Text 0:00-0:03: "regular oven gloves are a scam" — white, size 60\n3. Add Text 0:03-0:06: "these handle 500°F" — white, size 70\n4. Add Text 0:06-end: "$19.99 → link in bio" — orange, size 65\n5. Export 1080p`
    },
    demo: {
      script: `SCENE 1 (0-5s): Regular glove near flame — unsafe\nVOICEOVER: "I burned myself so many times with regular oven mitts"\n\nSCENE 2 (5-15s): Show silicone gloves features\nVOICEOVER: "these silicone gloves handle 500°F, waterproof, non-slip"\n\nSCENE 3 (15-25s): Demo grabbing hot pans, grill, oven\nVOICEOVER: "works on oven, grill, stovetop — everything"\n\nSCENE 4 (25-30s): Rinse clean easily\nTEXT: "$19.99 — link in bio"`,
      caption: `These replaced every oven mitt in my kitchen. Silicone, 500°F rated, waterproof, non-slip. The last oven gloves you'll ever buy. Link in bio.`,
      hashtags: `#kitchensafety #ovengloves #kitchengadgets #grillmaster #baking #kitchentools #cookinghacks #tiktokshop`,
      capcut: `1. Import CJ video, set 9:16, trim to 30s\n2. Add Text 0:00-0:05: "burning myself with oven mitts stops today" — white, size 55\n3. Add Text 0:05-0:15: "Silicone Oven Gloves" — white bold, size 70\n4. Add Text 0:15-0:25: "500°F. Waterproof. Non-slip." — white, size 65\n5. Add Text 0:25-end: "$19.99 → Link in bio" — orange, size 65\n6. Export 1080p`
    }
  }
};

// ─── AGENT SYSTEM ─────────────────────────────────────────────────────────────
const agents = {
  order: { name: 'Order Agent', status: 'running', processed: 0 },
  payment: { name: 'Payment Agent', status: 'running', processed: 0 },
  shipping: { name: 'Shipping Agent', status: 'running', processed: 0 },
  customer: { name: 'Customer Service Agent', status: 'running', processed: 0 },
  inventory: { name: 'Inventory Agent', status: 'running', processed: 0 },
  analytics: { name: 'Analytics Agent', status: 'running', processed: 0 },
  content: { name: 'Content Agent', status: 'running', processed: 0 }
};

function logAgent(agent, message) {
  const entry = { agent, message, time: new Date().toISOString() };
  agentLogs.unshift(entry);
  if (agentLogs.length > 100) agentLogs.pop();
  console.log(`[${agent}] ${message}`);
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function jsonResponse(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
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
    const options = {
      hostname, path: reqPath, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), ...headers }
    };
    const req = https.request(options, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.write(body); req.end();
  });
}

// ─── CJ API ──────────────────────────────────────────────────────────────────
async function getCJToken() {
  if (cjToken && Date.now() < tokenExpiry) return cjToken;
  const res = await httpsPost('developers.cjdropshipping.com', '/api2.0/v1/authentication/getAccessToken', { apiKey: CJ_API_KEY });
  if (res?.data?.accessToken) {
    cjToken = res.data.accessToken;
    tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
    logAgent('order', 'CJ token refreshed');
    return cjToken;
  }
  return null;
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

// ─── SERVER ───────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end(); return;
  }

  // ── GET /api/products ──
  if (req.method === 'GET' && pathname === '/api/products') {
    jsonResponse(res, PRODUCTS); return;
  }

  // ── GET /api/content/:productId ──
  if (req.method === 'GET' && pathname.startsWith('/api/content/')) {
    const productId = pathname.split('/')[3];
    const type = parsed.query.type || 'hook';
    const content = CONTENT_SCRIPTS[productId]?.[type];
    if (!content) { jsonResponse(res, { error: 'Not found' }, 404); return; }
    agents.content.processed++;
    logAgent('content', `Generated ${type} content for ${productId}`);
    jsonResponse(res, content); return;
  }

  // ── POST /api/orders ──
  if (req.method === 'POST' && pathname === '/api/orders') {
    const body = await readBody(req);
    const orderNumber = 'QK-' + Date.now();
    const order = { orderNumber, ...body, status: 'pending', createdAt: new Date().toISOString(), cjStatus: 'pending' };
    orders.push(order);
    agents.order.processed++;
    logAgent('order', `New order ${orderNumber} — $${body.totalAmount}`);

    getCJToken().then(token => {
      if (token) {
        submitToCJ(order, token).then(r => {
          if (r?.result) {
            order.cjStatus = 'submitted';
            order.cjOrderId = r.data?.orderId;
            agents.shipping.processed++;
            logAgent('shipping', `Order ${orderNumber} forwarded to CJ`);
          }
        });
      }
    });

    jsonResponse(res, { success: true, orderNumber, status: 'pending' }); return;
  }

  // ── GET /api/orders ──
  if (req.method === 'GET' && pathname === '/api/orders') {
    jsonResponse(res, { orders, total: orders.length }); return;
  }

  // ── GET /api/agents/status ──
  if (req.method === 'GET' && pathname === '/api/agents/status') {
    jsonResponse(res, { agents, logs: agentLogs.slice(0, 20), uptime: Math.floor(process.uptime()) }); return;
  }

  // ── GET /api/analytics/report ──
  if (req.method === 'GET' && pathname === '/api/analytics/report') {
    const revenue = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const pending = orders.filter(o => o.status === 'pending').length;
    const shipped = orders.filter(o => o.cjStatus === 'submitted').length;
    agents.analytics.processed++;
    jsonResponse(res, {
      sales: { totalOrders: orders.length, totalRevenue: revenue.toFixed(2), averageOrderValue: orders.length ? (revenue / orders.length).toFixed(2) : '0.00', pendingOrders: pending, shippedOrders: shipped },
      payments: { totalTransactions: orders.length, successRate: '100%' },
      topProducts: PRODUCTS.map(p => ({ name: p.name, price: p.price }))
    }); return;
  }

  // ── GET /api/inventory ──
  if (req.method === 'GET' && pathname === '/api/inventory') {
    jsonResponse(res, PRODUCTS.map(p => ({ sku: p.id, productName: p.name, quantity: 50, price: p.price, reorderPoint: 10 }))); return;
  }

  // ── GET /api/logs ──
  if (req.method === 'GET' && pathname === '/api/logs') {
    jsonResponse(res, agentLogs); return;
  }

  // ── STATIC FILES ──
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname === '/admin' ? 'admin.html' : pathname);
  if (!filePath.startsWith(__dirname)) { res.writeHead(403); res.end(); return; }
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(__dirname, 'index.html'), (e2, html) => {
        if (e2) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html);
      }); return;
    }
    res.writeHead(200, { 'Content-Type': mime[path.extname(filePath)] || 'text/plain' }); res.end(data);
  });
});

server.listen(PORT, () => {
  logAgent('order', 'Order Agent started');
  logAgent('payment', 'Payment Agent started');
  logAgent('shipping', 'Shipping Agent started');
  logAgent('customer', 'Customer Service Agent started');
  logAgent('inventory', 'Inventory Agent started');
  logAgent('analytics', 'Analytics Agent started');
  logAgent('content', 'Content Agent started');
  console.log(`\n🚀 QuickKitchen running on port ${PORT}`);
  console.log(`🛍  Store: http://localhost:${PORT}`);
  console.log(`📊 Admin: http://localhost:${PORT}/admin\n`);
});