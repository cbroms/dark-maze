const express = require("express");
const path = require("path");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

//when a client connects serve the static files in the public directory
app.use(express.static("public"));

app.get("/", function(req, res) {
  res.sendFile(path.join(__dirname + "/public/index.html"));
});

app.get("/network", function(req, res) {
  res.sendFile(path.join(__dirname + "/public/game.html"));
});

// the rate the server updates all the clients, FPS frames per sec
const FPS = 10;
const UPDATE_TIME = 1000 / FPS;
const MAX_PLAYERS = 4;
const MAX_ROOMS = 6;

// Timer variables: seconds they should be * FPS
const MAX_COOLDOWN = 3 * FPS;
const MAX_MOVE = 2 * FPS;
const ROUND_TIMING = 120;

const MOVE_TIME = 3000; // 3 seconds

const TARGET_NODE = 11;
const MAX_PAYLOADS = 3;
const WIN_PAYLOADS = 7;

// the map
// each index represents a node in the network. The array at each index contains
// the indices that the node has connections to
mapNodes = [
  [4, 5, 1], // 1
  [5, 6, 2, 0], // 2
  [6, 1, 3], // 3
  [2, 6, 9], // 4
  [10, 0, 5, 7], // 5
  [0, 1, 6, 8, 11, 4], // 6
  [1, 5, 2, 3, 9], // 7
  [4, 10, 11], // 8
  [5, 11, 9], // 9
  [6, 8, 11, 13, 14, 3], // 10
  [4, 7, 11, 12], // 11
  [10, 7, 5, 8, 9, 12, 15], // 12
  [10, 11, 15, 16, 17], // 13
  [15, 9, 20], // 14
  [9, 20], // 15
  [11, 12, 17, 19, 13], // 16
  [21, 12, 17], //  17
  [15, 12, 16, 21, 22], // 18
  [23, 19, 22], // 19
  [15, 18, 20, 23], // 20
  [19, 13, 14], // 21
  [16, 17, 23], // 22
  [21, 17, 18, 23], // 23
  [22, 18, 19, 20], //
];

// payload spawn nodes
// TODO: make sure none are adjacent to the center node!!!
const payloadSpawns = [1, 3, 4, 6, 11, 14, 18, 23];

// the position of each node on the screen
const positions = [
  { x: 50, y: 85 },
  { x: 50, y: 200 },
  { x: 50, y: 500 },
  { x: 60, y: 600 },
  { x: 200, y: 85 },
  { x: 300, y: 280 },
  { x: 300, y: 500 },
  { x: 500, y: 200 },
  { x: 480, y: 450 },
  { x: 550, y: 600 },
  { x: 600, y: 85 },
  { x: 600, y: 350 },
  { x: 720, y: 100 },
  { x: 750, y: 450 },
  { x: 750, y: 620 },
  { x: 850, y: 350 },
  { x: 900, y: 100 },
  { x: 1000, y: 200 },
  { x: 1000, y: 380 },
  { x: 950, y: 500 },
  { x: 1000, y: 620 },
  { x: 1100, y: 100 },
  { x: 1100, y: 350 },
  { x: 1100, y: 600 },
];

// initializes edges list of edgeID's
// i is the current node, j is the index of edge list, k is adjacent node
var edges = [];
for (let i = 0; i < mapNodes.length; i++) {
  var currEdges = mapNodes[i];
  for (let j = 0; j < currEdges.length; j++) {
    let k = currEdges[j];
    if (!edges.includes(k + "_" + i) && !edges.includes(i + "_" + k)) {
      edges.push(i + "_" + k);
      console.log(i + "_" + k + " edge added to server");
    }
  }
}

var rooms = [];

