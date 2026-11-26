/** @OnlyCurrentDoc */
/**
 * Loads backend (Google Apps Script, attached to the "Loads bookings" Google Sheet).
 *  - Saves bookings and waitlist sign-ups from the website.
 *  - Emails a notice for every new booking.
 *  - Answers the customer tracking page.
 *  - Takes stage updates from the staff page.
 *  - Bills customers through Square when staff tap "Send bill" (see Square.gs).
 *  - Starts Loads Weekly sign-ups (the monthly plan) on Square's checkout page.
 *
 * Setup: README.md, step 1.
 */

// Where new bookings get emailed. Separate several addresses with commas.
const NOTIFY_EMAIL = 'loadspickup@gmail.com,dimitri@dpzwest.com';

// PIN the staff page asks for (4 to 8 digits). Leave empty and the staff page stays locked.
const STAFF_PIN = '';

// Order stages, in order. Must match LOADS_STAGES in config.js.
const STAGES = ['booked', 'on_the_way', 'picked_up', 'at_store', 'washing', 'drying', 'folding', 'out_for_delivery', 'delivered'];

const BOOKING_HEADERS = [
  'received_at', 'booking_id', 'stage', 'stage_updated_at', 'pickup_date', 'pickup_label', 'zone', 'zip',
  'name', 'phone', 'address', 'notes', 'heard',
  'sms_order_consent', 'sms_marketing_consent', 'first_order_offer', 'first_order',
  'weight_lbs', 'order_total', 'paid_at',
  'picked_up_at', 'at_store_at', 'washing_at', 'drying_at', 'folding_at', 'out_for_delivery_at', 'delivered_at',
  'track_token', 'track_url',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'gclid', 'gbraid', 'wbraid', 'fbclid', 'ttclid',
  'first_utm_source', 'first_utm_medium', 'first_utm_campaign', 'first_utm_content',
  'landing_page', 'referrer', 'first_seen', 'submitted_at', 'user_agent', 'lang',
  'square_customer_id', 'square_order_id', 'square_invoice_id', 'square_bill_url', 'square_bill_total', 'square_payment_id', 'bill_sent_at',
  'subscriber',
  'pickup_window', 'dropoff_label', 'dropoff_window', 'wash_temp', 'on_the_way_at',
  'eta_at', 'eta_stage', 'canceled_at', 'canceled_from', 'needs_yes', 'confirmed_at', 'form_seconds', 'no_show_at',
  'order_type', 'return_method'
];

// Loads Weekly sign-ups from the website. Square keeps the subscription itself.
const SUBSCRIBER_HEADERS = [
  'received_at', 'name', 'phone', 'email', 'address', 'zip', 'zone', 'lang', 'status', 'checkout_url',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'gclid', 'fbclid', 'landing_page', 'referrer'
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
    if (req.action === 'subscribe') {                     // Loads Weekly sign-up from the website
      try { return json_(subscribe_(req)); } catch (err) { return json_({ ok: false, error: 'square', message: String(err && err.message || err) }); }
    }
    return json_(staff_(req));
  }
  return saveForm_((e && e.parameter) || {});           // booking form and waitlist
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'track') return json_(track_(p.id, p.t));
  if (p.action === 'hit') return json_(hit_(p));
  if (p.action === 'stats') return json_(stats_(p));
  return ContentService.createTextOutput('Loads booking endpoint is running.');
}

/* ---------------- bookings and waitlist ---------------- */

