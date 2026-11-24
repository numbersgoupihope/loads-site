/* ============================================================
   Loads site settings. This is the only file you need to edit.
   Every page (booking, tracker, staff) reads it. See README.md.
   ============================================================ */
window.LOADS_CONFIG = {
  endpoint: 'https://script.google.com/macros/s/AKfycbwE669toBO5Qjbx4_5TN1iqjZmKM2HcJBGdLaF-l9Im2il55UaZKWuT4x1NFo64lC3z/exec', // Google Apps Script web app URL (README step 1). Empty = preview mode.
  ga4Id: '',                   // Google Analytics 4 measurement ID, e.g. 'G-ABC123XYZ'
  googleAdsId: '',             // Google Ads tag ID, e.g. 'AW-123456789'
  googleAdsBookingLabel: '',   // Conversion label for "Booking completed", e.g. 'AbC-D_efG-h12'
  metaPixelId: '',             // Meta (Facebook) Pixel ID, e.g. '123456789012345'

  phoneDisplay: '(805) 407-3309',            // e.g. '(213) 555-0123'
  phoneSms: '+18054073309',                // same number for texting links, e.g. '+12135550123'
  email: 'hello@loadspickup.com', // forwards to loadspickup@gmail.com (Cloudflare Email Routing)
  turnaround: 'the next day',              // finishes the sentence "Back ___", e.g. 'the next evening'
  pickupWindow: '8 to 11am',            // e.g. '8 to 11am'
  guarantee: "If something comes back wrong, text us within 48 hours and we'll rewash it free.",               // e.g. "If something comes back wrong, we'll rewash it free. Just text us within 48 hours."
  bulkyPrice: '',              // e.g. '$8 per comforter'. Leave empty to hide the line.
  // Spanish versions of the lines above, used when a visitor switches to Español
  turnaroundEs: 'al día siguiente',
  pickupWindowEs: '8 a 11 de la mañana',
  guaranteeEs: 'Si algo regresa mal, mándanos un texto dentro de 48 horas y lo volvemos a lavar gratis.',
  bulkyPriceEs: '',
  googleRating: '',            // e.g. '4.7'. Leave empty to hide it.
  googleReviewUrl: '',         // link customers get after delivery to leave a Google review
  stores: ['3658 W 3rd St, Los Angeles, CA 90020', '6839 Lennox Ave, Van Nuys, CA'],            // full street addresses of the two laundromats

  pricePerLb: 2.25,
  deliveryFee: 6.99,
  minOrder: 30,                // smallest wash & fold charge per order, before the delivery fee
  firstOrderOffer: true,       // "First load? Delivery's on us."
  estOrderValue: 40,           // average order value sent to ad platforms with each booking
  daysAhead: 7,                // how many days of pickup dates to offer
  closedDays: [],              // days with no pickups: 0 = Sunday ... 6 = Saturday
  zones: {
    'Koreatown + Downtown LA': ['90005', '90006', '90010', '90020', '90015'],
    'Van Nuys + Sherman Oaks': ['91401', '91411', '91403', '91423']
  }
};

/* Order stages, in order. The keys must match STAGES in apps-script/Code.gs. */
window.LOADS_STAGES = [
  { key: 'booked',           label: 'Booked',            headline: 'Your load is booked.',          detail: "We'll pick it up on your pickup day." },
  { key: 'picked_up',        label: 'Picked up',         headline: 'Your load is on the move.',     detail: 'Picked up and headed to our laundromat.' },
  { key: 'at_store',         label: 'At the laundromat', headline: 'Your load made it to the store.', detail: "We're weighing and sorting it now." },
  { key: 'washing',          label: 'Washing',           headline: 'Your load is in the wash.',     detail: 'In one of our commercial washers.' },
  { key: 'drying',           label: 'Drying',            headline: 'Your load is in the dryer.',    detail: 'Tumbling dry.' },
  { key: 'folding',          label: 'Folding',           headline: 'Your load is getting folded.',  detail: 'Folded by hand at our counter.' },
  { key: 'out_for_delivery', label: 'Out for delivery',  headline: 'Your load is out the door.',    detail: 'Headed back to you now.' },
  { key: 'delivered',        label: 'Delivered',         headline: 'Your load is back.',            detail: 'Dropped off. Enjoy the clean clothes.' }
];
