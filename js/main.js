/* =========================================================================
   p.rite.sh — interaction + immersive 3D background
   - Three.js "network constellation" (thematically nods to cybersecurity)
   - Fully respects prefers-reduced-motion and an in-page Motion toggle
   - Gracefully degrades to a CSS gradient if WebGL is unavailable
   ========================================================================= */
(function () {
"use strict";

var THREE = window.THREE; // vendored UMD build (js/vendor/three.min.js)

/* ---------- Global motion state ---------------------------------------- */
const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
const STORAGE_KEY = "prite-motion";

// User's explicit choice wins; otherwise honour the OS preference.
const stored = localStorage.getItem(STORAGE_KEY);
let motionEnabled = stored ? stored === "on" : !prefersReduced.matches;

// current colour theme (the attribute was set pre-paint by the inline head script)
function isLight() { return document.documentElement.getAttribute("data-theme") === "light"; }

/* ---------- Footer year ----------------------------------------------- */
document.getElementById("year").textContent = new Date().getFullYear();

/* ---------- Kinetic section titles + page-load intro ------------------ */
// wrap each section heading's content in a mask-inner for the line-rise reveal
document.querySelectorAll(".section-title").forEach((el) => {
  const inner = document.createElement("span");
  inner.className = "title-inner";
  while (el.firstChild) inner.appendChild(el.firstChild);
  el.appendChild(inner);
});

const intro = document.getElementById("intro");
let introFinished = false;
function finishIntro() {
  if (introFinished) return;
  introFinished = true;
  document.body.classList.add("intro-done");
  document.documentElement.classList.remove("intro-active");
  if (intro) {
    intro.classList.add("is-hidden");
    setTimeout(() => intro.setAttribute("hidden", ""), 950);
  }
}
function runIntro() {
  // skip the loader for reduced-motion or when motion is off by preference
  if (!intro || prefersReduced.matches || stored === "off") {
    if (intro) { intro.classList.add("is-hidden"); intro.setAttribute("hidden", ""); }
    document.body.classList.add("intro-done");
    introFinished = true;
    return;
  }
  document.documentElement.classList.add("intro-active");
  const countEl = document.getElementById("intro-count");
  const fill = document.getElementById("intro-bar-fill");
  const dur = 1350;
  const start = performance.now();
  (function step(now) {
    const p = Math.min((now - start) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 2);
    if (countEl) countEl.textContent = Math.round(eased * 100);
    if (fill) fill.style.transform = "scaleX(" + eased.toFixed(3) + ")";
    if (p < 1) requestAnimationFrame(step);
    else setTimeout(finishIntro, 200);
  })(performance.now());
}
runIntro();
setTimeout(finishIntro, 4500); // failsafe: never leave the loader up

/* ---------- Header shadow on scroll ----------------------------------- */
const header = document.querySelector(".site-header");
const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 20);
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

/* ---------- Scroll-reveal (IntersectionObserver) ---------------------- */
const revealEls = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("is-visible"));
}

/* ---------- Safety net: never leave content permanently hidden -------- */
window.addEventListener("load", () => {
  // reveal anything already on-screen quickly…
  setTimeout(() => {
    document.querySelectorAll(".reveal:not(.is-visible)").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 1.1) el.classList.add("is-visible");
    });
  }, 600);
  // …and, as a last-resort safety net, never leave content hidden if the
  // observer failed to fire for any reason.
  setTimeout(() => {
    document.querySelectorAll(".reveal:not(.is-visible)").forEach((el) => el.classList.add("is-visible"));
  }, 2500);
});

/* ---------- Scrollspy: highlight the active chapter on the rail -------- */
const railLinks = Array.from(document.querySelectorAll(".rail a"));
const spyTargets = [
  { id: "hero", el: document.querySelector(".hero") },
  { id: "about", el: document.getElementById("about") },
  { id: "interests", el: document.getElementById("interests") },
  { id: "connect", el: document.getElementById("connect") },
].filter((t) => t.el);
if (railLinks.length && "IntersectionObserver" in window) {
  const setActive = (id) => {
    railLinks.forEach((a) => a.classList.toggle("is-active", a.dataset.rail === id));
  };
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const match = spyTargets.find((t) => t.el === e.target);
          if (match) setActive(match.id);
        }
      });
    },
    { rootMargin: "-45% 0px -45% 0px" }
  );
  spyTargets.forEach((t) => spy.observe(t.el));
  setActive("hero");
}