function saveForm_(p) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    if (p.company) return json_({ ok: true });            // spam trap field
    // Bots fill the whole form in a blink; people take a while. Drop bookings sent in under 4 seconds.
    const formMs = p.form_ms === undefined || p.form_ms === '' ? null : Number(p.form_ms);
    if (p.type !== 'waitlist' && formMs !== null && formMs < 4000) return json_({ ok: true });
    if (formMs !== null) p.form_seconds = Math.round(formMs / 1000);
    const isWaitlist = p.type === 'waitlist';
    const sheet = sheet_(isWaitlist ? 'Waitlist' : 'Bookings', isWaitlist ? WAITLIST_HEADERS : BOOKING_HEADERS);
    if (!isWaitlist) p.first_order = isFirstOrder_(p.phone) ? 'yes' : 'no';
    if (!isWaitlist) p.subscriber = planFlag_(p.phone);   // Loads Weekly member? Asks Square by mobile number
    if (!isWaitlist) {
      const seen = phoneHistory_(p.phone);
      // No finished order yet: they reply YES before a driver goes out. Drop-offs bring the bag in themselves.
      p.needs_yes = seen.delivered || p.order_type === 'dropoff' ? 'no' : 'yes';
      p.open_before = seen.open;                           // other open bookings on this number (flagged in the email)
    }
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const now = new Date();
    const row = headers.map(function (h) {
      if (h === 'received_at' || h === 'stage_updated_at') return now;
      if (h === 'stage') return 'booked';
      return TEXT_FIELDS.indexOf(h) >= 0 ? text_(p[h]) : clean_(p[h]);
    });
    sheet.appendRow(row);
    if (!isWaitlist && NOTIFY_EMAIL) notify_(p);
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function notify_(p) {
  const drop = p.order_type === 'dropoff', atStore = drop && p.return_method === 'store';
  const lines = [
    drop ? 'New Loads drop-off booking' : 'New Loads pickup booking',
    '',
    drop ? 'Drop-off: ' + (p.zone || '') + ', ' + when_(p.pickup_label || p.pickup_date, String(p.pickup_window || '').replace(/^Drop-off /, ''))
         : 'Pickup: ' + when_(p.pickup_label || p.pickup_date, p.pickup_window) + '  (' + (p.zone || '') + ')',
    atStore ? 'Back: they pick it up at the store (ready ' + (p.dropoff_label || '') + ')'
            : (drop ? 'Deliver back: ' : 'Drop-off: ') + (when_(p.dropoff_label, p.dropoff_window) || '-'),
    'Wash: ' + (p.wash_temp || '-'),
    'Name: ' + (p.name || ''),
    'Mobile: ' + (p.phone || ''),
    atStore ? null : 'Address: ' + (p.address || '') + '  ' + (p.zip || ''),
    'Notes: ' + (p.notes || '-'),
    'Heard about us: ' + (p.heard || '-'),
    'First order: ' + (p.first_order || ''),
    p.open_before ? 'Heads-up: this number already has ' + p.open_before + ' other open booking' + (p.open_before > 1 ? 's' : '') + '. Could be a duplicate.' : null,
    'Loads Weekly member: ' + (p.subscriber === 'yes' ? 'yes' : 'no'),
    'Reminder texts OK: ' + (p.sms_marketing_consent || 'no'),
    'Source: ' + [p.utm_source, p.utm_medium, p.utm_campaign].filter(String).join(' / '),
    '',
    'Tracking link for the customer: ' + (p.track_url || ''),
    'Booking ID: ' + (p.booking_id || ''),
    drop
      ? 'When they bring the bag in, tap "Dropped off" in the staff app.'
      : p.needs_yes === 'yes'
        ? 'New customer: tap Text update in the staff app to send the confirmation, and wait for their YES before anyone heads out.'
        : 'Tap Text update in the staff app to send the confirmation.',
    drop ? null : 'When you head out for this pickup, tap "On my way" in the staff app. It texts the customer your arrival time.'
  ].filter(function (l) { return l !== null; });
  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: (p.open_before ? 'Possible duplicate: ' : drop ? 'New drop-off: ' : 'New pickup: ') + (p.name || 'customer') + ', ' + when_(p.pickup_label || p.pickup_date, drop ? p.zone : p.pickup_window),
    body: lines.join('\n')
  });
}

// "Mon, Nov 17, 9 to 11am"
function when_(day, win) {
  return [day, win].filter(function (v) { return v; }).join(', ');
}

/* ---------------- customer tracking ---------------- */