function addRoom() {
  // the game state
  var state = {
    players: {},
    payloads: [],
    payloads_brought: 0,
    gameTimer: -1,
    gameOver: false,
  };

  // Initialize payload array to false
  for (let j = 0; j < mapNodes.length; j++) {
    state.payloads[j] = false;
  }
  generatePayloads(MAX_PAYLOADS, state);

  rooms.push(state);

  console.log("added room ", rooms.length - 1);
  return [rooms.length - 1, state];
}

// for reference
// var state = {
//   players: {}, // maps player socket ID to player state
//   payloads: [], // array of booleans per node, true if node has payload
//   payloads_brought = 0, // # payloads brought to PAYLOAD_NODE
//   gameTimer: -1,
//   gameOver: false,
// };

// for reference
// playerState = {
//   playerNode: int, // which node they are on (if moving)
//   playerEdge: string, // which edge they are on (if moving)
//   isBad: bool, // if the player is "it"
//   hasPayload: bool, // if player is carrying payload
//   moveTimer: bool, // if player is moving
//   coolTimer: bool, // if player is on cooldown
// };

/* TODO client side
   --note: the naming convention I used for edge.ID is a string "node1node2",
     unfortunately it's kind of hard coded like that in the "move" function to
     make handling a move easier so just an FYI (so when you're rendering edges 
     you can just use player.playerEdge to get the edgeID to render)
   --handle rendering different map views based on if player.isBad is true
   --handle receiving "map" w/mapNodes object
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
   --overall we need to set up diff maps and set a max payloads per map + total
   payloads needed to win for each map
   --player disconnect isn't detected for some reason
*/

// io.set('heartbeat timeout', 10);
// io.set('heartbeat interval', 4);

const queue = [];

