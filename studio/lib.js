/* Shared helpers and drawings for Loads reels. Every page defines seek(t) (seconds) and draws that moment exactly. */
const C = { green: '#183a2e', ink: '#14251f', cream: '#f3ede2', paper: '#faf6ef', mint: '#b9d6bb', mint2: '#d3e6d4', pink: '#c4235f', blush: '#f2a5c0', sand: '#f2e2d5', water: '#2c5f55' };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, start, dur) => clamp((t - start) / dur);
const E = {
  out: t => 1 - Math.pow(1 - t, 3),
  in: t => t * t * t,
  inOut: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  elastic: t => (t === 0 || t === 1 ? t : Math.pow(2, -9 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI) / 3.2) + 1),
};
const $ = s => document.querySelector(s);
/* place an element: x/y in px (translate), r deg, s / sx / sy scale, o opacity */
function put(el, { x = 0, y = 0, r = 0, s = 1, sx = 1, sy = 1, o = 1 } = {}) {
  if (typeof el === 'string') el = $(el);
  el.style.transform = `translate(${x}px,${y}px) rotate(${r}deg) scale(${s * sx},${s * sy})`;
  el.style.opacity = o;
}
/* squash and stretch for a hop: returns {y, sx, sy} for p in 0..1 of a hop of height h */
function hop(p, h) {
  if (p <= 0 || p >= 1) return { y: 0, sx: 1, sy: 1 };
  const y = -4 * h * p * (1 - p);
  const st = 1 + 0.12 * Math.sin(p * Math.PI);
  return { y, sx: 1 / st, sy: st };
}
function land(p) { /* squash right after landing, p 0..1 over ~0.3s */
  if (p <= 0 || p >= 1) return { sx: 1, sy: 1 };
  const k = Math.sin(p * Math.PI) * (1 - p) * 0.9;
  return { sx: 1 + 0.22 * k, sy: 1 - 0.2 * k };
}

