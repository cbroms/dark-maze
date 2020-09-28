//console.log("hi");

//const map = [[true, false, false, false, true], []]

class Trail {
  constructor(x, y, opacity, decAmt) {
    this.x = x;
    this.y = y;
    this.opacity = opacity;
    this.decAmt = decAmt;
  }

  draw() {
    noStroke();
    this.opacity -= this.decAmt;
    fill(255, 0, 0, this.opacity);
    circle(this.x, this.y, 10);
  }
}

class Player {
  constructor(x, y, image) {
    this.prevX = x;
    this.prevY = y;
    this.x = x;
    this.y = y;
    this.w = 10; //hitbox: w and h (used for collision)
    this.h = 10;
    this.trails = [];
    this.image = image;
  }

  // for if we make the character a circle...
  // https://stackoverflow.com/a/21096179
  updatePosition(addX, addY, walls) {
    if (this.collidesWith(this.x, this.y, walls)) {
      this.x = this.prevX;
      this.y = this.prevY;
      return;
    }

    if (this.collidesWith(this.x + addX, this.y + addY, walls)) {
      return;
    }

    // Set current position as "prev"
    this.prevX = this.x;
    this.prevY = this.y;

    //check if we are on the boundary
    if (this.x + addX < 0 || this.x + addX > windowWidth - this.w) return;
    if (this.y + addY < 0 || this.y + addY > windowHeight - this.h) return;
    this.x += addX;
    this.y += addY;
  }

  collidesWith(xCoord, yCoord, walls) {
    let collides = false;

    for (const wall of walls) {
      if (
        wall.x < xCoord + this.w &&
        wall.x + wall.w > xCoord &&
        wall.y < yCoord + this.h &&
        wall.y + wall.h > yCoord
      )
        collides = true;
    }
    return collides;
  }

  draw(accel) {
    // Push + pop make options apply only to lines within
    // playerX = this.x
    // playerY = this.y

    // strokeWeight(1500)
    // noFill(); //makes the circle transparent so that it reveals other things on the map
    // circle(this.x, this.y, 2000);

    // rect(this.x, this.y, this.w, this.h)
    // image(this.image, this.x, this.y, this.w, this.h);

    // add a new trail at the new position
    //TODO: have variable starting opacity and decAmt
    this.trails.push(
      new Trail(
        this.x + this.w / 2,
        this.y + this.h / 2,
        map(accel, 0, 20, 255, 150),
        map(accel, 0, 20, 1, 5)
      )
    );

    for (const trail of this.trails) {
      trail.draw();
    }

    if (this.trails.length > 0 && this.trails[0].opacity <= 0) {
      this.trails.shift();
    }
  }
}

class Wall {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  draw() {
    fill(0); //color of the walls
    rect(this.x, this.y, this.w, this.h);
  }
}

// initialize the map's walls
const level_map = [
  new Wall(50, 50, 10, 100),
  new Wall(50, 150, 150, 15),
  new Wall(500, 200, 100, 10),
  new Wall(500, 200, 10, 200),
  new Wall(300, 200, 10, 200),
];

let player;

let SpeedOn = false;
var accel = 1;
var PressNum = 0;
var radius = 1;
var prevX = 0;
var prevY = 0;

function preload() {
  // load the player sprite
  const img = loadImage(
    "https://cdn.glitch.com/a646d7e0-0d5b-45e4-83ad-8ef03945520c%2FGoldfish.png?v=1600815713378"
  );
  // initialize the player
  player = new Player(0, 0, img);
}

//called by the server upon any user action including me
function onAction(obj) {
  //change fill color to black
  fill(255, 0, 0);
  //draw a circle
  ellipse(obj.x, obj.y, 20, 20);
}

//connected to the server
function onConnect() {
  if (socket.id) {
    console.log("Connected to the server");
  }
}

//a message from the server
function onMessage(msg) {
  if (socket.id) {
    console.log("Message from server: " + msg);
  }
}

let socket;

function setup() {
  socket = io({
    autoConnect: false,
  });

  //detects a server connection
  socket.on("connect", onConnect);
  //handles the messages from the server, the parameter is a string
  socket.on("message", onMessage);
  //handles the user action broadcast by the server, the parameter is an object
  socket.on("action", onAction);

  socket.open();

  createCanvas(window.innerWidth, window.innerHeight);
}

// called every frame
function draw() {
  //console.log(accel);
  // console.log(PressNum);
  maxRadius = 100;
  minRadius = 20;
  radiusIncrement = 1;

  // Increase/decrease size of light circle
  if (accel === 0 || (player.x == prevX && player.y == prevY)) {
    radius += radiusIncrement;
    if (radius > maxRadius) radius = maxRadius;
  } else {
    radius -= radiusIncrement;
    if (radius < 20) radius = minRadius;
  }

  prevX = player.x;
  prevY = player.y;

  // We draw the circle BEFORE drawing the walls so that it looks like the circle "illuminates"
  // any surrounding walls
  background(0);
  fill(255);
  circle(player.x + player.w / 2, player.y + player.h / 2, radius);
  // draw all the walls to the canvas
  for (const wall of level_map) {
    wall.draw();
  }
  // draw the player + trails
  player.draw(accel);

  if ((PressNum) => 1) {
    accel += 0.25;
  }

  // if (SpeedOn == false) {
  //accel = 0;
  //}

  if (accel > 10) {
    accel = 10;
  }

  // Player movementd
  if (keyIsDown(87)) {
    // W key
    player.updatePosition(0, -accel, level_map);
  }

  if (keyIsDown(65)) {
    // A key
    player.updatePosition(-accel, 0, level_map);
  }

  if (keyIsDown(83)) {
    // S key
    player.updatePosition(0, accel, level_map);
  }

  if (keyIsDown(68)) {
    // D key
    player.updatePosition(accel, 0, level_map);
  }

  if (!keyIsDown(87) && !keyIsDown(65) && !keyIsDown(83) && !keyIsDown(68)) {
    //SpeedOn = false;
    PressNum = 0;
    accel = 0;
  }
}

function keyPressed() {
  // By pressing a kdey(WASD) we call upon the players Update Position to move it.
  let keyIndex = -1;

  //console.log("key: " + code);
  switch (
    keyCode //switch tells us that thing we want to check for is a key press
  ) {
    case 68: // case tells us which key
      PressNum += 1;
      break; // break is like reutrn null, it is the default if it returns with nothing
    case 65:
      PressNum += 1;
      break;
    case 87:
      PressNum += 1;
      break;
    case 83:
      PressNum += 1;
      break;
    default:
  }
}
