# Loads website: setup and launch

This folder is the live Loads site:

- **The landing page**, where customers book a pickup. Bookings land in a Google Sheet and Dimitri gets an email for each one.
- **The order tracker**, a private link per order that shows the customer where their load is, Domino's-style.
- **The staff page**, where staff tap one big button as each step happens. That updates the Sheet and the customer's tracker.

```
config.js           ALL settings live here (IDs, phone, zip codes, prices)
index.html          the landing page and booking form
track.html          the customer order tracker
staff.html          the staff update page (PIN protected)
privacy.html        privacy policy (template, needs legal review)
terms.html          terms of service (template, needs legal review)
img/                photos (swap in real ones, same file names)
apps-script/Code.gs the Google Sheets backend
```

Until you finish step 1, every page runs in **preview mode**: the booking form works but saves nothing, the tracker plays a demo order, and the staff page shows three demo orders. Yellow boxes mark details that still need filling in.

---

## 1. Connect the Google Sheet (15 minutes)

1. Create a new Google Sheet named **Loads bookings** in the Google account the business will use.
2. Open **Extensions > Apps Script**. Delete what's there and paste in all of `apps-script/Code.gs`.
3. At the top of the script, set:
   - `NOTIFY_EMAIL`: who gets an email for each new booking.
   - `STAFF_PIN`: a 4 to 8 digit PIN for the staff page. Share it only with staff.
4. Click **Deploy > New deployment**. Type: **Web app**. *Execute as*: **Me**. *Who has access*: **Anyone**. Click **Deploy** and approve the permissions.
5. Copy the **Web app URL** (ends in `/exec`) and paste it into `endpoint: ''` in `config.js`.

The script makes two tabs the first time it gets data: **Bookings** and **Waitlist**. In Bookings, `stage` and the `..._at` time columns are filled by the staff page; `weight_lbs` and `order_total` come from the staff page too. These feed the weekly scorecard.

After any change to the script, use **Deploy > Manage deployments > Edit (pencil) > Version: New version > Deploy** so the URL stays the same.

## 2. Fill in the business details

Everything is in `config.js`. Each line has an example.

| Setting | What to put |
| --- | --- |
| `phoneDisplay`, `phoneSms` | The business number that can send and receive texts |
| `email` | Contact email |
| `turnaround` | Finishes "Back ___", e.g. `the next evening` |
| `pickupWindow` | hours you pick up and drop off, e.g. `9am to midnight, every day` |
| `windows` | the time slots customers choose for pickup and drop-off |
| `guarantee` | e.g. `If something comes back wrong, we'll rewash it free.` |
| `bulkyPrice` | e.g. `$8 per comforter` |
| `googleRating` | The stores' Google rating, e.g. `4.7` |
| `googleReviewUrl` | The stores' "leave a review" link (Google Business Profile > Ask for reviews). Shown to customers after delivery. |
| `stores` | Both laundromat street addresses |
| `zones` | Final zip codes for each zone, once drive times from the stores are mapped |
| `closedDays` | Days with no pickups, `0` = Sunday |
| `firstOrderOffer` | `true` shows "First load? Delivery's on us" and leaves delivery off first-order totals |

Anything left blank shows as a yellow `[PLACEHOLDER]` box, on purpose. The browser console on the landing page lists what's still missing.

Also fill the yellow boxes in `privacy.html` and `terms.html`, and update prices there if they change.

## 3. Turn on tracking

| Platform | Where to get it | Setting in `config.js` |
| --- | --- | --- |
| Google Analytics 4 | analytics.google.com > Admin > Data streams > Web | `ga4Id` (starts with `G-`) |
| Google Ads | Goals > Conversions > New > Website > manual setup, category **Book appointment**, named "Booking completed" | `googleAdsId` (`AW-...`) and `googleAdsBookingLabel` |
| Meta Pixel | Meta Events Manager > Connect data sources > Web | `metaPixelId` |

