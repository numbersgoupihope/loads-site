/**
 * Loads backend (Google Apps Script, attached to the "Loads bookings" Google Sheet).
 *  - Saves bookings and waitlist sign-ups from the website.
 *  - Emails a notice for every new booking.
 *  - Answers the customer tracking page.
 *  - Takes stage updates from the staff page.
 *
 * Setup: README.md, step 1.
 */

// Where new bookings get emailed. Separate several addresses with commas.
const NOTIFY_EMAIL = '';

// PIN the staff page asks for (4 to 8 digits). Leave empty and the staff page stays locked.
const STAFF_PIN = '';

// Order stages, in order. Must match LOADS_STAGES in config.js.
const STAGES = ['booked', 'picked_up', 'at_store', 'washing', 'drying', 'folding', 'out_for_delivery', 'delivered'];

const BOOKING_HEADERS = [
  'received_at', 'booking_id', 'stage', 'stage_updated_at', 'pickup_date', 'pickup_label', 'zone', 'zip',
  'name', 'phone', 'address', 'notes', 'heard',
  'sms_order_consent', 'sms_marketing_consent', 'first_order_offer',
  'weight_lbs', 'order_total',
  'picked_up_at', 'at_store_at', 'washing_at', 'drying_at', 'folding_at', 'out_for_delivery_at', 'delivered_at',
  'track_token', 'track_url',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'gclid', 'gbraid', 'wbraid', 'fbclid', 'ttclid',
  'first_utm_source', 'first_utm_medium', 'first_utm_campaign', 'first_utm_content',
  'landing_page', 'referrer', 'first_seen', 'submitted_at', 'user_agent'
];

const WAITLIST_HEADERS = [
  'received_at', 'zip', 'phone',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'gclid', 'fbclid',
  'landing_page', 'referrer', 'first_seen', 'submitted_at'
];

/* ---------------- entry points ---------------- */

function doPost(e) {
  const type = (e && e.postData && e.postData.type) || '';
  if (type.indexOf('text/plain') === 0) {               // staff page sends JSON as plain text
    let req;
    try { req = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'bad_request' }); }
    return json_(staff_(req));
  }
  return saveForm_((e && e.parameter) || {});           // booking form and waitlist
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'track') return json_(track_(p.id, p.t));
  return ContentService.createTextOutput('Loads booking endpoint is running.');
}

/* ---------------- bookings and waitlist ---------------- */

function saveForm_(p) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    if (p.company) return json_({ ok: true });            // spam trap field
    const isWaitlist = p.type === 'waitlist';
    const sheet = sheet_(isWaitlist ? 'Waitlist' : 'Bookings', isWaitlist ? WAITLIST_HEADERS : BOOKING_HEADERS);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const now = new Date();
    const row = headers.map(function (h) {
      if (h === 'received_at' || h === 'stage_updated_at') return now;
      if (h === 'stage') return 'booked';
      return clean_(p[h]);
    });
    sheet.appendRow(row);
    if (!isWaitlist && NOTIFY_EMAIL) notify_(p);
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function notify_(p) {
  const lines = [
    'New Loads pickup booking',
    '',
    'Pickup: ' + (p.pickup_label || p.pickup_date || '') + '  (' + (p.zone || '') + ')',
    'Name: ' + (p.name || ''),
    'Mobile: ' + (p.phone || ''),
    'Address: ' + (p.address || '') + '  ' + (p.zip || ''),
    'Notes: ' + (p.notes || '-'),
    'Heard about us: ' + (p.heard || '-'),
    'First-order offer: ' + (p.first_order_offer || ''),
    'Reminder texts OK: ' + (p.sms_marketing_consent || 'no'),
    'Source: ' + [p.utm_source, p.utm_medium, p.utm_campaign].filter(String).join(' / '),
    '',
    'Tracking link for the customer: ' + (p.track_url || ''),
    'Booking ID: ' + (p.booking_id || ''),
    'Text the customer to confirm the pickup window.'
  ];
  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: 'New pickup: ' + (p.name || 'customer') + ', ' + (p.pickup_label || p.pickup_date || ''),
    body: lines.join('\n')
  });
}

/* ---------------- customer tracking ---------------- */