/* ---------- Animated stat counter ------------------------------------- */
function animateCount(el) {
  const target = parseInt(el.dataset.count, 10);
  const suffix = el.dataset.suffix || "";
  if (!motionEnabled) {
    el.textContent = target + suffix;
    return;
  }
  const duration = 1200;
  const start = performance.now();
  const step = (now) => {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * eased) + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const counters = document.querySelectorAll(".stat-num[data-count]");
if ("IntersectionObserver" in window) {
  const co = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          animateCount(e.target);
          co.unobserve(e.target);
        }
      });
    },
    { threshold: 0.6 }
  );
  counters.forEach((el) => co.observe(el));
} else {
  counters.forEach((el) => (el.textContent = el.dataset.count + (el.dataset.suffix || "")));
}

/* ---------- 3D tilt on interest cards (pointer + reduced-motion safe) -- */
const tiltCards = document.querySelectorAll(".tilt");
const MAX_TILT = 9;
function bindTilt(card) {
  let raf = null;
  const onMove = (ev) => {
    if (!motionEnabled) return;
    const r = card.getBoundingClientRect();
    const px = (ev.clientX - r.left) / r.width - 0.5;
    const py = (ev.clientY - r.top) / r.height - 0.5;
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      card.style.transform =
        `perspective(800px) rotateX(${(-py * MAX_TILT).toFixed(2)}deg) ` +
        `rotateY(${(px * MAX_TILT).toFixed(2)}deg) translateY(-4px)`;
    });
  };
  const reset = () => {
    if (raf) cancelAnimationFrame(raf);
    card.style.transform = "";
  };
  card.addEventListener("pointermove", onMove);
  card.addEventListener("pointerleave", reset);
}
tiltCards.forEach(bindTilt);

/* ---------- Scroll progress (JS fallback when no scroll-timeline) ------ */
const progressBar = document.querySelector(".scroll-progress");
const supportsScrollTimeline = CSS.supports && CSS.supports("animation-timeline: scroll()");
if (progressBar && !supportsScrollTimeline) {
  const updateProgress = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    h.style.setProperty("--scroll-progress", max > 0 ? (h.scrollTop / max).toFixed(4) : "0");
  };
  updateProgress();
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress, { passive: true });
}

/* ---------- Cursor-follow aurora glow --------------------------------- */
const aurora = document.querySelector(".cursor-aurora");
const finePointer = window.matchMedia("(pointer: fine)").matches;
if (aurora && finePointer) {
  let ax = window.innerWidth / 2, ay = window.innerHeight / 2;
  let tx = ax, ty = ay, raf = null;
  const render = () => {
    ax += (tx - ax) * 0.12;
    ay += (ty - ay) * 0.12;
    aurora.style.setProperty("--cx", ax + "px");
    aurora.style.setProperty("--cy", ay + "px");
    if (Math.abs(tx - ax) > 0.5 || Math.abs(ty - ay) > 0.5) {
      raf = requestAnimationFrame(render);
    } else {
      raf = null;
    }
  };
  window.addEventListener("pointermove", (e) => {
    if (!motionEnabled) return;
    tx = e.clientX;
    ty = e.clientY;
    if (!raf) raf = requestAnimationFrame(render);
  }, { passive: true });
}

/* ---------- Magnetic buttons ------------------------------------------ */
const magnets = document.querySelectorAll(".btn");
magnets.forEach((el) => {
  el.addEventListener("pointermove", (e) => {
    if (!motionEnabled || !finePointer) return;
    const r = el.getBoundingClientRect();
    const mx = e.clientX - r.left - r.width / 2;
    const my = e.clientY - r.top - r.height / 2;
    el.style.transform = `translate(${(mx * 0.25).toFixed(1)}px, ${(my * 0.35).toFixed(1)}px)`;
  });
  el.addEventListener("pointerleave", () => { el.style.transform = ""; });
});

/* ---------- Smooth momentum scroll (Lenis-style) ----------------------
   The page content is translated by an eased scroll value for that buttery,
   "weighted" feel. Native scrollbar + keyboard scroll still drive it, and it
   is gated to fine pointers + motion-on so touch and reduced-motion users get
   plain native scrolling. ------------------------------------------------ */
let _smoothOn = false;
let _smoothY = window.scrollY;
function getScroll() { return _smoothOn ? _smoothY : window.scrollY; }

const smoothWrap = document.getElementById("smooth-wrap");
let smoothRAF = null;
const canSmooth = () =>
  (window.matchMedia("(pointer: fine)").matches || location.search.indexOf("forcesmooth") >= 0) &&
  location.search.indexOf("nosmooth") < 0;

