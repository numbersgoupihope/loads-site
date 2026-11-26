/**
 * Square billing for the staff page's "Send bill" button.
 *
 * - Finds or adds the customer in Square (by mobile number).
 * - Creates a Square order for the weighed load at the "Loads" location.
 * - Saved card on file: charges it right away and marks the order paid.
 * - No saved card: publishes a Square invoice and returns its payment link, which
 *   staff text to the customer. The payment page lets the customer save their card.
 * - Checks unpaid invoices and marks the order paid once the customer pays.
 * - Loads Weekly: the monthly plan. Sign-up happens on Square's own checkout page;
 *   Square then charges the saved card every month. Weekly orders are billed here at
 *   the plan's rates (see "Loads Weekly" below).
 *
 * Needs the Square access token saved as the script property SQUARE_TOKEN
 * (Project Settings > Script Properties). Never put the token in this file.
 */

const SQUARE_LOCATION = 'LPMVZRGS1YP81';   // the "Loads" location in Square
const SQUARE_API = 'https://connect.squareup.com/v2';
const SQUARE_VERSION = '2026-07-15';

// Prices, in cents. Keep these the same as config.js.
const PRICE_PER_LB_CENTS = 225;
const NO_SHOW_CENTS = 1000;                // no bag and no answer when the driver arrives (see terms.html)
const TRIP_FEE_CENTS = 699;                // per trip: pickup is one trip, drop-off another
const MIN_ORDER_CENTS = 3000;              // wash and fold minimum, before delivery

// Loads Weekly: $200 a month for 30 lb every week (one pickup and drop-off a week).
const PLAN_MONTHLY_CENTS = 20000;
const PLAN_LBS_PER_WEEK = 30;
const PLAN_DELIVERY_CENTS = 699;           // per order, both trips together
const PLAN_OVER_CENTS = 225;               // per lb over 30 on the week's pickup
const PLAN_EXTRA_PICKUP_CENTS = 175;       // per lb on any extra pickup that week

/* ---------------- Send bill ---------------- */

// Returns { bill: { kind: 'charged' | 'link', ... } } or { error, message }.
function sendBill_(id) {
  const t = table_('Bookings');
  const r = t && find_(t, id);
  if (!r) return { error: 'not_found' };
  if (r.paid_at) return { error: 'already_paid', message: 'This order is already paid.' };
  const lbs = Number(r.weight_lbs), total = Number(r.order_total);
  if (!(lbs > 0) || r.order_total === '' || !(total >= 0)) return { error: 'no_weight', message: 'Save the weight and total first.' };

  // Loads Weekly: Square is the source of truth for who is on the plan right now.
  let plan = null, lookupFailed = false;
  try { plan = subscription_(r.phone); } catch (e) { lookupFailed = true; }
  const isPlan = lookupFailed ? String(r.subscriber) === 'yes' : !!plan;
  if (!lookupFailed && (String(r.subscriber) === 'yes') !== isPlan) { write_(t, r, { subscriber: isPlan ? 'yes' : 'no' }); r.subscriber = isPlan ? 'yes' : 'no'; }

  const totalCents = billCents_(r);
  if (totalCents === 0) {      // fully covered by the plan: nothing to charge
    write_(t, r, { paid_at: new Date(), square_bill_total: 0, bill_sent_at: new Date() });
    return { bill: { kind: 'covered', amount: 0 } };
  }

  // Same bill already sent and still open: hand back the same link instead of making a new one.
  if (r.square_invoice_id && Math.abs(Math.round(Number(r.square_bill_total) * 100) - totalCents) <= 1) {
    const inv = sq_('get', '/invoices/' + r.square_invoice_id).invoice;
    if (inv.status === 'PAID') { write_(t, r, { paid_at: new Date() }); return { bill: { kind: 'paid' } }; }
    if (['UNPAID', 'SCHEDULED', 'PARTIALLY_PAID'].indexOf(inv.status) >= 0) return { bill: { kind: 'link', url: inv.public_url, amount: totalCents / 100, resent: true } };
  }
  // The weight changed after a bill went out: cancel the old one so the customer can't pay the wrong amount.
  if (r.square_invoice_id) cancelInvoice_(r.square_invoice_id);

  const customerId = plan ? plan.customer_id : sqCustomer_(r);
  const order = sqOrder_(t, r, customerId, totalCents, isPlan);
  const amount = order.total_money.amount / 100;
  const card = savedCard_(customerId, plan && plan.card_id);
  const base = { square_customer_id: customerId, square_order_id: order.id, square_bill_total: amount, bill_sent_at: new Date() };

  let declined = false;
  if (card) {
    try {
      const pay = sq_('post', '/payments', {
        idempotency_key: key_('pay', order.id),
        source_id: card.id, customer_id: customerId, order_id: order.id, location_id: SQUARE_LOCATION,
        amount_money: order.total_money, autocomplete: true,
        reference_id: String(r.booking_id), note: 'Loads order ' + r.booking_id
      }).payment;
      if (pay.status === 'COMPLETED') {
        write_(t, r, Object.assign(base, { square_payment_id: pay.id, square_invoice_id: '', square_bill_url: '', paid_at: new Date() }));
        return { bill: { kind: 'charged', amount: amount, card: (card.card_brand || 'Card').replace(/_/g, ' ') + ' ending ' + (card.last_4 || '') } };
      }
      declined = true;
    } catch (e) {
      declined = true;   // declined or expired card: send a payment link instead
    }
  }

  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const draft = sq_('post', '/invoices', {
    idempotency_key: key_('inv', order.id),
    invoice: {
      location_id: SQUARE_LOCATION, order_id: order.id,
      primary_recipient: { customer_id: customerId },
      payment_requests: [{ request_type: 'BALANCE', due_date: today }],
      delivery_method: 'SHARE_MANUALLY',
      accepted_payment_methods: { card: true, square_gift_card: false, bank_account: false, buy_now_pay_later: false, cash_app_pay: false },
      store_payment_method_enabled: true,
      title: 'Loads wash & fold',
      description: lbs.toFixed(1) + ' lbs. Order ' + r.booking_id + '.' + (isPlan ? ' Loads Weekly rates.' : '') + (freeDelivery_(r) ? ' First delivery is on us.' : ''),
      sale_or_service_date: today
    }
  }).invoice;
  const inv = sq_('post', '/invoices/' + draft.id + '/publish', { version: draft.version, idempotency_key: key_('pub', draft.id) }).invoice;
  write_(t, r, Object.assign(base, { square_invoice_id: inv.id, square_bill_url: inv.public_url || '' }));
  return { bill: { kind: 'link', url: inv.public_url, amount: amount, declined: declined } };
}

