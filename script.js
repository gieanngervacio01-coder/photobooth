let shots = 4;
const COUNTDOWN_SECONDS = 3;

const video = document.getElementById("video");
const boothView = document.getElementById("boothView");
const countdownEl = document.getElementById("countdown");
const flashEl = document.getElementById("flash");
const startBtn = document.getElementById("startBtn");
const statusEl = document.getElementById("status");
const optionsEl = document.getElementById("options");
const colorBox = document.getElementById("colorBox");
const dots = document.querySelectorAll("#dots span");
const resultBox = document.getElementById("resultBox");
const strip = document.getElementById("strip");
const downloadBtn = document.getElementById("downloadBtn");
const retakeBtn = document.getElementById("retakeBtn");
const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");
const slotBtn = document.getElementById("slotBtn");
const slotText = document.getElementById("slotText");
const printOut = document.getElementById("printOut");
const resultBtns = document.getElementById("resultBtns");

let currentTheme = "classic";
let currentFilter = "none";
let currentFx = "";
let currentBg = "#ffffff";
let currentInk = "#ff5c8a";

const SHOTS_PER_THEME = { classic: 4, ticket: 4, polka: 3, green: 3, special: 3, spidey: 3 };

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

if (document.fonts) {
  document.fonts.load('60px "Kaushan Script"');
  document.fonts.load("60px Bangers");
}

menuBtn.addEventListener("click", () => {
  navLinks.classList.toggle("open");
});

navLinks.querySelectorAll("a").forEach((a) => {
  a.addEventListener("click", () => navLinks.classList.remove("open"));
});

document.querySelectorAll("#themes .chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelector("#themes .chip.active").classList.remove("active");
    chip.classList.add("active");
    currentTheme = chip.dataset.theme;
    shots = SHOTS_PER_THEME[currentTheme];
    dots.forEach((dot, i) => {
      dot.style.display = i < shots ? "" : "none";
    });
    colorBox.classList.toggle("hidden", currentTheme !== "classic");
  });
});

function applyPreview() {
  video.style.filter = "none";
  requestAnimationFrame(() => {
    video.style.filter = currentFilter;
  });
  boothView.dataset.fx = currentFx;
}

document.querySelectorAll("#filters .chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelector("#filters .chip.active").classList.remove("active");
    chip.classList.add("active");
    currentFilter = chip.dataset.filter;
    currentFx = chip.dataset.fx || "";
    applyPreview();
  });
});

document.querySelectorAll(".swatch").forEach((sw) => {
  sw.addEventListener("click", () => {
    document.querySelector(".swatch.active").classList.remove("active");
    sw.classList.add("active");
    currentBg = sw.dataset.bg;
    currentInk = sw.dataset.ink;
  });
});

async function initCamera() {
  try {
    video.addEventListener("loadedmetadata", () => {
      statusEl.textContent = "Ready when you are (camera " + video.videoWidth + "x" + video.videoHeight + ")";
    });
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    });
    video.srcObject = stream;
  } catch (err) {
    statusEl.textContent = "Can't access the camera. Please allow permission.";
    startBtn.disabled = true;
  }
}

async function runCountdown() {
  for (let i = COUNTDOWN_SECONDS; i > 0; i--) {
    countdownEl.textContent = i;
    countdownEl.classList.remove("pop");
    void countdownEl.offsetWidth;
    countdownEl.classList.add("pop");
    await sleep(1000);
  }
  countdownEl.textContent = "";
}

function addVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.85);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function addGrain(ctx, w, h, amount) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

function addDateStamp(ctx, w, h) {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const size = Math.round(w * 0.047);
  const margin = w * 0.033;
  ctx.font = "bold " + size + "px Courier New, monospace";
  ctx.textAlign = "right";
  ctx.fillStyle = "#ff8a1f";
  ctx.shadowColor = "rgba(255,90,0,0.6)";
  ctx.shadowBlur = size * 0.2;
  ctx.fillText("'" + yy + " " + mm + " " + dd, w - margin, h - margin);
  ctx.shadowBlur = 0;
}

const MAX_PHOTO_W = 1440; 