io.on("connection", (socket) => {
  console.log("A user connected, adding to queue");

  let state = {};
  let currRoomID = null;

  const setRoomId = (id) => {
    currRoomID = id;
    state = rooms[currRoomID];
  };

  queue.push({ socket: socket, setRoomId: setRoomId });

  if (queue.length >= MAX_PLAYERS) {
    console.log("removing players from queue and starting game");

    // get the first four players from the queue
    const playersToAdd = queue.slice(0, MAX_PLAYERS);
    // remove them from the queue
    for (let i = 0; i < MAX_PLAYERS; i++) {
      queue.shift();
    }

    // create a new room
    const [roomId, roomState] = addRoom();

    // add the users to the room
    for (let i = 0; i < playersToAdd.length; i++) {
      const playerSocket = playersToAdd[i].socket;

      playerSocket.join(roomId);
      playerSocket.emit("message", "welcome to room");

      // set the second to last player to be the bad guy
      let isBadPlayer = i === MAX_PLAYERS - 2;

      console.log(
        "Creating player " +
          playerSocket.id +
          " there are now " +
          (i + 1) +
          " players in " +
          roomId
      );

      // send the map info to the client
      playerSocket.emit("map", {
        mapNodes: mapNodes,
        positions: positions,
        targetNode: TARGET_NODE,
        payloadNodes: roomState.payloads,
        edges: edges,
        players: roomState.players,
        constants: {
          MOVE_TIME: MOVE_TIME,
          WIN_PAYLOADS: WIN_PAYLOADS,
          ROOM_ID: roomId,
        },
      });

      // Bad spawn in right side of map, good spawns on left side
      var spawnNode = isBadPlayer
        ? Math.floor(
            (Math.random() * mapNodes.length) / 2 + mapNodes.length / 2
          )
        : Math.floor((Math.random() * mapNodes.length) / 2);

      // I saw weird bugs when players spawn on payload nodes, so avoiding that
      while (payloadSpawns.includes(spawnNode)) {
        var spawnNode = isBadPlayer
          ? Math.floor(
              (Math.random() * mapNodes.length) / 2 + mapNodes.length / 2
            )
          : Math.floor((Math.random() * mapNodes.length) / 2);
      }

      // let the other clients know the new player is here
      io.to(roomId).emit("entered", {
        player: playerSocket.id,
        node: spawnNode,
        isBad: isBadPlayer,
        hasPayload: false,
      });

      // add the new player to state
      roomState.players[playerSocket.id] = {
        playerNode: spawnNode,
        isBad: isBadPlayer,
        hasPayload: false,
      };

      // Start the game when we have 4 players
      if (i === playersToAdd.length - 1) {
        startGame(roomId, false);
      }

      // set the player's room id/state vars
      playersToAdd[i].setRoomId(roomId);
    }
  } else {
    socket.emit("message", "you're in the queue!");
  }

  socket.on("message", function(obj) {
    //do something with a message
  });

  socket.on("endGame", function(obj) {
    endGame(currRoomID);
  });

  // Handle user requests here
  socket.on("move", function(node) {
    var playerState = state.players[socket.id];

    // IF move not valid, do nothing
    if (state.gameTimer <= 0) {
      return;
    }

    // if (!(mapNodes[playerState.playerNode].includes(node) === true)) {
    //   return;
    // }
    // Figure out the edgeID of the edge we are moving on
    var currEdge = "";
    for (var edge of edges) {
      if (edge === node + "_" + playerState.playerNode) {
        currEdge = node + "_" + playerState.playerNode;
        break;
      } else if (edge === playerState.playerNode + "_" + node) {
        currEdge = playerState.playerNode + "_" + node;
        break;
      }
    }

    if (currEdge === "") return; // no such edge exists

    io.to(currRoomID).emit("moved", {
      player: socket.id,
      edge: currEdge,
      prevNode: playerState.playerNode,
      isBad: playerState.isBad,
      hasPayload: playerState.hasPayload,
      node: node,
      wasKilled: false,
    });

    playerState.playerEdge = currEdge;
    playerState.playerNode = null;
    // wait to place that player on the node until after they've moved
    setTimeout(() => {
      state.players[socket.id].playerNode = node;

      // if you're a good guy, check if there's a bad guy there
      if (!state.players[socket.id].isBad) {
        for (const player in state.players) {
          if (
            state.players[player].playerNode === node &&
            state.players[player].isBad
          ) {
            // kill me now lol
            const playerState = state.players[socket.id];

            console.log("moving to spawn ", socket.id);
            io.to(currRoomID).emit("moved", {
              player: socket.id,
              edge: null,
              prevNode: playerState.playerNode,
              isBad: playerState.isBad,
              hasPayload: false,
              node: 0,
              wasKilled: true,
            });
            playerState.hasPayload = false;
            playerState.playerNode = 0;
          }
        }
      } else {
        // if you're the bad guy, kill everyone on the node
        const killList = [];
        for (const player in state.players) {
          if (
            state.players[player].playerNode === node &&
            player !== socket.id
          ) {
            // kill that player
            const playerState = state.players[player];
            console.log("moving to spawn ", player);
            io.to(currRoomID).emit("moved", {
              player: player,
              edge: null,
              prevNode: playerState.playerNode,
              isBad: playerState.isBad,
              hasPayload: false,
              node: 0,
              wasKilled: true,
            });
            playerState.hasPayload = false;
            playerState.playerNode = 0;
          }
        }
      }

      // if you're the good guy and the node is a payload node, pick up the payload
      if (!state.players[socket.id].isBad && state.payloads[node]) {
        io.to(currRoomID).emit("pickedUpPayload", {
          player: socket.id,
          node: node,
        });
        state.players[socket.id].hasPayload = true;
      }

      // if you're the good guy and the node is the payload target, drop it there
      if (
        !state.players[socket.id].isBad &&
        node === TARGET_NODE &&
        state.players[socket.id].hasPayload === true
      ) {
        state.payloads_brought++;
        io.to(currRoomID).emit("droppedPayload", {
          player: socket.id,
          node: node,
          payloads_brought: state.payloads_brought,
        });
        state.players[socket.id].hasPayload = false;
      }
    }, MOVE_TIME);
  });

  // If player disconnects from room
  socket.on("disconnect", function() {
    if (currRoomID !== null) {
      console.log("Player has left " + currRoomID);
      const playerState = state.players[socket.id];

      io.to(currRoomID).emit("exited", {
        player: socket.id,
        edge: playerState.playerEdge,
        node: playerState.playerNode,
      });

      delete state.players[socket.id];
      // Reset room for new game once all players have left
      if (Object.keys(state.players).length === 0) {
        if (state.gameTimer >= 0) {
          // force quit current game
          endGame(currRoomID);
        }
        state.gameOver = false;
      }
    } else {
      // remove the player from the queue
      for (let i = 0; i < queue.length; i++) {
        if (queue[i].socket.id === socket.id) {
          queue.splice(i, 1);
          console.log("Player has left, removed from queue");
        }
      }
    }
  });
}); // end onConnect

