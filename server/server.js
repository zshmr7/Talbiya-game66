// Import dependencies
const path = require('path');
const http = require('http');
const express = require('express');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables

// Import classes
const { LiveGames } = require('./utils/liveGames');
const { Players } = require('./utils/players');

const publicPath = path.join(__dirname, '../public');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const games = new LiveGames();
const players = new Players();

// ✅ Serve static files from the "public" directory
app.use(express.static(publicPath));

// ✅ MongoDB URI from environment variables
const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://v7zy:iUNHkBLElpvKi731@tabilya-game3.odtsp5d.mongodb.net/?retryWrites=true&w=majority&appName=tabilya-game3";

if (!MONGO_URI) {
    console.error("❌ MongoDB URI is missing! Please check your environment variables.");
    process.exit(1);
}

// ✅ Connect to MongoDB
async function connectToMongoDB() {
    try {
        await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("✅ MongoDB connected successfully!");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1);
    }
}

connectToMongoDB();

app.use('/socket.io', express.static(path.join(__dirname, '../node_modules/socket.io/client-dist')));

// ✅ Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});

// ✅ WebSocket connections
io.on('connection', (socket) => {
    console.log("🟢 New client connected!");

    // ✅ Handle new quiz creation
    socket.on('newQuiz', async (quiz) => {
        console.log("📥 Received new quiz:", quiz);

        const db = mongoose.connection.db;
        const gamePin = Math.floor(10000 + Math.random() * 90000); // Generate 5-digit PIN
        quiz.pin = gamePin;

        // ✅ Insert quiz into database
        await db.collection('kahootGames').insertOne(quiz);
        console.log("✅ Quiz saved with PIN:", gamePin);

        // ✅ Send PIN back to the creator & redirect them to the lobby
        socket.emit("quizCreated", gamePin);
        io.emit("displayQuizPin", gamePin);
    });

    // ✅ Player joins game
    socket.on('player-join', (data) => {
        const game = games.getGameByPin(data.pin);
        if (game) {
            console.log(`✅ Player "${data.playerName}" joined game with PIN: ${data.pin}`);
            players.addPlayer(game.hostId, socket.id, data.playerName, { score: 0, answer: 0 });
            socket.join(data.pin);

            const playersInGame = players.getPlayers(game.hostId);
            io.to(data.pin).emit("updatePlayerLobby", playersInGame);
        } else {
            socket.emit("noGameFound");
        }
    });

    // ✅ Host starts game
    socket.on("startGame", (pin) => {
        const game = games.getGameByPin(pin);
        if (game) {
            game.gameLive = true;
            io.to(pin).emit("gameStarted");
        }
    });

    // ✅ Handle disconnection
    socket.on("disconnect", () => {
        console.log("🔴 Client disconnected");
    });
});
