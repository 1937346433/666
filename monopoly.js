class Player {
    constructor(id, name, color, icon) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.icon = icon;  // 添加图标属性
        this.money = 10000;
        this.position = 0;
        this.properties = [];
        this.freeRent = false;  // 免租机会
    }
}

class Property {
    constructor(name, price) {
        this.name = name;
        this.price = price;
        this.owner = null;
        this.level = 0;  // 房屋等级：0=空地，1=房子，2=旅馆，3=酒店
        this.upgradePrice = Math.floor(price * 0.5);  // 升级费用是地产价格的50%
        this.updateRent();
    }

    updateRent() {
        // 根据等级计算租金
        const rentMultiplier = [0.1, 0.3, 0.6, 1];  // 不同等级的租金倍数
        this.rent = Math.floor(this.price * rentMultiplier[this.level]);
    }

    canUpgrade() {
        return this.level < 3;
    }

    upgrade() {
        if (this.canUpgrade()) {
            this.level++;
            this.updateRent();
            return true;
        }
        return false;
    }

    getLevelName() {
        const levelNames = ['空地', '房子', '旅馆', '酒店'];
        return levelNames[this.level];
    }

    canBuy(playerId) {
        // 如果没有所有者或所有者是当前玩家，则可以购买
        return this.owner === null;
    }
}

class Game {
    constructor() {
        this.players = [];
        this.currentPlayerIndex = 0;
        this.board = this.createBoard();
        this.isRolled = false;
        this.sounds = this.loadSounds();
        this.settings = {
            soundVolume: 1,
            bgmVolume: 0.5,
            enableAnimations: true,
            enableSound: true
        };
        this.bgm = new Audio('sounds/bgm.mp3');
        this.bgm.loop = true;
        this.bgmStarted = false;
        this.centerText = "大富翁";
        this.lastDice = null;
        this.tooltip = this.createTooltip();
        
        // 初始化设置面板
        this.initializeSettings();
        
        // 显示玩家设置对话框
        this.showPlayerSetupDialog();

        this.chanceEvents = this.createChanceEvents();
        this.fateEvents = this.createFateEvents();
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
        // 重置游戏状态
        this.currentPlayerIndex = 0;
        this.isRolled = false;
        this.lastDice = null;
        
        // 重置玩家位置和金钱
        this.players.forEach(player => {
            player.position = 0;
            player.money = 10000;
            player.properties = [];
        });

        // 重置地产所有权
        this.board.forEach(cell => {
            if (cell instanceof Property) {
                cell.owner = null;
                cell.level = 0;
                cell.updateRent();
            }
        });

        this.updateCurrentPlayerDisplay();
    }

