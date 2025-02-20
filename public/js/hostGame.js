var socket = io();
var params = jQuery.deparam(window.location.search); // Get ID from URL
var timer;
var time = 20;

// ✅ When host connects to the server
socket.on('connect', function () {
    socket.emit('host-join-game', params);
});

// ❌ If no game found, redirect to home page
socket.on('noGameFound', function () {
    window.location.href = '../../';
});

// ✅ Receive and display game questions
socket.on('gameQuestions', function (data) {
    document.getElementById('question').innerHTML = data.q1;
    document.getElementById('answer1').innerHTML = data.a1;
    document.getElementById('answer2').innerHTML = data.a2;
    document.getElementById('answer3').innerHTML = data.a3;
    document.getElementById('answer4').innerHTML = data.a4;
    document.getElementById('playersAnswered').innerHTML = "اللاعبين الذين أجابوا: 0 / " + data.playersInGame;
    updateTimer();
});

// ✅ Update the number of players who have answered
socket.on('updatePlayersAnswered', function (data) {
    document.getElementById('playersAnswered').innerHTML = `اللاعبين الذين أجابوا: ${data.playersAnswered} / ${data.playersInGame}`;
});

// ✅ Handle end of question
socket.on('questionOver', function (playerData, correct) {
    clearInterval(timer);
    var answersCount = [0, 0, 0, 0]; // Track answer counts
    var totalPlayers = 0;

    // Hide UI elements
    document.getElementById('playersAnswered').style.display = "none";
    document.getElementById('timerText').style.display = "none";

    // Show correct answer
    highlightCorrectAnswer(correct);

    // Count player answers
    playerData.forEach(player => {
        if (player.gameData.answer > 0) {
            answersCount[player.gameData.answer - 1]++;
        }
        totalPlayers++;
    });

    // Calculate answer percentages
    for (let i = 0; i < 4; i++) {
        answersCount[i] = totalPlayers ? (answersCount[i] / totalPlayers) * 100 : 0;
        document.getElementById(`square${i + 1}`).style.height = answersCount[i] + "px";
        document.getElementById(`square${i + 1}`).style.display = "inline-block";
    }

    // Show next question button
    document.getElementById('nextQButton').style.display = "block";
});

// ✅ Move to next question
function nextQuestion() {
    resetUI();
    document.getElementById('num').innerHTML = "20";
    socket.emit('nextQuestion');
}

// ✅ Update the countdown timer
function updateTimer() {
    time = 20;
    timer = setInterval(() => {
        time--;
        document.getElementById('num').textContent = " " + time;
        if (time === 0) {
            socket.emit('timeUp');
        }
    }, 1000);
}

// ✅ Handle game over event
socket.on('GameOver', function (data) {
    resetUI();
    document.getElementById('question').innerHTML = "اللعبة انتهت";
    document.getElementById('winnerTitle').style.display = "block";

    const winners = ["winner1", "winner2", "winner3", "winner4", "winner5"];
    winners.forEach((id, index) => {
        if (data[`num${index + 1}`]) {
            document.getElementById(id).style.display = "block";
            document.getElementById(id).innerHTML = `${index + 1}. ${data[`num${index + 1}`]}`;
        }
    });
});

// ✅ Handle individual player times
socket.on('getTime', function (player) {
    socket.emit('time', { player: player, time: time });
});

/** Utility Functions **/

// ✅ Highlight the correct answer
function highlightCorrectAnswer(correct) {
    const answers = ["answer1", "answer2", "answer3", "answer4"];
    answers.forEach((id, index) => {
        if (index + 1 === correct) {
            document.getElementById(id).innerHTML = "✅ " + document.getElementById(id).innerHTML;
        } else {
            document.getElementById(id).style.filter = "grayscale(50%)";
        }
    });
}

// ✅ Reset UI for next question
function resetUI() {
    document.getElementById('nextQButton').style.display = "none";
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`square${i}`).style.display = "none";
        document.getElementById(`answer${i}`).style.filter = "none";
    }
    document.getElementById('playersAnswered').style.display = "block";
    document.getElementById('timerText').style.display = "block";
}
