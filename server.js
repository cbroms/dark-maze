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

// the game state
var state = {
  players: {},
  payloads: [],
  gameTimer: -1,
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

// EVENTS FROM CLIENT:
// "move" --> {node: int}

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

    // TODO: send the map to the client
    socket.emit("map", map);

    // Start the game when we have 4 players
    if (Object.keys(state.players).length === MAX_PLAYERS) {
      startGame();
    }
  } else {
    socket.emit("message", "sorry, game is currently full");
    // TODO create a new "room" that acts as a new game for the next set of players
    // https://socket.io/docs/rooms/
  }

  socket.on("message", function (obj) {
    //do something with a message
  });

  // Handle user requests here
  socket.on("action", function (obj) {
    //respawn payload elsewhere + set hasLoad to false whenever "it" touches player
    //keep track of how many on map at given time
    //TODO check if player is currently moving; if so don't highlight other movement nodes + don't let them click anything
    //TODO if player touches payload set "hasPayload" to true
    //TODO check if player is on cooldown before letting them click
    //TODO check if player is currently moving; if so don't highlight other movement nodes + don't let them click anything
  });

  // setInterval works in milliseconds
  setInterval(function () {
    // Do processing of game state
    for (var playerId in state.players) {
      var playerState = state.players[playerId];
      // Cooldown on movement
      if (playerState.coolTimer > 0) {
        playerState.coolTimer--;
      }

      // Player is moving
      if (playerState.moveTimer > 0) {
        playerState.moveTimer--;
        if (playerState.moveTimer === 0) {
          playerState.coolTimer = MAX_COOLDOWN;
        }
      }
    }

    if (state.gameTimer > 0) state.gameTimer--;
    else if (state.gameTimer === 0) {
      endGame();
    }
    // if gameTimer is -1 then we haven't started yet

    //TODO stop game if timer reaches 0

    // Send the state to all players
    io.sockets.emit("state", state);
  }, UPDATE_TIME);

  //TODO: do we want an onDisconnect?
});

function endGame() {
  // prevent any further user actions
  // check # payloads in center node to see who won
  // display winner text
  // reset server for new game once all disconnect
  state.gameTimer = -1;
}

function startGame() {
  //TODO render some "game start" text on the client side/confirmation
  // show # of payloads brought to center in a text??
  state.gameTimer = ROUND_TIMING;

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
