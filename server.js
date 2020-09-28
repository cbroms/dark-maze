var express = require("express");
var app = express();
var http = require("http").createServer(app);
var io = require("socket.io")(http);

//when a client connects serve the static files in the public directory ie public/index.html
app.use(express.static("public"));

//when a client connects
io.on("connection", function (socket) {
  //this appears in the terminal
  console.log("A user connected");

  //this is sent to the client upon connection
  socket.emit("message", "Hello welcome!");

  //when a client performs an action...
  socket.on("clientAction", function (obj) {
    //I log it on the console
    console.log("A client pressed at " + obj.x + "," + obj.y);

    //and send it to all clients
    io.emit("action", obj);

    //sending to all clients except sender
    socket.broadcast.emit("message", "It wasn't you!");
  });
});

//listen to the port 3000
http.listen(3000, function () {
  console.log("listening on *:3000");
});