    renderBoard() {
        const gameMap = document.getElementById('gameMap');
        gameMap.innerHTML = '';

        // 修改中心区域的骰子显示
        const centerArea = document.createElement('div');
        centerArea.className = 'center-area';
        centerArea.innerHTML = `
            <h2>${this.centerText}</h2>
            ${this.lastDice ? `
                <div class="dice-display">
                    <span class="dice-3d">🎲 ${this.lastDice}</span>
                </div>
            ` : ''}
        `;
        gameMap.appendChild(centerArea);

        const totalCells = this.board.length;
        const cellsPerRow = 8;  // 每行格子数
        const cellsPerCol = 4;  // 每列格子数
        const cellWidth = 100;  // 格子宽度
        const cellHeight = 100; // 格子高度
        const spacing = 30;     // 增加格子间距
        
        // 计算合适的起始位置，使布局居中
        const totalWidthNeeded = (cellsPerRow - 1) * (cellWidth + spacing) + cellWidth;
        const totalHeightNeeded = (cellsPerCol - 1) * (cellHeight + spacing) + cellHeight;
        
        // 调整地图尺寸
        const mapWidth = 1200;  // 增加地图宽度
        const mapHeight = 800;  // 增加地图高度
        
        // 计算起始坐标使布局居中
        const startX = (mapWidth - totalWidthNeeded) / 2;
        const startY = (mapHeight - totalHeightNeeded) / 2;

        // 更新地图容器尺寸
        gameMap.style.width = `${mapWidth}px`;
        gameMap.style.height = `${mapHeight}px`;

        this.board.forEach((cell, index) => {
            const cellElement = document.createElement('div');
            cellElement.className = 'cell';

            // 计算格子位置
            let x, y;
            if (index < cellsPerRow) { // 上边
                x = startX + index * (cellWidth + spacing);
                y = startY;
            } else if (index < cellsPerRow + cellsPerCol) { // 右边
                x = startX + totalWidthNeeded - cellWidth;
                y = startY + (index - cellsPerRow) * (cellHeight + spacing);
            } else if (index < cellsPerRow * 2 + cellsPerCol) { // 下边
                x = startX + totalWidthNeeded - cellWidth - 
                    (index - (cellsPerRow + cellsPerCol)) * (cellWidth + spacing);
                y = startY + totalHeightNeeded - cellHeight;
            } else { // 左边
                x = startX;
                y = startY + totalHeightNeeded - cellHeight - 
                    (index - (cellsPerRow * 2 + cellsPerCol)) * (cellHeight + spacing);
            }

            cellElement.style.left = `${x}px`;
            cellElement.style.top = `${y}px`;

            // 添加悬停效果
            this.addHoverEffect(cellElement, cell);

            if (cell instanceof Property && cell.owner !== null) {
                cellElement.classList.add('owned');
                cellElement.style.borderColor = this.players[cell.owner].color;
            }

            // 添加房屋等级图标
            let propertyIcon = '';
            if (cell instanceof Property) {
                switch (cell.level) {
                    case 0: propertyIcon = '🏞️'; break;
                    case 1: propertyIcon = '🏠'; break;
                    case 2: propertyIcon = '🏨'; break;
                    case 3: propertyIcon = '🏰'; break;
                }
            } else if (cell.type === "机会") {
                propertyIcon = '❓';
            } else if (cell.type === "命运") {
                propertyIcon = '⭐';
            } else if (cell.type === "起点") {
                propertyIcon = '🎯';
            }

            // 直接设置内容，不需要旋转
            cellElement.innerHTML = `
                <div class="property-name">${cell.name}</div>
                ${propertyIcon ? `<div class="property-icon">${propertyIcon}</div>` : ''}
                ${cell instanceof Property ? `
                    <div class="property-price">${cell.price}元</div>
                    ${cell.owner !== null ? `
                        <div style="color: ${this.players[cell.owner].color}">
                            ${cell.getLevelName()}
                        </div>
                        <div>租金: ${cell.rent}元</div>
                    ` : ''}
                ` : ''}
            `;

            // 添加玩家标记
            this.players.forEach((player, playerIndex) => {
                if (player.position === index) {
                    const token = document.createElement('div');
                    token.className = `player-token player-${player.id}-token`;
                    token.style.color = player.color;
                    token.innerHTML = player.icon;  // 使用玩家选择的图标
                    cellElement.appendChild(token);
                }
            });

            gameMap.appendChild(cellElement);
        });
    }

    addHoverEffect(element, cell) {
        element.addEventListener('mouseenter', (e) => {
            let tooltipContent = '';
            if (cell instanceof Property) {
                tooltipContent = `
                    <strong>${cell.name}</strong><br>
                    价格: ${cell.price}元<br>
                    当前等级: ${cell.getLevelName()}<br>
                    当前租金: ${cell.rent}元<br>
                    ${cell.canUpgrade() ? `升级费用: ${cell.upgradePrice}元<br>` : ''}
                    ${cell.owner !== null ? 
                        `所有者: ${this.players[cell.owner].name}` : 
                        '待售'
                    }
                `;
            } else {
                tooltipContent = `
                    <strong>${cell.name}</strong><br>
                    ${cell.type === '机会' ? '随机获得奖励或惩罚' : 
                      cell.type === '命运' ? '触发随机事件' : 
                      '经过或停留可获得奖励'}
                `;
            }

            this.tooltip.innerHTML = tooltipContent;
            this.tooltip.style.opacity = '1';

            // 计算提示框位置
            const rect = element.getBoundingClientRect();
            const tooltipX = rect.left + window.scrollX;
            const tooltipY = rect.top + window.scrollY - this.tooltip.offsetHeight - 10;

            this.tooltip.style.left = `${tooltipX}px`;
            this.tooltip.style.top = `${tooltipY}px`;
        });

        element.addEventListener('mouseleave', () => {
            this.tooltip.style.opacity = '0';
        });
    }

