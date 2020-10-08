////////////////////////////////////////////////////////////////////////////////
// GAME CLASSES

// the "trail" left behind players. This is a circle that reduces in opacity every
// time it's drawn, reduced by a pre-specified amount
class Trail {
  constructor(x, y, opacity, decAmt) {
    this.x = x;
    this.y = y;
    this.opacity = opacity;
    this.decAmt = decAmt; // amont to reduce per update
  }

  draw() {
    this.opacity -= this.decAmt;
    fill(255, 0, 0, this.opacity);
    circle(this.x, this.y, 10);
  }
}

// the player itself. It has a position and list of trails that are left behind it.
class Player {
  constructor(hasPayload, color) {
    this.hasPayload = this.hasPayload;
    this.radius = 15;
    this.color = color;
  }

  draw(x, y) {
    fill(this.color);
    circle(x, y, this.radius);
  }
}

class Edge {
  constructor(startX, startY, endX, endY, id) {
    this.startX = startX;
    this.startY = startY;
    this.endX = endX;
    this.endY = endY;
    this.id = id;
  }

  draw() {
    strokeWeight(6);
    stroke(0);
    line(this.startX, this.startY, this.endX, this.endY);
  }
}

// the nodes aka "servers"
class Node {
  constructor(x, y, id, edges) {
    this.id = id;
    this.edges = edges;
    this.x = x;
    this.y = y;
    this.radius = 60;
    this.players = [];
  }

  mouseIsIn() {
    // check if the mouse is within the node
    return (mouseX - this.x) ** 2 + (mouseY - this.y) ** 2 < this.radius ** 2;
  }