function measureSmoothHeight() {
  if (smoothWrap) document.body.style.height = smoothWrap.scrollHeight + "px";
}
function smoothLoop() {
  const target = window.scrollY;
  _smoothY += (target - _smoothY) * 0.09;
  if (Math.abs(target - _smoothY) < 0.06) _smoothY = target;
  smoothWrap.style.transform = "translate3d(0," + (-_smoothY).toFixed(2) + "px,0)";
  smoothRAF = requestAnimationFrame(smoothLoop);
}
function enableSmooth() {
  if (_smoothOn || !smoothWrap || !canSmooth()) return;
  _smoothOn = true;
  _smoothY = window.scrollY;
  smoothWrap.classList.add("is-smooth");
  measureSmoothHeight();
  smoothLoop();
}
function disableSmooth() {
  if (!_smoothOn) return;
  _smoothOn = false;
  if (smoothRAF) cancelAnimationFrame(smoothRAF);
  smoothRAF = null;
  smoothWrap.classList.remove("is-smooth");
  smoothWrap.style.transform = "";
  document.body.style.height = "";
}
window.addEventListener("resize", () => { if (_smoothOn) measureSmoothHeight(); });
window.addEventListener("load", () => { if (_smoothOn) measureSmoothHeight(); });

// keep keyboard focus on-screen while smooth scroll is active (a11y)
document.addEventListener("focusin", (e) => {
  if (!_smoothOn) return;
  const el = e.target;
  if (!el || !el.getBoundingClientRect) return;
  const r = el.getBoundingClientRect();
  if (r.top < 90 || r.bottom > window.innerHeight) {
    window.scrollTo({ top: Math.max(0, r.top + _smoothY - window.innerHeight * 0.35) });
  }
});

// smooth in-page anchor navigation
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const href = a.getAttribute("href");
    if (!href || href.length < 2) return;
    const id = href.slice(1);
    // "#top" targets the fixed header, so just go to the very top of the page
    if (id === "top") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: _smoothOn ? "auto" : "smooth" });
      return;
    }
    const el = document.getElementById(id);
    if (!el || !_smoothOn) return;
    e.preventDefault();
    window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + _smoothY - 70) });
  });
});

/* ---------- Custom cursor (fine pointers, motion on) ------------------ */
const cursorEl = document.querySelector(".cursor");
if (cursorEl && finePointer) {
  let cx = window.innerWidth / 2, cy = window.innerHeight / 2, tx = cx, ty = cy, craf = null;
  const drawCursor = () => {
    cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
    cursorEl.style.transform = "translate3d(" + cx.toFixed(1) + "px," + cy.toFixed(1) + "px,0)";
    craf = (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) ? requestAnimationFrame(drawCursor) : null;
  };
  window.addEventListener("pointermove", (e) => {
    if (!motionEnabled) return;
    document.body.classList.add("cursor-active");
    tx = e.clientX; ty = e.clientY;
    if (!craf) craf = requestAnimationFrame(drawCursor);
  }, { passive: true });
  document.querySelectorAll("a, button, .card, .link-card").forEach((el) => {
    el.addEventListener("pointerenter", () => document.body.classList.add("cursor-hover"));
    el.addEventListener("pointerleave", () => document.body.classList.remove("cursor-hover"));
  });
  document.addEventListener("pointerleave", () => document.body.classList.remove("cursor-active"));
}

/* =========================================================================
   Immersive 3D background — a living network constellation that fills the
   view, reacts to the cursor, and glides on scroll. Motion-aware.
   ========================================================================= */
const canvas = document.getElementById("bg-canvas");
let three = null; // holds renderer/scene refs so we can pause/dispose

function supportsWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
  } catch (_) {
    return false;
  }
}