function captureFrame() {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const targetRatio = 4 / 3;

  let sw = vw;
  let sh = vw / targetRatio;
  if (sh > vh) {
    sh = vh;
    sw = vh * targetRatio;
  }
  const sx = (vw - sw) / 2;
  const sy = (vh - sh) / 2;

  const outW = Math.min(Math.floor(sw), MAX_PHOTO_W);
  const outH = Math.round((outW * 3) / 4);

  const c = document.createElement("canvas");
  c.width = outW;
  c.height = outH;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";

  ctx.filter = currentFilter;
  ctx.translate(outW, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, outW, outH);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = "none";

  if (currentFx === "vintage") {
    addGrain(ctx, outW, outH, 28);
    addVignette(ctx, outW, outH);
  }
  if (currentFx === "retro") {
    addDateStamp(ctx, outW, outH);
  }

  return c;
}

function doFlash() {
  flashEl.classList.remove("on");
  void flashEl.offsetWidth;
  flashEl.classList.add("on");
}

function setDots(activeIndex) {
  dots.forEach((dot, i) => {
    dot.classList.toggle("done", i < activeIndex);
    dot.classList.toggle("active", i === activeIndex);
  });
}

const QUALITY = 2;

function setupStrip(w, h) {
  strip.width = w * QUALITY;
  strip.height = h * QUALITY;
  const ctx = strip.getContext("2d");
  ctx.scale(QUALITY, QUALITY);
  return ctx;
}