    renderPlayerInfo() {
        const playerInfo = document.getElementById('playerInfo');
        playerInfo.innerHTML = '<h2>玩家信息</h2>';

        this.players.forEach(player => {
            const info = document.createElement('div');
            info.className = 'player-info-card';
            
            // 计算总资产
            const propertyValue = player.properties.reduce((total, p) => {
                const prop = this.board[p];
                return total + prop.price + (prop.level * prop.upgradePrice);
            }, 0);
            const totalAssets = player.money + propertyValue;

            const properties = player.properties.map(p => {
                const prop = this.board[p];
                return `
                    <div class="property-item">
                        <span class="property-icon">${prop.level === 0 ? '🏞️' : 
                                                    prop.level === 1 ? '🏠' : 
                                                    prop.level === 2 ? '🏨' : '🏰'}</span>
                        <span class="property-name">${prop.name}</span>
                        <span class="property-level">${prop.getLevelName()}</span>
                        <span class="property-rent">租金: ${prop.rent}元</span>
                    </div>
                `;
            }).join('');
            
            info.innerHTML = `
                <div class="player-header" style="background-color: ${player.color}">
                    <h3>${player.name}</h3>
                    ${this.currentPlayerIndex === this.players.indexOf(player) ? 
                        '<span class="current-player-badge">当前回合</span>' : ''}
                </div>
                <div class="player-stats">
                    <div class="stat-item">
                        <span class="stat-label">💰 现金</span>
                        <span class="stat-value">${player.money}元</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">🏦 总资产</span>
                        <span class="stat-value">${totalAssets}元</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">📍 位置</span>
                        <span class="stat-value">${this.board[player.position].name}</span>
                    </div>
                </div>
                <div class="player-properties">
                    <h4>拥有地产</h4>
                    <div class="properties-list">
                        ${properties || '<div class="no-properties">暂无地产</div>'}
                    </div>
                </div>
            `;
            playerInfo.appendChild(info);
        });
    }

    setupEventListeners() {
        document.getElementById('rollDice').addEventListener('click', () => {
            this.startBackgroundMusic();
            this.rollDice();
        });

        document.getElementById('buyProperty').addEventListener('click', () => {
            this.startBackgroundMusic();
            this.buyProperty();
        });

        document.getElementById('upgradeProperty').addEventListener('click', () => {
            this.startBackgroundMusic();
            this.upgradeProperty();
        });

        document.getElementById('endTurn').addEventListener('click', () => {
            this.startBackgroundMusic();
            this.endTurn();
        });

        this.updateButtons();
    }

    loadSounds() {
        return {
            dice: new Audio('sounds/dice.mp3'),
            buy: new Audio('sounds/buy.mp3'),
            money: new Audio('sounds/money.mp3'),
            chance: new Audio('sounds/chance.mp3'),
            move: new Audio('sounds/move.mp3'),
            endTurn: new Audio('sounds/endTurn.mp3')
        };
    }