function track_(id, token) {
  const t = table_('Bookings');
  const r = t && t.rows.filter(function (row) { return String(row.booking_id) === String(id); })[0];
  if (!r || !token || String(r.track_token) !== String(token)) return { ok: false, error: 'not_found' };
  return {
    ok: true,
    order: {
      id: r.booking_id,
      first_name: String(r.name || '').trim().split(/\s+/)[0],
      stage: r.stage || 'booked',
      pickup_label: r.pickup_label || '',
      zone: r.zone || '',
      weight_lbs: r.weight_lbs === '' ? '' : Number(r.weight_lbs),
      order_total: r.order_total === '' ? '' : Number(r.order_total),
      times: times_(r)
    }
  };
}

function times_(r) {
  const out = { booked: iso_(r.received_at) };
  STAGES.slice(1).forEach(function (s) { out[s] = iso_(r[s + '_at']); });
  return out;
}

/* ---------------- staff page ---------------- */

function staff_(req) {
  if (!STAFF_PIN || String(req.pin) !== String(STAFF_PIN)) return { ok: false, error: 'pin' };
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    if (req.action === 'set_stage') setStage_(req.id, req.stage);
    if (req.action === 'set_weight') setWeight_(req.id, req.weight_lbs, req.order_total);
    return { ok: true, orders: list_() };
  } finally {
    lock.releaseLock();
  }
}

function setStage_(id, stage) {
  const i = STAGES.indexOf(stage);
  if (i < 0) return;
  const t = table_('Bookings');
  const r = t && find_(t, id);
  if (!r) return;
  const now = new Date();
  const updates = { stage: stage, stage_updated_at: now };
  if (i > 0 && !r[stage + '_at']) updates[stage + '_at'] = now;
  STAGES.slice(i + 1).forEach(function (s) { updates[s + '_at'] = ''; });   // stepping back clears later stages
  write_(t, r, updates);
}

function setWeight_(id, weight, total) {
  const t = table_('Bookings');
  const r = t && find_(t, id);
  if (!r) return;
  const w = Number(weight), tot = Number(total);
  write_(t, r, { weight_lbs: isFinite(w) && w > 0 ? w : '', order_total: isFinite(tot) && tot > 0 ? tot : '' });
}

function list_() {
  const t = table_('Bookings');
  if (!t) return [];
  const tz = Session.getScriptTimeZone();
  const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  return t.rows
    .filter(function (r) {
      if (!r.booking_id) return false;
      if (r.stage !== 'delivered') return true;
      return r.delivered_at instanceof Date && Utilities.formatDate(r.delivered_at, tz, 'yyyy-MM-dd') === today;
    })
    .map(function (r) {
      return {
        id: String(r.booking_id), name: String(r.name || ''), phone: String(r.phone || ''),
        address: String(r.address || ''), zip: String(r.zip || ''), notes: String(r.notes || ''),
        zone: String(r.zone || ''), pickup_date: day_(r.pickup_date, tz), pickup_label: String(r.pickup_label || ''),
        stage: r.stage || 'booked', weight_lbs: r.weight_lbs, order_total: r.order_total,
        first_order_offer: String(r.first_order_offer || ''), track_url: String(r.track_url || ''),
        updated: iso_(r.stage_updated_at)
      };
    })
    .sort(function (a, b) { return a.pickup_date < b.pickup_date ? -1 : a.pickup_date > b.pickup_date ? 1 : 0; });
}

/* ---------------- sheet helpers ---------------- */

function sheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sh;
}

function table_(name) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh || sh.getLastRow() < 1) return null;
  const values = sh.getDataRange().getValues();
  const headers = values[0].map(String);
  const rows = values.slice(1).map(function (v, i) {
    const o = { _row: i + 2 };
    headers.forEach(function (h, c) { o[h] = v[c]; });
    return o;
  });
  return { sheet: sh, headers: headers, rows: rows };
}

function find_(t, id) {
  return t.rows.filter(function (r) { return String(r.booking_id) === String(id); })[0];
}

function write_(t, r, updates) {
  Object.keys(updates).forEach(function (k) {
    const c = t.headers.indexOf(k);
    if (c >= 0) t.sheet.getRange(r._row, c + 1).setValue(updates[k]);
  });
}

// Keeps text from being read as a spreadsheet formula and caps its length.
function clean_(v) {
  v = v == null ? '' : String(v).slice(0, 1000);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function iso_(v) {
  return v instanceof Date ? v.toISOString() : (v ? String(v) : '');
}

function day_(v, tz) {
  return v instanceof Date ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : String(v || '');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
