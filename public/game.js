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
  constructor(id, hasPayload, isBad, isMe) {
    this.hasPayload = hasPayload;
    this.id = id;
    this.radius = 15;
    this.isMe = isMe;
    this.isBad = isBad;
    this.color = isMe ? (isBad ? "red" : "blue") : "black";
  }

  draw(x, y) {
    if (!this.isBad || this.isMe) {
      fill(this.color);
      circle(x, y, this.radius);
    }
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

  draw(playerIn) {
    strokeWeight(6);
    if (playerIn) {
      stroke(255, 0, 0);
    } else {
      stroke(0);
    }

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

// this is where we keep our version of the state and update it when we
// receive a new one from the server
let localState = {};

// let SpeedOn = false;
// var accel = 1;
// var PressNum = 0;
// var radius = 1;
// var prevX = 0;
// var prevY = 0;

// var LinefloatX = 0;
// var lineNum = 0;
// var gRectfloatX;

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
    console.log(socket.id);
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
  }
}

//a message from the server
function onState(state) {
  if (socket.id) {
    localState = state;

    console.log(state);

    // update the player's positions
    // we're going to manually go through and check if the positions
    // need to be changed rather than wiping everything and starting
    // fresh because we don't want to see a flash where there are no
    // players rendered
    for (const player in localState.players) {
      const playerState = localState.players[player];
      // update the current node index to hightlight the possible destinations
      if (
        player === socket.id &&
        playerState.moveTimer === 0 &&
        playerState.coolTimer === 0
      ) {
        currentNode = playerState.playerNode;
      }

      const playerPos = playerState.playerNode;

      // if the player doesn't exist in that node yet, add it
      if (
        !nodes[playerPos].players.some((playerObj) => player === playerObj.id)
      ) {
        nodes[playerPos].players.push(
          new Player(player, false, playerState.isBad, player === socket.id)
        );
      }
    }

    for (const i in nodes) {
      const node = nodes[i];
      for (const j in node.players) {
        const playerState = localState.players[node.players[j].id];
        // if that player isn't in that node anymore, delete it
        if (
          playerState === undefined ||
          playerState.playerNode !== parseInt(i) ||
          playerState.moveTimer > 0
        ) {
          nodes[i].players.splice(j, 1);
        }
      }
    }
  }
}

let socket = io({
  autoConnect: true,
});

//detects a server connection
socket.on("connect", onConnect);
socket.on("message", onMessage);
socket.on("map", onMap);
socket.on("action", onAction);
socket.on("state", onState);
socket.on("disconnect", () => {
  console.log("disconnecting");
});

function setup() {
  createCanvas(1000, 900);
  frameRate(30);
}

////////////////////////////////////////////////////////////////////////////////
// GAME RENDERING
let img;
function preload() {
  img = loadImage("assets/cyberlines.gif");
}

// called every frame
function draw() {
  background(255);

  // image(img, 10, 10, windowHeight, windowWidth);

  if (edges && nodes) {
    for (const edge of edges) {
      let playerIn = false;

      // check if any players are currently in that edge
      for (const player in localState.players) {
        const playerState = localState.players[player];
        if (playerState.playerEdge === edge.id && playerState.moveTimer > 0) {
          playerIn = true;
        }
      }
      edge.draw(playerIn);
    }

    for (const node of nodes) {
      // draw the node, letting it know if its "clickable"
      node.draw(nodes[currentNode]?.edges.includes(node.id));
    }
  }
}

function mouseClicked() {
  for (let i = 0; i < nodes.length; i++) {
    if (
      nodes[currentNode]?.edges.includes(nodes[i].id) &&
      nodes[i].mouseIsIn()
    ) {
      socket.emit("move", i);
      currentNode = -1;
    }
  }
}
