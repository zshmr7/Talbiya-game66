var socket = io();
var playerAnswered = false;
var correct = false;
var name;
var score = 0;

var params = jQuery.deparam(window.location.search); // Gets player ID from URL

// ✅ When player connects
socket.on('connect', function () {
    // Tell the server that a player is joining a game
    socket.emit('player-join-game', params);

    // Show answer buttons
    showAnswerButtons();
});

// ❌ If the game is not found, redirect to the home page
socket.on('noGameFound', function () {
    window.location.href = '../../';
});

// ✅ Function when player submits an answer
function answerSubmitted(num) {
    if (!playerAnswered) {
        playerAnswered = true;
        socket.emit('playerAnswer', num); // Send answer to server

        hideAnswerButtons();
        showMessage("في انتظار باقي اللاعبين للإجابة !");
    }
}

// ✅ Handle answer result
socket.on('answerResult', function (data) {
    correct = data;
});

// ✅ Handle question completion
socket.on('questionOver', function (data) {
    if (correct) {
        setBackground("#4CAF50");
        showMessage("إجابة صحيحة!");
    } else {
        setBackground("#f94a1e");
        showMessage("إجابة خاطئة!");
    }

    hideAnswerButtons();
    socket.emit('getScore'); // Request updated score
});

// ✅ Update player score
socket.on('newScore', function (data) {
    document.getElementById('scoreText').innerHTML = "النقاط: " + data;
});

// ✅ Handle next question
socket.on('nextQuestionPlayer', function () {
    correct = false;
    playerAnswered = false;

    showAnswerButtons();
    hideMessage();
    resetBackground();
});

// ❌ If the host disconnects, send the player back to the home page
socket.on('hostDisconnect', function () {
    window.location.href = "../../";
});

// ✅ Update player game data (Name & Score)
socket.on('playerGameData', function (data) {
    for (var i = 0; i < data.length; i++) {
        if (data[i].playerId === socket.id) {
            document.getElementById('nameText').innerHTML = "الاسم: " + data[i].name;
            document.getElementById('scoreText').innerHTML = "النقاط: " + data[i].gameData.score;
        }
    }
});

// ✅ Handle game over
socket.on('GameOver', function () {
    setBackground("#FFFFFF");
    hideAnswerButtons();
    showMessage("حظًا موفقًا!");
});

/** Utility Functions **/
function showAnswerButtons() {
    document.getElementById('answer1').style.visibility = "visible";
    document.getElementById('answer2').style.visibility = "visible";
    document.getElementById('answer3').style.visibility = "visible";
    document.getElementById('answer4').style.visibility = "visible";
}

function hideAnswerButtons() {
    document.getElementById('answer1').style.visibility = "hidden";
    document.getElementById('answer2').style.visibility = "hidden";
    document.getElementById('answer3').style.visibility = "hidden";
    document.getElementById('answer4').style.visibility = "hidden";
}

function showMessage(msg) {
    document.getElementById('message').style.display = "block";
    document.getElementById('message').innerHTML = msg;
}

function hideMessage() {
    document.getElementById('message').style.display = "none";
}

function setBackground(color) {
    document.body.style.backgroundColor = color;
}

function resetBackground() {
    document.body.style.backgroundColor = "white";
}
