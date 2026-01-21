// ================= PHASER CONFIG =================
const config = {
    type: Phaser.WEBGL,
    width: 360,
    height: 640,
    parent: document.body,

    // Nền trong suốt để thấy Video bên dưới HTML
    transparent: true,
    // backgroundColor: null,  <-- ĐÃ XÓA DÒNG GÂY LỖI NÀY

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: { preload, create }
};

const game = new Phaser.Game(config);

// ================= CONSTANTS =================
const ROWS = 6;
const COLS = 5;
const CELL = 56;
const GAP = 6;

const BOARD_WIDTH = COLS * CELL + (COLS - 1) * GAP;
const OFFSET_X = (360 - BOARD_WIDTH) / 2 + CELL / 2;
const OFFSET_Y = 150 + CELL / 2;

const TOTAL_TIME = 120;
const BAR_WIDTH = 300;
const BAR_X = 30;
const BAR_Y = 85;
const MAX_HINT = 3;

// ================= STATE =================
let first = null;
let second = null;
let lock = false;
let matchedPairs = 0;
let score = 0;
let scoreText;
let timeLeft = TOTAL_TIME;
let timerEvent;
let timeBarGfx;
let hintLeft = MAX_HINT;
let hintText;

// ================= PRELOAD =================
function preload() {
    this.load.image('backBig', 'assets/back.png');
    for (let i = 1; i <= 16; i++) {
        this.load.image(`food${i}`, `assets/food${i}.png`);
    }

    this.load.audio('bgm', 'assets/bgm.mp3');
    this.load.audio('match', 'assets/match.mp3');
    this.load.audio('wrong', 'assets/wrong.mp3');
}

// ================= HELPERS: XỬ LÝ ẢNH =================
function prepareBackFrames(scene) {
    if (!scene.textures.exists('backBig')) { createFallbackTexture(scene); return; }
    const texture = scene.textures.get('backBig');
    const source = texture.getSourceImage();

    if (!source || source.width === 0) { createFallbackTexture(scene); return; }

    const imgW = source.width;
    const imgH = source.height;
    const stepX = imgW / COLS;
    const stepY = imgH / ROWS;

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (!texture.has(`piece_${r}_${c}`)) {
                texture.add(`piece_${r}_${c}`, 0, c * stepX, r * stepY, stepX, stepY);
            }
        }
    }
}

function createFallbackTexture(scene) {
    if (!scene.textures.exists('fallback_bg')) {
        const graphics = scene.make.graphics({ add: false });
        graphics.fillStyle(0x2ecc71);
        graphics.fillRect(0, 0, CELL, CELL);
        graphics.lineStyle(2, 0xffffff);
        graphics.strokeRect(0, 0, CELL, CELL);
        graphics.generateTexture('fallback_bg', CELL, CELL);
    }
}

// ================= CREATE =================
function create() {
    resetGameState();

    // Âm thanh nhạc nền
    if (!this.sound.get('bgm')) {
        this.sound.play('bgm', { loop: true, volume: 0.5 });
    } else if (!this.sound.get('bgm').isPlaying) {
        this.sound.play('bgm', { loop: true, volume: 0.5 });
    }

    // --- GIAO DIỆN CHÍNH ---
    createUI.call(this);

    // --- TẠO 2 NÚT DƯỚI CÙNG ---
    createBottomButtons.call(this);

    // --- BÀN CỜ ---
    prepareBackFrames(this);
    createBoard.call(this);

    // Đồng hồ
    if (timerEvent) timerEvent.remove();
    timerEvent = this.time.addEvent({
        delay: 1000,
        callback: updateTime,
        callbackScope: this,
        loop: true
    });
}

function resetGameState() {
    first = null; second = null; lock = false;
    matchedPairs = 0; score = 0; timeLeft = TOTAL_TIME; hintLeft = MAX_HINT;
}

// ================= UI FUNCTIONS =================

