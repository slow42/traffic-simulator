// ── Constants ────────────────────────────────────────────────
const ROAD_W         = 60;
const CAR_W          = 20;
const CAR_H          = 35;
const CANVAS_W       = 600;
const CANVAS_H       = 600;
const MENU_H         = 50;
const CENTER_X       = 300;
const CENTER_Y       = MENU_H + (CANVAS_H - MENU_H) / 2;  // 325
const INTERSECTION_R = 50;
const STOP_LINE_DIST = 58;
const BRAKE_DIST     = 130;
const APPROACH_SPEED = 1.5;
const PROCEED_SPEED  = 2.0;
const MAX_PER_ROAD   = 3;
const DASH_LEN       = 20;
const DASH_GAP       = 15;

// ── Traffic-flow constants ────────────────────────────────────
const SIM_SPEED        = 20;   // simulated minutes per real second (1 day ≈ 72 real sec)
const SIM_START_HOUR   = 5;    // clock starts at 5 AM
const BASE_FLOW        = { N: 0.8, S: 1.2, E: 0.5, W: 0.5 }; // veh per sim-hour at neutral
const RUSH_HOURS       = [
  { hour: 8,  multiplier: 2.0, bias: { N: 1.8, S: 0.5, E: 1.1, W: 1.1 } }, // morning: inbound
  { hour: 17, multiplier: 2.0, bias: { N: 0.5, S: 1.8, E: 1.1, W: 1.1 } }, // evening: outbound
];
const PEAK_WIDTH       = 1.0;  // Gaussian σ in sim-hours — controls how sharp each peak is
const ARRIVAL_NOISE    = 0.4;  // coefficient of variation on inter-arrival times (0 = uniform, 1 = very noisy)
const MIN_SPAWN_FRAMES = 60;   // safety floor: never spawn faster than this many frames apart

// Per-direction config — evaluated after constants above
const DIR_CFG = {
  N: { dx: 0,  dy:  1, stopVal: CENTER_Y - STOP_LINE_DIST,
       spawnX: CENTER_X + ROAD_W / 4, spawnY: MENU_H - CAR_H / 2 },
  S: { dx: 0,  dy: -1, stopVal: CENTER_Y + STOP_LINE_DIST,
       spawnX: CENTER_X - ROAD_W / 4, spawnY: CANVAS_H + CAR_H / 2 },
  E: { dx: -1, dy:  0, stopVal: CENTER_X + STOP_LINE_DIST,
       spawnX: CANVAS_W + CAR_H / 2, spawnY: CENTER_Y + ROAD_W / 4 },
  W: { dx:  1, dy:  0, stopVal: CENTER_X - STOP_LINE_DIST,
       spawnX: -CAR_H / 2, spawnY: CENTER_Y - ROAD_W / 4 },
};

// ── Menu config ──────────────────────────────────────────────
const BUTTONS = [
  { id: '4way',       label: '4-Way Stop'     },
  { id: 'roundabout', label: 'Roundabout'     },
  { id: 'lights',     label: 'Traffic Lights' },
];
const BTN_W = 160;
const BTN_H = 34;
const BTN_Y = MENU_H / 2;
function btnX(i) { return 20 + i * (BTN_W + 10) + BTN_W / 2; }

// ── Globals ──────────────────────────────────────────────────
let cars = [];
let activeMode = '4way';
let nextSpawn = {};
let flashMsg = '';
let flashTimer = 0;

// ── Intersection manager ─────────────────────────────────────
const intersection = {
  queue:  [],
  active: null,

  register(car) {
    this.queue.push(car);
  },

  update() {
    if (!this.active && this.queue.length > 0) {
      this.active = this.queue.shift();
      this.active.go();
    }
  },
};

// ── Car class ────────────────────────────────────────────────
class Car {
  constructor(x, y, dir) {
    this.x     = x;
    this.y     = y;
    this.dir   = dir;
    this.speed = APPROACH_SPEED;
    this.state = 'traveling';
  }

  distToStop() {
    const v = DIR_CFG[this.dir].stopVal;
    if (this.dir === 'N') return v - this.y;
    if (this.dir === 'S') return this.y - v;
    if (this.dir === 'E') return this.x - v;
    /* W */               return v - this.x;
  }

  clampToStop() {
    const v = DIR_CFG[this.dir].stopVal;
    if (this.dir === 'N' || this.dir === 'S') this.y = v;
    else                                       this.x = v;
  }

  hasCleared() {
    const m = CAR_H / 2;
    if (this.dir === 'N') return this.y  >  CENTER_Y + INTERSECTION_R + m;
    if (this.dir === 'S') return this.y  <  CENTER_Y - INTERSECTION_R - m;
    if (this.dir === 'E') return this.x  <  CENTER_X - INTERSECTION_R - m;
    /* W */               return this.x  >  CENTER_X + INTERSECTION_R + m;
  }