/* Soft radial sprite texture (used for the glowing core + dust) */
function makeGlowTexture() {
  const s = 128;
  const cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const ctx = cv.getContext("2d");
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(235,242,255,1)");
  g.addColorStop(0.25, "rgba(150,180,240,0.85)");
  g.addColorStop(0.55, "rgba(79,123,224,0.35)");
  g.addColorStop(1, "rgba(79,123,224,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(cv);
  return tex;
}

function initThree() {
  if (three || !THREE || !supportsWebGL()) return;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05080f, 0.026);

  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0, 32);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (_) {
    return; // leave CSS fallback in place
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;

  const reduced = window.innerWidth < 720;
  const glowTex = makeGlowTexture();

  /* ---------- World group (everything parallaxes together) ---------- */
  const world = new THREE.Group();
  scene.add(world);

  /* ---------- Immersive network constellation ----------------------------
     A living, ambient web of connected nodes that fills the whole view —
     evokes networks, connectivity and data flow (a cybersecurity leader's
     world), and gives the page its immersive depth. ----------------------- */
  const field = new THREE.Group();
  world.add(field);

  const NODES = reduced ? 130 : 320;
  const SX = 120, SY = 78, SZ = 72;
  const npos = new Float32Array(NODES * 3);
  const nph = new Float32Array(NODES);      // per-node phase for idle drift

  // FORMATIONS the field morphs between as you scroll (fly-through scenes):
  // 0 cloud (hero) → 1 sphere shell (about) → 2 grid plane (interests) → 3 vortex (connect)
  const FORMS = 4;
  const F = [];
  for (let k = 0; k < FORMS; k++) F.push(new Float32Array(NODES * 3));
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  const cols = Math.ceil(Math.sqrt(NODES));
  for (let i = 0; i < NODES; i++) {
    nph[i] = Math.random() * Math.PI * 2;
    // 0 — deep-space cloud
    F[0][i * 3]     = (Math.random() - 0.5) * SX;
    F[0][i * 3 + 1] = (Math.random() - 0.5) * SY;
    F[0][i * 3 + 2] = (Math.random() - 0.5) * SZ - 6;
    // 1 — sphere shell (fibonacci)
    const y = 1 - (i / (NODES - 1)) * 2;
    const rr = Math.sqrt(Math.max(0, 1 - y * y));
    const th = GOLDEN * i;
    F[1][i * 3]     = Math.cos(th) * rr * 30;
    F[1][i * 3 + 1] = y * 26;
    F[1][i * 3 + 2] = Math.sin(th) * rr * 30;
    // 2 — grid plane
    F[2][i * 3]     = ((i % cols) / (cols - 1) - 0.5) * SX * 0.96;
    F[2][i * 3 + 1] = (Math.floor(i / cols) / (cols - 1) - 0.5) * SY * 0.96;
    F[2][i * 3 + 2] = (Math.random() - 0.5) * 7;
    // 3 — vortex / helix
    const tt = i / NODES;
    const ang = tt * Math.PI * 9;
    const vr = 7 + tt * 30;
    F[3][i * 3]     = Math.cos(ang) * vr;
    F[3][i * 3 + 1] = (tt - 0.5) * SY * 1.15;
    F[3][i * 3 + 2] = Math.sin(ang) * vr;
    // start at the cloud
    npos[i * 3] = F[0][i * 3]; npos[i * 3 + 1] = F[0][i * 3 + 1]; npos[i * 3 + 2] = F[0][i * 3 + 2];
  }
  // nrender = what's drawn (morph base npos + eased cursor displacement ndisp)
  const nrender = new Float32Array(npos);
  const ndisp = new Float32Array(NODES * 3);
  const nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute("position", new THREE.BufferAttribute(nrender, 3).setUsage(THREE.DynamicDrawUsage));
  const nodePoints = new THREE.Points(nodeGeo, new THREE.PointsMaterial({
    map: glowTex, color: 0x7a98dc, size: 1.6, sizeAttenuation: true,
    transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  field.add(nodePoints);

  // dynamic links between nearby nodes — vertex-coloured so they fade with
  // distance (additive blending makes dimmer = fainter). This is the organic,
  // breathing web from the original concept, now larger and layered.
  const CONNECT = 13;
  const MAX_SEG = NODES * 16;
  const linePos = new Float32Array(MAX_SEG * 6);
  const lineCol = new Float32Array(MAX_SEG * 6);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3).setUsage(THREE.DynamicDrawUsage));
  lineGeo.setAttribute("color", new THREE.BufferAttribute(lineCol, 3).setUsage(THREE.DynamicDrawUsage));
  const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.8,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  field.add(lines);

  // link colour state — additive bright on dark, navy-on-light otherwise
  let LITE = false;
  const LBG = [0.93, 0.945, 0.97];   // light background rgb
  const LN = [0.10, 0.20, 0.45];     // navy "near" rgb for light mode

  const CONNECT2 = CONNECT * CONNECT;
  function rebuildLinks() {
    let v = 0;
    for (let i = 0; i < NODES; i++) {
      const ax = nrender[i * 3], ay = nrender[i * 3 + 1], az = nrender[i * 3 + 2];
      for (let j = i + 1; j < NODES; j++) {
        const dx = ax - nrender[j * 3], dy = ay - nrender[j * 3 + 1], dz = az - nrender[j * 3 + 2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < CONNECT2 && v < MAX_SEG) {
          const f = 1 - Math.sqrt(d2) / CONNECT;       // 0..1 closeness
          let r, g, b;
          if (LITE) {                                  // fade navy toward bg
            r = LBG[0] + (LN[0] - LBG[0]) * f;
            g = LBG[1] + (LN[1] - LBG[1]) * f;
            b = LBG[2] + (LN[2] - LBG[2]) * f;
          } else {                                     // additive brightness
            r = 0.30 * f; g = 0.46 * f; b = 0.85 * f;
          }
          const o = v * 6;
          linePos[o] = ax; linePos[o + 1] = ay; linePos[o + 2] = az;
          linePos[o + 3] = nrender[j * 3]; linePos[o + 4] = nrender[j * 3 + 1]; linePos[o + 5] = nrender[j * 3 + 2];
          lineCol[o] = r; lineCol[o + 1] = g; lineCol[o + 2] = b;
          lineCol[o + 3] = r; lineCol[o + 4] = g; lineCol[o + 5] = b;
          v++;
        }
      }
    }
    lineGeo.setDrawRange(0, v * 2);
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate = true;
  }

  // a reusable point used to repel nodes away from the cursor (in field space)
  const cursorLocal = new THREE.Vector3();
  const REPEL = 16, REPEL2 = REPEL * REPEL;

  rebuildLinks();

  /* ---------- Silver-blue dust particle field (depth-faded by fog) ---------- */
  const DUST = reduced ? 320 : 700;
  const dpos = new Float32Array(DUST * 3);
  const dvel = new Float32Array(DUST);
  const R = 60;
  for (let i = 0; i < DUST; i++) {
    dpos[i * 3] = (Math.random() - 0.5) * R * 2;
    dpos[i * 3 + 1] = (Math.random() - 0.5) * R * 1.2;
    dpos[i * 3 + 2] = (Math.random() - 0.5) * R * 2;
    dvel[i] = 0.002 + Math.random() * 0.004;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dpos, 3));
  const dustMat = new THREE.PointsMaterial({
    map: glowTex,
    color: 0x586fb8,
    size: 0.7,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  /* ---------- Distant starfield for depth ---------- */
  const STARS = 260;
  const spos = new Float32Array(STARS * 3);
  for (let i = 0; i < STARS; i++) {
    const r = 90 + Math.random() * 60;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    spos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    spos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    spos[i * 3 + 2] = r * Math.cos(ph);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(spos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xdfe9ff, size: 0.5, transparent: true, opacity: 0.55, depthWrite: false,
  }));
  stars.material.fog = false;
  scene.add(stars);

  /* ---------- Pointer parallax + scroll ---------- */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener("pointermove", (e) => {
    pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  let scrollY = window.scrollY;
  window.addEventListener("scroll", () => (scrollY = window.scrollY), { passive: true });

  // scroll-velocity "energy": fast scrolling charges the field + bloom
  let energy = 0, prevSp = 0;

  /* ---------- Cinematic post-processing: custom bloom + vignette + grain ----
     A hand-rolled pipeline (core Three only, so it still runs on file://):
     render scene → bright-pass → separable blur (ping-pong) → composite.
     Used in dark mode (additive glow); light mode renders directly. --------- */
  const QUAD = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  const postScene = new THREE.Scene();
  postScene.add(QUAD);
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const VERT = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";

  const brightMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, threshold: { value: 0.22 } },
    vertexShader: VERT,
    fragmentShader:
      "uniform sampler2D tDiffuse; uniform float threshold; varying vec2 vUv;" +
      "void main(){ vec3 c=texture2D(tDiffuse,vUv).rgb; float l=dot(c,vec3(0.299,0.587,0.114));" +
      "float k=smoothstep(threshold,threshold+0.35,l); gl_FragColor=vec4(c*k,1.0); }",
  });
  const blurMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() } },
    vertexShader: VERT,
    fragmentShader:
      "uniform sampler2D tDiffuse; uniform vec2 dir; varying vec2 vUv;" +
      "void main(){ vec3 s=texture2D(tDiffuse,vUv).rgb*0.227027;" +
      "s+=texture2D(tDiffuse,vUv+dir*1.3846).rgb*0.316216;" +
      "s+=texture2D(tDiffuse,vUv-dir*1.3846).rgb*0.316216;" +
      "s+=texture2D(tDiffuse,vUv+dir*3.2307).rgb*0.070270;" +
      "s+=texture2D(tDiffuse,vUv-dir*3.2307).rgb*0.070270;" +
      "gl_FragColor=vec4(s,1.0); }",
  });
  const compMat = new THREE.ShaderMaterial({
    uniforms: {
      tScene: { value: null }, tBloom: { value: null },
      strength: { value: 1.15 }, time: { value: 0 }, res: { value: new THREE.Vector2() },
    },
    vertexShader: VERT,
    fragmentShader:
      "uniform sampler2D tScene; uniform sampler2D tBloom; uniform float strength;" +
      "uniform float time; uniform vec2 res; varying vec2 vUv;" +
      "float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }" +
      "void main(){ vec3 col=texture2D(tScene,vUv).rgb + texture2D(tBloom,vUv).rgb*strength;" +
      "vec2 q=vUv-0.5; float vig=smoothstep(1.05,0.30,length(q)); col*=mix(0.62,1.0,vig);" +  // vignette / depth
      "float g=hash(vUv*res+fract(time))*0.06-0.03; col+=g;" +                                 // film grain
      "gl_FragColor=vec4(col,1.0); }",
  });

  let rtScene, rtA, rtB;
  const dbSize = new THREE.Vector2();
  function buildTargets() {
    renderer.getDrawingBufferSize(dbSize);
    const w = Math.max(2, dbSize.x), h = Math.max(2, dbSize.y);
    const bw = Math.max(2, Math.floor(w * 0.5)), bh = Math.max(2, Math.floor(h * 0.5));
    if (rtScene) { rtScene.dispose(); rtA.dispose(); rtB.dispose(); }
    rtScene = new THREE.WebGLRenderTarget(w, h);
    rtA = new THREE.WebGLRenderTarget(bw, bh);
    rtB = new THREE.WebGLRenderTarget(bw, bh);
    compMat.uniforms.res.value.set(bw, bh);
  }
  buildTargets();

  function renderBloom() {
    renderer.setClearColor(0x05070f, 1);
    renderer.setRenderTarget(rtScene);
    renderer.clear();
    renderer.render(scene, camera);
    // bright pass
    QUAD.material = brightMat;
    brightMat.uniforms.tDiffuse.value = rtScene.texture;
    renderer.setRenderTarget(rtA);
    renderer.render(postScene, postCam);
    // separable blur, a few iterations for a wide, soft bloom
    QUAD.material = blurMat;
    const bw = rtA.width, bh = rtA.height;
    for (let p = 0; p < 3; p++) {
      const spread = 1 + p;
      blurMat.uniforms.tDiffuse.value = rtA.texture;
      blurMat.uniforms.dir.value.set(spread / bw, 0);
      renderer.setRenderTarget(rtB);
      renderer.render(postScene, postCam);
      blurMat.uniforms.tDiffuse.value = rtB.texture;
      blurMat.uniforms.dir.value.set(0, spread / bh);
      renderer.setRenderTarget(rtA);
      renderer.render(postScene, postCam);
    }
    // composite to screen
    QUAD.material = compMat;
    compMat.uniforms.tScene.value = rtScene.texture;
    compMat.uniforms.tBloom.value = rtA.texture;
    compMat.uniforms.strength.value = 1.15 + energy * 0.5;   // bloom flares with scroll energy
    compMat.uniforms.time.value = t;
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCam);
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    buildTargets();
  }
  window.addEventListener("resize", onResize);

  /* ---------- Render ---------- */
  let frame = null;
  let t = 0;

  let camX = 0, camY = 0, camZ = 40;
  function renderFrame() {
    pointer.x += (pointer.tx - pointer.x) * 0.045;
    pointer.y += (pointer.ty - pointer.y) * 0.045;

    // scroll progress 0..3 across the four fly-through scenes
    const sp = Math.min(getScroll() / Math.max(window.innerHeight, 1), 3);
    const seg = Math.min(Math.floor(sp), FORMS - 2);
    const raw = sp - seg;
    const e = raw * raw * (3 - 2 * raw);          // smoothstep blend
    const A = F[seg], B = F[seg + 1];
    energy = energy * 0.9 + Math.abs(sp - prevSp) * 7;
    energy = Math.min(energy, 1.5);
    prevSp = sp;

    // MORPH: ease each node toward the blended formation + gentle idle motion
    for (let i = 0; i < NODES; i++) {
      const o = i * 3;
      const w1 = Math.sin(t * 0.18 + nph[i]) * 0.12;
      const w2 = Math.cos(t * 0.16 + nph[i]) * 0.12;
      const tx = A[o] + (B[o] - A[o]) * e + w1;
      const ty = A[o + 1] + (B[o + 1] - A[o + 1]) * e + w2;
      const tz = A[o + 2] + (B[o + 2] - A[o + 2]) * e + w1 * 0.8;
      npos[o]     += (tx - npos[o]) * 0.06;
      npos[o + 1] += (ty - npos[o + 1]) * 0.06;
      npos[o + 2] += (tz - npos[o + 2]) * 0.06;
    }

    // CURSOR-REACTIVE: push nearby nodes away from the pointer, then let the
    // displacement spring back — the web "parts" around the cursor.
    field.updateMatrixWorld();
    const halfH = camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
    const halfW = halfH * camera.aspect;
    cursorLocal.set(pointer.x * halfW, -pointer.y * halfH, 0);
    field.worldToLocal(cursorLocal);
    for (let i = 0; i < NODES; i++) {
      const o = i * 3;
      let dx = npos[o] - cursorLocal.x;
      let dy = npos[o + 1] - cursorLocal.y;
      let dz = npos[o + 2] - cursorLocal.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < REPEL2 && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const f = (1 - d / REPEL);
        const push = f * f * 1.3;            // ease-in falloff, stronger near cursor
        ndisp[o]     += (dx / d) * push;
        ndisp[o + 1] += (dy / d) * push;
        ndisp[o + 2] += (dz / d) * push;
      }
      ndisp[o] *= 0.88; ndisp[o + 1] *= 0.88; ndisp[o + 2] *= 0.88;
      nrender[o]     = npos[o]     + ndisp[o];
      nrender[o + 1] = npos[o + 1] + ndisp[o + 1];
      nrender[o + 2] = npos[o + 2] + ndisp[o + 2];
    }
    nodeGeo.attributes.position.needsUpdate = true;
    rebuildLinks();
    field.rotation.y += 0.00005 + energy * 0.0018;   // faster scroll spins the field

    // drift dust upward, recycle
    const p = dpos;
    for (let i = 0; i < DUST; i++) {
      p[i * 3 + 1] += dvel[i];
      if (p[i * 3 + 1] > R * 0.6) p[i * 3 + 1] = -R * 0.6;
    }
    dustGeo.attributes.position.needsUpdate = true;
    dust.rotation.y += 0.00005;
    stars.rotation.y += 0.0001;

    // parallax: the whole field leans toward the pointer (immersive depth)
    world.rotation.x = pointer.y * 0.05;
    world.rotation.y = pointer.x * 0.06;

    // FLY-THROUGH camera: arc through the scene as you scroll between scenes
    camX += ((Math.sin(sp * 1.05) * 5) - camX) * 0.05;
    camY += ((sp * -0.7) - camY) * 0.05;
    camZ += ((40 - sp * 3) - camZ) * 0.05;
    camera.position.set(camX, camY, camZ);
    camera.lookAt(0, sp * 0.6, 0);
    world.position.y += ((sp * 0.6) - world.position.y) * 0.04;

    // present: cinematic bloom in dark mode, direct transparent render in light
    if (LITE) {
      renderer.setRenderTarget(null);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      renderer.render(scene, camera);
    } else {
      renderBloom();
    }
  }

  function tick() {
    t += 0.016;
    renderFrame();
    frame = requestAnimationFrame(tick);
  }

  // recolour the scene for light / dark (additive only works on a dark bg, so
  // light mode switches to normal blending with dark navy colours)
  function setScenePalette(light) {
    LITE = light;
    if (light) {
      scene.fog.color.setHex(0xdfe4f0);
      nodePoints.material.blending = THREE.NormalBlending;
      nodePoints.material.color.setHex(0x1f3a82);
      nodePoints.material.opacity = 0.9;
      lines.material.blending = THREE.NormalBlending;
      lines.material.opacity = 0.95;
      dust.material.blending = THREE.NormalBlending;
      dust.material.color.setHex(0x4a63a0);
      dust.material.opacity = 0.3;
      stars.material.opacity = 0.0;
    } else {
      scene.fog.color.setHex(0x05080f);
      nodePoints.material.blending = THREE.AdditiveBlending;
      nodePoints.material.color.setHex(0x7a98dc);
      nodePoints.material.opacity = 0.92;
      lines.material.blending = THREE.AdditiveBlending;
      lines.material.opacity = 0.8;
      dust.material.blending = THREE.AdditiveBlending;
      dust.material.color.setHex(0x586fb8);
      dust.material.opacity = 0.75;
      stars.material.opacity = 0.55;
    }
    nodePoints.material.needsUpdate = true;
    lines.material.needsUpdate = true;
    dust.material.needsUpdate = true;
    stars.material.needsUpdate = true;
  }
  setScenePalette(isLight());

  three = {
    start() { if (!frame) tick(); },
    stop() { if (frame) cancelAnimationFrame(frame); frame = null; renderFrame(); },
    renderStatic() { renderFrame(); },
    setPalette: setScenePalette,
  };
}

