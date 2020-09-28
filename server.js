const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

//when a client connects serve the static files in the public directory
app.use(express.static("public"));

const MAX_PLAYERS = 5;

// the game state
const state = {
  players: {},
};

io.on("connection", (socket) => {
  console.log("A user connected");

  if (Object.keys(state.players).length < MAX_PLAYERS) {
    socket.emit("message", "welcome to the game");
  } else {
    socket.emit("message", "sorry, game is currently full");
    // TODO create a new "room" that acts as a new game for the next set of players
    // https://socket.io/docs/rooms/
  }

  //   //when a client performs an action...
  //   socket.on("clientAction", function (obj) {
  //     //I log it on the console
  //     console.log("A client pressed at " + obj.x + "," + obj.y);

  //     //and send it to all clients
  //     io.emit("action", obj);

  //     //sending to all clients except sender
  //     socket.broadcast.emit("message", "It wasn't you!");
  //   });
});

//listen to the port 3000
http.listen(3000, () => {
  console.log("listening on *:3000");
});