function getDate(options) {
  return new Date().toLocaleDateString("en-US", options);
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawClassic(photos) {
  const pw = 600;
  const ph = 450;
  const pad = 40;
  const gap = 20;
  const footer = 110;

  const w = pw + pad * 2;
  const h = pad + photos.length * ph + (photos.length - 1) * gap + footer;

  const ctx = setupStrip(w, h);

  ctx.fillStyle = currentBg;
  ctx.fillRect(0, 0, w, h);

  photos.forEach((photo, i) => {
    ctx.drawImage(photo, pad, pad + i * (ph + gap), pw, ph);
  });

  ctx.textAlign = "center";
  ctx.fillStyle = currentInk;
  ctx.font = "bold 36px Arial";
  ctx.fillText("snapbooth", w / 2, h - 60);
  ctx.globalAlpha = 0.8;
  ctx.font = "24px Arial";
  ctx.fillText(getDate({ year: "numeric", month: "long", day: "numeric" }), w / 2, h - 25);
  ctx.globalAlpha = 1;
}

function drawTicket(photos) {
  const W = 660;
  const H = 2110;
  const BLUE = "#3a6ba5";
  const CREAM = "#fbf3e0";
  const RED = "#c0262d";

  const ctx = setupStrip(W, H);
  ctx.textAlign = "center";

  ctx.fillStyle = BLUE;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = CREAM;
  ctx.fillRect(24, 24, W - 48, H - 48);

  ctx.fillStyle = BLUE;
  for (let y = 24; y <= H - 24; y += 30) {
    ctx.beginPath();
    ctx.arc(24, y, 9, 0, Math.PI * 2);
    ctx.arc(W - 24, y, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let x = 24; x <= W - 24; x += 30) {
    ctx.beginPath();
    ctx.arc(x, 24, 9, 0, Math.PI * 2);
    ctx.arc(x, H - 24, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = RED;
  ctx.lineWidth = 3;
  ctx.strokeRect(38, 38, W - 76, H - 76);

  ctx.fillStyle = RED;
  ctx.font = "bold 70px Georgia, serif";
  ctx.fillText("MOVIE", W / 2, 120);
  ctx.font = "bold 24px Georgia, serif";
  ctx.fillText("T I C K E T S", W / 2, 155);

  ctx.strokeRect(52, 175, W - 104, 80);
  ctx.beginPath();
  ctx.moveTo(352, 175);
  ctx.lineTo(352, 255);
  ctx.moveTo(472, 175);
  ctx.lineTo(472, 255);
  ctx.stroke();

  const seat = String(Math.floor(Math.random() * 60) + 1).padStart(2, "0");
  ctx.font = "bold 24px Georgia, serif";
  ctx.fillText(getDate({ weekday: "long", month: "short", day: "numeric" }), 202, 225);
  ctx.font = "bold 16px Georgia, serif";
  ctx.fillText("ROW", 412, 200);
  ctx.fillText("SEAT", 556, 200);
  ctx.font = "bold 32px Georgia, serif";
  ctx.fillText("01", 412, 238);
  ctx.fillText(seat, 556, 238);

  const pw = 520;
  const ph = 390;
  const px = (W - pw) / 2;
  photos.forEach((photo, i) => {
    const py = 285 + i * (ph + 18);
    ctx.fillStyle = RED;
    ctx.fillRect(px - 6, py - 6, pw + 12, ph + 12);
    ctx.drawImage(photo, px, py, pw, ph);
  });

  ctx.fillStyle = BLUE;
  ctx.font = "bold 16px Arial";
  ctx.fillText("THANK YOU * SEE YOU AGAIN * THANK YOU", W / 2, 1960);
  ctx.strokeStyle = RED;
  ctx.strokeRect(52, 1978, W - 104, 90);
  ctx.fillStyle = RED;
  ctx.font = "bold 50px Georgia, serif";
  ctx.fillText("SNAPBOOTH", W / 2, 2042);
}

function drawStar(ctx, cx, cy, r, fill) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 5]);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPolka(photos) {
  const W = 660;
  const H = 1560;
  const CREAM = "#fff3df";
  const MAROON = "#8b1c2c";
  const RED = "#b22234";

  const ctx = setupStrip(W, H);
  ctx.textAlign = "center";

  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = MAROON;
  let row = 0;
  for (let y = 40; y < H; y += 44) {
    const offset = row % 2 === 0 ? 0 : 22;
    for (let x = 20 + offset; x < W; x += 44) {
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    row++;
  }

  ctx.fillStyle = MAROON;
  for (let x = 0; x < W; x += 30) {
    ctx.beginPath();
    ctx.arc(x + 15, 0, 17, 0, Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 15, H, 17, Math.PI, Math.PI * 2);
    ctx.fill();
  }

  const pw = 500;
  const ph = 375;
  const px = (W - pw) / 2;
  photos.forEach((photo, i) => {
    const py = 110 + i * (ph + 40);
    ctx.fillStyle = RED;
    ctx.fillRect(px - 16, py - 16, pw + 32, ph + 32);
    ctx.drawImage(photo, px, py, pw, ph);
  });

  drawStar(ctx, 600, 130, 42, RED);
  drawStar(ctx, 70, 500, 46, RED);
  drawStar(ctx, 590, 900, 42, RED);

  ctx.fillStyle = "#e9dfc9";
  ctx.fillRect(100, 1355, 400, 48);
  ctx.fillRect(80, 1410, 360, 48);
  ctx.fillStyle = "#333";
  ctx.font = "bold 30px Courier New, monospace";
  ctx.textAlign = "left";
  ctx.fillText("dream a little,", 112, 1390);
  ctx.fillText("dream of me", 92, 1445);
}

function drawButton(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  const d = r * 0.22;
  [[-d, -d], [d, -d], [-d, d], [d, d]].forEach((p) => {
    ctx.beginPath();
    ctx.arc(x + p[0], y + p[1], r * 0.1, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawFlower(ctx, x, y, s, petal, center) {
  ctx.fillStyle = petal;
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const a = ((Math.PI * 2) / 5) * i;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * s * 0.5, y + Math.sin(a) * s * 0.5, s * 0.32, s * 0.2, a, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = center;
  ctx.beginPath();
  ctx.arc(x, y, s * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawGreen(photos) {
  const W = 660;
  const H = 1560;
  const GREEN = "#9bb86d";

  const ctx = setupStrip(W, H);
  ctx.textAlign = "center";

  ctx.fillStyle = "#eef4e4";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(143,170,110,0.35)";
  for (let x = 0; x < W; x += 44) ctx.fillRect(x, 0, 22, H);
  for (let y = 0; y < H; y += 44) ctx.fillRect(0, y, W, 22);

  ctx.fillStyle = "#6f7a8e";
  ctx.fillRect(0, 1360, W, H - 1360);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  for (let x = -200; x < W; x += 10) {
    ctx.beginPath();
    ctx.moveTo(x, 1360);
    ctx.lineTo(x + (H - 1360), H);
    ctx.stroke();
  }

  const pw = 500;
  const ph = 375;
  const px = (W - pw) / 2;
  photos.forEach((photo, i) => {
    const py = 110 + i * (ph + 45);
    ctx.fillStyle = GREEN;
    ctx.fillRect(px - 16, py - 16, pw + 32, ph + 32);
    ctx.strokeStyle = "#f4f1e0";
    ctx.lineWidth = 4;
    ctx.strokeRect(px - 10, py - 10, pw + 20, ph + 20);
    ctx.drawImage(photo, px, py, pw, ph);

    drawButton(ctx, px + 5, py + ph + 5, 28, "#b9a77a");
    drawButton(ctx, px + 48, py + ph + 24, 20, "#5a4636");
    drawButton(ctx, px - 14, py + ph - 30, 22, "#c9d6a8");
  });

  drawFlower(ctx, 595, 125, 70, "#fbfdf2", "#e8d36a");
  drawFlower(ctx, 65, 545, 70, "#fbfdf2", "#e8d36a");
  drawFlower(ctx, 595, 965, 70, "#fbfdf2", "#e8d36a");

  ctx.fillStyle = "#f4f1e0";
  ctx.font = "italic bold 54px Georgia, serif";
  ctx.fillText("photobooth", W / 2, 1450);
  ctx.font = "26px Courier New, monospace";
  ctx.fillText(getDate({ year: "numeric", month: "long", day: "numeric" }), W / 2, 1500);
}

function drawHeartOutline(ctx, x, y, s, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, s * 0.35);
  ctx.bezierCurveTo(-s * 0.6, -s * 0.2, -s * 0.2, -s * 0.7, 0, -s * 0.25);
  ctx.bezierCurveTo(s * 0.2, -s * 0.7, s * 0.6, -s * 0.2, 0, s * 0.35);
  ctx.stroke();
  ctx.restore();
}

function drawGlass(ctx, x, y, s, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(-s * 0.42, -s * 0.6);
  ctx.lineTo(s * 0.42, -s * 0.6);
  ctx.lineTo(0, -s * 0.05);
  ctx.closePath();
  ctx.moveTo(-s * 0.22, -s * 0.38);
  ctx.lineTo(s * 0.22, -s * 0.38);
  ctx.moveTo(0, -s * 0.05);
  ctx.lineTo(0, s * 0.5);
  ctx.moveTo(-s * 0.26, s * 0.5);
  ctx.lineTo(s * 0.26, s * 0.5);
  ctx.stroke();
  ctx.restore();
}

function drawRose(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.62, 0.3, Math.PI * 1.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + r * 0.08, y, r * 0.3, 3.5, Math.PI * 2.6);
  ctx.stroke();
}

function drawBouquet(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.2);
  ctx.scale(s, s);

  ctx.beginPath();
  ctx.moveTo(-46, -55);
  ctx.lineTo(46, -55);
  ctx.lineTo(10, 90);
  ctx.lineTo(-10, 90);
  ctx.closePath();
  ctx.moveTo(-46, -55);
  ctx.lineTo(0, 5);
  ctx.lineTo(46, -55);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(-38, -78, 18, 7, -0.6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(40, -80, 18, 7, 0.6, 0, Math.PI * 2);
  ctx.stroke();

  drawRose(ctx, -20, -72, 22);
  drawRose(ctx, 22, -74, 22);
  drawRose(ctx, 0, -98, 20);
  ctx.restore();
}

function drawSpecial(photos) {
  const W = 660;
  const H = 1950;
  const MAROON = "#4d0e12";

  const ctx = setupStrip(W, H);
  ctx.textAlign = "center";

  ctx.fillStyle = MAROON;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px Arial";
  ctx.fillText("SNAPBOOTH", W / 2, 44);

  ctx.fillStyle = "#ffffff";
  roundRectPath(ctx, 24, 62, W - 48, H - 86, 26);
  ctx.fill();

  ctx.fillStyle = "#111111";
  let bx = 62;
  while (bx < 596) {
    const bw = 2 + Math.floor(Math.random() * 6);
    ctx.fillRect(bx, 92, bw, 100);
    bx += bw + 2 + Math.floor(Math.random() * 5);
  }

  const lines = [222, 1512];
  ctx.strokeStyle = MAROON;
  ctx.lineWidth = 4;
  ctx.setLineDash([14, 10]);
  lines.forEach((ly) => {
    ctx.beginPath();
    ctx.moveTo(62, ly);
    ctx.lineTo(598, ly);
    ctx.stroke();
  });
  ctx.setLineDash([]);
  ctx.fillStyle = MAROON;
  lines.forEach((ly) => {
    ctx.beginPath();
    ctx.arc(24, ly, 24, 0, Math.PI * 2);
    ctx.arc(W - 24, ly, 24, 0, Math.PI * 2);
    ctx.fill();
  });

  const pw = 520;
  const ph = 390;
  const px = (W - pw) / 2;
  photos.forEach((photo, i) => {
    ctx.drawImage(photo, px, 252 + i * (ph + 30), pw, ph);
  });

  ctx.fillStyle = MAROON;
  ctx.strokeStyle = MAROON;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.textAlign = "left";
  let size = 40;
  ctx.font = size + "px 'Kaushan Script', cursive";
  while (ctx.measureText("cheers to many more").width > 300 && size > 20) {
    size -= 1;
    ctx.font = size + "px 'Kaushan Script', cursive";
  }
  ctx.fillText("cheers to many more", 128, 1597);
  ctx.fillText("years together", 122, 1662);

  drawHeartOutline(ctx, 520, 1580, 36, -0.2);
  drawHeartOutline(ctx, 548, 1572, 30, 0.25);
  ctx.beginPath();
  ctx.moveTo(440, 1594);
  ctx.bezierCurveTo(462, 1568, 484, 1612, 506, 1592);
  ctx.moveTo(558, 1590);
  ctx.bezierCurveTo(580, 1570, 602, 1606, 628, 1586);
  ctx.stroke();

  drawGlass(ctx, 398, 1676, 76, 0.35);
  drawGlass(ctx, 482, 1676, 76, -0.35);
  ctx.beginPath();
  [[440, 1630, 440, 1612], [427, 1634, 416, 1621], [453, 1634, 464, 1621]].forEach((l) => {
    ctx.moveTo(l[0], l[1]);
    ctx.lineTo(l[2], l[3]);
  });
  ctx.stroke();

  drawBouquet(ctx, 215, 1800, 1);

  ctx.font = "bold 20px Arial";
  ctx.fillText("S N A P", 458, 1830);
  ctx.fillText("B O O T H", 458, 1858);

  ctx.fillStyle = MAROON;
  ctx.beginPath();
  ctx.arc(W / 2, H - 24, 26, 0, Math.PI * 2);
  ctx.fill();
}

function drawWeb(ctx, x, y, r, sx, sy, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, sy);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = (Math.PI / 2) * (i / (n - 1));
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.stroke();
  }
  for (let k = 1; k <= 5; k++) {
    const rr = (r * k) / 5;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (Math.PI / 2) * (i / (n - 1));
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      if (i === 0) {
        ctx.moveTo(px, py);

} else {
        const am = (Math.PI / 2) * ((i - 0.5) / (n - 1));
        ctx.quadraticCurveTo(Math.cos(am) * rr * 0.88, Math.sin(am) * rr * 0.88, px, py);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawBurst(ctx, cx, cy, rOuter, rInner, spikes, fill, stroke) {
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = (Math.PI / spikes) * i - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 6;
  ctx.lineJoin = "round";
  ctx.stroke();
}

function drawSpider(ctx, x, y, s) {
  ctx.strokeStyle = "#000";
  ctx.lineWidth = s * 0.08;
  ctx.lineCap = "round";
  [-1, 1].forEach((d) => {
    for (let i = 0; i < 4; i++) {
      const yy = y + (i - 1.5) * s * 0.18;
      ctx.beginPath();
      ctx.moveTo(x + d * s * 0.2, yy);
      ctx.lineTo(x + d * s * 0.7, yy - s * 0.25 + i * s * 0.05);
      ctx.lineTo(x + d * s * 0.95, yy + s * 0.25 + i * s * 0.1);
      ctx.stroke();
    }
  });
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.15, s * 0.28, s * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y - s * 0.3, s * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawSpidey(photos) {
  const W = 660;
  const H = 1700;
  const RED = "#d62839";
  const DARK_RED = "#a81c2b";
  const BLUE = "#1d3f9e";
  const BLACK = "#0b0b0b";
  const YELLOW = "#ffd60a";

  const ctx = setupStrip(W, H);
  ctx.textAlign = "center";

  ctx.fillStyle = RED;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = DARK_RED;
  let row = 0;
  for (let y = 12; y < H; y += 24) {
    const offset = row % 2 === 0 ? 0 : 12;
    const r = 1 + 6 * (y / H);
    for (let x = offset; x < W + 24; x += 24) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    row++;
  }

  drawWeb(ctx, 0, 0, 300, 1, 1, "rgba(255,255,255,0.55)");
  drawWeb(ctx, W, 0, 300, -1, 1, "rgba(255,255,255,0.55)");

  const pw = 480;
  const ph = 360;
  const tilts = [-0.02, 0.02, -0.02];
  photos.forEach((photo, i) => {
    const cy = 265 + i * (ph + 60) + ph / 2;
    ctx.save();
    ctx.translate(W / 2, cy);
    ctx.rotate(tilts[i] || 0);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(-pw / 2 - 18 + 12, -ph / 2 - 18 + 12, pw + 36, ph + 36);
    ctx.fillStyle = BLACK;
    ctx.fillRect(-pw / 2 - 18, -ph / 2 - 18, pw + 36, ph + 36);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-pw / 2 - 10, -ph / 2 - 10, pw + 20, ph + 20);
    ctx.drawImage(photo, -pw / 2, -ph / 2, pw, ph);
    ctx.restore();
  });

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(585, 14);
  ctx.lineTo(585, 140);
  ctx.stroke();
  drawSpider(ctx, 585, 168, 40);

  drawBurst(ctx, W / 2, 130, 112, 84, 14, YELLOW, BLACK);
  ctx.save();
  ctx.translate(W / 2, 148);
  ctx.rotate(-0.08);
  ctx.font = "58px Bangers, Impact, sans-serif";
  ctx.lineWidth = 10;
  ctx.lineJoin = "round";
  ctx.strokeStyle = BLACK;
  ctx.strokeText("THWIP!", 0, 0);
  ctx.fillStyle = RED;
  ctx.fillText("THWIP!", 0, 0);
  ctx.restore();

  ctx.fillStyle = BLUE;
  ctx.fillRect(0, 1500, W, 200);
  ctx.fillStyle = BLACK;
  ctx.fillRect(0, 1500, W, 10);
  drawWeb(ctx, 0, H, 200, 1, -1, "rgba(255,255,255,0.35)");
  drawWeb(ctx, W, H, 200, -1, -1, "rgba(255,255,255,0.35)");

  ctx.save();
  ctx.font = "76px Bangers, Impact, sans-serif";
  ctx.lineWidth = 10;
  ctx.lineJoin = "round";
  ctx.strokeStyle = BLACK;
  ctx.strokeText("WEB-SLINGER", W / 2, 1600);
  ctx.fillStyle = "#ffffff";
  ctx.fillText("WEB-SLINGER", W / 2, 1600);
  ctx.restore();
  ctx.fillStyle = YELLOW;
  ctx.font = "bold 26px Courier New, monospace";
  ctx.fillText(getDate({ month: "long", day: "numeric", year: "numeric" }), W / 2, 1655);

  ctx.strokeStyle = BLACK;
  ctx.lineWidth = 28;
  ctx.strokeRect(0, 0, W, H);
}

function buildStrip(photos) {
  if (currentTheme === "ticket") drawTicket(photos);
  else if (currentTheme === "polka") drawPolka(photos);
  else if (currentTheme === "green") drawGreen(photos);
  else if (currentTheme === "special") drawSpecial(photos);
  else if (currentTheme === "spidey") drawSpidey(photos);
  else drawClassic(photos);
}

const SOUND_ON = true;
const PRINT_SECONDS = 5;
const PRINT_STEPS = 40;
let printToken = 0;

function beep(ac, when, freq, dur) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "square";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.08, when + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(when);
  osc.stop(when + dur + 0.02);
}

function tick(ac, when) {
  const len = Math.floor(ac.sampleRate * 0.04);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 900;
  const gain = ac.createGain();
  gain.gain.value = 0.35;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  src.start(when);
}

function playPrintSound() {
  if (!SOUND_ON) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ac = new AC();
    const now = ac.currentTime;
    beep(ac, now, 880, 0.1);
    beep(ac, now + 0.15, 1175, 0.12);
    const gap = PRINT_SECONDS / PRINT_STEPS;
    for (let i = 0; i < PRINT_STEPS; i++) {
      tick(ac, now + 0.3 + i * gap);
    }
    beep(ac, now + 0.3 + PRINT_SECONDS + 0.1, 1319, 0.15);
    setTimeout(() => ac.close(), (PRINT_SECONDS + 2) * 1000);
  } catch (err) {

  }
}

function resetPrint() {
  printToken++;
  resultBox.classList.add("hidden");
  resultBtns.classList.add("hidden");
  printOut.classList.remove("printed");
  printOut.style.transition = "none";
  printOut.style.height = "0px";
  slotBtn.classList.remove("ready", "printing");
  slotBtn.disabled = true;
  slotText.textContent = "your photos come out here";
}

function readySlot() {
  slotBtn.disabled = false;
  slotBtn.classList.add("ready");
  slotText.textContent = "▼ tap here to print your photos ▼";
  slotBtn.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function printStrip() {
  if (!slotBtn.classList.contains("ready")) return;
  const token = ++printToken;

  slotBtn.classList.remove("ready");
  slotBtn.classList.add("printing");
  slotBtn.disabled = true;
  slotText.textContent = "printing...";
  statusEl.textContent = "Printing your photos...";

  resultBox.classList.remove("hidden");
  printOut.classList.remove("printed");
  printOut.style.transition = "none";
  printOut.style.height = "0px";
  void printOut.offsetHeight;
  const fullHeight = strip.offsetHeight;

  printOut.style.transition = "height " + PRINT_SECONDS + "s steps(" + PRINT_STEPS + ", end) 0.3s";
  printOut.style.height = fullHeight + "px";
  playPrintSound();
  resultBox.scrollIntoView({ behavior: "smooth", block: "start" });

  await sleep((PRINT_SECONDS + 0.5) * 1000);
  if (token !== printToken) return;

  printOut.style.transition = "none";
  printOut.classList.add("printed");
  resultBtns.classList.remove("hidden");
  slotBtn.classList.remove("printing");
  slotText.textContent = "photos printed!";
  statusEl.textContent = "Your strip is ready!";
  resultBtns.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function startSession() {
  startBtn.disabled = true;
  optionsEl.classList.add("locked");
  resetPrint();

  const photos = [];
  for (let i = 0; i < shots; i++) {
    setDots(i);
    statusEl.textContent = "Shot " + (i + 1) + " of " + shots + ", get ready!";
    await runCountdown();
    photos.push(captureFrame());
    doFlash();
    await sleep(700);
  }

  setDots(shots);
  buildStrip(photos);
  statusEl.textContent = "Done! Tap the slot to print your photos";
  readySlot();

  startBtn.disabled = false;
  optionsEl.classList.remove("locked");
}

downloadBtn.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "snapbooth-strip.png";
  link.href = strip.toDataURL("image/png");
  link.click();
});

retakeBtn.addEventListener("click", () => {
  resetPrint();
  setDots(-1);
  statusEl.textContent = "Ready when you are";
  document.getElementById("booth").scrollIntoView({ behavior: "smooth" });
});

startBtn.addEventListener("click", startSession);
slotBtn.addEventListener("click", printStrip);
initCamera();