/* ---------- Apply / toggle motion ------------------------------------- */
function applyMotion() {
  document.body.classList.toggle("motion-off", !motionEnabled);

  if (motionEnabled) {
    initThree();
    if (three) three.start();
    canvas.style.display = "";
    enableSmooth();
  } else {
    if (three) three.stop();        // freeze a static constellation frame
    // keep the canvas visible as a still image; CSS gradient sits behind it
    disableSmooth();
    document.body.classList.remove("cursor-active", "cursor-hover");
  }
  updateToggleUI();
}

/* ---------- Motion toggle button -------------------------------------- */
const toggle = document.getElementById("motion-toggle");
function updateToggleUI() {
  toggle.setAttribute("aria-pressed", String(!motionEnabled));
  toggle.querySelector("strong").textContent = motionEnabled ? "On" : "Off";
}
toggle.addEventListener("click", () => {
  motionEnabled = !motionEnabled;
  localStorage.setItem(STORAGE_KEY, motionEnabled ? "on" : "off");
  applyMotion();
});

// React if the OS preference changes and the user hasn't set an explicit choice.
prefersReduced.addEventListener("change", (e) => {
  if (!localStorage.getItem(STORAGE_KEY)) {
    motionEnabled = !e.matches;
    applyMotion();
  }
});