/* ---------------- No-show fee ---------------- */

// Driver went out ("Driver on the way"), no bag, no answer: cancel the pickup and bill the no-show fee.
// Charges a saved card when there is one, otherwise makes a payment link to text them.
function noShow_(id) {
  const t = table_('Bookings');
  const r = t && find_(t, id);
  if (!r) return { error: 'not_found' };
  if (r.stage !== 'on_the_way') return { error: 'cant_no_show', message: 'Tap On my way first. The no-show fee is only for when a driver went out.' };
  const cents = /^test\b/i.test(String(r.name || '').trim()) ? 100 : NO_SHOW_CENTS;
  const money = { amount: cents, currency: 'USD' };
  const customerId = sqCustomer_(r);
  const order = sq_('post', '/orders', {
    idempotency_key: key_('noshow', r.booking_id),
    order: { location_id: SQUARE_LOCATION, reference_id: String(r.booking_id), customer_id: customerId,
      line_items: [{ name: 'No-show fee (no bag at pickup)', quantity: '1', base_price_money: money }] }
  }).order;
  const now = new Date();
  const base = { stage: 'canceled', canceled_from: r.stage, canceled_at: now, no_show_at: now, stage_updated_at: now,
    square_customer_id: customerId, square_order_id: order.id, square_bill_total: cents / 100, bill_sent_at: now };
  const card = savedCard_(customerId);
  if (card) {
    try {
      const pay = sq_('post', '/payments', {
        idempotency_key: key_('nspay', order.id), source_id: card.id, customer_id: customerId, order_id: order.id,
        location_id: SQUARE_LOCATION, amount_money: money, autocomplete: true,
        reference_id: String(r.booking_id), note: 'Loads no-show fee ' + r.booking_id
      }).payment;
      if (pay.status === 'COMPLETED') {
        write_(t, r, Object.assign(base, { square_payment_id: pay.id, paid_at: now }));
        return { bill: { kind: 'charged', amount: cents / 100, card: (card.card_brand || 'Card').replace(/_/g, ' ') + ' ending ' + (card.last_4 || '') } };
      }
    } catch (e) { /* declined: send a link instead */ }
  }
  const today = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const draft = sq_('post', '/invoices', {
    idempotency_key: key_('nsinv', order.id),
    invoice: {
      location_id: SQUARE_LOCATION, order_id: order.id, primary_recipient: { customer_id: customerId },
      payment_requests: [{ request_type: 'BALANCE', due_date: today }], delivery_method: 'SHARE_MANUALLY',
      accepted_payment_methods: { card: true, square_gift_card: false, bank_account: false, buy_now_pay_later: false, cash_app_pay: false },
      title: 'Loads no-show fee', description: 'No bag at pickup. Order ' + r.booking_id + '.', sale_or_service_date: today
    }
  }).invoice;
  const inv = sq_('post', '/invoices/' + draft.id + '/publish', { version: draft.version, idempotency_key: key_('nspub', draft.id) }).invoice;
  write_(t, r, Object.assign(base, { square_invoice_id: inv.id, square_bill_url: inv.public_url || '' }));
  return { bill: { kind: 'link', url: inv.public_url, amount: cents / 100 } };
}