// --- HÀM TẠO 2 NÚT DƯỚI CÙNG (CẬP NHẬT MÀU) ---
function createBottomButtons() {
    const btnY = 580; // Vị trí Y gần đáy màn hình

    // 1. Nút CHƠI LẠI (Màu Xanh da trời sẫm #073f68)
    createSingleButton.call(this, 95, btnY, 'Chơi Lại', 0x073f68, () => {
        // Dừng nhạc hiệu ứng
        if (this.sound.get('match')) this.sound.stopByKey('match');
        if (this.sound.get('wrong')) this.sound.stopByKey('wrong');

        // Reset lại game
        this.scene.restart();
    });

    // 2. Nút ĐẶT MÓN (Màu Cam #e87121)
    createSingleButton.call(this, 265, btnY, 'Đặt Món', 0xe87121, () => {
        // Mở link đặt món
        window.open('https://google.com', '_blank');
    });
}

// Hàm vẽ nút bấm
function createSingleButton(x, y, textStr, color, onClick) {
    const btnW = 150;
    const btnH = 50;

    const container = this.add.container(x, y);

    // Nền nút
    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    // Viền trắng
    bg.lineStyle(2, 0xffffff, 1);
    bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);

    // Chữ
    const text = this.add.text(0, 0, textStr, {
        fontSize: '22px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        color: '#ffffff'
    }).setOrigin(0.5);

    // Vùng bấm (Hit Area)
    const zone = this.add.zone(0, 0, btnW, btnH)
        .setInteractive({ useHandCursor: true });

    // Hiệu ứng bấm (Nhún xuống)
    zone.on('pointerdown', () => {
        this.tweens.add({
            targets: container,
            scaleX: 0.9, scaleY: 0.9,
            duration: 100,
            yoyo: true,
            onComplete: onClick
        });
    });

    container.add([bg, text, zone]);
}

