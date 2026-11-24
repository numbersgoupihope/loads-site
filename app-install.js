/* "Get the app" button: installs Loads to the home screen.
   Android/Chrome: one tap opens the install prompt.
   iPhone: shows the two Safari steps. Computer: shows a QR code to open it on a phone.
   Any element with data-get-app opens it. The page's <html> sets data-app ("customer" or "staff"). */
(function () {
  var QR = {"customer": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 33 33\"><path fill=\"#fff\" d=\"M0 0h33v33h-33z\"/><path stroke=\"#183a2e\" d=\"M2 2.5h7m3 0h1m3 0h1m3 0h1m3 0h7m-29 1h1m5 0h1m1 0h1m2 0h1m1 0h1m1 0h3m2 0h1m1 0h1m5 0h1m-29 1h1m1 0h3m1 0h1m1 0h2m1 0h1m2 0h1m1 0h1m1 0h2m2 0h1m1 0h3m1 0h1m-29 1h1m1 0h3m1 0h1m2 0h5m2 0h2m4 0h1m1 0h3m1 0h1m-29 1h1m1 0h3m1 0h1m3 0h2m1 0h1m3 0h1m1 0h1m2 0h1m1 0h3m1 0h1m-29 1h1m5 0h1m2 0h6m4 0h2m1 0h1m5 0h1m-29 1h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7m-15 1h4m1 0h1m-19 1h3m1 0h2m4 0h1m1 0h2m5 0h1m5 0h2m-28 1h3m1 0h1m2 0h1m1 0h1m1 0h1m1 0h1m2 0h1m1 0h8m2 0h1m-28 1h1m1 0h4m2 0h1m2 0h1m1 0h1m1 0h3m1 0h1m1 0h1m1 0h4m-27 1h1m9 0h1m2 0h2m3 0h1m3 0h2m3 0h1m-27 1h1m3 0h1m4 0h3m2 0h2m3 0h1m1 0h1m1 0h4m-28 1h1m5 0h1m1 0h1m3 0h4m1 0h2m2 0h2m1 0h4m-28 1h2m1 0h1m1 0h1m1 0h1m1 0h2m2 0h2m1 0h3m1 0h1m1 0h3m1 0h2m-29 1h3m1 0h1m3 0h1m1 0h1m1 0h3m2 0h2m1 0h1m3 0h2m2 0h1m-29 1h1m1 0h3m1 0h3m2 0h1m4 0h4m3 0h3m2 0h1m-27 1h1m1 0h2m1 0h1m3 0h3m2 0h1m3 0h1m2 0h1m1 0h1m-26 1h1m5 0h2m1 0h1m1 0h2m1 0h5m1 0h1m1 0h2m-22 1h2m5 0h1m3 0h2m2 0h2m1 0h4m2 0h3m-28 1h1m4 0h2m3 0h4m1 0h11m-19 1h2m1 0h4m1 0h1m3 0h1m3 0h2m1 0h2m-29 1h7m3 0h1m1 0h2m2 0h2m1 0h2m1 0h1m1 0h1m1 0h2m-28 1h1m5 0h1m1 0h4m1 0h1m2 0h1m1 0h1m1 0h1m3 0h1m2 0h1m-28 1h1m1 0h3m1 0h1m2 0h1m2 0h3m3 0h1m1 0h8m-28 1h1m1 0h3m1 0h1m1 0h1m1 0h1m1 0h2m2 0h4m4 0h2m1 0h1m-28 1h1m1 0h3m1 0h1m1 0h1m1 0h3m2 0h2m3 0h1m2 0h1m1 0h2m1 0h1m-29 1h1m5 0h1m1 0h1m1 0h1m1 0h3m1 0h1m1 0h1m1 0h1m1 0h1m1 0h2m1 0h1m-28 1h7m2 0h1m2 0h4m2 0h6m3 0h1\"/></svg>\n", "staff": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 33 33\"><path fill=\"#fff\" d=\"M0 0h33v33h-33z\"/><path stroke=\"#183a2e\" d=\"M2 2.5h7m2 0h2m2 0h2m3 0h1m3 0h7m-29 1h1m5 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m3 0h1m1 0h1m5 0h1m-29 1h1m1 0h3m1 0h1m1 0h2m2 0h1m1 0h1m1 0h1m2 0h2m1 0h1m1 0h3m1 0h1m-29 1h1m1 0h3m1 0h1m1 0h1m1 0h4m2 0h5m1 0h1m1 0h3m1 0h1m-29 1h1m1 0h3m1 0h1m3 0h2m2 0h1m1 0h5m1 0h1m1 0h3m1 0h1m-29 1h1m5 0h1m3 0h1m3 0h1m1 0h2m2 0h1m1 0h1m5 0h1m-29 1h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7m-21 1h5m2 0h1m3 0h1m-20 1h1m5 0h1m1 0h2m1 0h5m1 0h1m3 0h2m2 0h3m-26 1h1m2 0h1m4 0h1m3 0h3m2 0h1m1 0h1m1 0h2m1 0h2m-28 1h1m4 0h4m1 0h2m3 0h1m1 0h2m2 0h1m2 0h1m-25 1h2m1 0h3m1 0h3m1 0h2m1 0h1m1 0h1m2 0h7m-26 1h2m1 0h2m1 0h2m1 0h1m1 0h2m3 0h1m3 0h1m1 0h2m4 0h1m-25 1h1m3 0h1m1 0h2m2 0h3m2 0h1m1 0h4m2 0h2m-29 1h1m3 0h3m1 0h1m3 0h1m2 0h2m4 0h1m1 0h4m-27 1h1m1 0h1m2 0h1m1 0h1m1 0h3m2 0h1m3 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m-28 1h4m1 0h1m4 0h4m2 0h1m2 0h1m4 0h2m-27 1h1m2 0h3m4 0h2m2 0h3m1 0h3m1 0h3m1 0h3m-29 1h2m3 0h3m1 0h2m2 0h7m1 0h1m3 0h1m2 0h1m-29 1h1m2 0h2m3 0h1m1 0h2m4 0h1m3 0h2m1 0h1m-24 1h1m2 0h1m2 0h1m1 0h4m3 0h3m2 0h5m1 0h3m-21 1h1m2 0h2m1 0h2m2 0h3m3 0h2m-26 1h7m2 0h1m1 0h2m2 0h1m1 0h1m1 0h2m1 0h1m1 0h3m-27 1h1m5 0h1m2 0h1m2 0h1m5 0h3m3 0h1m2 0h1m-28 1h1m1 0h3m1 0h1m2 0h2m2 0h2m1 0h1m2 0h7m1 0h1m-28 1h1m1 0h3m1 0h1m2 0h2m2 0h1m1 0h2m1 0h4m3 0h2m1 0h1m-29 1h1m1 0h3m1 0h1m5 0h1m2 0h1m1 0h1m2 0h8m-28 1h1m5 0h1m2 0h3m1 0h3m2 0h1m3 0h1m1 0h3m1 0h1m-29 1h7m1 0h1m1 0h1m1 0h2m3 0h3m2 0h2m2 0h1\"/></svg>\n"};
  var kind = document.documentElement.getAttribute('data-app') === 'staff' ? 'staff' : 'customer';
  var name = kind === 'staff' ? 'Loads Staff' : 'Loads';
  var icon = kind === 'staff' ? 'icons/staff-180.png' : 'icons/loads-180.png';
  var btns = [].slice.call(document.querySelectorAll('[data-get-app]'));
  var standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone) { btns.forEach(function (b) { b.hidden = true; }); return; }

  var ua = navigator.userAgent;
  var isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/.test(ua);
  var deferred = null;
  addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; if (go) go.hidden = false; });
  addEventListener('appinstalled', function () { btns.forEach(function (b) { b.hidden = true; }); if (d.open) d.close(); });

  var shareIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-3px"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M6 11v9h12v-9"/></svg>';
  var steps;
  if (isIOS) {
    steps = '<ol><li>Tap the Share button ' + shareIcon + ' at the bottom of Safari. In Chrome it is at the top, next to the address.</li>' +
      '<li>Scroll down and tap <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b>. The ' + name + ' icon shows up with your other apps.</li></ol>';
  } else if (isAndroid) {
    steps = '<button type="button" class="appsheet-go" hidden>Install ' + name + '</button><ol><li>Tap the <b>&#8942;</b> menu at the top right of Chrome.</li>' +
      '<li>Tap <b>Add to Home screen</b> or <b>Install app</b>.</li><li>Tap <b>Install</b>. The ' + name + ' icon shows up with your other apps.</li></ol>';
  } else {
    steps = '<div class="appsheet-qr">' + QR[kind] + '</div><p class="appsheet-c">Scan this with your phone\'s camera. The steps to add it open right on your phone.</p>';
  }

  var css = document.createElement('style');
  css.textContent =
    '.appsheet{border:none;border-radius:22px;padding:28px 24px 24px;max-width:380px;width:calc(100% - 32px);background:#fbf7f1;color:#183a2e;font-family:inherit;box-shadow:0 20px 60px rgba(24,58,46,.3)}' +
    '.appsheet::backdrop{background:rgba(24,58,46,.45)}' +
    '.appsheet img.appsheet-i{display:block;width:64px;height:64px;border-radius:15px}' +
    '.appsheet h2{margin:16px 0 6px;font-size:24px;line-height:1.15;font-weight:750}' +
    '.appsheet p{margin:0;font-size:15px;line-height:1.5;color:#4d5b54}' +
    '.appsheet ol{margin:16px 0 0;padding-left:22px;font-size:16px;line-height:1.5}.appsheet li{margin:0 0 10px;padding-left:4px}' +
    '.appsheet-qr{margin:18px auto 0;width:180px;height:180px}.appsheet-qr svg{width:100%;height:100%;display:block}' +
    '.appsheet .appsheet-c{margin-top:12px;text-align:center}' +
    '.appsheet-x{position:absolute;top:12px;right:12px;width:44px;height:44px;border:none;border-radius:50%;background:transparent;color:#183a2e;cursor:pointer;display:flex;align-items:center;justify-content:center}' +
    '.appsheet-x:hover{background:rgba(24,58,46,.08)}' +
    '.appsheet-go{display:flex;width:100%;min-height:52px;margin:18px 0 4px;align-items:center;justify-content:center;border:none;border-radius:14px;background:#c4235f;color:#fff;font:inherit;font-size:17px;font-weight:650;cursor:pointer}';
  document.head.appendChild(css);

  var d = document.createElement('dialog');
  d.className = 'appsheet';
  d.setAttribute('aria-labelledby', 'appsheet-t');
  d.innerHTML = '<form method="dialog"><button class="appsheet-x" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></form>' +
    '<img class="appsheet-i" src="' + icon + '" alt="">' +
    '<h2 id="appsheet-t">Get the ' + name + ' app</h2>' +
    '<p>' + (kind === 'staff' ? 'Opens straight to today\'s loads.' : 'Free, and no App Store needed. Book your next pickup in two taps.') + '</p>' + steps;
  d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
  document.body.appendChild(d);
  var go = d.querySelector('.appsheet-go');
  if (go) {
    go.hidden = !deferred;
    go.addEventListener('click', function () { install(); });
  }

  function install() {
    if (!deferred) return;
    var p = deferred; deferred = null;
    if (go) go.hidden = true;
    p.prompt();
    p.userChoice.then(function (c) {
      if (c.outcome === 'accepted') { btns.forEach(function (b) { b.hidden = true; }); if (d.open) d.close(); }
    }).catch(function () {});
  }

  function open(fromTap) {
    if (fromTap && isAndroid && deferred) return install();
    if (typeof d.showModal === 'function') { if (!d.open) d.showModal(); } else d.setAttribute('open', '');
  }
  btns.forEach(function (b) { b.hidden = false; b.addEventListener('click', function (e) { e.preventDefault(); open(true); }); });
  if (location.hash === '#getapp') setTimeout(function () { open(false); }, 400);
})();