// What the customer owes, in cents. TEST orders (name starts with "TEST") are $1 so the setup can be tried for real.
function billCents_(r) {
  if (/^test\b/i.test(String(r.name || '').trim())) return 100;
  return Math.round(Number(r.order_total) * 100);
}

function freeDelivery_(r) {
  return String(r.first_order || r.first_order_offer) === 'yes';
}

// Trips we drive: a pickup order is two (pickup and drop-off). A drop-off at the store is one if we
// deliver it back, none if they collect it.
function trips_(r) {
  if (String(r.order_type) !== 'dropoff') return 2;
  return String(r.return_method) === 'store' ? 0 : 1;
}

// What an order costs, itemized. kind: 'regular', 'plan' (the week's pickup) or 'plan_extra' (another pickup that week).
function priceOrder_(lbs, kind, freeDelivery, trips) {
  if (trips === undefined) trips = 2;
  lbs = Math.round(Number(lbs) * 10) / 10;
  const money = function (c) { return { amount: c, currency: 'USD' }; };
  const pounds = function (name, qty, cents) {
    return { name: name, quantity: qty.toFixed(1), quantity_unit: { measurement_unit: { weight_unit: 'IMPERIAL_POUND' }, precision: 1 }, base_price_money: money(cents) };
  };
  const lines = [];
  let cents = 0;
  if (kind === 'plan' || kind === 'plan_extra') {
    if (kind === 'plan') {
      const included = Math.min(lbs, PLAN_LBS_PER_WEEK), over = Math.round(Math.max(0, lbs - PLAN_LBS_PER_WEEK) * 10) / 10;
      lines.push(pounds('Wash & fold, Loads Weekly (' + PLAN_LBS_PER_WEEK + ' lb a week included)', included, 0));
      if (over > 0) { lines.push(pounds('Over ' + PLAN_LBS_PER_WEEK + ' lb this week', over, PLAN_OVER_CENTS)); cents += Math.round(over * PLAN_OVER_CENTS); }
    } else {
      lines.push(pounds('Wash & fold, extra pickup this week (Loads Weekly)', lbs, PLAN_EXTRA_PICKUP_CENTS));
      cents += Math.round(lbs * PLAN_EXTRA_PICKUP_CENTS);
    }
    if (!freeDelivery && trips > 0) { lines.push({ name: trips === 2 ? 'Pickup & drop-off (Loads Weekly)' : 'Delivery (Loads Weekly)', quantity: '1', base_price_money: money(PLAN_DELIVERY_CENTS) }); cents += PLAN_DELIVERY_CENTS; }
    return { lines: lines, cents: cents };
  }
  const laundry = Math.round(lbs * PRICE_PER_LB_CENTS);
  lines.push(pounds('Wash & fold', lbs, PRICE_PER_LB_CENTS));
  if (laundry < MIN_ORDER_CENTS) lines.push({ name: 'Order minimum', quantity: '1', base_price_money: money(MIN_ORDER_CENTS - laundry) });
  if (!freeDelivery && trips === 2) {
    lines.push({ name: 'Pickup', quantity: '1', base_price_money: money(TRIP_FEE_CENTS) });
    lines.push({ name: 'Drop-off', quantity: '1', base_price_money: money(TRIP_FEE_CENTS) });
  }
  if (!freeDelivery && trips === 1) lines.push({ name: 'Delivery', quantity: '1', base_price_money: money(TRIP_FEE_CENTS) });
  return { lines: lines, cents: Math.max(laundry, MIN_ORDER_CENTS) + (freeDelivery ? 0 : trips * TRIP_FEE_CENTS) };
}

