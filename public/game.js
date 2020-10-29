////////////////////////////////////////////////////////////////////////////////
// GLOBALS

let BGImg;
let serverEmpty;
let serverTarget;
let serverPayload;
let ServerImg;
let GreenPl;
let BluePl;
let RedPl;

let CanX;

let CanY;

let timer = -1

// map position
let mapNodes;
let positions;
let currentNode = 0;
let iAmBad = false;
let nodes = [];
let edges = {};
let constants = {};
let gameOver = false;
let gameStart = false;
let payloadsInCenter = 0;
let fontMonospace;

function preload() {
  BGImg = loadImage("assets/background.gif");
  serverEmpty = loadImage("assets/serverempty.png");
  serverTarget = loadImage("assets/servertarget.png");
  serverPayload = loadImage("assets/serverpayload.png");
  ServerImg = loadImage("assets/server.gif");
  RedPl = loadImage("assets/redSkull.gif");
  BluePl = loadImage("assets/SmileBlue.gif");
  GreenPl = loadImage("assets/SmileGreen.gif");
  fontMonospace = loadFont("assets/VT323-Regular.ttf");
}

////////////////////////////////////////////////////////////////////////////////
// GAME CLASSES

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

// the player itself.
class Player {
  constructor(id, hasPayload, isBad, isMe) {
    this.hasPayload = hasPayload;
    this.id = id;
    this.radius = 20;
    this.isMe = isMe;
    this.isBad = isBad;
    this.color = isBad ? RedPl : isMe ? GreenPl : BluePl;
  }

  draw(x, y) {
    if (!this.isBad || this.isMe) {
      if (this.hasPayload) {
        if (this.isMe) fill(0, 255, 0);
        else fill(0, 222, 255);
        circle(x, y, 30);
      }
      image(this.color, x - 10, y - 10, this.radius, this.radius);
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
    this.playerIn = 0;
  }

  draw(visibleToPlayer, barelyVisibleToPlayer) {
    strokeWeight(4);
    if (this.playerIn > 0) {
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
  constructor(x, y, id, edges, isTarget, isPayload) {
    this.id = id;
    this.name = String.fromCharCode(id + 65);
    this.edges = edges;
    this.x = x;
    this.y = y;
    this.isTarget = isTarget;
    this.isPayload = isPayload;
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
      // is there a bad guy on the current node?
      if (playerOn) {
        for (const player of this.players) {
          if (player.isBad) {
            badOn = true;

            break;
          }
        }
      }

      // draw the background
      // if (badOn) fill(180, 0, 0);
      // else fill(255);
      // rect(this.x - 0, this.y - 0, 10, 10);
      if (this.isTarget) {
        image(serverTarget, this.x - 40, this.y - 40, 80, 80);
      } else if (this.isPayload) {
        image(serverPayload, this.x - 40, this.y - 40, 80, 80);
      } else {
        image(serverEmpty, this.x - 40, this.y - 40, 80, 80);
      }

      // draw the server name
      //fill(0);
      //text(this.name, this.x - 20, this.y + 10);
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
  }
}

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
      console.log(i === mapObj.targetNode);
      return new Node(
        mapObj.positions[i].x,
        mapObj.positions[i].y,
        i,
        node,
        i === mapObj.targetNode,
        mapObj.payloadNodes[i]
      );
    });

    for (const edge of mapObj.edges) {
      const edgeNodes = edge.split("_");
      const first = parseInt(edgeNodes[0]);
      const second = parseInt(edgeNodes[1]);

      edges[edge] = new Edge(
        nodes[first].x,
        nodes[first].y,
        nodes[second].x,
        nodes[second].y,
        edge
      );
    }

    // add any existing players to their nodes
    for (player in mapObj.players) {
      const playerObj = mapObj.players[player];
      nodes[playerObj.playerNode].players.push(
        new Player(
          player,
          playerObj.hasPayload,
          playerObj.isBad,
          player === socket.id
        )
      );
    }

    // set the local versions of the constants
    constants = mapObj.constants;
  }
}

function onMoved(obj) {
  console.log("player moved", obj);
  // remove the player from the previous node
  for (const j in nodes[obj.prevNode].players) {
    if (nodes[obj.prevNode].players[j].id === obj.player) {
      nodes[obj.prevNode].players.splice(j, 1);
    }
  }

  if (obj.edge !== null) {
    // set the edge to render the player inside
    edges[obj.edge].playerIn += 1;

    // after the movement time, adjust the rendering
    window.setTimeout(() => {
      // stop the edge from rendering a player inside
      edges[obj.edge].playerIn -= 1;
      // add the player to the destination node
      nodes[obj.node].players.push(
        new Player(
          obj.player,
          obj.hasPayload,
          obj.isBad,
          obj.player === socket.id
        )
      );
      if (obj.player === socket.id) currentNode = obj.node;
    }, constants.MOVE_TIME);
  } else {
    // the player died

    // add the player to the destination node
    nodes[obj.node].players.push(
      new Player(
        obj.player,
        obj.hasPayload,
        obj.isBad,
        obj.player === socket.id
      )
    );
    if (obj.player === socket.id) {
      currentNode = obj.node;
      alert("you entered a server infected by malware and died :(");
    }
  }
}

function onPickedUpPayload(obj) {
  // set the player to have a payload
  for (const player of nodes[obj.node].players) {
    player.hasPayload = true;
  }
}

function onDroppedPayload(obj) {
  // set the player to not have a payload
  for (const player of nodes[obj.node].players) {
    player.hasPayload = false;
  }
  payloadsInCenter = obj.payloads_brought;
}

