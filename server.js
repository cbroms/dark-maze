const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

//when a client connects serve the static files in the public directory
app.use(express.static("public"));

// the rate the server updates all the clients, FPS frames per sec
const FPS = 1;
const UPDATE_TIME = 1000 / FPS;
const MAX_PLAYERS = 4;

// Timer variables: seconds they should be * FPS
const MAX_COOLDOWN = 3 * FPS;
const MAX_MOVE = 2 * FPS;
const ROUND_TIMING = 120 * FPS;

// the map
// each index represents a node in the network. The array at each index contains
// the indecies that the node has connections to
const map = [
  [1, 2],
  [0, 2],
  [0, 1],
];

//TODO: define this in a different way
const MAX_PAYLOADS = map.length / 2;
const PAYLOAD_NODE = 0;
const WIN_PAYLOADS = MAX_PAYLOADS - 1;

// the game state
var state = {
  players: {},
  payloads: [],
  payloads_brought = 0,
  gameTimer: -1,
  gameOver: false,
};

// for reference
// playerState = {
//   playerNode: int, // which node they are on (if moving)
//   playerEdge: int, // which edge they are on (if moving)
//   isBad: bool, // if the player is "it"
//   hasPayload: bool, // if player is carrying payload
//   moveTimer: bool, // if player is moving
//   coolTimer: bool, // if player is on cooldown
// };

/* TODO client side
   --handle rendering different map views based on if player.isBad is true
   --handle receiving "map" w/map object
   --handle receiving "state"
   --handle checking if player is on same node as IT:if so send "badPlayerNode"
     event to server
   --handle checking if player is NOT carrying a payload and is on same node
     as a payload (and NOT same node as IT), then send "getPayload" event to 
     server
   --render when a player is carrying a payload by checking hasPayload
   --render player movement cooldown by checking if coolTimer > 0 and make sure
     adjacent nodes aren't highlighted until coolTimer is back to 0
   --render player movement on specific EDGE by lighting up edge if 
     moveTimer > 0 and a player is on it; make sure adjacent nodes aren't 
     highlighted in red until moveTimer is back to 0
   --if state.gameOver, ignore all player input and do NOTHING 
   --render text/img for "payloadsBrought" on UI (num payloads brought to center), game over, game start etc (currently not handled, just written as notes in this file)
*/

io.on("connection", (socket) => {
  console.log("A user connected");

  if (Object.keys(state.players).length < MAX_PLAYERS) {
    socket.emit("message", "welcome to the game");

    // We always set the 3rd player as "bad"
    let isBadPlayer =
      Object.keys(state.players).length === MAX_PLAYERS - 2 ? true : false;

    state.players[socket.id] = {
      playerNode: 0,
      playerEdge: 0,
      isBad: isBadPlayer,
      hasPayload: false,
      moveTimer: 0, // when player wants to move set to MAX_MOVE
      coolTimer: 0, // when player finishes a move set to MAX_COOLDOWN
    };

    console.log(
      "Creating player " +
        socket.id +
        " there are now " +
        Object.keys(state.players).length +
        " players"
    );

    // send the map to the client
    socket.emit("map", map);

    // Start the game when we have 4 players
    if (Object.keys(state.players).length === MAX_PLAYERS) {
      startGame();
    }
  } else {
    socket.emit("message", "sorry, game is currently full");
    // TODO: create a new "room" that acts as a new game for the next set of players
    // https://socket.io/docs/rooms/
  }

  socket.on("message", function (obj) {
    //do something with a message
  });

  // Handle user requests here
  socket.on("move", function (node) {
    // If player is currently moving or on cooldown, nothing happens
    if (moveTimer > 0 || coolTimer > 0) {
      return;
    }

    // IF move not valid, do nothing
    //TODO: add UI text for invalid move?
    if (!(map[state.players[socket.id].playerNode].includes(node) === true)) {
      return;
    }

    state.players[socket.id].playerEdge = ??;
    state.players[socket.id].moveTimer = MAX_MOVE;
    state.players[socket.id].playerNode = node;
  });

  // If some player on same node as "IT"
  socket.on("badPlayerNode", function (obj) {
    // just mark the player as not-carrying and spawn a new payload
    state.players[socket.id].hasPayload = false;
    generatePayloads(1);
  });

  // If some player on same node as a payload
  socket.on("getPayload", function (obj) {
    // If they're carrying a payload, do nothing
    // (checked on client side) If on same node as "it", do nothing
    if (state.players[socket.id].hasPayload === true) return;
    state.players[socket.id].hasPayload = true;
  });

  //TODO: do we want an onDisconnect?
}); // end onConnect

// setInterval works in milliseconds
setInterval(function () {
  // Do processing of game state
  for (var playerId in state.players) {
    var playerState = state.players[playerId];
    // Cooldown on movement
    if (playerState.coolTimer > 0) {
      playerState.coolTimer -= 1;
    }

    // Player is moving
    if (playerState.moveTimer > 0) {
      playerState.moveTimer -= 1;
      if (playerState.moveTimer === 0) {
        playerState.coolTimer = MAX_COOLDOWN;
      }
    }

    // Check if player on same node as payload_node and if so add
    if (playerState.moveTimer <= 0 && playerState.hasPayload && playerNode === PAYLOAD_NODE) {
      state.payloads_brought++;
      if (state.payloads_brought === WIN_PAYLOADS) {
        endGame();
      }
    }
  }

  if (state.gameTimer > 0) state.gameTimer -= 1;
  else if (state.gameTimer === 0) {
    endGame();
  }
  // if gameTimer is -1 then we haven't started yet, so ignore if timer < 0

  // Send the state to all players
  io.sockets.emit("state", state);
}, UPDATE_TIME);

function endGame() {
  // prevent any further user actions
  state.gameOver = true;
  state.gameTimer = -1;

  // TODO: display winner text on client side
    // winner = state.payloads_brought === WIN_PAYLOADS ? "Good" : "Bad";
    // winnerText = winner + " team won!";
  // TODO: reset server room for new game once all disconnect
}

function startGame() {
  console.log("Game start");
  //TODO: render some "game start" text on the client side/confirmation
  // show UI text for payloads_brought
  state.gameTimer = ROUND_TIMING;
  state.gameOver = false;
  state.payloads_brought = 0;

  // Initialize payload array to false
  for (let i = 0; i < map.length; i++) {
    state.payloads[i] = false;
  }
  generatePayloads(MAX_PAYLOADS);
}

function generatePayloads(numberToAdd) {
  if (numberToAdd > map.length) {
    console.log("ERROR: invalid input to generatePayloads");
    return;
  }
  // Initialize payload locations
  for (let i = 0; i < numberToAdd; i++) {
    let foundPayload = false;
    // Keep looking for an empty node on the map
    while (!foundPayload) {
      // Random number between 0 and map.length-1 (inclusive)
      let j = Math.floor(Math.random() * (map.length));
      // shouldn't be the node we bring payloads to
      if (j === PAYLOAD_NODE) continue;

      // Check if we can add the payload
      if (state.payloads[j] === false) {
        state.payloads[j] = true;
        foundPayload = true;
        break;
      }
    }
  }
}

//listen to the port 3000
http.listen(3000, () => {
  console.log("listening on *:3000");
});