What the landing page reports:

| Event | When | Google | Meta |
| --- | --- | --- | --- |
| `booking_completed` | Step 2 is submitted | GA4 event + Google Ads conversion (value $40) | `Schedule` |
| `begin_booking` | Step 1 is submitted with a served zip | GA4 event | `BeginBooking` |
| `text_click` | Someone taps a "text us" link | GA4 event | `Contact` |
| `waitlist_join` | An out-of-area zip joins the waitlist | GA4 event | `Lead` |

In GA4, mark `booking_completed` as a key event. In Meta, optimize campaigns for `Schedule`.

Every booking row also stores UTM tags, Google and Meta click IDs, landing page and referrer, for the visitor's first and latest visit.

## 4. How staff use the tracker

1. Staff open `yoursite.com/staff.html` on their phone and enter the PIN. Add it to the home screen so it opens like an app.
2. Each open order shows the customer, pickup and drop-off windows, hot or cold wash, address (tap **Directions**), notes and current stage.
3. When you head to a pickup, tap **On my way**. The app uses your phone's location and Google Maps traffic to work out when you'll get there (allow location the first time), then shows **Text (name): arriving 2:40pm**. Tap it and hit send. The customer's tracker shows the same time. If it can't get your location, tap 15, 30, 45 or 60 min. **Out for delivery** works the same way. Type your first name at the bottom of the app once so texts say who's coming.
   **New customers:** their card shows a yellow box until they reply YES to the confirmation text (send it with **Text update** right after they book). When they reply, tap **They replied YES**, and then **On my way** shows up. No reply? Call them before anyone drives out.
   **No-show:** at the door with no bag and no answer (and they don't pick up when you call)? Tap **No-show** under the button, then **Charge $10 no-show fee**. It cancels the pickup and charges their saved card, or gives you a payment link. Then tap **Text (name)** to send the message. The fee is in the terms and on the booking form.
   **Canceling:** a customer texts to cancel before pickup? Tap **Cancel order** under the big button, then **Yes, cancel it**. The order leaves the list (the row stays in the Sheet), their tracker says canceled, and you get a **Text (name)** link with the message written. Tapped it by mistake? **Undo**. Orders already picked up can't be canceled in the app.
4. As each other step happens, tap the big button: **Picked up > At the laundromat > Washing > Drying > Folding > Out for delivery > Delivered**. A wrong tap? **Undo** steps back one.
5. At the laundromat, weigh the bag **dry, before washing**, and take a photo of the scale. Type the weight. The total fills in automatically: $2.25/lb with a $30 minimum, plus $6.99 delivery (free on a customer's first order). Tap **Save**. The customer sees both on their tracker.
6. **Text update** opens the phone's Messages app with a ready-made text for the current stage and the customer's tracking link. Send it right after booking (it confirms their window), at pickup, after weighing and when delivered.
7. **Getting paid.** Each order says **first order** or **repeat customer**.
   - **First order:** tap **Text update** (it has the weight and total), attach the scale photo, send. Then in the Square Invoices app or Dashboard, switch to the **Loads** location, tap **Create invoice**, add the customer by name and mobile, enter the same total, tick **Allow customer to save card on file**, and send it by text.
   - **Repeat customer:** tap **Text update**, attach the scale photo, send. In Square (Loads location), open the customer and charge their saved card for the total. No saved card? Send an invoice like a first order.
   - When Square shows it paid, tap **Mark paid** on the staff page. **Out for delivery** stays locked until you do.

Square setup: invoices go out from the **Loads** location on Dimitri's Square account (added Nov 2026, $49/month). Install the Square Invoices app on each store phone and sign in with a login that can use the Loads location. Use the Invoices app rather than the register, so the register stays on the store's own location.

Customers get their tracking link on the booking confirmation screen, in the first text, and in the booking email Dimitri receives. Their tracker refreshes every minute on its own.

The tracker is only as live as the taps: if staff skip a step, the customer won't see it. Delivered orders stay on the staff list until the end of the day.

**Privacy:** every tracking link has a random 16-letter code, so nobody can look up someone else's order by guessing. The tracker shows only the customer's first name, stage, times, weight, total and whether it's paid, never the address or phone.

## 5. Swap in real photos

Replace the files in `img/` with real shots of the stores, keeping the same names and a 3:2 landscape shape:

- `laundromat-1600.webp` (1600 px wide) and `laundromat-900.webp` (900 px wide): the main photo, also cropped for the step cards and the closing banner
- `share.jpg` (1200 x 630): the preview image when the link is shared

squoosh.app makes WebP files for free. Keep each under about 250 KB.

## 6. Put it online

Easiest: **Netlify**. Sign up free, go to *Sites > Add new site > Deploy manually* and drag this whole folder onto the page. Add a custom domain (like `loadslaundry.com`) under *Domain settings*. Any static host works (Vercel, Cloudflare Pages, GitHub Pages).

## 7. Launch test (all of these before the first ad)

- [ ] Book a test pickup on your phone. A row appears in **Bookings** and the email arrives.
- [ ] Tap **Track your load** on the confirmation screen. The tracker shows "Your load is booked."
- [ ] On the staff page, tap through every stage and enter a weight. The tracker follows each step (refresh it).
- [ ] Book from a link with tags, e.g. `yoursite.com/?utm_source=test&utm_campaign=launch`. The row shows those tags.
- [ ] Try a zip outside the zones. The waitlist offer appears and the sign-up lands in **Waitlist**.
- [ ] GA4 > Reports > Realtime shows your visit and `booking_completed`.
- [ ] Meta Events Manager > Test events shows `PageView` and `Schedule`.
- [ ] Google Tag Assistant (tagassistant.google.com) shows the Ads conversion firing on booking.
- [ ] No yellow boxes left on any page.
- [ ] Delete the test rows from the Sheet.

## Tagging links

Put these on every link you control so each customer's source lands in the Sheet:

| Where | Link ending |
| --- | --- |
| Google Search ads | `?utm_source=google&utm_medium=cpc&utm_campaign=zone-ktown` (Google adds `gclid` itself) |
| Meta ads | `?utm_source=meta&utm_medium=paid_social&utm_campaign=zone-ktown&utm_content={{ad.name}}` |
| Door hanger QR code, per building | `?utm_source=flyer&utm_medium=print&utm_campaign=zone-ktown&utm_content=wilshire-park-place` |
| Counter cards at the stores | `?utm_source=store&utm_medium=print&utm_content=van-nuys-counter` |
| Nextdoor posts | `?utm_source=nextdoor&utm_medium=social` |

## Texting customers

The booking form collects two separate consents: texts about the order (required) and reminders and offers (optional, unchecked). The Sheet records both. Only send reorder reminders to rows where `sms_marketing_consent` is `yes`, and honor STOP replies. For the trial, staff send texts by hand from the business number (the staff page's **Text update** button). At higher volume, automatic texts at each stage can be added with a texting service. Have someone check the texting rules before sending marketing texts.

## Search pages (SEO)

- `koreatown.html`, `downtown-la.html`, `van-nuys.html`, `sherman-oaks.html` are neighborhood pages for Google, served at `/koreatown`, `/downtown-la`, etc.
- `es.html` is the homepage in Spanish as its own page (`/es`), so Google can show it for Spanish searches. Its "English" button goes to the English homepage.
- `sitemap.xml` lists every page Google should index; `robots.txt` points to it.
- These are generated. After changing prices, zips, store addresses or homepage copy, rebuild them: `python3 tools/build_seo.py` (needs node and Playwright with Chrome).
- The Google review link goes in `googleReviewUrl` in `config.js`. Once it's set, the "delivered" text from the staff app and the tracking page both ask for a review.
