var socket = io();

// ✅ When player connects to the server
socket.on('connect', function () {
    var params = jQuery.deparam(window.location.search); // Get data from URL

    if (params && params.pin) {
        socket.emit('player-join', params); // Tell server it's a player connection
        console.log("✅ Player joining game with PIN:", params.pin);
    } else {
        console.error("❌ Error: Missing game PIN.");
        window.location.href = '../'; // Redirect back to home if no PIN
    }
});

// ❌ Boot player back to join screen if game PIN is invalid
socket.on('noGameFound', function () {
    alert("❌ No game found with this PIN. Please try again.");
    window.location.href = '../'; // Redirect to main page
});

// ❌ Redirect player if the host disconnects
socket.on('hostDisconnect', function () {
    alert("⚠️ The game host has disconnected. Returning to main page.");
    window.location.href = '../';
});

// ✅ When the host starts the game, move the player to the game screen
socket.on('gameStartedPlayer', function () {
    console.log("🎮 Game started! Navigating to the player game screen...");
    window.location.href = "/player/game/?id=" + socket.id;
});

// ✅ Update the lobby with the latest list of players
socket.on('updatePlayerLobby', function (playerList) {
    const playerListElement = document.getElementById('playerList');

    if (playerListElement) {
        playerListElement.innerHTML = ""; // Clear previous list

        if (playerList && playerList.length > 0) {
            playerList.forEach(player => {
                let listItem = document.createElement('li');
                listItem.textContent = player.name;
                playerListElement.appendChild(listItem);
            });
        } else {
            console.warn("⚠️ No players found in the lobby.");
        }
    } else {
        console.error("❌ Error: 'playerList' element not found in the HTML.");
    }
});
