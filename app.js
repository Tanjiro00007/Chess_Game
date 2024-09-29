// Import required modules
const express = require("express"); // Framework for building web applications
const socket = require("socket.io"); // Library for real-time web socket communication
const http = require("http"); // Node.js module to create HTTP server
const { Chess } = require("chess.js"); // Chess logic library
const path = require('path'); // Node.js module for handling file paths

// Create an Express application
const app = express();

// Create an HTTP server and wrap the Express app with it
const server = http.createServer(app);

// Initialize socket.io with the created server
const io = socket(server);

// Initialize a new Chess game instance
const chess = new Chess();

// Object to keep track of connected players
let players = {};

// Variable to track the current player's turn
let currentPlayer = "W";

// Set the view engine for the Express app to EJS
app.set("view engine", "ejs");

// Set the views directory for the Express app
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// Define the root route to render the index page
app.get("/", (req, res) => {
    res.render("index");
});

// Set up the socket.io connection event
io.on("connection", (uniquesocket) => {
    console.log("connected");

    // Assign roles to connecting players (white, black, or spectator)
    if (!players.white) {
        players.white = uniquesocket.id;
        uniquesocket.emit("playerRole", "w");
    } else if (!players.black) {
        players.black = uniquesocket.id;
        uniquesocket.emit("playerRole", "b");
    } else {
        uniquesocket.emit("spectatorRole");
    }

    // Handle disconnection event
    uniquesocket.on("disconnect", function () {
        if (uniquesocket.id === players.white) {
            delete players.white;
        } else if (uniquesocket.id === players.black) {
            delete players.black;
        }
    });

    // Handle move events from clients
    uniquesocket.on("move", (move) => {
        try {
            // Ensure the player making the move is the correct one
            if (chess.turn() === 'w' && uniquesocket.id !== players.white) return;
            if (chess.turn() === 'b' && uniquesocket.id !== players.black) return;

            // Attempt to make the move
            const result = chess.move(move);

            // If the move is valid, update the game state
            if (result) {
                currentPlayer = chess.turn();
                io.emit("move", move); // Broadcast the move to all clients
                io.emit("boardstate", chess.fen()); // Broadcast the updated board state
            } else {
                console.log("Invalid move:", move);
                uniquesocket.emit("InvalidMove", move); // Notify the player of an invalid move
            }
        } catch (err) {
            console.log(err);
            console.log("Invalid move:", move);
        }
    });
});

// Define the port number
const port = 3000;

// Start the server and listen on the specified port
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});