function orderKind_(t, r, isPlan) {
  if (!isPlan) return 'regular';
  return extraPickup_(t, r) ? 'plan_extra' : 'plan';
}

// Itemized when the saved total matches the price list; one line with the saved total when staff edited it.
function sqOrder_(t, r, customerId, totalCents, isPlan) {
  const lbs = Math.round(Number(r.weight_lbs) * 10) / 10;
  const money = function (c) { return { amount: c, currency: 'USD' }; };
  let lines;
  if (totalCents === 100 && /^test\b/i.test(String(r.name || '').trim())) {
    lines = [{ name: 'Test charge', quantity: '1', base_price_money: money(100) }];
  } else {
    const priced = priceOrder_(lbs, orderKind_(t, r, isPlan), freeDelivery_(r), trips_(r));
    lines = priced.lines;
    if (Math.abs(priced.cents - totalCents) > 1) {
      lines = [{ name: 'Wash & fold, ' + lbs.toFixed(1) + ' lbs', quantity: '1', base_price_money: money(totalCents) }];
    }
  }
  const order = sq_('post', '/orders', {
    idempotency_key: key_('order', r.booking_id + '-' + totalCents + '-' + lbs),
    order: { location_id: SQUARE_LOCATION, reference_id: String(r.booking_id), customer_id: customerId, line_items: lines }
  }).order;
  // Square rounds pound prices to the cent; anything more than a cent off means something is wrong.
  if (Math.abs(order.total_money.amount - totalCents) > 1) {
    throw new Error('Square total ' + order.total_money.amount + ' does not match ' + totalCents);
  }
  return order;
}

/* ---------------- customers and cards ---------------- */

function sqCustomer_(r) {
  if (r.square_customer_id) return String(r.square_customer_id);
  const phone = e164_(r.phone);
  if (phone) {
    const found = sq_('post', '/customers/search', { query: { filter: { phone_number: { exact: phone } } }, limit: 1 });
    if (found.customers && found.customers.length) return found.customers[0].id;
  }
  const parts = String(r.name || '').trim().split(/\s+/);
  const body = {
    idempotency_key: key_('cust', r.booking_id),
    given_name: parts[0] || 'Loads customer',
    reference_id: String(r.booking_id),
    note: 'Loads pickup and delivery'
  };
  if (parts.length > 1) body.family_name = parts.slice(1).join(' ');
  if (phone) body.phone_number = phone;
  if (r.address) body.address = { address_line_1: String(r.address).slice(0, 255), postal_code: String(r.zip || ''), country: 'US' };
  return sq_('post', '/customers', body).customer.id;
}

// The card to charge: the plan's card when there is one, else the newest saved card.
function savedCard_(customerId, preferId) {
  const res = sq_('get', '/cards?customer_id=' + encodeURIComponent(customerId));
  const cards = (res.cards || []).filter(function (c) { return c.enabled !== false; });
  const preferred = preferId && cards.filter(function (c) { return c.id === preferId; })[0];
  return preferred || (cards.length ? cards[cards.length - 1] : null);
}

function cancelInvoice_(invoiceId) {
  try {
    const inv = sq_('get', '/invoices/' + invoiceId).invoice;
    if (['UNPAID', 'SCHEDULED'].indexOf(inv.status) >= 0) sq_('post', '/invoices/' + invoiceId + '/cancel', { version: inv.version });
  } catch (e) { /* nothing to cancel */ }
}

/* ---------------- paid by itself ---------------- */

// Looks up open bills and marks orders paid once Square says so. Never throws.
function syncPaid_(onlyId) {
  try {
    if (!PropertiesService.getScriptProperties().getProperty('SQUARE_TOKEN')) return;
    const t = table_('Bookings');
    if (!t) return;
    t.rows.forEach(function (r) {
      if (!r.square_invoice_id || r.paid_at || r.stage === 'delivered') return;
      if (onlyId && String(r.booking_id) !== String(onlyId)) return;
      try {
        const inv = sq_('get', '/invoices/' + r.square_invoice_id).invoice;
        if (inv.status === 'PAID') write_(t, r, { paid_at: new Date() });
      } catch (e) { /* try again next refresh */ }
    });
  } catch (e) { /* never block the page */ }
}

/* ---------------- Loads Weekly ---------------- */

