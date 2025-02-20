var socket = io();
var questionNum = 1; // Start at 1 because question 1 is already present

/**
 * Function to create a new quiz and send it to the server
 */
function updateDatabase() {
    var questions = [];
    var name = document.getElementById('name').value;

    if (!name) {
        alert("❌ Please enter a quiz name!");
        return;
    }

    for (var i = 1; i <= questionNum; i++) {
        var question = document.getElementById('q' + i)?.value;
        var answer1 = document.getElementById(i + 'a1')?.value;
        var answer2 = document.getElementById(i + 'a2')?.value;
        var answer3 = document.getElementById(i + 'a3')?.value;
        var answer4 = document.getElementById(i + 'a4')?.value;
        var correct = document.getElementById('correct' + i)?.value;

        if (!question || !answer1 || !answer2 || !answer3 || !answer4 || !correct) {
            alert(`❌ Please fill out all fields for question ${i}`);
            return;
        }

        var answers = [answer1, answer2, answer3, answer4];
        questions.push({
            "question": question,
            "answers": answers,
            "correct": parseInt(correct) // Ensure correct answer is stored as a number
        });
    }

    var quiz = {
        id: 0, // This will be set on the server
        "name": name,
        "questions": questions
    };

    console.log("📡 Sending quiz data to server:", quiz);
    socket.emit('newQuiz', quiz);
}

/**
 * Function to add a new question to the quiz dynamically
 */
function addQuestion() {
    questionNum++;

    var questionsDiv = document.getElementById('allQuestions');
    var newQuestionDiv = document.createElement("div");

    var questionLabel = document.createElement('label');
    var questionField = document.createElement('input');

    var answers = [];
    for (let i = 1; i <= 4; i++) {
        let answerLabel = document.createElement('label');
        let answerField = document.createElement('input');
        answerLabel.innerHTML = `Answer ${i}: `;
        answerField.setAttribute('id', `${questionNum}a${i}`);
        answerField.setAttribute('type', 'text');
        answers.push(answerLabel, answerField);
    }

    var correctLabel = document.createElement('label');
    var correctField = document.createElement('input');
    correctLabel.innerHTML = "Correct Answer (1-4): ";
    correctField.setAttribute('id', 'correct' + questionNum);
    correctField.setAttribute('type', 'number');
    correctField.setAttribute('min', '1');
    correctField.setAttribute('max', '4');

    questionLabel.innerHTML = `Question ${questionNum}: `;
    questionField.setAttribute('class', 'question');
    questionField.setAttribute('id', 'q' + questionNum);
    questionField.setAttribute('type', 'text');

    newQuestionDiv.setAttribute('id', 'question-field');
    newQuestionDiv.appendChild(questionLabel);
    newQuestionDiv.appendChild(questionField);
    newQuestionDiv.appendChild(document.createElement('br'));
    
    for (let i = 0; i < answers.length; i++) {
        newQuestionDiv.appendChild(answers[i]);
        if (i % 2 !== 0) newQuestionDiv.appendChild(document.createElement('br'));
    }

    newQuestionDiv.appendChild(document.createElement('br'));
    newQuestionDiv.appendChild(correctLabel);
    newQuestionDiv.appendChild(correctField);
    
    questionsDiv.appendChild(document.createElement('br'));
    questionsDiv.appendChild(newQuestionDiv);

    newQuestionDiv.style.backgroundColor = randomColor();
}

/**
 * Function to handle quiz cancellation
 */
function cancelQuiz() {
    if (confirm("⚠️ Are you sure you want to exit? All work will be LOST!")) {
        window.location.href = "../";
    }
}

/**
 * When quiz is successfully created, navigate to the host page with the game PIN
 */
socket.on('quizCreated', function (data) {
    console.log("✅ Quiz Created, navigating to host page:", data);
    window.location.href = `/host/index.html?pin=${data.pin}`;
});

/**
 * Generate a random color for question fields
 */
function randomColor() {
    var colors = ['#4CAF50', '#f94a1e', '#3399ff', '#ff9933'];
    return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Set background color for a new question
 */
function setBGColor() {
    document.getElementById('question-field').style.backgroundColor = randomColor();
}
