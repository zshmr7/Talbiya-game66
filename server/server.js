// Import dependencies
const path = require('path');
const http = require('http');
const express = require('express');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
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

// MongoDB setup
const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://v7zy@outlook.com:Zz0599759271%3F%3F%0A@cluster.mongodb.net/kahootDB";

// Connect to MongoDB using Mongoose
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected successfully!"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// Connect to MongoDB using Native MongoClient (for manual queries)
MongoClient.connect(MONGO_URI, (err, db) => {
    if (err) {
        console.error("❌ MongoClient connection error:", err);
        return;
    }
    console.log("✅ MongoClient connected successfully!");
    db.close();
});

// Serve static files
app.use(express.static(publicPath));

// Start server on port 3000
server.listen(3000, async () => {
    console.log("✅ Server started on port 3000");
    const open = (await import('open')).default;
    open('http://localhost:3000');
});

// Handle WebSocket connections
io.on('connection', (socket) => {
    
    // When host connects for the first time
    socket.on('host-join', (data) => {
        MongoClient.connect(MONGO_URI, (err, db) => {
            if (err) throw err;
            const dbo = db.db("kahootDB");
            const query = { id: parseInt(data.id) };

            dbo.collection('kahootGames').find(query).toArray((err, result) => {
                if (err) throw err;

                if (result.length > 0) {
                    const gamePin = Math.floor(Math.random() * 90000) + 10000;
                    games.addGame(gamePin, socket.id, false, { playersAnswered: 0, questionLive: false, gameid: data.id, question: 1 });

                    const game = games.getGame(socket.id);
                    socket.join(game.pin);

                    console.log('✅ Game Created with pin:', game.pin);

                    socket.emit('showGamePin', { pin: game.pin });
                } else {
                    socket.emit('noGameFound');
                }
                db.close();
            });
        });
    });

    // Player joining game
    socket.on('player-join', (params) => {
        let gameFound = false;

        for (let i = 0; i < games.games.length; i++) {
            if (params.pin === games.games[i].pin) {
                console.log('✅ Player connected to game');

                const hostId = games.games[i].hostId;
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
    socket.on('playerAnswer', (num) => {
        const player = players.getPlayer(socket.id);
        if (!player) return;

        const game = games.getGame(player.hostId);
        if (game && game.gameData.questionLive) {
            player.gameData.answer = num;
            game.gameData.playersAnswered++;

            MongoClient.connect(MONGO_URI, (err, db) => {
                if (err) throw err;
                const dbo = db.db('kahootDB');
                const query = { id: parseInt(game.gameData.gameid) };

                dbo.collection("kahootGames").find(query).toArray((err, res) => {
                    if (err) throw err;
                    const correctAnswer = res[0].questions[game.gameData.question - 1].correct;

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
                    db.close();
                });
            });
        }
    });

    // When a player or host disconnects
    socket.on('disconnect', () => {
        const game = games.getGame(socket.id);
        if (game) {
            if (!game.gameLive) {
                games.removeGame(socket.id);
                console.log('❌ Game ended with pin:', game.pin);

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