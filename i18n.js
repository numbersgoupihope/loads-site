/* English / Español switch for the customer pages.
   Elements with data-i18n="key" get their content from ES below when Spanish is on
   (their English stays in the HTML). data-i18n-attr="alt:key,placeholder:key" does the
   same for attributes. Buttons with data-lang-toggle switch languages.
   Language: ?lang=es or ?lang=en in the link, then the visitor's last choice,
   then their phone's language. Page scripts listen for the 'loads:lang' event. */
(function () {
  'use strict';

  /* Text that page scripts build on the fly. {name} gets filled in. */
  var EN = {
    tomorrow: 'Tomorrow, ',
    chooseDay: 'Choose a day',
    chooseWin: 'Choose a time',
    eWin: 'Choose a pickup time.',
    eDwin: 'Choose a drop-off time.',
    eTemp: 'Choose hot or cold water.',
    eZip: 'Enter a 5-digit zip code.',
    eDay: 'Choose a pickup day.',
    ePhone: 'Enter a 10-digit mobile number.',
    eName: 'Add your name.',
    eAddr: 'Add your pickup address.',
    eConsent: 'Check the box so we can text you about this order.',
    eEmail: 'Enter your email so Square can send your receipts.',
    ePlanZone: "Loads Weekly is only in our pickup areas so far, and {zip} isn't one yet.",
    eConsentPlan: 'Check the box so we can text you about your pickups.',
    planStarting: 'Opening secure checkout...',
    booking: 'Booking...',
    eFail: "Something went wrong. Text PICKUP to {phone} and we'll book you by text.",
    done: "You're set for pickup {day}. We'll text {phone} when your driver is on the way, about an hour before. Leave your bag by the door.",
    wlOk: "You're on the list. We'll text you when we get to {zip}.",
    wlFail: 'Something went wrong. Try again in a minute.',
    wlInZone: 'Good news: we already pick up in {zip}. Book above.',
    hHalf: 'about half a hamper',
    hOne: 'about 1 hamper',
    hMany: 'about {n} hampers',
    lbsLine: '{n} lbs, {hamper}',
    estMin: 'Includes the ${min} order minimum. ',
    tripNote: '+ ${fee} each trip charge',
    estFirst: 'First order: the trip charges are on us. You pay for the actual weight.',
    estPlain: 'You pay for the actual weight. A full hamper is usually around 10 lbs.',
    rating: '{r} stars',
    us: 'us',
    trkOrder: 'Order {id}',
    trkPickupOn: ' · pickup {day}',
    trkBookedDetail: "We'll pick it up {day}.",
    trkStep: 'Step {n} of {total}',
    trkLbs: '{n} lbs',
    trkPaid: 'Paid. Thank you!',
    trkUnpaid: 'Not paid yet. Check your texts for the payment link.',
    trkUpdated: 'Updated {time}',
    trkRefresh: ' · refreshes every minute',
    trkNoRefresh: "Couldn't refresh. Trying again in a minute.",
    trkUnreachable: "We couldn't reach the tracker. Check your connection and refresh.",
    trkDocTitle: '{label} | Track your load | Loads'
  };

  var ES = {
    /* ---------- home page ---------- */
    docTitle: 'Recogida y entrega de ropa en Los Ángeles | Loads',
    metaDesc: 'Recogida y entrega de ropa por todo LA, del Westside y Downtown hasta el Valle. Lavada y doblada en nuestras propias lavanderías. $2.25 la libra, o $200 al mes por 30 libras cada semana.',
    offer: '¿Primera carga? La entrega va por nuestra cuenta. Ya recogemos por todo LA y el Valle.',
    tagline: 'Recogida y entrega de ropa',
    getApp: 'Descarga la app',
    questions: '¿Preguntas? Escríbenos al <a data-sms href="#"><span data-fill="phone"></span></a>',
    bookPickup: 'Agenda tu recogida',
    heroH1: 'Quítate un <span class="serif">peso</span> de encima.',
    kicker: 'Nosotros nos encargamos.',
    heroP: 'Recogida y entrega por todo LA, del Westside y Downtown hasta el Valle. Lavamos y doblamos cada carga en nuestras propias lavanderías y te la regresamos a tu puerta.',
    priceSub: 'la libra: lavado, secado y doblado',
    heroAlt: 'Una lavandería iluminada por el sol, con lavadoras de acero inoxidable en una pared y palmeras afuera de las ventanas',
    s1Title: 'Mándanos tu carga',
    s1Steps: 'Paso 1 de 2 <span><i class="on"></i> <i></i></span>',
    zipLabel: 'Tu código postal',
    dayLabel: 'Día de recogida',
    winLabel: 'Hora de recogida',
    seeTimes: 'Continuar',
    tempLabel: 'Lavar con',
    temp0: '¿Caliente o fría?',
    tempCold: 'Agua fría',
    tempHot: 'Agua caliente',
    dwinLabel: 'Hora de entrega',
    outzoneMsg: 'Todavía no recogemos en <span id="outzip"></span>. Déjanos tu número y te mandamos un texto cuando lleguemos.',
    mobileNumber: 'Número de celular',
    outjoin: 'Avísenme cuando lleguen',
    s2Title: '¿Dónde recogemos?',
    s2Steps: 'Paso 2 de 2 <span><i class="on"></i> <i class="on"></i></span>',
    nameLabel: 'Nombre',
    mobileLabel: 'Celular',
    addrLabel: 'Dirección de recogida',
    addrPh: 'Calle y número de departamento',
    notesLabel: 'Notas para la recogida (opcional)',
    notesPh: 'Código de la reja, dónde dejarás la bolsa',
    heardLabel: '¿Cómo supiste de nosotros?',
    heard0: 'Elige una',
    heard1: 'Búsqueda en Google',
    heard2: 'Instagram o Facebook',
    heard3: 'TikTok',
    heard4: 'Volante o aviso en la puerta',
    heard5: 'Vi su lavandería',
    heard6: 'Un amigo o amiga',
    heard7: 'Nextdoor',
    heard8: 'Otro',
    consentOrder: 'Mándame textos sobre este pedido (confirmación, recogida y entrega). Responde STOP cuando quieras. Pueden aplicar tarifas de mensajes y datos.',
    consentMkt: 'También mándame recordatorios y ofertas, hasta 4 al mes. Opcional. Responde STOP cuando quieras.',
    legal: 'Las recogidas son de <span data-fill="window"></span>. Al agendar aceptas nuestros <a href="terms.html">términos</a> y nuestra <a href="privacy.html">política de privacidad</a> (en inglés).',
    bookBtn: 'Agendar mi recogida',
    back: 'Atrás',
    s3Title: 'Tu carga ya está agendada.',
    doneDefault: 'Te mandamos un texto cuando tu chofer vaya en camino, como una hora antes. Deja tu bolsa en la puerta.',
    trackLink: 'Sigue tu carga',
    again: 'Agendar otra',
    homeTip: 'La próxima vez, sin navegador: agrega Loads a tu pantalla de inicio',
    foot1: 'Sin contratos',
    foot2: 'Pagas por libra',
    foot3: 'O manda PICKUP por texto al <a data-sms href="#"><span data-fill="phone"></span></a>',
    proofAria: 'Por qué confían en nosotros',
    proof1: 'calificación en Google de nuestras lavanderías',
    proof2b: 'Nuestras propias tiendas',
    proof2: 'Cada carga se lava en lavanderías que nosotros manejamos',
    proof3b: 'Nuestros propios choferes',
    proof3: 'Son de nuestro equipo, no de una app',
    proof4b: 'Dos veces al día',
    proof4: 'Una ruta de recogida y una de entrega, todos los días',
    howH2: 'Nosotros nos encargamos. <span class="serif">Tú haces solo una cosa.</span>',
    c1h: 'Agenda una recogida',
    c1p: 'Elige un día aquí o mándanos un texto, y deja cualquier bolsa en tu puerta. Eso es todo lo que tienes que hacer.',
    c2h: 'Lavamos tu carga en nuestra tienda',
    c2p: 'Nuestro chofer la lleva a nuestra lavandería, donde nuestro propio personal la lava, la seca y la dobla.',
    c3h: 'De vuelta en tu puerta',
    c3p: 'Doblada, en bolsa y entregada <span data-fill="turnaround"></span>.',
    priceH2: 'Cobramos por libra, <span class="serif">no por carga.</span>',
    priceP: 'Paga por lo que mandas, o si lavas cada semana, ahorra con Loads Weekly. El lavado, secado, doblado y embolsado siempre están incluidos.',
    bulky: 'Edredones y artículos grandes: <span data-fill="bulky"></span>',
    ticketWash: 'Lavado y doblado',
    ticketNo: 'Carga No. 0001',
    perLb: 'la libra',
    feeLine: '+ $<span data-fee></span> de recogida y $<span data-fee></span> de entrega',
    minLine: 'Mínimo de $<span data-min></span> por pedido, sin contar la entrega',
    offerLine: 'Primer pedido: la entrega va por nuestra cuenta',
    sizeLabel: '¿Qué tan grande es tu carga?',
    estTotal: 'Estimado',
    bookMy: 'Agendar mi recogida',
    whyAlt: 'Filas de lavadoras de acero inoxidable bajo lámparas colgantes',
    whyH2: 'Tu ropa <span class="serif">nunca sale</span> de nuestras manos.',
    whyP: 'Muchos servicios de entrega le pasan tu ropa a otras lavanderías o a contratistas independientes. Nosotros somos dueños de las lavanderías y nuestros choferes trabajan para nosotros, así que un solo equipo cuida cada carga, de puerta a puerta.',
    pointA: '<span class="serif">a.</span><span><strong>Máquinas comerciales en nuestras propias tiendas.</strong> <span class="muted">No la lavadora del departamento de alguien.</span></span>',
    pointB: '<span class="serif">b.</span><span><strong>Los mismos choferes del barrio.</strong> <span class="muted">No quien esté libre en una app esta noche.</span></span>',
    pointC: '<span class="serif">c.</span><span><strong>Una persona de verdad cuando escribes.</strong> <a data-sms href="#"><span data-fill="phone"></span></a></span>',
    areasH2: 'Ya recogemos <span class="serif">por todo</span> LA.',
    zoneCity: 'Del Westside al Este de LA',
    zoneValley: 'Todo el Valle',
    daily: 'Recogemos a diario',
    bookHere: 'Agenda aquí',
    waitP: '¿Estás más lejos? Déjanos tu código postal y tu número, y te mandamos un texto cuando lleguemos.',
    wzipLabel: 'Código postal',
    letMeKnow: 'Avísenme',
    faqH2: '¿Preguntas? <span class="serif">Aquí te respondemos.</span>',
    q1: '¿Tengo que estar en casa?',
    a1: 'No. Deja tu bolsa afuera de tu puerta, o dinos dónde encontrarla cuando agendes.',
    q2: '¿Cuándo me la regresan?',
    a2: 'De regreso <span data-fill="turnaround"></span>. Tú eliges un horario de dos horas para la recogida y otro para la entrega, de 9 a.m. a medianoche. Te mandamos un texto cuando el chofer esté como a una hora.',
    qPlan: '¿Cómo funciona Loads Weekly?',
    aPlan: 'Son $<span data-plan="monthly"></span> al mes, cobrados a tu tarjeta por Square. Cada semana incluye una recogida de hasta <span data-plan="lbs"></span> libras, y la entrega de ese pedido cuesta $<span data-plan="delivery"></span>. Si esa recogida pesa más, solo se cobran las libras extra, a $<span data-plan="over"></span> cada una. Una segunda recogida en la misma semana cuesta $<span data-plan="extra"></span> la libra más $<span data-plan="delivery"></span> de entrega. Las libras que no uses no se acumulan. Agenda cada recogida en esta página como siempre, y cancela cuando quieras por texto o correo.',
    subscribedMsg: 'Ya tienes Loads Weekly. Agenda tu recogida aquí abajo; te reconocemos por tu número de celular.',
    weeklyNudge: '<a href="#weekly">¿Cada semana? Con Loads Weekly ahorras unos $<span data-plan="save"></span> al mes</a>',
    weeklyKicker: 'Para casas que lavan cada semana',
    weeklyH2: 'Loads Weekly. <span class="serif">Ahorra cada semana.</span>',
    weeklyP: 'Por $<span data-plan="monthly"></span> al mes te lavamos y doblamos <span data-plan="lbs"></span> libras cada semana, recogidas y entregadas por nuestros propios choferes.',
    weeklyA: '<span class="serif">1.</span><span><strong>Unos $<span data-plan="perlb"></span> la libra.</strong> <span class="muted">Si usas tus <span data-plan="lbs"></span> libras cada semana, en vez de $<span data-price></span>.</span></span>',
    weeklyB: '<span class="serif">2.</span><span><strong>La entrega cuesta $<span data-plan="delivery"></span> por pedido.</strong> <span class="muted">Sin plan son $<span data-fee></span> por cada viaje.</span></span>',
    weeklyC: '<span class="serif">3.</span><span><strong>¿Otra recogida esa semana? $<span data-plan="extra"></span> la libra.</strong> <span class="muted">Más $<span data-plan="delivery"></span> de entrega.</span></span>',
    weeklyD: '<span class="serif">4.</span><span><strong>¿Más de <span data-plan="lbs"></span> libras?</strong> <span class="muted">Solo se cobran las libras extra, a $<span data-plan="over"></span> la libra.</span></span>',
    weeklyE: '<span class="serif">5.</span><span><strong>Cobro mensual. Cancela cuando quieras.</strong> <span class="muted">Mándanos un texto o correo. Las libras que no uses no pasan a la siguiente semana.</span></span>',
    weeklyLabel: 'Loads Weekly',
    weeklyEvery: 'Cada semana',
    perMonth: 'al mes',
    weeklyLine: '<span data-plan="lbs"></span> libras cada semana + $<span data-plan="delivery"></span> de entrega por pedido',
    cmpHead: 'Si mandas <span data-plan="lbs"></span> libras cada semana:',
    cmpGo: '<span class="muted">Sin plan</span><span class="muted">unos $<span data-plan="payg"></span> al mes</span>',
    cmpPlan: '<span>Loads Weekly, con entrega</span><span>unos $<span data-plan="planmo"></span> al mes</span>',
    cmpSave: 'Ahorras unos $<span data-plan="save"></span> al mes.',
    emailLabel: 'Correo (para tus recibos)',
    zipShort: 'Código postal',
    consentPlan: 'Mándenme textos sobre mis recogidas y entregas. Responde STOP cuando quieras. Pueden aplicar cargos por mensajes y datos.',
    planBtn: 'Empezar Loads Weekly',
    planFine: 'Terminas en la página de pago segura de Square. Se cobran $<span data-plan="monthly"></span> hoy y luego una vez al mes. Al inscribirte aceptas nuestros <a href="terms.html#weekly">términos</a>.',
    q3: '¿Cómo cobran?',
    a3: 'No necesitas tarjeta para agendar. Pesamos tu ropa seca en la tienda, antes de lavarla, y cobramos $<span data-price></span> la libra<span data-minline> con un mínimo de $<span data-min></span></span>, más $<span data-fee></span> por la recogida y $<span data-fee></span> por la entrega. Un cesto lleno normalmente pesa unas 10 libras. Te mandamos por texto el peso, una foto de la báscula y tu total.',
    a3b: 'En tu primer pedido recibes un enlace de pago seguro de Square. Al pagar, marca la opción para guardar tu tarjeta, y después solo cobramos a tu tarjeta guardada, así que no tienes que hacer nada. Tu ropa regresa en cuanto esté pagada.',
    q4: '¿Y si algo regresa mal?',
    q5: '¿Qué zonas cubren?',
    a5: 'Cualquier lugar a unas 30 millas de nuestras lavanderías en Koreatown y Van Nuys. Eso incluye el Westside, Hollywood, Downtown, el Este de LA, Pasadena, el South Bay, todo el Valle, Burbank, Santa Clarita y Simi Valley. Escribe tu código postal en el formulario para revisar.',
    finalH2: 'Suelta la carga. <span class="serif">Disfruta el fin de semana.</span>',
    finalP: 'Agenda en un minuto, o manda PICKUP por texto al <a data-sms href="#" style="color:#fff"><span data-fill="phone"></span></a>.',
    footP: 'Recogida y entrega de ropa por todo LA y el Valle, lavada y doblada en nuestras propias lavanderías.',
    storesH3: 'Nuestras lavanderías',
    contactH3: 'Contacto',
    legalLinks: '<a href="privacy.html">Privacidad</a> &middot; <a href="terms.html">Términos</a>',
    copyright: '&copy; <span id="year">2026</span> Loads Laundry Co. Nosotros nos encargamos.',
    mbarSmall: 'Por todo LA',
    bookShort: 'Agendar',

    /* ---------- built on the fly ---------- */
    tomorrow: 'Mañana, ',
    chooseDay: 'Elige un día',
    chooseWin: 'Elige una hora',
    eWin: 'Elige una hora de recogida.',
    eDwin: 'Elige una hora de entrega.',
    eTemp: 'Elige agua caliente o fría.',
    eZip: 'Escribe un código postal de 5 dígitos.',
    eDay: 'Elige un día de recogida.',
    ePhone: 'Escribe un número de celular de 10 dígitos.',
    eName: 'Escribe tu nombre.',
    eAddr: 'Escribe la dirección de recogida.',
    eConsent: 'Marca la casilla para que podamos mandarte textos sobre este pedido.',
    eEmail: 'Escribe tu correo para que Square te mande tus recibos.',
    ePlanZone: 'Por ahora Loads Weekly solo está en nuestras zonas de recogida, y {zip} todavía no es una.',
    eConsentPlan: 'Marca la casilla para que podamos mandarte textos sobre tus recogidas.',
    planStarting: 'Abriendo la página de pago segura...',
    booking: 'Agendando...',
    eFail: 'Algo salió mal. Manda PICKUP por texto al {phone} y te agendamos por texto.',
    done: 'Listo, te recogemos el {day}. Te mandamos un texto al {phone} cuando tu chofer vaya en camino, como una hora antes. Deja tu bolsa en la puerta.',
    wlOk: 'Ya estás en la lista. Te mandamos un texto cuando lleguemos a {zip}.',
    wlFail: 'Algo salió mal. Intenta de nuevo en un minuto.',
    wlInZone: '¡Buenas noticias! Ya recogemos en {zip}. Agenda arriba.',
    hHalf: 'como medio cesto',
    hOne: 'como 1 cesto',
    hMany: 'como {n} cestos',
    lbsLine: '{n} libras, {hamper}',
    estMin: 'Incluye el mínimo de ${min} por pedido. ',
    tripNote: '+ ${fee} por viaje',
    estFirst: 'Primer pedido: los viajes van por nuestra cuenta. Pagas por el peso real.',
    estPlain: 'Pagas por el peso real. Un cesto lleno normalmente pesa unas 10 libras.',
    rating: '{r} estrellas',
    us: 'nosotros',

    /* ---------- tracker ---------- */
    trkTitleTag: 'Rastrea tu carga | Loads',
    trkHeader: 'Rastreo de pedido',
    trkLoading: 'Buscando tu carga...',
    trkNfH: 'No encontramos esa carga.',
    trkNfP: 'Revisa el enlace en tu texto, o escríbenos y lo buscamos.',
    trkWeighed: 'Pesó <b id="lbs"></b>',
    trkTotal: 'Total <b id="total"></b>',
    trkReview: 'Déjanos una reseña en Google',
    trkQuestions: '¿Preguntas? Escríbenos al <a id="sms" href="#"><span id="phone"></span></a>',
    trkOrder: 'Pedido {id}',
    trkPickupOn: ' · recogida {day}',
    trkBookedDetail: 'La recogemos el {day}.',
    trkStep: 'Paso {n} de {total}',
    trkLbs: '{n} libras',
    trkPaid: 'Pagado. ¡Gracias!',
    trkUnpaid: 'Aún no está pagado. Revisa tus textos para el enlace de pago.',
    trkUpdated: 'Actualizado {time}',
    trkRefresh: ' · se actualiza cada minuto',
    trkNoRefresh: 'No se pudo actualizar. Lo intentamos de nuevo en un minuto.',
    trkUnreachable: 'No pudimos conectar con el rastreo. Revisa tu conexión y vuelve a cargar la página.',
    trkDocTitle: '{label} | Rastrea tu carga | Loads',
    'st.booked.label': 'Agendado',
    'st.booked.headline': 'Tu carga está agendada.',
    'st.booked.detail': 'La recogemos el día que elegiste.',
    'st.on_the_way.label': 'Chofer en camino',
    'st.on_the_way.headline': 'Tu chofer va en camino.',
    'st.on_the_way.detail': 'Llega en aproximadamente una hora. Ten tu bolsa en la puerta.',
    'st.picked_up.label': 'Recogido',
    'st.picked_up.headline': 'Tu carga va en camino.',
    'st.picked_up.detail': 'La recogimos y va rumbo a nuestra lavandería.',
    'st.at_store.label': 'En la lavandería',
    'st.at_store.headline': 'Tu carga llegó a la tienda.',
    'st.at_store.detail': 'La estamos pesando y separando.',
    'st.washing.label': 'Lavando',
    'st.washing.headline': 'Tu carga se está lavando.',
    'st.washing.detail': 'En una de nuestras lavadoras comerciales.',
    'st.drying.label': 'Secando',
    'st.drying.headline': 'Tu carga está en la secadora.',
    'st.drying.detail': 'Secándose.',
    'st.folding.label': 'Doblando',
    'st.folding.headline': 'Estamos doblando tu carga.',
    'st.folding.detail': 'Doblada a mano en nuestro mostrador.',
    'st.out_for_delivery.label': 'En camino a ti',
    'st.out_for_delivery.headline': 'Tu carga ya salió.',
    'st.out_for_delivery.detail': 'Va de regreso a tu casa. Llega en aproximadamente una hora.',
    'st.delivered.label': 'Entregado',
    'st.delivered.headline': 'Tu carga ya regresó.',
    'st.delivered.detail': 'Entregada. Disfruta tu ropa limpia.'
  };

  var qs = new URLSearchParams(location.search);
  var saved = null;
  try { saved = localStorage.getItem('loads_lang'); } catch (e) {}
  var asked = qs.get('lang');
  var lang = asked === 'es' || asked === 'en' ? asked
    : saved === 'es' || saved === 'en' ? saved
    : (navigator.language || '').toLowerCase().indexOf('es') === 0 ? 'es' : 'en';

  var originals = new Map();   // element -> its English HTML
  var originalAttrs = new Map(); // element -> { attr: English value }

  function t(key, vars, fallback) {
    var s = lang === 'es' && ES[key] != null ? ES[key] : EN[key] != null ? EN[key] : fallback != null ? fallback : key;
    if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    return s;
  }

  function apply() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      if (!originals.has(el)) originals.set(el, el.innerHTML);
      var key = el.getAttribute('data-i18n');
      el.innerHTML = lang === 'es' && ES[key] != null ? ES[key] : originals.get(el);
    });
    document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      if (!originalAttrs.has(el)) originalAttrs.set(el, {});
      var store = originalAttrs.get(el);
      el.getAttribute('data-i18n-attr').split(',').forEach(function (pair) {
        var bits = pair.split(':'), attr = bits[0].trim(), key = bits[1].trim();
        if (!(attr in store)) store[attr] = el.getAttribute(attr);
        el.setAttribute(attr, lang === 'es' && ES[key] != null ? ES[key] : store[attr]);
      });
    });
    document.querySelectorAll('[data-lang-toggle]').forEach(function (b) {
      b.textContent = lang === 'es' ? 'English' : 'Español';
      b.setAttribute('lang', lang === 'es' ? 'en' : 'es');
      b.setAttribute('aria-label', lang === 'es' ? 'View this page in English' : 'Ver esta página en español');
    });
    document.dispatchEvent(new CustomEvent('loads:lang', { detail: { lang: lang } }));
  }

  function setLang(next) {
    lang = next === 'es' ? 'es' : 'en';
    try { localStorage.setItem('loads_lang', lang); } catch (e) {}
    apply();
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-lang-toggle]');
    if (!b) return;
    e.preventDefault();
    setLang(lang === 'es' ? 'en' : 'es');
  });

  window.LOADS_I18N = {
    get lang() { return lang; },
    locale: function () { return lang === 'es' ? 'es-US' : 'en-US'; },
    t: t,
    setLang: setLang,
    apply: apply
  };
  if (asked === 'es' || asked === 'en') { try { localStorage.setItem('loads_lang', lang); } catch (e) {} }
  apply();
})();