    initializeSettings() {
        // 设置按钮控制
        const settingsButton = document.getElementById('settingsButton');
        const settingsPanel = document.getElementById('settingsPanel');
        
        settingsButton.addEventListener('click', () => {
            settingsPanel.style.display = 
                settingsPanel.style.display === 'none' ? 'block' : 'none';
        });

        // 音效音量控制
        const soundVolume = document.getElementById('soundVolume');
        const soundVolumeValue = document.getElementById('soundVolumeValue');
        
        soundVolume.addEventListener('input', (e) => {
            const value = e.target.value;
            this.settings.soundVolume = value / 100;
            soundVolumeValue.textContent = `${value}%`;
            this.updateVolumes();
        });

        // 背景音乐音量控制
        const bgmVolume = document.getElementById('bgmVolume');
        const bgmVolumeValue = document.getElementById('bgmVolumeValue');
        
        bgmVolume.addEventListener('input', (e) => {
            const value = e.target.value;
            this.settings.bgmVolume = value / 100;
            bgmVolumeValue.textContent = `${value}%`;
            this.updateVolumes();
        });

        // 动画开关
        const enableAnimations = document.getElementById('enableAnimations');
        enableAnimations.addEventListener('change', (e) => {
            this.settings.enableAnimations = e.target.checked;
        });

        // 音效开关
        const enableSound = document.getElementById('enableSound');
        enableSound.addEventListener('change', (e) => {
            this.settings.enableSound = e.target.checked;
            if (e.target.checked) {
                if (!this.bgmStarted) {
                    this.bgm.play()
                        .then(() => {
                            this.bgmStarted = true;
                        })
                        .catch(e => {
                            console.log('背景音乐播放失败:', e);
                            this.createBgmPlayButton();
                        });
                } else {
                    this.bgm.play();
                }
            } else {
                this.bgm.pause();
            }
        });

        // 点击面板外关闭设置
        document.addEventListener('click', (e) => {
            if (!settingsPanel.contains(e.target) && 
                !settingsButton.contains(e.target)) {
                settingsPanel.style.display = 'none';
            }
        });

        // 初始化背景音乐
        this.bgm.volume = this.settings.bgmVolume;
    }

    updateVolumes() {
        // 更新所有音效的音量
        Object.values(this.sounds).forEach(sound => {
            sound.volume = this.settings.soundVolume;
        });
        // 更新背景音乐音量
        this.bgm.volume = this.settings.bgmVolume;
    }

    playSound(soundName) {
        if (!this.settings.enableSound) return;
        
        const sound = this.sounds[soundName];
        if (sound) {
            sound.currentTime = 0;
            sound.volume = this.settings.soundVolume;
            sound.play().catch(e => console.log('音效播放失败:', e));
        }
    }

    async rollDice() {
        if (this.isRolled) return;
        
        this.playSound('dice');
        
        // 创建新的骰子显示
        const diceDisplay = document.createElement('div');
        diceDisplay.className = 'dice-display';
        
        // 添加骰子元素
        const dice3D = document.createElement('span');
        dice3D.className = 'dice-3d rolling';  // 添加 rolling 类触发动画
        dice3D.textContent = '🎲';
        diceDisplay.appendChild(dice3D);

        // 将骰子添加到中心区域
        const centerArea = document.querySelector('.center-area');
        centerArea.innerHTML = '<h2>掷骰子中...</h2>';
        centerArea.appendChild(diceDisplay);

        // 等待动画完成
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 生成随机数并显示结果
        const steps = Math.floor(Math.random() * 6) + 1;
        this.lastDice = steps;
        
        // 更新骰子显示，移除动画类
        dice3D.classList.remove('rolling');
        dice3D.textContent = `🎲 ${steps}`;
        centerArea.querySelector('h2').textContent = this.centerText;

        // 移动玩家
        const player = this.players[this.currentPlayerIndex];
        const startPos = player.position;
        const endPos = (startPos + steps) % this.board.length;
        
        await this.animatePlayerMovement(startPos, endPos, player);
        
        this.isRolled = true;
        this.updateButtons();
        this.checkCurrentPosition();
    }

