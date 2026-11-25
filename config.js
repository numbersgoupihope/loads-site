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
  pickupWindow: '9am to midnight, every day',   // hours we pick up and drop off, finishes "Pickups run ___"
  guarantee: "If something comes back wrong, text us within 48 hours and we'll rewash it free.",               // e.g. "If something comes back wrong, we'll rewash it free. Just text us within 48 hours."
  bulkyPrice: '',              // e.g. '$8 per comforter'. Leave empty to hide the line.
  // Spanish versions of the lines above, used when a visitor switches to Español
  turnaroundEs: 'al día siguiente',
  pickupWindowEs: '9 a.m. a medianoche, todos los días',
  guaranteeEs: 'Si algo regresa mal, mándanos un texto dentro de 48 horas y lo volvemos a lavar gratis.',
  bulkyPriceEs: '',
  googleRating: '',            // e.g. '4.7'. Leave empty to hide it.
  googleReviewUrl: '',         // link customers get after delivery to leave a Google review
  stores: ['3658 W 3rd St, Los Angeles, CA 90020', '6839 Lennox Ave, Van Nuys, CA'],            // full street addresses of the two laundromats

  pricePerLb: 2.25,
  deliveryFee: 6.99,           // per trip: pickup is one trip, drop-off is another
  tripsPerOrder: 2,            // so a regular order pays $6.99 x 2 for delivery
  minOrder: 30,                // smallest wash & fold charge per order, before the delivery fee
  // Loads Weekly, the monthly plan. Keep the same as apps-script/Square.gs.
  plan: {
    name: 'Loads Weekly',
    monthly: 200,              // charged to their card every month by Square
    lbsPerWeek: 30,            // included on the week's one pickup
    deliveryPerOrder: 6.99,    // both trips together, not $6.99 each way
    overPerLb: 2.25,           // pounds over 30 on the week's pickup
    extraPickupPerLb: 1.75     // any extra pickup that week
  },
  firstOrderOffer: true,       // "First load? Delivery's on us."
  estOrderValue: 40,           // average order value sent to ad platforms with each booking
  daysAhead: 7,                // how many days of pickup dates to offer
  // Time windows customers pick for pickup and for drop-off. The English text is what
  // staff see in the Sheet and the staff app; Spanish is shown to Spanish speakers.
  windows: [
    { en: '9 to 11am',       es: '9 a 11 a.m.' },
    { en: '11am to 1pm',     es: '11 a.m. a 1 p.m.' },
    { en: '1 to 3pm',        es: '1 a 3 p.m.' },
    { en: '3 to 5pm',        es: '3 a 5 p.m.' },
    { en: '5 to 7pm',        es: '5 a 7 p.m.' },
    { en: '7 to 9pm',        es: '7 a 9 p.m.' },
    { en: '9pm to midnight', es: '9 p.m. a medianoche' }
  ],
  closedDays: [],              // days with no pickups: 0 = Sunday ... 6 = Saturday
  // Every zip within about 30 miles of either laundromat (measured from each store).
  // Each zip is listed under the closer store, so staff can split routes by store.
  zones: {
    'Koreatown store': [
      '90001', '90002', '90003', '90004', '90005', '90006', '90007', '90008', '90010', '90011', '90012', '90013',
      '90014', '90015', '90016', '90017', '90018', '90019', '90020', '90021', '90022', '90023', '90024', '90025',
      '90026', '90027', '90028', '90029', '90031', '90032', '90033', '90034', '90035', '90036', '90037', '90038',
      '90039', '90040', '90041', '90042', '90043', '90044', '90045', '90046', '90047', '90048', '90056', '90057',
      '90058', '90059', '90061', '90062', '90063', '90064', '90065', '90066', '90067', '90068', '90069', '90071',
      '90079', '90094', '90134', '90201', '90210', '90211', '90212', '90220', '90221', '90222', '90230', '90232',
      '90240', '90241', '90242', '90245', '90247', '90248', '90249', '90250', '90254', '90255', '90260', '90261',
      '90262', '90266', '90270', '90274', '90275', '90277', '90278', '90280', '90291', '90292', '90293', '90301',
      '90302', '90303', '90304', '90305', '90311', '90401', '90402', '90403', '90404', '90405', '90501', '90502',
      '90503', '90504', '90505', '90506', '90601', '90602', '90603', '90604', '90605', '90606', '90620', '90621',
      '90623', '90630', '90631', '90638', '90640', '90650', '90660', '90670', '90680', '90701', '90703', '90706',
      '90710', '90712', '90713', '90715', '90716', '90717', '90720', '90723', '90731', '90732', '90740', '90744',
      '90745', '90746', '90755', '90802', '90803', '90804', '90805', '90806', '90807', '90808', '90810', '90813',
      '90814', '90815', '90822', '90831', '90833', '91001', '91006', '91007', '91008', '91010', '91011', '91016',
      '91020', '91024', '91030', '91101', '91103', '91104', '91105', '91106', '91107', '91108', '91201', '91202',
      '91203', '91204', '91205', '91206', '91207', '91208', '91210', '91501', '91502', '91506', '91608', '91702',
      '91706', '91722', '91723', '91724', '91731', '91732', '91733', '91740', '91741', '91744', '91745', '91746',
      '91748', '91754', '91755', '91765', '91770', '91773', '91775', '91776', '91780', '91789', '91790', '91791',
      '91792', '91801', '91803', '91804', '92647', '92649', '92655', '92683', '92801', '92802', '92804', '92805',
      '92806', '92809', '92821', '92831', '92832', '92833', '92835', '92840', '92841', '92843', '92844', '92845',
      '92870', '92899'
    ],
    'Van Nuys store': [
      '90049', '90077', '90265', '90272', '90290', '91040', '91042', '91214', '91301', '91302', '91303', '91304',
      '91306', '91307', '91311', '91316', '91320', '91321', '91324', '91325', '91326', '91331', '91335', '91340',
      '91342', '91343', '91344', '91345', '91350', '91351', '91352', '91354', '91355', '91356', '91360', '91361',
      '91362', '91364', '91367', '91377', '91381', '91382', '91383', '91384', '91387', '91390', '91401', '91402',
      '91403', '91405', '91406', '91411', '91423', '91436', '91504', '91505', '91601', '91602', '91604', '91605',
      '91606', '91607', '93021', '93063', '93065', '93510', '93550'
    ]
  }
};