/* ---------- Theme: system / light / dark (system is the default) ------ */
const THEME_KEY = "prite-theme";
const themeToggle = document.getElementById("theme-toggle");
const prefersLight = window.matchMedia("(prefers-color-scheme: light)");
function currentMode() {
  const m = document.documentElement.getAttribute("data-theme-mode");
  return (m === "light" || m === "dark") ? m : "system";
}
function applyThemeMode(mode, store) {
  document.documentElement.setAttribute("data-theme-mode", mode);
  const theme = mode === "system" ? (prefersLight.matches ? "light" : "dark") : mode;
  document.documentElement.setAttribute("data-theme", theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
    if (bg) meta.setAttribute("content", bg);
  }
  const label = mode.charAt(0).toUpperCase() + mode.slice(1);
  if (themeToggle) themeToggle.setAttribute("aria-label", "Theme: " + label + " (activate to change)");
  if (three && three.setPalette) { three.setPalette(theme === "light"); three.renderStatic(); }
  if (store) { try { localStorage.setItem(THEME_KEY, mode); } catch (e) {} }
}
applyThemeMode(currentMode(), false);
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const order = ["system", "light", "dark"];
    applyThemeMode(order[(order.indexOf(currentMode()) + 1) % 3], true);
  });
}
prefersLight.addEventListener("change", () => { if (currentMode() === "system") applyThemeMode("system", false); });