  draw(clickable) {
    strokeWeight(2);
    if (clickable) {
      stroke("red");
    } else {
      stroke("black");
    }
    fill(100);
    circle(this.x, this.y, this.radius);

    // draw the players within the node
    // there are four possible positions to draw the players in the node,
    // and we want each player to have a unique position so there's no overlap
    for (let i = 0; i < this.players.length; i++) {
      const playerRad = (this.players[i].radius / 3) * 2;
      // just hardcoding the positions, could be tricky here with mod
      switch (i) {
        case 0:
          this.players[i].draw(this.x - playerRad, this.y + playerRad);
          break;
        case 1:
          this.players[i].draw(this.x + playerRad, this.y + playerRad);
          break;
        case 2:
          this.players[i].draw(this.x + playerRad, this.y - playerRad);
          break;
        case 3:
          this.players[i].draw(this.x - playerRad, this.y - playerRad);
          break;
      }
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
// GLOBALS

// map position
let mapNodes;
let positions;
let currentNode = 0;
let nodes = [];
let edges = [];

// initialize the players
let me = new Player(false, "#877fc1");
let otherPlayer = new Player(false, "#c1857f");

let SpeedOn = false;
var accel = 1;
var PressNum = 0;
var radius = 1;
var prevX = 0;
var prevY = 0;

////////////////////////////////////////////////////////////////////////////////
// SERVER COMMUNICATION

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

function onMap(mapObj) {
  if (socket.id) {
    console.log("got map!");
    console.log(mapObj);
    // initialize the nodes
    nodes = mapObj.mapNodes.map((node, i) => {
      return new Node(mapObj.positions[i].x, mapObj.positions[i].y, i, node);
    });

    // initialize the edges
    for (const node of nodes) {
      for (const ed of node.edges) {
        // if the edge does not already exist
        if (
          !edges.some(
            (edge) =>
              edge.id === node.id + "" + nodes[ed]?.id ||
              edge.id === nodes[ed]?.id + "" + node.id
          )
        ) {
          console.log(node.id + "" + nodes[ed].id + " edge added to map");
          // add the new edge
          edges.push(
            new Edge(
              node.x,
              node.y,
              nodes[ed].x,
              nodes[ed].y,
              node.id + "" + nodes[ed].id
            )
          );
        }
      }
    }

    // TODO remove this hard coded shit
    nodes[0].players = [me];
  }
}

//a message from the server
function onState(state) {
  if (socket.id) {
    console.log("got new state");
    console.log(state);
  }
}

let socket;

function setup() {
  socket = io({
    autoConnect: false,
  });

  //detects a server connection
  socket.on("connect", onConnect);
  socket.on("map", onMap);

  socket.on("action", onAction);

  socket.on("state", onState);

  socket.open();

  // set the canvas size to 1000x800
  createCanvas(1000, 900);
}

////////////////////////////////////////////////////////////////////////////////
// GAME RENDERING

// called every frame
function draw() {
  // draw the nodes/edges
  background(255);

  // for (let i = 0; i < edges.length; i++) {
  //   edges[i].draw(currentNode === i);
  // }
  if (edges && nodes) {
    for (const edge of edges) {
      edge.draw();
    }

    for (const node of nodes) {
      // draw the node, letting it know if its "clickable"
      node.draw(nodes[currentNode].edges.includes(node.id));
    }
  }

  //console.log(accel);
  // console.log(PressNum);
  // maxRadius = 100;
  // minRadius = 20;
  // radiusIncrement = 1;
  // // Increase/decrease size of light circle
  // if (accel === 0 || (player.x == prevX && player.y == prevY)) {
  //   radius += radiusIncrement;
  //   if (radius > maxRadius) radius = maxRadius;
  // } else {
  //   radius -= radiusIncrement;
  //   if (radius < 20) radius = minRadius;
  // }
  // prevX = player.x;
  // prevY = player.y;
  // // We draw the circle BEFORE drawing the walls so that it looks like the circle "illuminates"
  // // any surrounding walls
  // background(0);
  // fill(255);
  // circle(player.x + player.w / 2, player.y + player.h / 2, radius);
  // // draw all the walls to the canvas
  // for (const wall of level_map) {
  //   wall.draw();
  // }
  // // draw the player + trails
  // player.draw(accel);
  // if ((PressNum) => 1) {
  //   accel += 0.25;
  // }
  // // if (SpeedOn == false) {
  // //accel = 0;
  // //}
  // if (accel > 10) {
  //   accel = 10;
  // }
  // // Player movementd
  // if (keyIsDown(87)) {
  //   // W key
  //   player.updatePosition(0, -accel, level_map);
  // }
  // if (keyIsDown(65)) {
  //   // A key
  //   player.updatePosition(-accel, 0, level_map);
  // }
  // if (keyIsDown(83)) {
  //   // S key
  //   player.updatePosition(0, accel, level_map);
  // }
  // if (keyIsDown(68)) {
  //   // D key
  //   player.updatePosition(accel, 0, level_map);
  // }
  // if (!keyIsDown(87) && !keyIsDown(65) && !keyIsDown(83) && !keyIsDown(68)) {
  //   //SpeedOn = false;
  //   PressNum = 0;
  //   accel = 0;
  // }
}

function mouseClicked() {
  for (let i = 0; i < nodes.length; i++) {
    if (
      nodes[currentNode].edges.includes(nodes[i].id) &&
      nodes[i].mouseIsIn()
    ) {
      nodes[currentNode].players = [];
      currentNode = i;
      nodes[currentNode].players = [me];
    }
  }
}

// function keyPressed() {
//   // By pressing a kdey(WASD) we call upon the players Update Position to move it.
//   let keyIndex = -1;

//   //console.log("key: " + code);
//   switch (
//     keyCode //switch tells us that thing we want to check for is a key press
//   ) {
//     case 68: // case tells us which key
//       PressNum += 1;
//       break; // break is like reutrn null, it is the default if it returns with nothing
//     case 65:
//       PressNum += 1;
//       break;
//     case 87:
//       PressNum += 1;
//       break;
//     case 83:
//       PressNum += 1;
//       break;
//     default:
//   }
// }
