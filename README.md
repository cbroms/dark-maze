# Dark Maze

A game.

## Run it

Install the dependencies:

```
npm install
```

Then, run the server:

```
npm run start
```

### Organization

The server code is located in the file `server.js`. It uses express and socketio, and serves the client files from the `/public` directory. The client game logic uses p5.js for rendering and connects to the socketio server. The main client file is `public/game.js`.
