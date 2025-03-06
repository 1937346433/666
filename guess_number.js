const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 游戏配置
const difficulties = {
    easy: { range: 100, attempts: 10 },
    medium: { range: 500, attempts: 12 },
    hard: { range: 1000, attempts: 15 }
};

let targetNumber;
let maxAttempts;
let attempts = 0;
let gameRange;

// 开始游戏
console.log('欢迎来到猜数字游戏！');
console.log('请选择难度等级：');
console.log('1. 简单 (1-100, 10次机会)');
console.log('2. 中等 (1-500, 12次机会)');
console.log('3. 困难 (1-1000, 15次机会)');

function startGame(difficulty) {
    const config = difficulties[difficulty];
    gameRange = config.range;
    maxAttempts = config.attempts;
    targetNumber = Math.floor(Math.random() * gameRange) + 1;
    
    console.log(`\n游戏开始！`);
    console.log(`我已经想好了一个1到${gameRange}之间的数字`);
    console.log(`你有${maxAttempts}次机会来猜这个数字`);
    askGuess();
}

function askGuess() {
    if (attempts >= maxAttempts) {
        console.log(`\n游戏结束！你已用完${maxAttempts}次机会`);
        console.log(`正确答案是：${targetNumber}`);
        rl.close();
        return;
    }

    const remainingAttempts = maxAttempts - attempts;
    rl.question(`\n请输入你猜的数字 (还剩${remainingAttempts}次机会): `, (answer) => {
        const guess = parseInt(answer);
        attempts++;

        if (isNaN(guess)) {
            console.log('请输入有效的数字！');
            askGuess();
        } else if (guess < 1 || guess > gameRange) {
            console.log(`请输入1到${gameRange}之间的数字！`);
            askGuess();
        } else if (guess < targetNumber) {
            console.log('太小了！再试试！');
            askGuess();
        } else if (guess > targetNumber) {
            console.log('太大了！再试试！');
            askGuess();
        } else {
            console.log(`\n恭喜你猜对了！答案就是 ${targetNumber}`);
            console.log(`你用了 ${attempts} 次机会`);
            rl.close();
        }
    });
}

// 选择难度
rl.question('请输入难度编号 (1-3): ', (answer) => {
    const difficultyMap = {
        '1': 'easy',
        '2': 'medium',
        '3': 'hard'
    };

    const difficulty = difficultyMap[answer];
    if (!difficulty) {
        console.log('无效的选择，游戏将以简单模式开始');
        startGame('easy');
    } else {
        startGame(difficulty);
    }
}); 