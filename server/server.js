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
// ✅ Serve static files from the "public" directory


const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const games = new LiveGames();
const players = new Players();

app.use(express.static(path.join(__dirname, 'public')));

// ✅ MongoDB URI from environment variables
const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://v7zy:iUNHkBLElpvKi731@tabilya-game3.odtsp5d.mongodb.net/?retryWrites=true&w=majority&appName=tabilya-game3";

// ✅ Check if MongoDB URI is available
if (!MONGO_URI) {
    console.error("❌ MongoDB URI is missing! Please check your environment variables.");
    process.exit(1); // Stop server if MongoDB URI is not set
}

// ✅ Function to establish MongoDB connection
async function connectToMongoDB() {
    try {
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("✅ MongoDB connected successfully!");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1); // Stop the server on connection failure
    }
}

// ✅ Run connection
connectToMongoDB();

app.use('/socket.io', express.static(path.join(__dirname, '../node_modules/socket.io/client-dist')));
// Serve static files
app.use(express.static(publicPath));

const PORT = process.env.PORT || 3000;  // Use environment variable or fallback to 3000

// ✅ Start server on port 3000
server.listen(PORT, async () => {
    console.log("✅ Server started on port", PORT);
    const open = (await import('open')).default;
    open('http://localhost:3000');
});

// ✅ Handle WebSocket connections
io.on('connection', (socket) => {
    console.log("🟢 New client connected!");

    // When host connects for the first time
    socket.on('host-join', async (data) => {
        try {
            const db = mongoose.connection.db;
            const result = await db.collection('kahootGames').findOne({ id: parseInt(data.id) });

            if (result) {
                const gamePin = Math.floor(Math.random() * 90000) + 10000;
                games.addGame(gamePin, socket.id, false, { playersAnswered: 0, questionLive: false, gameid: data.id, question: 1 });

                const game = games.getGame(socket.id);
                socket.join(game.pin);

                console.log(`✅ Game Created with pin: ${game.pin}`);
                socket.emit('showGamePin', { pin: game.pin });
            } else {
                socket.emit('noGameFound');
            }
        } catch (err) {
            console.error("❌ Database query error:", err);
        }
    });

    // Player joining game
    socket.on('player-join', (params) => {
        let gameFound = false;

        for (const game of games.games) {
            if (params.pin === game.pin) {
                console.log('✅ Player connected to game');

                const hostId = game.hostId;
                players.addPlayer(hostId, socket.id, params.name, { score: 0, answer: 0 });

                socket.join(params.pin);
                const playersInGame = players.getPlayers(hostId);
                io.to(params.pin).emit('updatePlayerLobby', playersInGame);
                gameFound = true;
            }
        }

        if (!gameFound) {
            socket.emit('noGameFound');
        }
    });

    // Host starts game
    socket.on('startGame', () => {
        const game = games.getGame(socket.id);
        if (game) {
            game.gameLive = true;
            socket.emit('gameStarted', game.hostId);
        }
    });

    // Player answers a question
    socket.on('playerAnswer', async (num) => {
        const player = players.getPlayer(socket.id);
        if (!player) return;

        const game = games.getGame(player.hostId);
        if (game && game.gameData.questionLive) {
            player.gameData.answer = num;
            game.gameData.playersAnswered++;

            try {
                const db = mongoose.connection.db;
                const result = await db.collection('kahootGames').findOne({ id: parseInt(game.gameData.gameid) });

                if (result) {
                    const correctAnswer = result.questions[game.gameData.question - 1].correct;

                    if (num === correctAnswer) {
                        player.gameData.score += 100;
                        io.to(game.pin).emit('getTime', socket.id);
                        socket.emit('answerResult', true);
                    }

                    if (game.gameData.playersAnswered === players.getPlayers(game.hostId).length) {
                        game.gameData.questionLive = false;
                        const playerData = players.getPlayers(game.hostId);
                        io.to(game.pin).emit('questionOver', playerData, correctAnswer);
                    } else {
                        io.to(game.pin).emit('updatePlayersAnswered', {
                            playersInGame: players.getPlayers(game.hostId).length,
                            playersAnswered: game.gameData.playersAnswered
                        });
                    }
                }
            } catch (err) {
                console.error("❌ Database query error:", err);
            }
        }
    });

    // ✅ Handle new quiz creation (Inserts into MongoDB)
    socket.on('newQuiz', async (quiz) => {
        try {
            console.log("📥 Received new quiz:", quiz);
            const db = mongoose.connection.db;
            await db.collection('kahootGames').insertOne(quiz);
            console.log("✅ Quiz inserted successfully!");
        } catch (error) {
            console.error("❌ Error inserting quiz:", error);
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log("🔴 Client disconnected.");

        const game = games.getGame(socket.id);
        if (game) {
            if (!game.gameLive) {
                games.removeGame(socket.id);
                console.log(`❌ Game ended with pin: ${game.pin}`);

                const playersToRemove = players.getPlayers(game.hostId);
                playersToRemove.forEach(player => players.removePlayer(player.playerId));

                io.to(game.pin).emit('hostDisconnect');
                socket.leave(game.pin);
            }
        } else {
            const player = players.getPlayer(socket.id);
            if (player) {
                const game = games.getGame(player.hostId);
                if (game && !game.gameLive) {
                    players.removePlayer(socket.id);
                    const playersInGame = players.getPlayers(player.hostId);
                    io.to(game.pin).emit('updatePlayerLobby', playersInGame);
                    socket.leave(game.pin);
                }
            }
        }
    });
});
