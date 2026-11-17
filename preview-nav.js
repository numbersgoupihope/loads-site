/* Shows a small menu linking the three pages while the site is in preview mode
   (no endpoint set in config.js). It disappears on its own once the site is connected. */
(function () {
  if (!window.LOADS_CONFIG || window.LOADS_CONFIG.endpoint) return;
  var here = location.pathname.split('/').pop() || 'index.html';
  var pages = [['index.html', 'Booking page'], ['track.html', 'Customer tracker'], ['staff.html', 'Staff page']];
  var bar = document.createElement('nav');
  bar.setAttribute('aria-label', 'Preview pages');
  bar.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:6px 16px;padding:8px 12px;background:#fff0a0;border-bottom:1px dashed #8a6d00;font:600 14px/1.3 system-ui,-apple-system,sans-serif;color:#183a2e';
  var label = document.createElement('span');
  label.textContent = 'Preview mode:';
  bar.appendChild(label);
  pages.forEach(function (p) {
    var a = document.createElement('a');
    a.href = p[0];
    a.textContent = p[1];
    a.style.cssText = 'color:#183a2e;padding:4px 2px;' + (p[0] === here ? 'text-decoration:none;opacity:.55' : 'text-decoration:underline');
    if (p[0] === here) a.setAttribute('aria-current', 'page');
    bar.appendChild(a);
  });
  document.body.insertBefore(bar, document.body.firstChild);
})();
