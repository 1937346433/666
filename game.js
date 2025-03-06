const difficulties = {
    easy: { range: 100, attempts: 10 },
    medium: { range: 500, attempts: 12 },
    hard: { range: 1000, attempts: 15 }
};

let gameState = {
    targetNumber: null,
    maxAttempts: null,
    attempts: 0,
    gameRange: null,
    isGameActive: false,
    guessHistory: []
};

function startGame(difficulty) {
    const config = difficulties[difficulty];
    gameState = {
        targetNumber: Math.floor(Math.random() * config.range) + 1,
        maxAttempts: config.attempts,
        attempts: 0,
        gameRange: config.range,
        isGameActive: true,
        guessHistory: []
    };

    document.getElementById('gameArea').style.display = 'block';
    document.getElementById('gameInfo').textContent = 
        `我已经想好了一个1到${config.range}之间的数字，你有${config.attempts}次机会来猜！`;
    updateAttemptsDisplay();
    clearMessage();
    clearHistory();
    document.getElementById('guessInput').value = '';
    document.getElementById('guessInput').focus();
}

function makeGuess() {
    if (!gameState.isGameActive) return;

    const input = document.getElementById('guessInput');
    const guess = parseInt(input.value);
    input.value = '';

    if (isNaN(guess) || guess < 1 || guess > gameState.gameRange) {
        showMessage(`请输入1到${gameState.gameRange}之间的有效数字！`, 'red');
        return;
    }

    gameState.attempts++;
    addToHistory(guess);
    updateAttemptsDisplay();

    if (guess === gameState.targetNumber) {
        gameWon();
    } else {
        if (gameState.attempts >= gameState.maxAttempts) {
            gameLost();
        } else {
            const hint = guess < gameState.targetNumber ? '太小了！' : '太大了！';
            showMessage(hint, 'blue');
        }
    }
}

function gameWon() {
    showMessage(`恭喜你猜对了！答案就是 ${gameState.targetNumber}`, 'green');
    gameState.isGameActive = false;
}

function gameLost() {
    showMessage(`游戏结束！正确答案是：${gameState.targetNumber}`, 'red');
    gameState.isGameActive = false;
}

function showMessage(text, color = 'black') {
    const message = document.getElementById('message');
    message.textContent = text;
    message.style.color = color;
}

function updateAttemptsDisplay() {
    document.getElementById('attempts').textContent = 
        `已猜测 ${gameState.attempts} 次，还剩 ${gameState.maxAttempts - gameState.attempts} 次机会`;
}

function addToHistory(guess) {
    const history = document.getElementById('guessHistory');
    const li = document.createElement('li');
    const hint = guess < gameState.targetNumber ? '太小了' : '太大了';
    li.textContent = `第 ${gameState.attempts} 次：${guess} - ${guess === gameState.targetNumber ? '正确！' : hint}`;
    history.appendChild(li);
}

function clearMessage() {
    document.getElementById('message').textContent = '';
}

function clearHistory() {
    document.getElementById('guessHistory').innerHTML = '';
}

// 添加键盘事件支持
document.getElementById('guessInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        makeGuess();
    }
}); 