/* ---------- Big Load: the mascot. A stuffed laundry bag in shades, with an iced matcha. ---------- */
function bigLoadSVG(id) {
  const o = C.ink;
  return `
<svg id="${id}" viewBox="0 0 420 500" width="420" height="500" style="overflow:visible">
  <ellipse class="shadow" cx="210" cy="488" rx="150" ry="15" fill="#000" opacity=".22"/>
  <g class="body">
    <!-- feet: little slides -->
    <g class="feet">
      <rect x="124" y="444" width="70" height="38" rx="17" fill="${o}"/>
      <rect x="226" y="444" width="70" height="38" rx="17" fill="${o}"/>
      <rect x="131" y="458" width="56" height="12" rx="6" fill="${C.pink}"/>
      <rect x="233" y="458" width="56" height="12" rx="6" fill="${C.pink}"/>
    </g>
    <!-- sock flopping out of the top -->
    <g class="sock">
      <path d="M234 134 L238 66 C239 52 250 44 264 45 L306 50 C322 52 330 64 328 78 C326 92 314 98 300 96 L268 92 L264 134 Z" fill="${C.blush}" stroke="${o}" stroke-width="7" stroke-linejoin="round"/>
      <path d="M237 112 L265 113 M238 96 L266 97" stroke="${C.cream}" stroke-width="7" stroke-linecap="round"/>
      <path d="M306 51 C320 53 329 64 327 78 C325 90 316 96 304 96 C310 82 310 64 306 51 Z" fill="${C.pink}" opacity=".55"/>
    </g>
    <!-- gathered top -->
    <path d="M146 150 C140 128 150 108 166 112 C172 96 190 92 200 104 C210 90 230 92 236 108 C252 102 270 116 264 150 Z" fill="${C.cream}" stroke="${o}" stroke-width="8" stroke-linejoin="round"/>
    <!-- sack -->
    <path d="M150 146 C96 168 58 236 60 318 C62 404 122 452 210 452 C298 452 358 404 360 318 C362 236 324 168 270 146 C240 158 180 158 150 146 Z" fill="${C.cream}" stroke="${o}" stroke-width="8" stroke-linejoin="round"/>
    <!-- fabric creases -->
    <path d="M106 240 C98 270 96 300 100 330" stroke="#d9cfbf" stroke-width="7" stroke-linecap="round" fill="none"/>
    <path d="M318 236 C326 262 330 292 326 324" stroke="#d9cfbf" stroke-width="7" stroke-linecap="round" fill="none"/>
    <!-- drawstring -->
    <path d="M152 150 C186 162 236 162 268 150" stroke="${C.pink}" stroke-width="10" stroke-linecap="round" fill="none"/>
    <g class="bow">
      <path d="M210 156 C196 140 176 146 182 160 C188 172 204 164 210 156 Z" fill="${C.pink}" stroke="${o}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M210 156 C224 140 244 146 238 160 C232 172 216 164 210 156 Z" fill="${C.pink}" stroke="${o}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M206 160 C200 178 196 190 190 200 M214 160 C220 178 226 188 232 196" stroke="${C.pink}" stroke-width="7" stroke-linecap="round" fill="none"/>
      <circle cx="210" cy="157" r="8" fill="${C.pink}" stroke="${o}" stroke-width="5"/>
    </g>
    <!-- face -->
    <g class="face">
      <g class="shades">
        <path d="M118 238 L194 238 C200 238 202 242 201 248 L196 276 C194 288 186 294 174 294 L140 294 C126 294 118 286 116 274 L112 246 C111 241 113 238 118 238 Z" fill="${o}"/>
        <path d="M226 238 L302 238 C307 238 309 241 308 246 L304 274 C302 286 294 294 280 294 L246 294 C234 294 226 288 224 276 L219 248 C218 242 220 238 226 238 Z" fill="${o}"/>
        <rect x="196" y="244" width="28" height="9" rx="4" fill="${o}"/>
        <path d="M100 246 L114 244 M306 244 L320 246" stroke="${o}" stroke-width="7" stroke-linecap="round"/>
        <g class="glint" opacity=".9">
          <path d="M136 250 L150 250 L130 282 L118 282 Z" fill="#fff" opacity=".28"/>
          <path d="M244 250 L258 250 L238 282 L226 282 Z" fill="#fff" opacity=".28"/>
        </g>
      </g>
      <path class="smirk" d="M188 336 C204 348 228 346 244 330" stroke="${o}" stroke-width="8" stroke-linecap="round" fill="none"/>
      <path d="M244 330 C250 326 252 322 252 318" stroke="${o}" stroke-width="6" stroke-linecap="round" fill="none"/>
    </g>
    <!-- name patch -->
    <g class="patch" transform="rotate(-6 210 402)">
      <rect x="150" y="380" width="120" height="44" rx="10" fill="${C.green}" stroke="${o}" stroke-width="5"/>
      <text x="210" y="412" text-anchor="middle" font-family="Bricolage Grotesque" font-weight="800" font-size="28" font-stretch="80%" fill="${C.cream}" letter-spacing="1">LOADS</text>
    </g>
    <!-- left arm (the waving / flexing one) -->
    <g class="armL">
      <path d="M72 300 C46 306 32 324 30 344" stroke="${o}" stroke-width="10" stroke-linecap="round" fill="none"/>
      <circle cx="30" cy="350" r="15" fill="${C.cream}" stroke="${o}" stroke-width="7"/>
    </g>
    <!-- right arm holding an iced matcha -->
    <g class="armR">
      <path d="M350 300 C376 300 390 284 394 262" stroke="${o}" stroke-width="10" stroke-linecap="round" fill="none"/>
      <g class="cup">
        <path d="M372 190 L420 190 L414 262 C413 270 408 274 400 274 L392 274 C384 274 379 270 378 262 Z" fill="#e9f3ea" stroke="${o}" stroke-width="6" stroke-linejoin="round"/>
        <path d="M376 214 L416 214 L412 260 C411 266 407 268 401 268 L391 268 C385 268 381 266 380 260 Z" fill="#8fc49a"/>
        <rect x="383" y="200" width="12" height="12" rx="3" fill="#fff" opacity=".8" transform="rotate(12 389 206)"/>
        <rect x="399" y="206" width="11" height="11" rx="3" fill="#fff" opacity=".7" transform="rotate(-10 404 211)"/>
        <rect x="366" y="182" width="60" height="12" rx="6" fill="#e9f3ea" stroke="${o}" stroke-width="6"/>
        <path d="M400 184 L412 140 L426 136" stroke="${C.pink}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </g>
      <circle cx="394" cy="262" r="15" fill="${C.cream}" stroke="${o}" stroke-width="7"/>
    </g>
  </g>
</svg>`;
}