  isOffCanvas() {
    const m = CAR_H / 2;
    if (this.dir === 'N') return this.y - m > CANVAS_H;
    if (this.dir === 'S') return this.y + m < MENU_H;
    if (this.dir === 'E') return this.x + m < 0;
    /* W */               return this.x - m > CANVAS_W;
  }

  go() {
    this.state = 'proceeding';
    this.speed = PROCEED_SPEED;
  }

  update() {
    const cfg = DIR_CFG[this.dir];

    if (this.state === 'traveling') {
      this.speed = APPROACH_SPEED;
      if (this.distToStop() < BRAKE_DIST) this.state = 'braking';

    } else if (this.state === 'braking') {
      const d = this.distToStop();
      if (d <= 1) {
        this.clampToStop();
        this.speed = 0;
        this.state = 'stopped';
        intersection.register(this);
        return;
      }
      this.speed = APPROACH_SPEED * (d / BRAKE_DIST);

    } else if (this.state === 'stopped') {
      return;

    } else if (this.state === 'proceeding') {
      this.speed = PROCEED_SPEED;
      if (this.hasCleared()) {
        this.state = 'exiting';
        intersection.active = null;
      }

    } /* exiting — keep moving at PROCEED_SPEED */

    this.x += cfg.dx * this.speed;
    this.y += cfg.dy * this.speed;
  }

  display() {
    let r, g, b;
    if (this.state === 'stopped') {
      [r, g, b] = [220, 30, 30];
    } else if (this.state === 'proceeding' || this.state === 'exiting') {
      [r, g, b] = [255, 210, 0];
    } else {
      const ratio = this.speed / APPROACH_SPEED;
      r = 255;
      g = Math.floor(ratio * 255);
      b = Math.floor(ratio * 255);
    }

    push();
    translate(this.x, this.y);
    if (this.dir === 'E' || this.dir === 'W') rotate(HALF_PI);
    fill(r, g, b);
    noStroke();
    rectMode(CENTER);
    rect(0, 0, CAR_W, CAR_H, 4);
    pop();
  }
}

// ── Flow helpers ─────────────────────────────────────────────
function simHour() {
  return (SIM_START_HOUR + (frameCount / 60) * SIM_SPEED / 60) % 24;
}

// Per-direction flow multiplier at a given sim-hour (base 1.0 + Gaussian rush peaks).
function flowMult(dir, h) {
  let m = 1.0;
  for (const peak of RUSH_HOURS) {
    const z = (h - peak.hour) / PEAK_WIDTH;
    m += (peak.multiplier - 1) * peak.bias[dir] * exp(-0.5 * z * z);
  }
  return m;
}

// Frames between spawns for a direction at a given sim-hour, with arrival noise.
function nextSpawnInterval(dir, h) {
  const framesPerSimHour = (60 / SIM_SPEED) * 60; // at SIM_SPEED=20 → 180 frames/sim-hr
  const base = framesPerSimHour / BASE_FLOW[dir] / flowMult(dir, h);
  const jitter = randomGaussian(0, ARRIVAL_NOISE * base);
  return max(MIN_SPAWN_FRAMES, round(base + jitter));
}

function formatSimTime(h) {
  const hh = floor(h);
  const mm = floor((h - hh) * 60);
  const ampm = hh < 12 ? 'AM' : 'PM';
  const h12  = hh % 12 || 12;
  return `${h12}:${nf(mm, 2)} ${ampm}`;
}

// ── p5 lifecycle ─────────────────────────────────────────────
function setup() {
  createCanvas(CANVAS_W, CANVAS_H);
  textFont('sans-serif');
  for (const dir of ['N', 'S', 'E', 'W']) nextSpawn[dir] = 0;
}

function draw() {
  background(30);
  drawIntersection();

  // Spawn cars according to time-of-day flow rates
  const h = simHour();
  for (const dir of ['N', 'S', 'E', 'W']) {
    if (frameCount >= nextSpawn[dir]) {
      if (cars.filter(c => c.dir === dir).length < MAX_PER_ROAD) {
        const cfg = DIR_CFG[dir];
        cars.push(new Car(cfg.spawnX, cfg.spawnY, dir));
      }
      nextSpawn[dir] = frameCount + nextSpawnInterval(dir, h);
    }
  }

  for (const car of cars) {
    car.update();
    car.display();
  }

  intersection.update();
  cars = cars.filter(c => !c.isOffCanvas());

  drawMenu(h);

  if (flashTimer > 0) {
    fill(255, 200);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(13);
    text(flashMsg, CANVAS_W / 2, MENU_H + 22);
    flashTimer--;
  }
}

function mousePressed() {
  for (let i = 0; i < BUTTONS.length; i++) {
    const bx = btnX(i);
    if (abs(mouseX - bx) < BTN_W / 2 && abs(mouseY - BTN_Y) < BTN_H / 2) {
      if (BUTTONS[i].id !== activeMode) {
        flashMsg = BUTTONS[i].label + ' — coming soon!';
        flashTimer = 120;
      }
    }
  }
}