    async animatePlayerMovement(start, end, player) {
        if (!this.settings.enableAnimations) {
            player.position = end;
            this.renderBoard();
            return;
        }

        // 获取起点和终点的位置
        const startCell = document.querySelector(`.cell:nth-child(${start + 2})`);
        const endCell = document.querySelector(`.cell:nth-child(${end + 2})`);
        const startRect = startCell.getBoundingClientRect();
        const endRect = endCell.getBoundingClientRect();

        // 创建移动标记
        const token = document.createElement('div');
        token.className = `player-token player-${player.id}-token moving`;
        token.style.color = player.color;
        token.innerHTML = player.icon;
        token.style.position = 'fixed';
        token.style.left = `${startRect.left + window.scrollX}px`;
        token.style.top = `${startRect.top + window.scrollY}px`;
        document.body.appendChild(token);

        // 隐藏原始标记
        const originalToken = document.querySelector(`.player-${player.id}-token:not(.moving)`);
        if (originalToken) {
            originalToken.style.visibility = 'hidden';
        }

        // 创建拖尾效果
        const createTrail = (x, y) => {
            const trail = document.createElement('div');
            trail.className = 'token-trail';
            trail.style.left = `${x}px`;
            trail.style.top = `${y}px`;
            trail.style.backgroundColor = player.color;
            document.body.appendChild(trail);
            setTimeout(() => trail.remove(), 500);
        };

        // 计算移动路径上的点
        const steps = 20; // 拖尾效果的点数
        const dx = (endRect.left - startRect.left) / steps;
        const dy = (endRect.top - startRect.top) / steps;

        // 播放移动音效
        this.playSound('move');

        // 创建拖尾动画
        for (let i = 0; i < steps; i++) {
            const x = startRect.left + dx * i + window.scrollX;
            const y = startRect.top + dy * i + window.scrollY;
            setTimeout(() => createTrail(x, y), i * 15);
        }

        // 执行移动动画
        setTimeout(() => {
            token.style.left = `${endRect.left + window.scrollX}px`;
            token.style.top = `${endRect.top + window.scrollY}px`;
        }, 50);

        // 等待动画完成
        await new Promise(resolve => setTimeout(resolve, 300));

        // 更新玩家位置并移除动画标记
        player.position = end;
        token.remove();
        this.renderBoard();

        // 检查是否经过起点
        if (end === 0 && start !== 0) {
            player.money += 2000;
            this.showMoneyAnimation(endCell, 2000);
            this.log(`${player.name}经过起点，获得2000元`);
            this.playSound('money');
        }
    }