// --- UI TRÊN CÙNG (SCORE & HINT) ---
function createUI() {
    // Score
    this.add.text(20, 40, 'Score', { fontSize: '24px', fontFamily: 'Arial', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0, 0.5);
    const scoreBg = this.add.graphics();
    scoreBg.fillStyle(0xc0392b, 1);
    scoreBg.fillRoundedRect(100, 23, 70, 34, 16);
    scoreText = this.add.text(135, 40, '0', { fontSize: '22px', fontFamily: 'Arial', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5, 0.5);

    // Hint
    const hintContainer = this.add.container(230, 23);
    const hintW = 110; const hintH = 36;
    const hintBg = this.add.graphics();
    hintBg.lineStyle(3, 0xffffff, 1); hintBg.strokeRoundedRect(0, 0, hintW, hintH, 18);
    hintBg.fillStyle(0x0984e3, 1); hintBg.fillRoundedRect(0, 0, hintW, hintH, 18);

    const hitZone = this.add.zone(hintW / 2, hintH / 2, hintW, hintH).setInteractive({ useHandCursor: true });
    hitZone.on('pointerdown', () => useHint.call(this));

    hintContainer.add([hintBg, hitZone]);

    const iconBg = this.add.graphics();
    iconBg.fillStyle(0xf1c40f, 1); iconBg.fillCircle(18, hintH / 2, 16);
    hintContainer.add(iconBg);

    const iconText = this.add.text(18, hintH / 2, 'S', { fontSize: '20px', fontFamily: 'Arial', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5, 0.5);
    hintContainer.add(iconText);

    hintText = this.add.text(65, hintH / 2, 'Hint: ' + MAX_HINT, { fontSize: '18px', fontFamily: 'Arial', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5, 0.5);
    hintContainer.add(hintText);

    // Time Bar
    timeBarGfx = this.add.graphics();
    drawTimeBar(this);
}

// ================= BOARD & LOGIC =================
function createBoard() {
    const values = [];
    for (let i = 1; i <= 15; i++) { values.push(`food${i}`, `food${i}`); }
    Phaser.Utils.Array.Shuffle(values);

    let idx = 0;
    const texture = this.textures.get('backBig');
    const hasFrames = texture && texture.has('piece_0_0');

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const x = OFFSET_X + c * (CELL + GAP);
            const y = OFFSET_Y + r * (CELL + GAP);

            let textureKey = hasFrames ? 'backBig' : 'fallback_bg';
            let frameKey = hasFrames ? `piece_${r}_${c}` : null;

            const card = this.add.image(x, y, textureKey, frameKey)
                .setDisplaySize(CELL, CELL)
                .setInteractive()
                .setData({
                    value: values[idx], flipped: false, removed: false,
                    baseTexture: textureKey, baseFrame: frameKey
                });

            card.on('pointerdown', () => flipCard.call(this, card));
            idx++;
        }
    }
}

function drawTimeBar(scene) {
    if (!timeBarGfx) return;
    const percent = Phaser.Math.Clamp(timeLeft / TOTAL_TIME, 0, 1);
    timeBarGfx.clear();
    timeBarGfx.lineStyle(2, 0xffffff);
    timeBarGfx.strokeRect(BAR_X, BAR_Y, BAR_WIDTH, 14);

    if (percent > 0.5) timeBarGfx.fillStyle(0x00ff00);
    else if (percent > 0.2) timeBarGfx.fillStyle(0xffff00);
    else timeBarGfx.fillStyle(0xff0000);

    timeBarGfx.fillRect(BAR_X, BAR_Y, BAR_WIDTH * percent, 14);
}

function updateTime() {
    if (timeLeft > 0) {
        timeLeft--; drawTimeBar(this);
    } else {
        timerEvent.remove(); lock = true;
        this.add.text(180, 320, 'GAME OVER', { fontSize: '40px', color: '#ff0000', backgroundColor: '#000', padding: { x: 10, y: 10 } }).setOrigin(0.5).setDepth(100);
        this.sound.stopAll();
    }
}

function flipCard(card) {
    if (lock || card.getData('flipped') || card.getData('removed')) return;
    if (first && second) return;

    card.setData('flipped', true);

    flipAnimation(this, card, card.getData('value'), null, () => {
        if (!first) { first = card; return; }
        second = card; lock = true;

        if (first.getData('value') === second.getData('value')) {
            this.sound.play('match');
            score += 10; matchedPairs++; scoreText.setText(score);
            removePair(first, second);
            if (matchedPairs === 15) {
                this.add.text(180, 320, 'YOU WIN!', { fontSize: '40px', color: '#00ff00', backgroundColor: '#000', padding: { x: 10, y: 10 } }).setOrigin(0.5).setDepth(100);
                timerEvent.remove();
                this.sound.stopAll();
            }
            resetTurn();
        } else {
            this.sound.play('wrong');
            this.time.delayedCall(800, () => {
                flipBack(first); flipBack(second); resetTurn();
            });
        }
    });
}

function flipBack(card) {
    if (!card.scene) return;
    flipAnimation(card.scene, card, card.getData('baseTexture'), card.getData('baseFrame'), () => card.setData('flipped', false));
}

function flipAnimation(scene, card, texture, frame, onComplete) {
    scene.tweens.add({
        targets: card, scaleX: 0, duration: 150,
        onComplete: () => {
            if (card.active) {
                card.setTexture(texture, frame);
                card.setDisplaySize(CELL, CELL);
                const currentScale = card.scaleX; card.scaleX = 0;
                scene.tweens.add({ targets: card, scaleX: currentScale, duration: 150, onComplete: onComplete });
            }
        }
    });
}

function removePair(a, b) {
    a.setData('removed', true); b.setData('removed', true);
    a.scene.tweens.add({ targets: [a, b], alpha: 0, scale: 0.1, duration: 300, onComplete: () => { a.destroy(); b.destroy(); } });
}

function resetTurn() { first = null; second = null; lock = false; }

function useHint() {
    if (hintLeft <= 0 || lock || first) return;
    const cards = this.children.list.filter(c => c.type === 'Image' && c.getData && !c.getData('removed') && !c.getData('flipped'));
    for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
            if (cards[i].getData('value') === cards[j].getData('value')) {
                hintLeft--; hintText.setText(`Hint: ${hintLeft}`); lock = true;
                flipAnimation(this, cards[i], cards[i].getData('value'), null);
                flipAnimation(this, cards[j], cards[j].getData('value'), null);
                this.time.delayedCall(1000, () => {
                    flipBack(cards[i]); flipBack(cards[j]); lock = false;
                });
                return;
            }
        }
    }
}