// ── drawMenu ─────────────────────────────────────────────────
function drawMenu(h) {
  fill(40);
  noStroke();
  rect(0, 0, CANVAS_W, MENU_H);

  textAlign(CENTER, CENTER);
  textSize(13);

  for (let i = 0; i < BUTTONS.length; i++) {
    const btn    = BUTTONS[i];
    const active = btn.id === activeMode;
    const bx     = btnX(i);

    if (active) { fill(60); stroke(200); strokeWeight(1.5); }
    else        { fill(45); stroke(90);  strokeWeight(1);   }

    rectMode(CENTER);
    rect(bx, BTN_Y, BTN_W, BTN_H, 5);

    fill(active ? 240 : 100);
    noStroke();
    text(btn.label, bx, BTN_Y);
  }

  // Sim clock (top-right)
  fill(160);
  noStroke();
  textAlign(RIGHT, CENTER);
  textSize(12);
  text(formatSimTime(h), CANVAS_W - 12, BTN_Y);

  rectMode(CORNER);
}

// ── drawIntersection ─────────────────────────────────────────
function drawIntersection() {
  fill(80);
  noStroke();
  rect(CENTER_X - ROAD_W / 2, MENU_H, ROAD_W, CANVAS_H - MENU_H); // N-S road
  rect(0, CENTER_Y - ROAD_W / 2, CANVAS_W, ROAD_W);                 // E-W road

  fill(95);
  rect(CENTER_X - INTERSECTION_R, CENTER_Y - INTERSECTION_R,
       INTERSECTION_R * 2, INTERSECTION_R * 2);

  drawLaneMarkers();
  drawStopLines();
  drawStopSigns();
}

function drawLaneMarkers() {
  stroke(220, 220, 100);
  strokeWeight(2);
  const step = DASH_LEN + DASH_GAP;
  const laneN = CENTER_X + ROAD_W / 4;  // 315
  const laneS = CENTER_X - ROAD_W / 4;  // 285
  const laneE = CENTER_Y + ROAD_W / 4;  // 340
  const laneW = CENTER_Y - ROAD_W / 4;  // 310

  for (let y = MENU_H; y < CENTER_Y - INTERSECTION_R; y += step)
    line(laneN, y, laneN, y + DASH_LEN);
  for (let y = CENTER_Y + INTERSECTION_R; y < CANVAS_H; y += step)
    line(laneS, y, laneS, y + DASH_LEN);
  for (let x = CENTER_X + INTERSECTION_R; x < CANVAS_W; x += step)
    line(x, laneE, x + DASH_LEN, laneE);
  for (let x = 0; x < CENTER_X - INTERSECTION_R; x += step)
    line(x, laneW, x + DASH_LEN, laneW);

  noStroke();
}

function drawStopLines() {
  stroke(255);
  strokeWeight(4);

  line(CENTER_X,            CENTER_Y - STOP_LINE_DIST,
       CENTER_X + ROAD_W/2, CENTER_Y - STOP_LINE_DIST); // N

  line(CENTER_X - ROAD_W/2, CENTER_Y + STOP_LINE_DIST,
       CENTER_X,            CENTER_Y + STOP_LINE_DIST); // S

  line(CENTER_X + STOP_LINE_DIST, CENTER_Y,
       CENTER_X + STOP_LINE_DIST, CENTER_Y + ROAD_W/2); // E

  line(CENTER_X - STOP_LINE_DIST, CENTER_Y - ROAD_W/2,
       CENTER_X - STOP_LINE_DIST, CENTER_Y);             // W

  noStroke();
}

function drawStopSigns() {
  const signs = [
    { x: CENTER_X + ROAD_W/2 + 14, y: CENTER_Y - STOP_LINE_DIST },
    { x: CENTER_X - ROAD_W/2 - 14, y: CENTER_Y + STOP_LINE_DIST },
    { x: CENTER_X + STOP_LINE_DIST, y: CENTER_Y + ROAD_W/2 + 14 },
    { x: CENTER_X - STOP_LINE_DIST, y: CENTER_Y - ROAD_W/2 - 14 },
  ];
  for (const s of signs) drawOctagon(s.x, s.y, 12);
}

function drawOctagon(cx, cy, r) {
  push();
  translate(cx, cy);
  fill(200, 0, 0);
  stroke(255);
  strokeWeight(1.2);
  beginShape();
  for (let i = 0; i < 8; i++) {
    const angle = (PI / 4) * i - PI / 8;
    vertex(r * cos(angle), r * sin(angle));
  }
  endShape(CLOSE);
  fill(255);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(5);
  textStyle(BOLD);
  text('STOP', 0, 0);
  textStyle(NORMAL);
  pop();
}
