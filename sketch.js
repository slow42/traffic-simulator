// ── Constants ────────────────────────────────────────────────
const ROAD_W          = 60;
const CAR_W           = 20;
const CAR_H           = 35;
const DEFAULT_SPEED   = 2;
const NUM_CARS        = 10;

const DECEL_RATE      = 0.05;
const ACCEL_RATE      = 0.03;
const MIN_SPEED       = 0.1;
const DISRUPTION_RADIUS = 100;

// ── Car class ────────────────────────────────────────────────
class Car {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.speed = DEFAULT_SPEED;
    this.state = 'normal';
  }

  disrupt() {
    if (this.state === 'normal') {
      this.state = 'decelerating';
    }
  }

  update() {
    if (this.state === 'decelerating') {
      this.speed -= DECEL_RATE;
      if (this.speed <= MIN_SPEED) {
        this.speed = MIN_SPEED;
        this.state = 'accelerating';
      }
    } else if (this.state === 'accelerating') {
      this.speed += ACCEL_RATE;
      if (this.speed >= DEFAULT_SPEED) {
        this.speed = DEFAULT_SPEED;
        this.state = 'normal';
      }
    }

    this.y += this.speed;

    // Wrap to top when car exits bottom
    if (this.y - CAR_H / 2 > height) {
      this.y = -CAR_H / 2;
    }
  }

  display() {
    // Speed ratio: 1 = full speed (white), 0 = stopped (red)
    const ratio = (this.speed - MIN_SPEED) / (DEFAULT_SPEED - MIN_SPEED);
    const r = 255;
    const g = Math.floor(ratio * 255);
    const b = Math.floor(ratio * 255);

    push();
    translate(this.x, this.y);
    fill(r, g, b);
    noStroke();
    rectMode(CENTER);
    rect(0, 0, CAR_W, CAR_H, 4); // rounded corners
    pop();
  }
}

// ── Globals ──────────────────────────────────────────────────
let cars = [];
let roadX;       // center x of the road
const DASH_LEN  = 20;
const DASH_GAP  = 15;

// ── p5 lifecycle ─────────────────────────────────────────────
function setup() {
  createCanvas(400, 700);
  roadX = width / 2;

  // Space cars evenly along the road height
  for (let i = 0; i < NUM_CARS; i++) {
    const y = (height / NUM_CARS) * i + height / (NUM_CARS * 2);
    cars.push(new Car(roadX, y));
  }
}

function draw() {
  background(30);

  drawRoad();

  for (const car of cars) {
    car.update();
    car.display();
  }
}

function mousePressed() {
  for (const car of cars) {
    if (dist(mouseX, mouseY, car.x, car.y) < DISRUPTION_RADIUS) {
      car.disrupt();
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────
function drawRoad() {
  // Road surface
  fill(80);
  noStroke();
  rect(roadX - ROAD_W / 2, 0, ROAD_W, height);

  // Dashed center lane marker
  stroke(220, 220, 100);
  strokeWeight(2);
  const totalStep = DASH_LEN + DASH_GAP;
  for (let y = 0; y < height; y += totalStep) {
    line(roadX, y, roadX, y + DASH_LEN);
  }
  noStroke();
}