// The customer's active Loads Weekly subscription in Square, found by mobile number, or null.
function subscription_(phone) {
  const e = e164_(phone);
  if (!e) return null;
  const found = sq_('post', '/customers/search', { query: { filter: { phone_number: { exact: e } } }, limit: 10 });
  const ids = (found.customers || []).map(function (c) { return c.id; });
  if (!ids.length) return null;
  const res = sq_('post', '/subscriptions/search', { query: { filter: { customer_ids: ids, location_ids: [SQUARE_LOCATION] } } });
  const props = PropertiesService.getScriptProperties();
  const plans = [props.getProperty('PLAN_VARIATION_ID'), props.getProperty('PLAN_TEST_VARIATION_ID')].filter(String);
  const active = (res.subscriptions || []).filter(function (s) {
    return s.status === 'ACTIVE' && (!plans.length || plans.indexOf(s.plan_variation_id) >= 0);
  });
  return active.length ? { id: active[0].id, customer_id: active[0].customer_id, card_id: active[0].card_id || '' } : null;
}

// 'yes' or 'no' for a new booking, or '' when Square can't be asked. Never throws.
function planFlag_(phone) {
  try {
    if (!PropertiesService.getScriptProperties().getProperty('SQUARE_TOKEN')) return '';
    return subscription_(phone) ? 'yes' : 'no';
  } catch (e) { return ''; }
}

// True when the same plan member already has an earlier pickup booked in the same week (Monday to Sunday).
// The plan covers one pickup a week; others are billed as extra pickups.
function extraPickup_(t, r) {
  const me = String(r.phone || '').replace(/\D/g, '').slice(-10), wk = weekOf_(r.pickup_date);
  if (me.length < 10 || !wk) return false;
  const rank = function (x) { return [String(weekDay_(x.pickup_date)), x.received_at instanceof Date ? x.received_at.getTime() : 0, x._row || 0]; };
  const mine = rank(r);
  return t.rows.some(function (x) {
    if (x === r || !x.booking_id || String(x.booking_id) === String(r.booking_id)) return false;
    if (String(x.subscriber) !== 'yes' || String(x.phone || '').replace(/\D/g, '').slice(-10) !== me || weekOf_(x.pickup_date) !== wk) return false;
    const o = rank(x);
    return o[0] < mine[0] || (o[0] === mine[0] && (o[1] < mine[1] || (o[1] === mine[1] && o[2] < mine[2])));
  });
}

function weekDay_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(v || '').replace(/^'/, '').slice(0, 10);
}

// The Monday of the pickup's week, as yyyy-mm-dd ('' when there's no pickup date).
function weekOf_(v) {
  const m = weekDay_(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
  return d.toISOString().slice(0, 10);
}

// Website sign-up: saves the person in the Subscribers tab and returns Square's checkout page for the plan.
// Square matches or creates the customer by mobile number, saves their card and starts the monthly billing.
function subscribe_(req) {
  if (req.company) return { ok: true, url: '' };                 // spam trap field
  const name = String(req.name || '').trim().slice(0, 120), phone = e164_(req.phone), email = String(req.email || '').trim().slice(0, 200);
  if (name.length < 2) return { ok: false, error: 'name' };
  if (!phone) return { ok: false, error: 'phone' };
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'email' };
  const test = /^test\b/i.test(name);
  const variation = PropertiesService.getScriptProperties().getProperty(test ? 'PLAN_TEST_VARIATION_ID' : 'PLAN_VARIATION_ID');
  if (!variation) return { ok: false, error: 'not_ready' };

  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  let t, r;
  try {
    const sh = sheet_('Subscribers', SUBSCRIBER_HEADERS);
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const p = Object.assign({}, req, { name: name, phone: String(req.phone || ''), email: email, status: 'checkout started' });
    sh.appendRow(headers.map(function (h) {
      if (h === 'received_at') return new Date();
      return h === 'zip' ? text_(p[h]) : clean_(p[h]);
    }));
    t = table_('Subscribers');
    r = t.rows[t.rows.length - 1];
  } finally {
    lock.releaseLock();
  }

  const es = String(req.lang) === 'es';
  const pre = { buyer_phone_number: phone };
  if (email) pre.buyer_email = email;
  const link = sq_('post', '/online-checkout/payment-links', {
    idempotency_key: Utilities.getUuid(),
    quick_pay: {
      name: test ? 'Loads Weekly (test, $1 a month)' : 'Loads Weekly: ' + PLAN_LBS_PER_WEEK + ' lb of wash & fold every week',
      price_money: { amount: test ? 100 : PLAN_MONTHLY_CENTS, currency: 'USD' },
      location_id: SQUARE_LOCATION
    },
    checkout_options: {
      subscription_plan_id: variation,
      redirect_url: 'https://loadspickup.com/?subscribed=1' + (es ? '&lang=es' : '') + '#book',
      merchant_support_email: 'hello@loadspickup.com',
      ask_for_shipping_address: false,
      allow_tipping: false
    },
    pre_populated_data: pre
  }).payment_link;
  const url = link.url || link.long_url;
  write_(t, r, { checkout_url: url });
  if (NOTIFY_EMAIL) {
    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: 'Loads Weekly sign-up started: ' + name,
      body: ['Someone started signing up for Loads Weekly' + (test ? ' (TEST, $1)' : '') + '.', '',
        'Name: ' + name, 'Mobile: ' + (req.phone || ''), 'Email: ' + (email || '-'),
        'Address: ' + (req.address || '') + '  ' + (req.zip || ''), '',
        "They finish on Square's checkout page. Square emails you when the first payment goes through,",
        'and the subscription shows under Customers in the Square Dashboard.'].join('\n')
    });
  }
  return { ok: true, url: url };
}