function onEntered(obj) {
  console.log("player entered");
  console.log(obj);
  // add the player to the map
  nodes[obj.node].players.push(
    new Player(obj.player, false, obj.isBad, obj.player === socket.id)
  );
  if (obj.player === socket.id) {
    currentNode = obj.node;
    iAmBad = obj.isBad;
  }
}

function onExited(obj) {
  console.log("player exited");
  // remove the player from the map
  for (const j in nodes[obj.node].players) {
    if (nodes[obj.node].players[j].id === obj.player) {
      nodes[obj.node].players.splice(j, 1);
    }
  }
}

function onGameTimer(obj) {
  timer = obj.time;
}

let socket = io({
  autoConnect: true,
});

//detects a server connection
socket.on("connect", onConnect);
socket.on("message", onMessage);
socket.on("map", onMap);
socket.on("action", onAction);
socket.on("pickedUpPayload", onPickedUpPayload);
socket.on("droppedPayload", onDroppedPayload);
socket.on("entered", onEntered);
socket.on("moved", onMoved);
socket.on("exited", onExited);
socket.on("gameTimer", onGameTimer);

socket.on("disconnect", () => {
  console.log("disconnecting");
});

function setup() {
  CanX = 1200;
  CanY = 700;
  createCanvas(CanX, CanY);
  frameRate(10);
  textSize(32);
  //TIMER
  // setInterval(time, 1000);
}

////////////////////////////////////////////////////////////////////////////////
// GAME RENDERING

let hideStartText = 0;
// called every frame
function draw() {
  background(0);
  image(BGImg, 0, 0, CanX, CanY);
  textAlign(CENTER, CENTER);
  textSize(23);
  textFont(fontMonospace);
  fill(0,168,0);

  text(constants.ROOM_ID + ' - LOCALHOST:3000', 129, 17)
  textSize(23);
  text('DARK-MAZE', 1149, 687);

  if (edges && nodes) {
    for (const edge in edges) {
      const [nodeCon1, nodeCon2] = edge.split("_");

      const visible =
        nodes[currentNode]?.id === parseInt(nodeCon2) ||
        nodes[currentNode]?.id === parseInt(nodeCon1);

      const barelyVisible =
        nodes[currentNode]?.edges.includes(parseInt(nodeCon2)) ||
        nodes[currentNode]?.edges.includes(parseInt(nodeCon1));

      // draw the node, letting it know if there's a player inside and if
      // if it is visible to the player
      edges[edge].draw(visible, barelyVisible);
    }

    for (const node of nodes) {
      // draw the node, letting it know if its "clickable" or it is the current node
      node.draw(
        nodes[currentNode]?.edges.includes(node.id),
        nodes[currentNode]?.id === node.id
      );
    }
  }
  // Hacky addition to say you're moving
  if (currentNode === -1) {
    textSize(28);
    text("Uploading to new server...", width/2, height/2);
  }

  // Payloads brought
  textSize(23);
  fill (255);
  if (gameStart) {
    var payDisplay = payloadsInCenter > constants.WIN_PAYLOADS ? constants.WIN_PAYLOADS: payloadsInCenter;
    text("Payloads: " + payDisplay + "/" + constants.WIN_PAYLOADS, 1000, 17);
  }

  //TIMER
  textSize(23);
  fill(255);
  
  
  if (gameStart && payloadsInCenter >= constants.WIN_PAYLOADS) {
      socket.emit("endGame", {timer: timer});
      gameOver = true;
      timer = -1;
  }
  
  if (timer > 0 && !gameStart) { //game just started
    gameStart = true;
    hideStartText = timer - 2;
    textSize(56);
    text("GAME HAS STARTED", width/2, height/2);

    textSize(23);
    var extra_zero = timer % 60 < 10 ? "0" : "";
    text("0" + Math.floor(timer/60) + ":" + extra_zero + timer % 60, width/2, 17);
  } else if (timer > 0) { // game already started

    if (timer > hideStartText) { // still show start text
      textSize(56);
      text("GAME HAS STARTED", width/2, height/2);
    }

    textSize(23);
    var extra_zero = timer % 60 < 10 ? "0" : "";
    text("0" + Math.floor(timer/60) + ":" + extra_zero + timer % 60, width/2, 17);
  } else if (timer === 0 || gameOver) { //winner
    gameOver = true;
    let winner = payloadsInCenter >= constants.WIN_PAYLOADS ? "The antivirus" : "The virus";
    // display winner text
    textSize(56);
    text(winner + " won the game!", width/2, height/2);

    textSize(23);
    text("TIME OUT", width/2, 17);
  } else if (timer < 0 && !gameOver) { //in lobby
    textSize(56);
    text('Waiting for more players to join...', width/2, height/2);
  }

  // Cooldown text
  
}

//TIMER
function time() {
  if (timer > 0) {
    timer--;
  }
}

function mouseClicked() {
  if (timer <= 0) { // Game already started or ended
    return;
  }
  for (let i = 0; i < nodes.length; i++) {
    if (
      nodes[currentNode]?.edges.includes(nodes[i].id) &&
      nodes[i].mouseIsIn()
    ) {
      // make sure the player is not a bad player if the node is the target or payload node
      if (iAmBad && (nodes[i].isPayload || nodes[i].isTarget)) {
        alert("restricted server");
      } else {
        socket.emit("move", i);
        currentNode = -1;
      }
    }
  }
}

// function keyPressed(key) {
//   const upperKey = key.key.toUpperCase();

//   for (let i = 0; i < nodes.length; i++) {
//     if (
//       nodes[currentNode]?.edges.includes(nodes[i].id) &&
//       nodes[i].name === upperKey
//     ) {
//       socket.emit("move", i);
//       currentNode = -1;
//     }
//   }
// }