function track_(id, token) {
  const t = table_('Bookings');
  const r = t && t.rows.filter(function (row) { return String(row.booking_id) === String(id); })[0];
  if (!r || !token || String(r.track_token) !== String(token)) return { ok: false, error: 'not_found' };
  if (r.square_invoice_id && !r.paid_at) {
    syncPaid_(id);
    const fresh = find_(table_('Bookings'), id);
    if (fresh) r.paid_at = fresh.paid_at;
  }
  return {
    ok: true,
    order: {
      id: r.booking_id,
      first_name: String(r.name || '').trim().split(/\s+/)[0],
      stage: r.stage || 'booked',
      pickup_label: label_(r.pickup_label, Session.getScriptTimeZone()),
      pickup_window: String(r.pickup_window || ''),
      dropoff_label: label_(r.dropoff_label, Session.getScriptTimeZone()),
      dropoff_window: String(r.dropoff_window || ''),
      order_type: String(r.order_type || 'pickup'), return_method: String(r.return_method || 'delivery'),
      eta_at: r.eta_stage && r.eta_stage === r.stage ? iso_(r.eta_at) : '',
      zone: r.zone || '',
      weight_lbs: r.weight_lbs === '' ? '' : Number(r.weight_lbs),
      order_total: r.order_total === '' ? '' : Number(r.order_total),
      paid: !!r.paid_at,
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
    sheet_('Bookings', BOOKING_HEADERS);                  // adds any new columns to an older sheet
    let error = '', message = '', bill = null, eta = null;
    if (req.action === 'list') syncPaid_();
    if (req.action === 'set_stage') error = setStage_(req.id, req.stage) || '';
    if (req.action === 'set_weight') setWeight_(req.id, req.weight_lbs, req.order_total);
    if (req.action === 'set_paid') setPaid_(req.id, req.paid);
    if (req.action === 'eta') { const res = eta_(req); if (res.error) error = res.error; else eta = res.eta; }
    if (req.action === 'cancel') error = cancel_(req.id, true) || '';
    if (req.action === 'uncancel') error = cancel_(req.id, false) || '';
    if (req.action === 'confirmed') { const ct = table_('Bookings'), cr = ct && find_(ct, req.id); if (cr) write_(ct, cr, { confirmed_at: req.on === false ? '' : new Date() }); }
    if (req.action === 'no_show') {
      try {
        const res = noShow_(req.id);
        if (res.error) { error = res.error; message = res.message || ''; } else bill = res.bill;
      } catch (e) {
        error = 'square'; message = String(e && e.message || e);
      }
    }
    if (req.action === 'send_bill') {
      try {
        const res = sendBill_(req.id);
        if (res.error) { error = res.error; message = res.message || ''; } else bill = res.bill;
      } catch (e) {
        error = 'square'; message = String(e && e.message || e);
      }
    }
    const out = { ok: !error, orders: list_() };
    if (error) out.error = error;
    if (message) out.message = message;
    if (bill) out.bill = bill;
    if (eta) out.eta = eta;
    return out;
  } finally {
    lock.releaseLock();
  }
}

// Driver taps "On my way" (pickup) or "Out for delivery": work out when they'll get there.
// The staff app sends the phone's location; Google Maps gives the drive time in traffic.
// If that fails the app asks the driver instead and sends minutes. Returns 'no_eta' when
// there's neither, and leaves the stage alone so the driver can pick a time.
function eta_(req) {
  const stage = req.stage === 'out_for_delivery' ? 'out_for_delivery' : 'on_the_way';
  const t = table_('Bookings');
  const r = t && find_(t, req.id);
  if (!r) return { error: 'not_found' };
  let minutes = Math.round(Number(req.minutes) || 0), source = 'driver';
  if (!minutes) {
    const drive = driveSeconds_(Number(req.lat), Number(req.lng), String(r.address || ''), String(r.zip || ''));
    if (drive) { minutes = Math.ceil((drive + 180) / 300) * 5; source = 'maps'; }   // +3 min to park, rounded up to 5
  }
  if (!minutes) return { error: 'no_eta' };
  minutes = Math.min(Math.max(minutes, 5), 240);
  if (r.stage !== stage) {
    const err = setStage_(req.id, stage);
    if (err) return { error: err };
  }
  const at = new Date(Date.now() + minutes * 60000);
  write_(t, r, { eta_at: at, eta_stage: stage });
  return { eta: { minutes: minutes, at: at.toISOString(), source: source } };
}

function driveSeconds_(lat, lng, street, zip) {
  if (!isFinite(lat) || !isFinite(lng) || (lat === 0 && lng === 0) || !street.trim()) return 0;
  try {
    const res = Maps.newDirectionFinder().setOrigin(lat, lng).setDestination(street.trim() + ', CA ' + zip)
      .setMode(Maps.DirectionFinder.Mode.DRIVING).setDepart(new Date()).getDirections();
    const leg = res && res.routes && res.routes[0] && res.routes[0].legs && res.routes[0].legs[0];
    return leg ? Number((leg.duration_in_traffic || leg.duration || {}).value) || 0 : 0;
  } catch (e) {
    return 0;
  }
}

// Run this from the editor for a quick health check of the whole system. It logs counts,
// order IDs and first names only (no phones or addresses). Changes nothing.
function checkHealth() {
  const lines = [], tz = Session.getScriptTimeZone();
  const t = table_('Bookings');
  if (!t) { Logger.log('No Bookings sheet yet.'); return; }
  const missing = BOOKING_HEADERS.filter(function (h) { return t.headers.indexOf(h) < 0; });
  lines.push('Bookings: ' + t.rows.length + ' rows. Missing columns: ' + (missing.join(', ') || 'none (they get added on the next booking or staff action)'));
  const byStage = {};
  t.rows.forEach(function (r) { const k = String(r.stage || '(blank)'); byStage[k] = (byStage[k] || 0) + 1; });
  lines.push('By stage: ' + Object.keys(byStage).map(function (k) { return k + ' ' + byStage[k]; }).join(', '));
  let listed = [];
  try { listed = list_().map(function (o) { return o.id; }); lines.push('Staff list: OK, ' + listed.length + ' orders showing'); }
  catch (e) { lines.push('Staff list: ERROR ' + e); }
  t.rows.slice(-6).forEach(function (r) {
    const reached = STAGES.slice(1).filter(function (s) { return r[s + '_at']; });
    let tracked = '';
    try { const tr = track_(r.booking_id, r.track_token); tracked = tr && tr.ok ? 'tracker OK (' + tr.order.stage + ')' : 'tracker ' + JSON.stringify(tr).slice(0, 60); }
    catch (e) { tracked = 'tracker ERROR ' + e; }
    lines.push('  ' + r.booking_id + ' ' + String(r.name || '').trim().split(/\s+/)[0] + ': stage ' + r.stage +
      ' | done: ' + (reached.join(' > ') || 'none') + ' | weight ' + (r.weight_lbs || '-') + ' | total ' + (r.order_total || '-') +
      ' | paid ' + (r.paid_at ? 'yes' : 'no') + ' | ' + (listed.indexOf(String(r.booking_id)) >= 0 ? 'in staff list' : 'not in staff list') + ' | ' + tracked);
  });
  const drive = driveSeconds_(34.0688, -118.3093, '6839 Lennox Ave, Van Nuys', '91405');
  lines.push('Google Maps drive time: ' + (drive ? 'OK (' + Math.round(drive / 60) + ' min store to store)' : 'FAILED'));
  lines.push('Email: ' + MailApp.getRemainingDailyQuota() + ' alert emails left today');
  const props = PropertiesService.getScriptProperties();
  lines.push('Staff PIN set: ' + (STAFF_PIN ? 'yes' : 'NO'));
  if (!props.getProperty('SQUARE_TOKEN')) lines.push('Square: NO KEY SAVED');
  else {
    try { const loc = sq_('get', '/locations/' + SQUARE_LOCATION).location; lines.push('Square: OK (' + loc.name + ', ' + loc.status + ')'); }
    catch (e) { lines.push('Square: ERROR ' + e); }
  }
  const v = table_('Visits');
  if (v) {
    const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
    lines.push('Site visits logged today: ' + v.rows.filter(function (r) { return r.at && Utilities.formatDate(new Date(r.at), tz, 'yyyy-MM-dd') === today; }).length);
  }
  Logger.log(lines.join('\n'));
  return lines.join('\n');
}

// Run this from the editor to see what staff did on recent orders: when each step was tapped,
// the arrival estimate vs. the actual pickup, weighing, billing and payment. First names only.
function checkActivity() {
  const t = table_('Bookings'), tz = Session.getScriptTimeZone(), lines = [];
  if (!t) { Logger.log('No bookings yet.'); return; }
  const clock = function (v) { return v ? Utilities.formatDate(new Date(v), tz, 'EEE h:mm a') : ''; };
  const mins = function (a, b) { return Math.round((new Date(b) - new Date(a)) / 60000); };
  const weekAgo = Date.now() - 7 * 864e5;
  t.rows.filter(function (r) { return r.booking_id && new Date(r.received_at || 0).getTime() > weekAgo; }).forEach(function (r) {
    const first = String(r.name || '').trim().split(/\s+/)[0];
    lines.push(r.booking_id + ' ' + first + ' | booked ' + clock(r.received_at) + ' | pickup ' + [label_(r.pickup_label, tz), r.pickup_window].filter(String).join(', ') +
      ' | ' + (String(r.first_order) === 'yes' ? 'new customer' : 'repeat') + ' | now: ' + r.stage);
    const steps = [], flags = [];
    let prev = null;
    STAGES.slice(1).forEach(function (s) {
      const at = r[s + '_at'];
      if (!at) return;
      steps.push(s.replace(/_/g, ' ') + ' ' + clock(at) + (prev ? ' (+' + mins(prev, at) + ' min)' : ''));
      prev = at;
    });
    lines.push('  steps: ' + (steps.join(' > ') || 'none yet'));
    if (r.confirmed_at) lines.push('  YES confirmed ' + clock(r.confirmed_at));
    if (r.eta_at && r.eta_stage) {
      const done = r.eta_stage === 'on_the_way' ? r.picked_up_at : r.delivered_at;
      lines.push('  arrival estimate (' + r.eta_stage.replace(/_/g, ' ') + '): ' + clock(r.eta_at) +
        (done ? ', actual ' + clock(done) + ' (' + Math.abs(mins(r.eta_at, done)) + ' min ' + (new Date(done) <= new Date(r.eta_at) ? 'early' : 'late') + ')' : ''));
    }
    if (r.weight_lbs) lines.push('  weighed ' + r.weight_lbs + ' lb, total $' + Number(r.order_total || 0).toFixed(2) +
      (r.bill_sent_at ? ' | bill sent ' + clock(r.bill_sent_at) : '') +
      (r.paid_at ? ' | paid ' + clock(r.paid_at) + ' (' + (r.square_payment_id && !r.square_invoice_id ? 'saved card' : r.square_invoice_id ? 'payment link' : 'marked paid by staff: cash/Zelle') + ')' : ' | not paid yet'));
    if (r.canceled_at || r.stage === 'canceled') lines.push('  ' + (r.no_show_at ? 'NO-SHOW' : 'canceled') + ' ' + clock(r.canceled_at || r.stage_updated_at) + (r.canceled_from ? ' (was: ' + String(r.canceled_from).replace(/_/g, ' ') + ')' : ''));
    if (r.picked_up_at && !r.on_the_way_at) flags.push('picked up without tapping On my way, so no arrival text');
    if (r.at_store_at && !r.weight_lbs && Date.now() - new Date(r.at_store_at) > 2 * 3600e3) flags.push('at the store 2+ hours and not weighed');
    if (r.weight_lbs && !r.paid_at && !r.bill_sent_at && r.stage !== 'canceled') flags.push('weighed but no bill sent');
    if (r.out_for_delivery_at && r.stage === 'out_for_delivery' && Date.now() - new Date(r.out_for_delivery_at) > 3 * 3600e3) flags.push('out for delivery 3+ hours, not marked delivered');
    if (String(r.needs_yes) === 'yes' && !r.confirmed_at && r.on_the_way_at) flags.push('driver went out before the YES');
    lines.push('  ' + (flags.length ? 'CHECK: ' + flags.join('; ') : 'nothing off'));
  });
  Logger.log(lines.join('\n') || 'No orders in the last 7 days.');
  return lines.join('\n');
}

// Run this from the editor to check the Google Maps drive-time lookup works (store to store).
function checkDriveTime() {
  const s = driveSeconds_(34.0688, -118.3093, '6839 Lennox Ave, Van Nuys', '91405');
  Logger.log(s ? 'Koreatown store to Van Nuys store: ' + Math.round(s / 60) + ' min' : 'Drive time lookup failed');
  return s;
}

// Cancel an order that hasn't been picked up yet (or undo that). Canceled orders leave the
// staff list and the tracker says canceled. The row stays in the Sheet.
function cancel_(id, on) {
  const t = table_('Bookings');
  const r = t && find_(t, id);
  if (!r) return 'not_found';
  if (on) {
    if (r.stage !== 'booked' && r.stage !== 'on_the_way') return 'cant_cancel';
    write_(t, r, { stage: 'canceled', canceled_from: r.stage, canceled_at: new Date(), stage_updated_at: new Date() });
  } else {
    if (r.stage !== 'canceled') return;
    write_(t, r, { stage: STAGES.indexOf(String(r.canceled_from)) >= 0 ? String(r.canceled_from) : 'booked', canceled_at: '', stage_updated_at: new Date() });
  }
}

// Returns 'unpaid' when an order would go out for delivery before it's marked paid.
function setStage_(id, stage) {
  const i = STAGES.indexOf(stage);
  if (i < 0) return;
  const t = table_('Bookings');
  const r = t && find_(t, id);
  if (!r) return;
  // Paid before it leaves the store. A drop-off they collect can be marked ready first and paid at the counter.
  const collect = String(r.order_type) === 'dropoff' && String(r.return_method) === 'store';
  if (i >= STAGES.indexOf(collect ? 'delivered' : 'out_for_delivery') && !r.paid_at) return 'unpaid';
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
  const weighed = isFinite(w) && w > 0;
  // $0 is a real total for a Loads Weekly pickup that's fully covered by the plan.
  const updates = { weight_lbs: weighed ? w : '', order_total: weighed && String(total == null ? '' : total).trim() !== '' && isFinite(tot) && tot >= 0 ? tot : '' };
  // A bill already went out for a different amount: cancel it so the old link can't be paid.
  if (r.square_invoice_id && !r.paid_at && Number(r.square_bill_total) !== updates.order_total) {
    cancelInvoice_(r.square_invoice_id);
    Object.assign(updates, { square_invoice_id: '', square_bill_url: '', square_bill_total: '', bill_sent_at: '' });
  }
  write_(t, r, updates);
}

function setPaid_(id, paid) {
  const t = table_('Bookings');
  const r = t && find_(t, id);
  if (!r) return;
  write_(t, r, { paid_at: paid === true || paid === 'true' ? new Date() : '' });
}

// A booking is a first order when no earlier booking has the same mobile number.
// Has this number finished an order before, and how many of its bookings are still open?
function phoneHistory_(phone) {
  const d = String(phone || '').replace(/\D/g, '').slice(-10), out = { delivered: false, open: 0 };
  const t = d.length === 10 && table_('Bookings');
  if (!t) return out;
  t.rows.forEach(function (r) {
    if (String(r.phone || '').replace(/\D/g, '').slice(-10) !== d) return;
    if (r.stage === 'delivered' || r.delivered_at) out.delivered = true;
    else if (r.stage !== 'canceled') out.open++;
  });
  return out;
}

function isFirstOrder_(phone) {
  const d = String(phone || '').replace(/\D/g, '').slice(-10);
  if (d.length < 10) return true;
  const t = table_('Bookings');
  if (!t) return true;
  return !t.rows.some(function (r) { return r.stage !== 'canceled' && String(r.phone || '').replace(/\D/g, '').slice(-10) === d; });
}

function list_() {
  const t = table_('Bookings');
  if (!t) return [];
  const tz = Session.getScriptTimeZone();
  const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  return t.rows
    .filter(function (r) {
      if (!r.booking_id || r.stage === 'canceled') return false;
      if (r.stage !== 'delivered') return true;
      return r.delivered_at instanceof Date && Utilities.formatDate(r.delivered_at, tz, 'yyyy-MM-dd') === today;
    })
    .map(function (r) {
      return {
        id: String(r.booking_id), name: String(r.name || ''), phone: String(r.phone || ''),
        address: String(r.address || ''), zip: String(r.zip || ''), notes: String(r.notes || ''),
        zone: String(r.zone || ''), pickup_date: day_(r.pickup_date, tz), pickup_label: label_(r.pickup_label, tz),
        pickup_window: String(r.pickup_window || ''), dropoff_label: label_(r.dropoff_label, tz),
        dropoff_window: String(r.dropoff_window || ''), wash_temp: String(r.wash_temp || ''),
        order_type: String(r.order_type || 'pickup'), return_method: String(r.return_method || 'delivery'),
        eta_at: r.eta_stage && r.eta_stage === r.stage ? iso_(r.eta_at) : '',
        needs_yes: String(r.needs_yes) === 'yes', confirmed: !!r.confirmed_at,
        stage: r.stage || 'booked', weight_lbs: r.weight_lbs, order_total: r.order_total,
        first_order_offer: String(r.first_order_offer || ''), first_order: String(r.first_order || ''),
        paid: !!r.paid_at, track_url: String(r.track_url || ''),
        bill_url: String(r.square_bill_url || ''), bill_total: r.square_bill_total === '' ? '' : Number(r.square_bill_total) || '',
        bill_sent: !!r.bill_sent_at, lang: String(r.lang || ''),
        subscriber: String(r.subscriber) === 'yes', plan_extra: String(r.subscriber) === 'yes' && extraPickup_(t, r),
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
    return sh;
  }
  const have = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0].map(String).filter(String);
  const missing = headers.filter(function (h) { return have.indexOf(h) < 0; });
  if (missing.length) sh.getRange(1, have.length + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
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

// Sheets turns text like "2026-11-23" or "Mon, Nov 23" into dates. These columns are saved as plain text.
const TEXT_FIELDS = ['pickup_date', 'pickup_label', 'zip', 'pickup_window', 'dropoff_label', 'dropoff_window'];

function text_(v) {
  v = clean_(v);
  return v && v.charAt(0) !== "'" ? "'" + v : v;
}

function label_(v, tz) {
  return v instanceof Date ? Utilities.formatDate(v, tz, 'EEE, MMM d') : String(v || '');
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

/* ---------------- visit counts and weekly stats (no personal info) ---------------- */

const VISIT_HEADERS = ['at', 'source', 'medium', 'campaign', 'content', 'referrer', 'page'];

// One row per website visit (the site sends this once per browser session).
function hit_(p) {
  const cut = (v, n) => clean_(v).slice(0, n);
  sheet_('Visits', VISIT_HEADERS).appendRow([new Date(), cut(p.src, 60), cut(p.med, 60), cut(p.camp, 80), cut(p.cont, 80), cut(p.ref, 120), cut(p.page, 200)]);
  return { ok: true };
}

// Weekly totals by source: visits, bookings, Loads Weekly sign-ups, waitlist. Counts only.
// GET ?action=stats&weeks=8
function stats_(p) {
  const weeks = Math.max(1, Math.min(26, Number(p.weeks) || 8));
  const since = new Date(); since.setDate(since.getDate() - weeks * 7 - 7);
  const out = {};
  const bump = function (w, key, src) {
    if (!w) return;
    if (!out[w]) out[w] = { week_of: w, visits: {}, bookings: {}, plan_signups: {}, waitlist: 0 };
    if (key === 'waitlist') out[w].waitlist++;
    else out[w][key][src] = (out[w][key][src] || 0) + 1;
  };
  function scan(name, dateCol, key, srcCols) {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
    if (!sh || sh.getLastRow() < 2) return;
    const vals = sh.getDataRange().getValues(), h = vals[0];
    const di = h.indexOf(dateCol), ni = h.indexOf('name');
    for (let i = 1; i < vals.length; i++) {
      const d = vals[i][di];
      if (!(d instanceof Date) || d < since) continue;
      if (ni >= 0 && /^test/i.test(String(vals[i][ni] || ''))) continue;      // staff test orders
      let src = '';
      (srcCols || []).forEach(function (c) { const j = h.indexOf(c); if (!src && j >= 0) src = String(vals[i][j] || '').replace(/^'/, ''); });
      bump(weekOf_(d), key, (src || '(direct)').toLowerCase());
    }
  }
  scan('Visits', 'at', 'visits', ['source']);
  scan('Bookings', 'received_at', 'bookings', ['utm_source', 'first_utm_source']);
  scan('Subscribers', 'received_at', 'plan_signups', ['utm_source']);
  scan('Waitlist', 'received_at', 'waitlist', []);
  return { ok: true, generated_at: new Date().toISOString(), weeks: Object.keys(out).sort().reverse().slice(0, weeks).map(function (k) { return out[k]; }) };
}

// Monday-morning data email for the weekly report (set up as a time-driven trigger: Triggers > Add Trigger >
// emailWeeklyStats, Time-driven, Week timer, Monday, 7am to 8am). Counts only, goes to Mick's personal inbox.
const STATS_EMAIL = 'mick.mathis@gmail.com';
function emailWeeklyStats() {
  const s = stats_({ weeks: 4 });
  const fmt = function (o) { return Object.keys(o).sort(function (a, b) { return o[b] - o[a]; }).map(function (k) { return k + ' ' + o[k]; }).join(', ') || 'none'; };
  const lines = s.weeks.map(function (w) {
    return 'Week of ' + w.week_of + '\n  Visits: ' + fmt(w.visits) + '\n  Bookings: ' + fmt(w.bookings) +
      '\n  Loads Weekly sign-ups: ' + fmt(w.plan_signups) + '\n  Waitlist: ' + w.waitlist;
  });
  MailApp.sendEmail(STATS_EMAIL, 'Loads weekly stats (data)', 'Website numbers by source, counts only.\n\n' + lines.join('\n\n') + '\n\nSTATS_JSON ' + JSON.stringify(s));
}
