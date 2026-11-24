/**
 * Square billing for the staff page's "Send bill" button.
 *
 * - Finds or adds the customer in Square (by mobile number).
 * - Creates a Square order for the weighed load at the "Loads" location.
 * - Saved card on file: charges it right away and marks the order paid.
 * - No saved card: publishes a Square invoice and returns its payment link, which
 *   staff text to the customer. The payment page lets the customer save their card.
 * - Checks unpaid invoices and marks the order paid once the customer pays.
 *
 * Needs the Square access token saved as the script property SQUARE_TOKEN
 * (Project Settings > Script Properties). Never put the token in this file.
 */

const SQUARE_LOCATION = 'LPMVZRGS1YP81';   // the "Loads" location in Square
const SQUARE_API = 'https://connect.squareup.com/v2';
const SQUARE_VERSION = '2026-07-15';

// Prices, in cents. Keep these the same as config.js.
const PRICE_PER_LB_CENTS = 225;
const DELIVERY_FEE_CENTS = 699;
const MIN_ORDER_CENTS = 3000;              // wash and fold minimum, before delivery

/* ---------------- Send bill ---------------- */

// Returns { bill: { kind: 'charged' | 'link', ... } } or { error, message }.
function sendBill_(id) {
  const t = table_('Bookings');
  const r = t && find_(t, id);
  if (!r) return { error: 'not_found' };
  if (r.paid_at) return { error: 'already_paid', message: 'This order is already paid.' };
  const lbs = Number(r.weight_lbs), total = Number(r.order_total);
  if (!(lbs > 0) || !(total > 0)) return { error: 'no_weight', message: 'Save the weight and total first.' };
  const totalCents = billCents_(r);

  // Same bill already sent and still open: hand back the same link instead of making a new one.
  if (r.square_invoice_id && Math.abs(Math.round(Number(r.square_bill_total) * 100) - totalCents) <= 1) {
    const inv = sq_('get', '/invoices/' + r.square_invoice_id).invoice;
    if (inv.status === 'PAID') { write_(t, r, { paid_at: new Date() }); return { bill: { kind: 'paid' } }; }
    if (['UNPAID', 'SCHEDULED', 'PARTIALLY_PAID'].indexOf(inv.status) >= 0) return { bill: { kind: 'link', url: inv.public_url, amount: totalCents / 100, resent: true } };
  }
  // The weight changed after a bill went out: cancel the old one so the customer can't pay the wrong amount.
  if (r.square_invoice_id) cancelInvoice_(r.square_invoice_id);

  const customerId = sqCustomer_(r);
  const order = sqOrder_(r, customerId, totalCents);
  const amount = order.total_money.amount / 100;
  const card = savedCard_(customerId);
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
      description: lbs.toFixed(1) + ' lbs. Order ' + r.booking_id + '.' + (freeDelivery_(r) ? ' First delivery is on us.' : ''),
      sale_or_service_date: today
    }
  }).invoice;
  const inv = sq_('post', '/invoices/' + draft.id + '/publish', { version: draft.version, idempotency_key: key_('pub', draft.id) }).invoice;
  write_(t, r, Object.assign(base, { square_invoice_id: inv.id, square_bill_url: inv.public_url || '' }));
  return { bill: { kind: 'link', url: inv.public_url, amount: amount, declined: declined } };
}

// What the customer owes, in cents. TEST orders (name starts with "TEST") are $1 so the setup can be tried for real.
function billCents_(r) {
  if (/^test\b/i.test(String(r.name || '').trim())) return 100;
  return Math.round(Number(r.order_total) * 100);
}

function freeDelivery_(r) {
  return String(r.first_order || r.first_order_offer) === 'yes';
}

// Itemized when the saved total matches the price list; one line with the saved total when staff edited it.
function sqOrder_(r, customerId, totalCents) {
  const lbs = Math.round(Number(r.weight_lbs) * 10) / 10;
  const money = function (c) { return { amount: c, currency: 'USD' }; };
  let lines;
  if (totalCents === 100 && /^test\b/i.test(String(r.name || '').trim())) {
    lines = [{ name: 'Test charge', quantity: '1', base_price_money: money(100) }];
  } else {
    const laundry = Math.round(lbs * PRICE_PER_LB_CENTS);
    lines = [{
      name: 'Wash & fold', quantity: lbs.toFixed(1),
      quantity_unit: { measurement_unit: { weight_unit: 'IMPERIAL_POUND' }, precision: 1 },
      base_price_money: money(PRICE_PER_LB_CENTS)
    }];
    if (laundry < MIN_ORDER_CENTS) lines.push({ name: 'Order minimum', quantity: '1', base_price_money: money(MIN_ORDER_CENTS - laundry) });
    if (!freeDelivery_(r)) lines.push({ name: 'Pickup & delivery', quantity: '1', base_price_money: money(DELIVERY_FEE_CENTS) });
    const priced = Math.max(laundry, MIN_ORDER_CENTS) + (freeDelivery_(r) ? 0 : DELIVERY_FEE_CENTS);
    if (Math.abs(priced - totalCents) > 1) {
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

function savedCard_(customerId) {
  const res = sq_('get', '/cards?customer_id=' + encodeURIComponent(customerId));
  const cards = (res.cards || []).filter(function (c) { return c.enabled !== false; });
  return cards.length ? cards[cards.length - 1] : null;
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
