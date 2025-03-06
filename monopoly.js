class Player {
    constructor(id, name, color) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.money = 10000;
        this.position = 0;
        this.properties = [];
    }
}

class Property {
    constructor(name, price) {
        this.name = name;
        this.price = price;
        this.owner = null;
        this.rent = Math.floor(price * 0.1);
    }
}

class Game {
    constructor() {
        this.players = [
            new Player(1, "玩家1", "#FF4081"),
            new Player(2, "玩家2", "#2196F3")
        ];
        this.currentPlayerIndex = 0;
        this.board = this.createBoard();
        this.isRolled = false;
        this.sounds = this.loadSounds();
        this.initialize();
    }

    createBoard() {
        const board = [];
        const properties = [
            "起点", "北京", "上海", "广州", "深圳", "成都", 
            "机会", "杭州", "武汉", "西安", "南京", "重庆",
            "命运", "青岛", "长沙", "苏州", "天津", "机会",
            "厦门", "郑州", "命运", "济南", "福州", "合肥"
        ];

        properties.forEach((name, index) => {
            if (name === "起点" || name === "机会" || name === "命运") {
                board.push({ name, type: name });
            } else {
                board.push(new Property(name, (index + 1) * 1000));
            }
        });

        return board;
    }

    initialize() {
        this.renderBoard();
        this.renderPlayerInfo();
        this.setupEventListeners();
        this.log("游戏开始！");
    }

    renderBoard() {
        const gameMap = document.getElementById('gameMap');
        gameMap.innerHTML = '';

        this.board.forEach((cell, index) => {
            const cellElement = document.createElement('div');
            cellElement.className = 'cell';
            
            if (cell instanceof Property && cell.owner !== null) {
                cellElement.classList.add('owned');
                cellElement.style.borderColor = this.players[cell.owner].color;
            }

            cellElement.innerHTML = `
                <div>${cell.name}</div>
                ${cell instanceof Property ? `<div>${cell.price}元</div>` : ''}
            `;

            // 添加玩家标记
            this.players.forEach(player => {
                if (player.position === index) {
                    const token = document.createElement('div');
                    token.className = 'player-token';
                    token.style.backgroundColor = player.color;
                    cellElement.appendChild(token);
                }
            });

            gameMap.appendChild(cellElement);
        });
    }

    renderPlayerInfo() {
        const playerInfo = document.getElementById('playerInfo');
        playerInfo.innerHTML = '<h2>玩家信息</h2>';

        this.players.forEach(player => {
            const info = document.createElement('div');
            info.innerHTML = `
                <h3 style="color: ${player.color}">${player.name}</h3>
                <p>资金: ${player.money}元</p>
                <p>位置: ${this.board[player.position].name}</p>
                <p>拥有地产: ${player.properties.map(p => this.board[p].name).join(', ') || '无'}</p>
            `;
            playerInfo.appendChild(info);
        });
    }

    setupEventListeners() {
        document.getElementById('rollDice').addEventListener('click', () => this.rollDice());
        document.getElementById('buyProperty').addEventListener('click', () => this.buyProperty());
        document.getElementById('endTurn').addEventListener('click', () => this.endTurn());
        this.updateButtons();
    }

    loadSounds() {
        return {
            dice: new Audio('sounds/dice.mp3'),
            buy: new Audio('sounds/buy.mp3'),
            money: new Audio('sounds/money.mp3'),
            chance: new Audio('sounds/chance.mp3'),
            move: new Audio('sounds/move.mp3')
        };
    }