// Round timer sent every second
setInterval(function() {
  for (var roomID in rooms) {
    var roomState = rooms[roomID];
    if (roomState.gameTimer > 0) {
      roomState.gameTimer -= 1;
      io.to(roomID).emit("gameTimer", { time: roomState.gameTimer });
      if (roomState.gameTimer === 0) {
        endGame(roomID);
      }
    }
  }
}, 1000);

function endGame(roomID) {
  var state = rooms[roomID];
  if (state.gameOver === true) return; // don't allow duplicate calls
  console.log("Game end in " + roomID);
  // prevent any further user actions
  state.gameOver = true;
  state.gameTimer = -1;

  // TODO: display winner text on client side
  // winner = state.payloads_brought === WIN_PAYLOADS ? "Good" : "Bad";
  // winnerText = winner + " team won!";
}

function startGame(roomID, toShuffle) {
  console.log("Game start in " + roomID);
  var state = rooms[roomID];

  state.gameTimer = ROUND_TIMING;
  state.gameOver = false;
  state.payloads_brought = 0;

  //TODO: if shuffling same room's players
  if (toShuffle) {
    // pick new bad player
    var newBad = Math.floor(Math.random() * MAX_PLAYERS);
    var counter = 0;
    for (player in state.players) {
      playerObj = state.players[player];
      playerObj.isBad = counter === newBad ? true : false;
      counter++;

      // update player spawn location to random
      // set has payload to false
    }

    // Set new payloads
    for (let i = 0; i < mapNodes.length; i++) {
      state.payloads[i] = false;
    }
    generatePayloads(MAX_PAYLOADS, state);

    // Send new info to players: map, players
    // re-render everything on client side
  }
}

function generatePayloads(numberToAdd, state) {
  if (numberToAdd > mapNodes.length) {
    console.log("ERROR: invalid input to generatePayloads");
    return;
  }

  // Only add up to the length of payloadSpawns
  var toAdd = Math.min(numberToAdd, payloadSpawns.length);

  // randomly select n payload locations
  for (let i = 0; i < toAdd; i++) {
    const node =
      payloadSpawns[Math.floor(Math.random() * payloadSpawns.length)];
    if (state.payloads[node] === false) state.payloads[node] = true;
    else i--; // Retry until we get to a new payload node
  }

  // // Initialize payload locations
  // for (let i = 0; i < numberToAdd; i++) {
  //   let foundPayload = false;
  //   // Keep looking for an empty node on the map
  //   while (!foundPayload) {
  //     // Random number between 0 and mapNodes.length-1 (inclusive)
  //     let j = Math.floor(Math.random() * mapNodes.length);
  //     // shouldn't be the node we bring payloads to
  //     if (j === PAYLOAD_NODE) continue;

  //     // Check if we can add the payload
  //     if (state.payloads[j] === false) {
  //       state.payloads[j] = true;
  //       foundPayload = true;
  //       break;
  //     }
  //   }
  // }
}

//listen to the port 3000
http.listen(process.env.PORT || 3000, () => {
  console.log("listening on ", process.env.PORT || 3000);
});
