var socket = io();
var params = jQuery.deparam(window.location.search);

// ✅ When host connects to server
socket.on('connect', function () {
    document.getElementById('players').value = ""; // Clear players list
    socket.emit('host-join', params); // Tell server this is a host connection
});

// ✅ Display game PIN when received
socket.on('showGamePin', function (data) {
    if (data && data.pin) {
        document.getElementById('gamePinText').innerHTML = data.pin;
    } else {
        console.error("❌ Error: No game PIN received.");
    }
});

// ✅ Update the player list in the lobby
socket.on('updatePlayerLobby', function (data) {
    const playersTextArea = document.getElementById('players');
    playersTextArea.value = ""; // Clear previous list

    if (data && data.length > 0) {
        data.forEach(player => {
            playersTextArea.value += `${player.name}\n`;
        });
    } else {
        console.warn("⚠️ No players found in the lobby.");
    }
});

// ✅ Start game when host clicks "Start Game"
function startGame() {
    socket.emit('startGame');
}

// ✅ End game and return to home
function endGame() {
    window.location.href = "/";
}

// ✅ When server starts the game, navigate to the game screen
socket.on('gameStarted', function (id) {
    if (id) {
        console.log('🎮 Game Started!');
        window.location.href = `/host/game/?id=${id}`;
    } else {
        console.error("❌ Error: No game ID received.");
    }
});

// ❌ If no game is found, redirect to the home page
socket.on('noGameFound', function () {
    window.location.href = '../../';
});