    playSound(soundName) {
        const sound = this.sounds[soundName];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.log('音效播放失败:', e));
        }
    }

    async rollDice() {
        if (this.isRolled) return;

        const rollDiceBtn = document.getElementById('rollDice');
        rollDiceBtn.classList.add('dice-animation');
        this.playSound('dice');

        // 等待动画完成
        await new Promise(resolve => setTimeout(resolve, 500));
        rollDiceBtn.classList.remove('dice-animation');

        const dice = Math.floor(Math.random() * 6) + 1;
        const player = this.players[this.currentPlayerIndex];
        const oldPosition = player.position;
        player.position = (player.position + dice) % this.board.length;
        
        // 移动动画
        await this.animatePlayerMovement(oldPosition, player.position, player);
        
        this.isRolled = true;
        this.log(`${player.name}掷出了${dice}点，移动到了${this.board[player.position].name}`);
        this.checkCurrentPosition();
        this.renderBoard();
        this.renderPlayerInfo();
        this.updateButtons();
    }

    async animatePlayerMovement(start, end, player) {
        const totalCells = this.board.length;
        const path = [];
        let current = start;
        
        // 计算移动路径
        while (current !== end) {
            current = (current + 1) % totalCells;
            path.push(current);
            this.playSound('move');
            
            // 移动玩家标记
            player.position = current;
            this.renderBoard();
            
            // 等待一小段时间
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    async buyProperty() {
        const player = this.players[this.currentPlayerIndex];
        const property = this.board[player.position];

        if (property instanceof Property && !property.owner && player.money >= property.price) {
            // 添加购买动画
            const cell = document.querySelector(`.cell:nth-child(${player.position + 1})`);
            cell.classList.add('highlight');
            this.playSound('buy');

            // 显示金钱动画
            this.showMoneyAnimation(cell, -property.price);

            player.money -= property.price;
            property.owner = this.currentPlayerIndex;
            player.properties.push(player.position);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            cell.classList.remove('highlight');
            
            this.log(`${player.name}购买了${property.name}，花费${property.price}元`);
            this.renderBoard();
            this.renderPlayerInfo();
            this.updateButtons();
        }
    }

    showMoneyAnimation(element, amount) {
        const animation = document.createElement('div');
        animation.className = 'money-animation';
        animation.textContent = amount > 0 ? `+${amount}` : amount;
        animation.style.color = amount > 0 ? 'green' : 'red';
        element.appendChild(animation);

        setTimeout(() => animation.remove(), 1000);
    }

    async handleSpecialEvent() {
        const events = [
            { text: "银行发放红利，获得1000元", money: 1000 },
            { text: "缴纳所得税，支付500元", money: -500 },
            { text: "中奖了！获得2000元", money: 2000 },
            { text: "医疗费用，支付800元", money: -800 }
        ];

        const event = events[Math.floor(Math.random() * events.length)];
        const player = this.players[this.currentPlayerIndex];
        
        this.playSound('chance');
        const cell = document.querySelector(`.cell:nth-child(${player.position + 1})`);
        cell.classList.add('highlight');
        
        // 显示金钱动画
        this.showMoneyAnimation(cell, event.money);
        
        player.money += event.money;
        this.log(`${player.name}${event.text}`);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        cell.classList.remove('highlight');
        this.renderPlayerInfo();
    }

    endTurn() {
        if (!this.isRolled) return;

        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.isRolled = false;
        this.log(`轮到${this.players[this.currentPlayerIndex].name}的回合`);
        this.updateButtons();
    }

    checkCurrentPosition() {
        const player = this.players[this.currentPlayerIndex];
        const cell = this.board[player.position];

        if (cell instanceof Property && cell.owner !== null && cell.owner !== this.currentPlayerIndex) {
            const rent = cell.rent;
            player.money -= rent;
            this.players[cell.owner].money += rent;
            this.log(`${player.name}支付租金${rent}元给${this.players[cell.owner].name}`);
        } else if (cell.type === "机会" || cell.type === "命运") {
            this.handleSpecialEvent();
        }
    }

    updateButtons() {
        const rollDiceBtn = document.getElementById('rollDice');
        const buyPropertyBtn = document.getElementById('buyProperty');
        const endTurnBtn = document.getElementById('endTurn');
        const player = this.players[this.currentPlayerIndex];
        const property = this.board[player.position];

        rollDiceBtn.disabled = this.isRolled;
        buyPropertyBtn.disabled = !(
            this.isRolled && 
            property instanceof Property && 
            !property.owner && 
            player.money >= property.price
        );
        endTurnBtn.disabled = !this.isRolled;
    }

    log(message) {
        const eventLog = document.getElementById('eventLog');
        const entry = document.createElement('div');
        entry.textContent = message;
        eventLog.appendChild(entry);
        eventLog.scrollTop = eventLog.scrollHeight;
    }
}

// 启动游戏
new Game(); 