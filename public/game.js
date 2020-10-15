////////////////////////////////////////////////////////////////////////////////
// GAME CLASSES

// the "trail" left behind players. This is a circle that reduces in opacity every
// time it's drawn, reduced by a pre-specified amount

let img;
let serverempty;
let roombackground;
let ServerImg;
let GreenPl;
let BluePl;
let RedPl;
function preload() {
  img = loadImage("assets/GreenLine.gif");
  serverempty = loadImage("assets/serverempty.png");
  roombackground = loadImage("assets/background.png");
  ServerImg = loadImage("assets/server.gif");
  RedPl = loadImage("assets/SmileRed.gif");
  BluePl = loadImage("assets/SmileBlue.gif");
  GreenPl = loadImage("assets/SmileGreen.gif");
}

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
    this.radius = 20;
    this.isMe = isMe;
    this.isBad = isBad;
    this.color = isMe ? (isBad ? GreenPl : RedPl) : BluePl;
  }

  draw(x, y) {
    if (!this.isBad || this.isMe) {
      //fill(this.color);
      //circle(x, y, this.radius);
      image(this.color, x + 10, y - 20, this.radius, this.radius);
    }
  }
}

//lines/routes/bridges connecting the servers for the packets to travel through
class Edge {
  constructor(startX, startY, endX, endY, id) {
    this.startX = startX;
    this.startY = startY;
    this.endX = endX;
    this.endY = endY;
    this.id = id;
  }

  draw(playerIn, visibleToPlayer, barelyVisibleToPlayer) {
    strokeWeight(4);
    if (playerIn) {
      stroke(255, 0, 0);
    } else if (visibleToPlayer) {
      stroke(0, 168, 0);
    } else if (barelyVisibleToPlayer) {
      stroke("rgba(0,168,0,0.05)");
    } else {
      noStroke();
    }

    line(this.startX, this.startY, this.endX, this.endY);
  }
}

// the nodes aka "servers"
class Node {
  constructor(x, y, id, edges) {
    this.id = id;
    this.name = String.fromCharCode(id + 65);
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

  draw(clickable, playerOn) {
    strokeWeight(4);
    if (clickable || playerOn) {
      let badOn = false;
      // is there a bad guy on the current node? if so draw background red
      if (playerOn) {
        for (const player of this.players) {
          if (player.isBad) {
            badOn = true;
            break;
          }
        }
      }

      // draw the background
      if (badOn) fill(180, 0, 0);
      else fill(255);
      rect(this.x - 30, this.y - 30, 60, 60);
      // draw the server name
      fill(0);
      text(this.name, this.x - 20, this.y + 10);
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
    } else {
      // don't do anything since the node is invisible to the player
    }

    // image(serverempty, this.x - 30, this.y - 30);
    // image(ServerImg, this.x - 40, this.y - 40, 80, 80);
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
          //      console.log(node.id + "" + nodes[ed].id + " edge added to map");
          // add the new edge
          edges.push(
            new Edge(
              node.x,
              node.y,
              nodes[ed].x,
              nodes[ed].y,
              node.id + "_" + nodes[ed].id
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

    //console.log(state);

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
  createCanvas(1200, 700);
  frameRate(20);
  textSize(32);
}

////////////////////////////////////////////////////////////////////////////////
// GAME RENDERING

// called every frame
function draw() {
  background(0);
  //image(roombackground, 0, 0);

  //image(img, 0, 0, 700, 700);

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

      const [nodeCon1, nodeCon2] = edge.id.split("_");

      const visible =
        nodes[currentNode]?.id === parseInt(nodeCon2) ||
        nodes[currentNode]?.id === parseInt(nodeCon1);

      const barelyVisible =
        nodes[currentNode]?.edges.includes(parseInt(nodeCon2)) ||
        nodes[currentNode]?.edges.includes(parseInt(nodeCon1));
      // draw the node, letting it know if there's a player inside and if
      // if it is visible to the player
      edge.draw(playerIn, visible, barelyVisible);
    }

    for (const node of nodes) {
      // draw the node, letting it know if its "clickable" or it is the current node
      node.draw(
        nodes[currentNode]?.edges.includes(node.id),
        nodes[currentNode]?.id === node.id
      );
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

function keyPressed(key) {
  const upperKey = key.key.toUpperCase();

  for (let i = 0; i < nodes.length; i++) {
    if (
      nodes[currentNode]?.edges.includes(nodes[i].id) &&
      nodes[i].name === upperKey
    ) {
      socket.emit("move", i);
      currentNode = -1;
    }
  }
}