/* Order stages, in order. The keys must match STAGES in apps-script/Code.gs. */
window.LOADS_STAGES = [
  { key: 'booked',           label: 'Booked',            headline: 'Your load is booked.',          detail: "We'll pick it up on your pickup day." },
  { key: 'on_the_way',       label: 'Driver on the way', headline: 'Your driver is on the way.',    detail: 'Arriving within about an hour. Have your bag by the door.' },
  { key: 'picked_up',        label: 'Picked up',         headline: 'Your load is on the move.',     detail: 'Picked up and headed to our laundromat.' },
  { key: 'at_store',         label: 'At the laundromat', headline: 'Your load made it to the store.', detail: "We're weighing and sorting it now." },
  { key: 'washing',          label: 'Washing',           headline: 'Your load is in the wash.',     detail: 'In one of our commercial washers.' },
  { key: 'drying',           label: 'Drying',            headline: 'Your load is in the dryer.',    detail: 'Tumbling dry.' },
  { key: 'folding',          label: 'Folding',           headline: 'Your load is getting folded.',  detail: 'Folded by hand at our counter.' },
  { key: 'out_for_delivery', label: 'Out for delivery',  headline: 'Your load is out the door.',    detail: 'Headed back to you. Arriving within about an hour.' },
  { key: 'delivered',        label: 'Delivered',         headline: 'Your load is back.',            detail: 'Dropped off. Enjoy the clean clothes.' }
];