    async buyProperty() {
        const player = this.players[this.currentPlayerIndex];
        const property = this.board[player.position];

        if (property instanceof Property && 
            property.canBuy(player.id) && 
            player.money >= property.price) {
            if (this.settings.enableAnimations) {
                const cell = document.querySelector(`.cell:nth-child(${player.position + 2})`);
                cell.classList.add('highlight');
                await new Promise(resolve => setTimeout(resolve, 1000));
                cell.classList.remove('highlight');
                
                // 显示金钱动画
                this.showMoneyAnimation(cell, -property.price);
            }

            this.playSound('buy');

            player.money -= property.price;
            property.owner = this.currentPlayerIndex;
            player.properties.push(player.position);
            
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
        const player = this.players[this.currentPlayerIndex];
        const cell = this.board[player.position];
        const events = cell.type === "机会" ? this.chanceEvents : this.fateEvents;
        
        // 创建卡片选择界面
        const cardSelection = document.createElement('div');
        cardSelection.className = 'card-selection';
        
        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'cards-container';
        
        // 随机选择三张卡片
        const selectedEvents = this.shuffleArray([...events]).slice(0, 3);
        let isCardSelected = false;  // 添加标记，防止多次选择
        
        // 创建卡片
        const cards = selectedEvents.map((event, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            
            const cardBack = document.createElement('div');
            cardBack.className = 'card-face card-back';
            cardBack.innerHTML = cell.type === "机会" ? '❓' : '⭐';
            
            const cardFront = document.createElement('div');
            cardFront.className = 'card-face card-front';
            
            // 设置卡片正面内容
            const icon = this.getEventIcon(event);
            cardFront.innerHTML = `
                <div class="card-icon">${icon}</div>
                <div class="card-title">${cell.type}卡片</div>
                <div class="card-content">
                    ${event.money ? 
                        `${event.text}${Math.abs(event.money)}元` : 
                        event.text}
                </div>
            `;
            
            card.appendChild(cardBack);
            card.appendChild(cardFront);
            
            // 添加点击事件
            card.addEventListener('click', async () => {
                if (isCardSelected || card.classList.contains('flipped')) return;
                
                isCardSelected = true;  // 设置标记，防止再次选择
                this.playSound('chance');
                card.classList.add('flipped');
                
                // 等待动画完成
                await new Promise(resolve => setTimeout(resolve, 600));
                
                // 处理事件效果
                await this.processEvent(event, player);
                
                // 移除卡片选择界面
                await new Promise(resolve => setTimeout(resolve, 1000));
                cardSelection.remove();
            });
            
            return card;
        });
        
        cards.forEach(card => cardsContainer.appendChild(card));
        cardSelection.appendChild(cardsContainer);
        document.body.appendChild(cardSelection);
    }

    // 获取事件对应的图标
    getEventIcon(event) {
        if (event.money > 0) return '💰';
        if (event.money < 0) return '💸';
        
        switch (event.action) {
            case 'moveToStart': return '🎯';
            case 'freeTravel': return '🌍';
            case 'swapPosition': return '🔄';
            case 'swapProperty': return '🏠';
            case 'collectRent': return '💵';
            case 'upgradeAll': return '⬆️';
            case 'teleport': return '✨';
            case 'freeRent': return '🎫';
            default: return '❓';
        }
    }

    // 处理事件效果
    async processEvent(event, player) {
        const currentCell = document.querySelector(`.cell:nth-child(${player.position + 2})`);
        currentCell.classList.add('highlight');

        if (event.money) {
            this.showMoneyAnimation(currentCell, event.money);
            player.money += event.money;
            this.log(`${player.name}${event.text}${Math.abs(event.money)}元`);
        } else {
            switch (event.action) {
                case "moveToStart":
                    await this.animatePlayerMovement(player.position, 0, player);
                    player.money += 2000;
                    this.log(`${player.name}直接前往起点，获得2000元`);
                    break;

                case "freeTravel":
                    this.log(`${player.name}获得免费环游机会！`);
                    for (let i = 1; i <= this.board.length; i++) {
                        await this.animatePlayerMovement(
                            (player.position + i - 1) % this.board.length,
                            (player.position + i) % this.board.length,
                            player
                        );
                    }
                    break;

                case "swapPosition":
                    const otherPlayer = this.players[(this.currentPlayerIndex + 1) % this.players.length];
                    const tempPos = player.position;
                    player.position = otherPlayer.position;
                    otherPlayer.position = tempPos;
                    this.log(`${player.name}与${otherPlayer.name}交换了位置`);
                    this.renderBoard();
                    break;

                case "swapProperty":
                    if (player.properties.length > 0 && this.players.some(p => p !== player && p.properties.length > 0)) {
                        const otherPlayer = this.players.find(p => p !== player && p.properties.length > 0);
                        const playerProp = player.properties[Math.floor(Math.random() * player.properties.length)];
                        const otherProp = otherPlayer.properties[Math.floor(Math.random() * otherPlayer.properties.length)];
                        
                        // 交换地产所有权
                        this.board[playerProp].owner = otherPlayer.id - 1;
                        this.board[otherProp].owner = player.id - 1;
                        
                        // 更新玩家的地产列表
                        player.properties = player.properties.filter(p => p !== playerProp);
                        player.properties.push(otherProp);
                        otherPlayer.properties = otherPlayer.properties.filter(p => p !== otherProp);
                        otherPlayer.properties.push(playerProp);
                        
                        this.log(`${player.name}与${otherPlayer.name}交换了一处地产`);
                        this.renderBoard();
                        this.renderPlayerInfo();
                    }
                    break;

                case "collectRent":
                    const otherPlayers = this.players.filter(p => p !== player);
                    otherPlayers.forEach(p => {
                        p.money -= event.money;
                        player.money += event.money;
                        this.log(`${p.name}支付${event.money}元给${player.name}`);
                    });
                    break;

                case "upgradeAll":
                    let upgraded = false;
                    player.properties.forEach(propIndex => {
                        const property = this.board[propIndex];
                        if (property.canUpgrade()) {
                            property.upgrade();
                            upgraded = true;
                        }
                    });
                    if (upgraded) {
                        this.log(`${player.name}的所有地产都升级了一级！`);
                        this.renderBoard();
                    }
                    break;

                case "teleport":
                    const randomPos = Math.floor(Math.random() * this.board.length);
                    await this.animatePlayerMovement(player.position, randomPos, player);
                    this.log(`${player.name}被随机传送到了${this.board[randomPos].name}`);
                    break;

                case "freeRent":
                    player.freeRent = true;
                    this.log(`${player.name}获得一次免租机会！`);
                    break;
            }
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        currentCell.classList.remove('highlight');
        this.renderPlayerInfo();
    }

    // 数组随机排序
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    endTurn() {
        if (!this.isRolled) return;

        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.isRolled = false;
        this.updateCurrentPlayerDisplay();
        this.updateButtons();
        this.renderBoard();
        
        // 播放结束回合音效
        this.playSound('endTurn');
    }

    checkCurrentPosition() {
        const player = this.players[this.currentPlayerIndex];
        const cell = this.board[player.position];

        if (cell instanceof Property && cell.owner !== null && cell.owner !== this.currentPlayerIndex) {
            if (player.freeRent) {
                this.log(`${player.name}使用了免租机会！`);
                player.freeRent = false;
            } else {
                const rent = cell.rent;
                player.money -= rent;
                this.players[cell.owner].money += rent;
                this.log(`${player.name}支付租金${rent}元给${this.players[cell.owner].name}`);
            }
        } else if (cell.type === "机会" || cell.type === "命运") {
            this.handleSpecialEvent();
        }
    }

    updateButtons() {
        const rollDiceBtn = document.getElementById('rollDice');
        const buyPropertyBtn = document.getElementById('buyProperty');
        const endTurnBtn = document.getElementById('endTurn');
        const upgradePropertyBtn = document.getElementById('upgradeProperty');
        const player = this.players[this.currentPlayerIndex];
        const property = this.board[player.position];

        rollDiceBtn.disabled = this.isRolled;
        buyPropertyBtn.disabled = !(
            this.isRolled && 
            property instanceof Property && 
            property.canBuy(player.id) && 
            player.money >= property.price
        );
        endTurnBtn.disabled = !this.isRolled;
        upgradePropertyBtn.disabled = !(
            this.isRolled && 
            property instanceof Property && 
            property.owner === this.currentPlayerIndex && 
            property.canUpgrade() && 
            this.players[this.currentPlayerIndex].money >= property.upgradePrice
        );
    }

    log(message) {
        const eventLog = document.getElementById('eventLog');
        const entry = document.createElement('div');
        entry.textContent = message;
        eventLog.appendChild(entry);
        eventLog.scrollTop = eventLog.scrollHeight;
    }

    createBgmPlayButton() {
        const settingsPanel = document.getElementById('settingsPanel');
        const bgmPlayButton = document.createElement('button');
        bgmPlayButton.textContent = '播放背景音乐';
        bgmPlayButton.className = 'settings-button';
        bgmPlayButton.style.position = 'static';
        bgmPlayButton.style.marginTop = '10px';
        
        bgmPlayButton.addEventListener('click', () => {
            this.bgm.play()
                .then(() => {
                    this.bgmStarted = true;
                    bgmPlayButton.remove();  // 成功播放后移除按钮
                })
                .catch(e => console.log('背景音乐播放失败:', e));
        });

        settingsPanel.appendChild(bgmPlayButton);
    }

    startBackgroundMusic() {
        if (this.settings.enableSound && !this.bgmStarted) {
            this.bgm.play()
                .then(() => {
                    this.bgmStarted = true;
                })
                .catch(e => {
                    console.log('背景音乐播放失败:', e);
                    this.createBgmPlayButton();
                });
        }
    }

    async upgradeProperty() {
        const player = this.players[this.currentPlayerIndex];
        const property = this.board[player.position];

        if (property instanceof Property && 
            property.owner === this.currentPlayerIndex && 
            property.canUpgrade() && 
            player.money >= property.upgradePrice) {

            if (this.settings.enableAnimations) {
                const cell = document.querySelector(`.cell:nth-child(${player.position + 2})`);
                cell.classList.add('highlight');
                await new Promise(resolve => setTimeout(resolve, 500));
                cell.classList.remove('highlight');
                
                // 显示金钱动画
                this.showMoneyAnimation(cell, -property.upgradePrice);
            }

            this.playSound('buy');  // 使用购买音效或添加新的升级音效

            player.money -= property.upgradePrice;
            property.upgrade();
            
            this.log(`${player.name}将${property.name}升级为${property.getLevelName()}，花费${property.upgradePrice}元`);
            this.renderBoard();
            this.renderPlayerInfo();
            this.updateButtons();
        }
    }

    createTooltip() {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        document.body.appendChild(tooltip);
        return tooltip;
    }

    showPlayerSetupDialog() {
        const chessIcons = ['♔', '♕', '♖', '♗', '♘', '♙', '♚', '♛', '♜', '♝', '♞', '♟'];
        const dialog = document.createElement('div');
        dialog.className = 'player-setup-dialog';
        dialog.innerHTML = `
            <div class="dialog-content">
                <h2>玩家设置</h2>
                <div class="player-setup">
                    <h3>玩家1</h3>
                    <input type="text" id="player1Name" placeholder="输入玩家1名称" value="玩家1">
                    <input type="color" id="player1Color" value="#FF4081">
                    <div class="chess-icon-select" id="player1Icons">
                        ${chessIcons.map(icon => `
                            <div class="chess-icon-option" data-icon="${icon}">${icon}</div>
                        `).join('')}
                    </div>
                </div>
                <div class="player-setup">
                    <h3>玩家2</h3>
                    <input type="text" id="player2Name" placeholder="输入玩家2名称" value="玩家2">
                    <input type="color" id="player2Color" value="#2196F3">
                    <div class="chess-icon-select" id="player2Icons">
                        ${chessIcons.map(icon => `
                            <div class="chess-icon-option" data-icon="${icon}">${icon}</div>
                        `).join('')}
                    </div>
                </div>
                <button id="startGameBtn">开始游戏</button>
            </div>
        `;
        document.body.appendChild(dialog);

        // 添加图标选择功能
        let player1Icon = '♔';
        let player2Icon = '♕';

        ['player1Icons', 'player2Icons'].forEach((id, index) => {
            const container = document.getElementById(id);
            container.querySelectorAll('.chess-icon-option').forEach(option => {
                if (option.dataset.icon === (index === 0 ? player1Icon : player2Icon)) {
                    option.classList.add('selected');
                }
                option.addEventListener('click', () => {
                    container.querySelectorAll('.chess-icon-option').forEach(opt => 
                        opt.classList.remove('selected'));
                    option.classList.add('selected');
                    if (index === 0) {
                        player1Icon = option.dataset.icon;
                    } else {
                        player2Icon = option.dataset.icon;
                    }
                });
            });
        });

        document.getElementById('startGameBtn').addEventListener('click', () => {
            const player1Name = document.getElementById('player1Name').value || "玩家1";
            const player2Name = document.getElementById('player2Name').value || "玩家2";
            const player1Color = document.getElementById('player1Color').value;
            const player2Color = document.getElementById('player2Color').value;

            this.players = [
                new Player(1, player1Name, player1Color, player1Icon),
                new Player(2, player2Name, player2Color, player2Icon)
            ];

            dialog.remove();
            this.initialize();
            this.setupEventListeners();
            this.renderBoard();
            this.renderPlayerInfo();
            this.updateCurrentPlayerDisplay();
            this.log("游戏开始！");
        });
    }

    updateCurrentPlayerDisplay() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        const display = document.getElementById('currentPlayer');
        if (display && currentPlayer) {
            display.textContent = currentPlayer.name;
            display.style.color = currentPlayer.color;
        }
    }

    createChanceEvents() {
        return [
            { text: "股票大涨，获得", money: 2000 },
            { text: "中了彩票，获得", money: 5000 },
            { text: "收到意外保险赔付，获得", money: 3000 },
            { text: "路上捡到钱包，获得", money: 1000 },
            { text: "遭遇小偷，损失", money: -1000 },
            { text: "手机摔坏维修，支付", money: -500 },
            { text: "前往起点", action: "moveToStart" },
            { text: "免费环游一周", action: "freeTravel" }
        ];
    }

    createFateEvents() {
        return [
            { text: "与其他玩家交换位置", action: "swapPosition" },
            { text: "与其他玩家交换一处地产", action: "swapProperty" },
            { text: "收取其他玩家过路费", action: "collectRent", money: 1000 },
            { text: "所有地产升级一级", action: "upgradeAll" },
            { text: "随机传送", action: "teleport" },
            { text: "获得一次免租机会", action: "freeRent" }
        ];
    }
}

// 启动游戏
new Game(); 