/* ---------- A hoodie (front view). parts: sleeveL, sleeveR, bodyTop, bodyBot so it can fold ---------- */
function hoodieSVG(id, color = C.pink, dirty = false) {
  const o = C.ink;
  const stains = dirty ? `
    <ellipse cx="170" cy="250" rx="26" ry="18" fill="#6b4a2f" opacity=".55"/>
    <ellipse cx="236" cy="300" rx="16" ry="12" fill="#6b4a2f" opacity=".5"/>
    <ellipse cx="128" cy="330" rx="12" ry="9" fill="#6b4a2f" opacity=".45"/>` : '';
  return `
<svg id="${id}" viewBox="0 0 400 420" width="400" height="420" style="overflow:visible">
  <g class="hood"><path d="M150 92 C150 52 250 52 250 92 L250 120 L150 120 Z" fill="${color}" stroke="${o}" stroke-width="8" stroke-linejoin="round"/>
    <path d="M168 104 C176 84 224 84 232 104" stroke="${o}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".5"/></g>
  <g class="sleeveL"><path d="M110 112 L48 250 C44 262 50 272 62 274 L86 276 C96 276 102 270 104 262 L130 180 Z" fill="${color}" stroke="${o}" stroke-width="8" stroke-linejoin="round"/>
    <rect x="44" y="262" width="62" height="26" rx="10" fill="${color}" stroke="${o}" stroke-width="7"/></g>
  <g class="sleeveR"><path d="M290 112 L352 250 C356 262 350 272 338 274 L314 276 C304 276 298 270 296 262 L270 180 Z" fill="${color}" stroke="${o}" stroke-width="8" stroke-linejoin="round"/>
    <rect x="294" y="262" width="62" height="26" rx="10" fill="${color}" stroke="${o}" stroke-width="7"/></g>
  <g class="bodyBot"><path d="M118 250 L282 250 L284 372 C284 380 278 386 270 386 L130 386 C122 386 116 380 116 372 Z" fill="${color}" stroke="${o}" stroke-width="8" stroke-linejoin="round"/>
    <rect x="116" y="360" width="168" height="28" rx="8" fill="${color}" stroke="${o}" stroke-width="7"/>
    <path d="M150 290 L250 290 L262 338 L138 338 Z" fill="none" stroke="${o}" stroke-width="6" stroke-linejoin="round" opacity=".6"/></g>
  <g class="bodyTop"><path d="M110 112 C140 104 260 104 290 112 L284 254 L116 254 Z" fill="${color}" stroke="${o}" stroke-width="8" stroke-linejoin="round"/>
    <path d="M182 120 L178 176 M218 120 L222 176" stroke="${C.cream}" stroke-width="6" stroke-linecap="round"/>
    <circle cx="178" cy="180" r="6" fill="${C.cream}"/><circle cx="222" cy="180" r="6" fill="${C.cream}"/></g>
  ${stains}
</svg>`;
}

/* a round machine door. kind: 'wash' (water, bubbles) or 'dry' (warm glow) */
function porthole(id, kind) {
  const o = C.ink;
  const inner = kind === 'wash'
    ? `<circle cx="300" cy="300" r="190" fill="${C.water}"/>
       <path class="wave" d="M90 300 C150 270 210 330 270 300 C330 270 390 330 450 300 C510 270 530 300 530 300 L530 520 L90 520 Z" fill="#3f8173" opacity=".9"/>`
    : `<radialGradient id="glow-${id}"><stop offset="0" stop-color="#ffd9a8"/><stop offset=".6" stop-color="#f2a5c0"/><stop offset="1" stop-color="#c4235f"/></radialGradient>
       <circle cx="300" cy="300" r="190" fill="url(#glow-${id})"/>`;
  return `
<svg id="${id}" viewBox="0 0 600 600" width="600" height="600" style="overflow:visible">
  <defs><clipPath id="clip-${id}"><circle cx="300" cy="300" r="190"/></clipPath></defs>
  <circle cx="300" cy="300" r="282" fill="${C.cream}" stroke="${o}" stroke-width="10"/>
  <circle cx="300" cy="300" r="236" fill="#dcd3c4" stroke="${o}" stroke-width="8"/>
  <g clip-path="url(#clip-${id})">${inner}<g class="inside"></g></g>
  <circle cx="300" cy="300" r="190" fill="none" stroke="${o}" stroke-width="10"/>
  <path d="M190 190 C220 160 260 146 300 146" stroke="#fff" stroke-width="16" stroke-linecap="round" fill="none" opacity=".35"/>
</svg>`;
}

/* poses: set on a Big Load svg element. amount 0..1 blends the arm moves */
function blPose(svg, { sip = 0, wave = 0, smile = 0, glint = 0 } = {}) {
  // sip: bring the cup in so the straw meets the mouth corner
  svg.querySelector('.cup').setAttribute('transform', `translate(${-112 * sip} ${88 * sip}) rotate(${-34 * sip} 396 232)`);
  const hx = lerp(394, 300, sip), hy = lerp(262, 340, sip);
  svg.querySelector('.armR path').setAttribute('d', `M350 300 C${lerp(376, 352, sip)} ${lerp(300, 330, sip)} ${lerp(390, 320, sip)} ${lerp(284, 346, sip)} ${hx} ${hy}`);
  const hand = svg.querySelector('.armR circle'); hand.setAttribute('cx', hx); hand.setAttribute('cy', hy);
  svg.querySelector('.armL').setAttribute('transform', `rotate(${wave} 72 300)`);
  svg.querySelector('.smirk').setAttribute('d', `M${lerp(188, 182, smile)} ${lerp(336, 330, smile)} C${lerp(204, 202, smile)} ${lerp(348, 358, smile)} ${lerp(228, 238, smile)} ${lerp(346, 354, smile)} 244 330`);
  svg.querySelector('.glint').setAttribute('transform', `translate(${glint * 40} 0)`);
}