// Run once from the editor (Run > setupLoadsWeekly) to add the plan to Square. Safe to run again.
function setupLoadsWeekly() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('PLAN_VARIATION_ID') && props.getProperty('PLAN_TEST_VARIATION_ID')) {
    Logger.log('Loads Weekly is already set up: ' + props.getProperty('PLAN_VARIATION_ID'));
    return props.getProperty('PLAN_VARIATION_ID');
  }
  const plan = sq_('post', '/catalog/object', {
    idempotency_key: key_('plan', 'loads-weekly-v1'),
    object: { type: 'SUBSCRIPTION_PLAN', id: '#plan', subscription_plan_data: { name: 'Loads Weekly', all_items: false } }
  }).catalog_object;
  const variation = function (name, cents, tag) {
    const make = function (field) {
      const pricing = { type: 'STATIC' };
      pricing[field] = { amount: cents, currency: 'USD' };
      return sq_('post', '/catalog/object', {
        idempotency_key: key_(tag + field, plan.id),
        object: { type: 'SUBSCRIPTION_PLAN_VARIATION', id: '#variation', subscription_plan_variation_data: {
          name: name, subscription_plan_id: plan.id, phases: [{ cadence: 'MONTHLY', ordinal: 0, pricing: pricing }]
        } }
      }).catalog_object;
    };
    try { return make('price_money'); } catch (e) { return make('price'); }   // field name differs by API version
  };
  const real = variation('Loads Weekly: ' + PLAN_LBS_PER_WEEK + ' lb a week', PLAN_MONTHLY_CENTS, 'v');
  const test = variation('Loads Weekly test ($1)', 100, 't');
  props.setProperty('PLAN_VARIATION_ID', real.id);
  props.setProperty('PLAN_TEST_VARIATION_ID', test.id);
  Logger.log('Loads Weekly added to Square. Plan ' + plan.id + ', $' + (PLAN_MONTHLY_CENTS / 100) + ' variation ' + real.id + ', $1 test variation ' + test.id);
  return real.id;
}

/* ---------------- helpers ---------------- */

function sq_(method, path, body) {
  const token = PropertiesService.getScriptProperties().getProperty('SQUARE_TOKEN');
  if (!token) throw new Error('No Square key saved yet (SQUARE_TOKEN).');
  const opts = {
    method: method, contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + token, 'Square-Version': SQUARE_VERSION }
  };
  if (body) opts.payload = JSON.stringify(body);
  const res = UrlFetchApp.fetch(SQUARE_API + path, opts);
  const code = res.getResponseCode();
  let data = {};
  try { data = JSON.parse(res.getContentText() || '{}'); } catch (e) {}
  if (code >= 300) {
    const err = (data.errors && data.errors[0]) || {};
    throw new Error('Square said: ' + (err.detail || err.code || ('HTTP ' + code)));
  }
  return data;
}

function e164_(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (d.length === 10) return '+1' + d;
  if (d.length === 11 && d.charAt(0) === '1') return '+' + d;
  return '';
}

// Square needs a unique key per request so a double tap never charges twice.
function key_(prefix, value) {
  return (prefix + '-' + value).replace(/[^\w-]/g, '').slice(0, 45);
}

// Run this once from the editor (Run > checkSquare) to confirm the key works. It changes nothing.
function checkSquare() {
  const loc = sq_('get', '/locations/' + SQUARE_LOCATION).location;
  Logger.log('Square key works. Location: ' + loc.name + ' (' + loc.status + ')');
  return loc.name;
}