/* ---------- Text size control (accessibility) ------------------------- */
const TS_KEY = "prite-textsize";
const textToggle = document.getElementById("text-toggle");
const TS_STEPS = ["", "lg", "xl"];
const TS_LABELS = { "": "Normal", "lg": "Large", "xl": "Larger" };
function applyTextSize(step, store) {
  if (step) document.documentElement.setAttribute("data-text", step);
  else document.documentElement.removeAttribute("data-text");
  if (textToggle) textToggle.setAttribute("aria-label", "Text size: " + (TS_LABELS[step] || "Normal") + " (activate to change)");
  if (store) { try { localStorage.setItem(TS_KEY, step); } catch (e) {} }
  if (typeof _smoothOn !== "undefined" && _smoothOn && typeof measureSmoothHeight === "function") measureSmoothHeight();
}
applyTextSize(document.documentElement.getAttribute("data-text") || "", false);
if (textToggle) {
  textToggle.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-text") || "";
    applyTextSize(TS_STEPS[(TS_STEPS.indexOf(cur) + 1) % TS_STEPS.length], true);
  });
}

// Pause the loop when the tab is hidden (battery / CPU friendly).
document.addEventListener("visibilitychange", () => {
  if (!three) return;
  if (document.hidden) three.stop();
  else if (motionEnabled) three.start();
});

/* ---------- Boot ------------------------------------------------------ */
applyMotion();

})();