/* ---------- Lefty: the lost sock. A pink striped sock with a face. mirror=true faces left ---------- */
function sockSVG(id, mirror = false) {
  const o = C.ink;
  return `
<svg id="${id}" viewBox="0 0 280 380" width="280" height="380" style="overflow:visible">
  <ellipse class="shadow" cx="150" cy="362" rx="110" ry="12" fill="#000" opacity=".25"/>
  <g class="sbody" transform="${mirror ? 'translate(280 0) scale(-1 1)' : ''}">
    <path d="M62 24 L166 24 L166 206 C166 228 178 238 200 242 L222 246 C254 252 262 300 240 324 C230 336 212 342 194 342 L98 342 C72 342 56 322 56 296 Z" fill="${C.blush}" stroke="${o}" stroke-width="9" stroke-linejoin="round"/>
    <path d="M62 24 L166 24 L166 74 L62 74 Z" fill="${C.cream}" stroke="${o}" stroke-width="9" stroke-linejoin="round"/>
    <path d="M62 50 L166 50" stroke="${C.pink}" stroke-width="10"/>
    <path d="M200 244 C232 248 252 270 248 300 C246 316 236 332 214 338 C228 314 226 274 200 244 Z" fill="${C.pink}" opacity=".55"/>
    <path d="M56 300 C60 326 76 340 98 342 C88 326 82 310 82 290 Z" fill="${C.pink}" opacity=".45"/>
  </g>
  <g class="face" transform="translate(${mirror ? 4 : 0} 0)">
    <g class="eyes">
      <ellipse cx="92" cy="128" rx="20" ry="25" fill="#fff" stroke="${o}" stroke-width="6"/>
      <ellipse cx="140" cy="128" rx="20" ry="25" fill="#fff" stroke="${o}" stroke-width="6"/>
      <circle class="pupil" cx="94" cy="132" r="10" fill="${o}"/>
      <circle class="pupil" cx="142" cy="132" r="10" fill="${o}"/>
      <circle cx="97" cy="127" r="3.5" fill="#fff"/><circle cx="145" cy="127" r="3.5" fill="#fff"/>
    </g>
    <path class="browL" d="M72 96 L108 92" stroke="${o}" stroke-width="7" stroke-linecap="round"/>
    <path class="browR" d="M124 92 L160 96" stroke="${o}" stroke-width="7" stroke-linecap="round"/>
    <path class="mouth" d="M102 178 C110 170 124 170 132 178" stroke="${o}" stroke-width="7" stroke-linecap="round" fill="none"/>
    <path class="tear" d="M90 160 C84 172 82 180 90 184 C98 180 96 172 90 160 Z" fill="#9fd3e8" stroke="${o}" stroke-width="3" opacity="0"/>
  </g>
</svg>`;
}
/* sad: 0..1 raises inner brows and turns the mouth down; look: -1..1 moves pupils; tear: 0..1 slides a tear down */
function sockFace(svg, { sad = 0, look = 0, tear = 0, shock = 0 } = {}) {
  svg.querySelector('.browL').setAttribute('d', `M72 ${96 + 8 * sad - 10 * shock} L108 ${92 - 10 * sad - 10 * shock}`);
  svg.querySelector('.browR').setAttribute('d', `M124 ${92 - 10 * sad - 10 * shock} L160 ${96 + 8 * sad - 10 * shock}`);
  const m = svg.querySelector('.mouth');
  if (shock > 0.5) m.setAttribute('d', 'M106 182 C106 166 128 166 128 182 C128 196 106 196 106 182 Z');
  else m.setAttribute('d', `M102 ${174 + 8 * sad} C110 ${184 - 22 * sad} 124 ${184 - 22 * sad} 132 ${174 + 8 * sad}`);
  svg.querySelectorAll('.pupil').forEach((p, i) => { p.setAttribute('cx', (i ? 142 : 94) + look * 8); });
  const tr = svg.querySelector('.tear');
  tr.setAttribute('opacity', tear > 0 && tear < 1 ? 1 : 0);
  tr.setAttribute('transform', `translate(0 ${tear * 120})`);
}
