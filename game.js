// ================= PHASER CONFIG =================
const config = {
    type: Phaser.WEBGL,
    width: 360,
    height: 640,
    parent: document.body,
    transparent: true,
    dom: { createContainer: false },

    // Giữ độ nét cao cho màn hình điện thoại
    resolution: window.devicePixelRatio,

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

// Tính toán vị trí bàn cờ
const BOARD_WIDTH = COLS * CELL + (COLS - 1) * GAP;
const OFFSET_X = (360 - BOARD_WIDTH) / 2 + CELL / 2;

// --- THAY ĐỔI 1: KÉO BÀN CỜ LÊN CAO HƠN ---
// Cũ: 150 -> Mới: 120 (Nhường 30px thêm cho phần dưới)
const OFFSET_Y = 120 + CELL / 2;

const TOTAL_TIME = 120;
const BAR_WIDTH = 300;
const BAR_X = 30;
const BAR_Y = 85;
const MAX_HINT = 3;

// ================= STATE =================
let first = null;
let second = null;
let lock = true;
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
    const stepX = source.width / COLS;
    const stepY = source.height / ROWS;
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
        graphics.fillStyle(0x2ecc71); graphics.fillRect(0, 0, CELL, CELL);
        graphics.lineStyle(2, 0xffffff); graphics.strokeRect(0, 0, CELL, CELL);
        graphics.generateTexture('fallback_bg', CELL, CELL);
    }
}

// ================= CREATE =================
function create() {
    // TẠO TEXTURE HẠT
    if (!this.textures.exists('flare')) {
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });
        gfx.fillStyle(0xffffff); gfx.fillCircle(8, 8, 8);
        gfx.generateTexture('flare', 16, 16);
    }

    if (!this.textures.exists('star')) {
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });
        gfx.fillStyle(0xffffff);
        gfx.beginPath();
        gfx.moveTo(8, 0); gfx.lineTo(16, 8); gfx.lineTo(8, 16); gfx.lineTo(0, 8);
        gfx.closePath();
        gfx.fill();
        gfx.generateTexture('star', 16, 16);
    }

    first = null; second = null; matchedPairs = 0; score = 0; timeLeft = TOTAL_TIME; hintLeft = MAX_HINT;
    lock = true;

    createUI.call(this);
    createBottomButtons.call(this);
    prepareBackFrames(this);
    createBoard.call(this);

    handleStartScreen.call(this);
}

// --- XỬ LÝ INTRO ---
function handleStartScreen() {
    const startScreen = document.getElementById('start-screen');
    const introVideo = document.getElementById('intro-video');

    if (!startScreen || !introVideo) { startGame.call(this); return; }

    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.onclick = () => {
            startScreen.style.display = 'none';
            introVideo.style.display = 'block';
            introVideo.currentTime = 0;
            introVideo.muted = false;
            introVideo.play().catch(() => { removeIntroElements(); startGame.call(this); });
        };
    }

    introVideo.onended = () => { removeIntroElements(); startGame.call(this); };
}

function removeIntroElements() {
    const startScreen = document.getElementById('start-screen');
    const introVideo = document.getElementById('intro-video');
    if (startScreen) startScreen.remove();
    if (introVideo) introVideo.remove();
}

function startGame() {
    lock = false;
    if (!this.sound.get('bgm')) this.sound.play('bgm', { loop: true, volume: 0.5 });
    else if (!this.sound.get('bgm').isPlaying) this.sound.play('bgm', { loop: true, volume: 0.5 });

    if (timerEvent) timerEvent.remove();
    timerEvent = this.time.addEvent({ delay: 1000, callback: updateTime, callbackScope: this, loop: true });
}

// ================= UI FUNCTIONS =================
function createBottomButtons() {
    // --- THAY ĐỔI 2: ĐẨY NÚT LÊN CAO HẲN ---
    // Cũ: 580 -> Mới: 550 (Cách đáy 90px, cực kỳ an toàn cho mọi loại màn hình)
    const btnY = 550;

    createSingleButton.call(this, 95, btnY, 'Chơi Lại', 0x073f68, () => {
        if (this.sound.get('match')) this.sound.stopByKey('match');
        if (this.sound.get('wrong')) this.sound.stopByKey('wrong');
        this.scene.restart();
    });
    createSingleButton.call(this, 265, btnY, 'Đặt Món', 0xe87121, () => {
        window.open('https://ahafood.ai', '_blank');
    });
}

function createSingleButton(x, y, textStr, color, onClick) {
    const btnW = 150; const btnH = 50;
    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(color, 1); bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    bg.lineStyle(2, 0xffffff, 1); bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);

    // Giữ độ nét chữ
    const text = this.add.text(0, 0, textStr, {
        fontSize: '22px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        color: '#ffffff'
    }).setOrigin(0.5).setResolution(2);

    const zone = this.add.zone(0, 0, btnW, btnH).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
        this.tweens.add({ targets: container, scaleX: 0.9, scaleY: 0.9, duration: 100, yoyo: true, onComplete: onClick });
    });
    container.add([bg, text, zone]);
}

function createUI() {
    this.add.text(20, 40, 'Score', { fontSize: '24px', fontFamily: 'Arial', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0, 0.5).setResolution(2);
    const scoreBg = this.add.graphics(); scoreBg.fillStyle(0xc0392b, 1); scoreBg.fillRoundedRect(100, 23, 70, 34, 16);
    scoreText = this.add.text(135, 40, '0', { fontSize: '22px', fontFamily: 'Arial', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5, 0.5).setResolution(2);

    const hintContainer = this.add.container(230, 23);
    const hintW = 110; const hintH = 36;
    const hintBg = this.add.graphics();
    hintBg.lineStyle(3, 0xffffff, 1); hintBg.strokeRoundedRect(0, 0, hintW, hintH, 18);
    hintBg.fillStyle(0x0984e3, 1); hintBg.fillRoundedRect(0, 0, hintW, hintH, 18);
    const hitZone = this.add.zone(hintW / 2, hintH / 2, hintW, hintH).setInteractive({ useHandCursor: true });
    hitZone.on('pointerdown', () => useHint.call(this));
    hintContainer.add([hintBg, hitZone]);
    const iconBg = this.add.graphics(); iconBg.fillStyle(0xf1c40f, 1); iconBg.fillCircle(18, hintH / 2, 16); hintContainer.add(iconBg);
    const iconText = this.add.text(18, hintH / 2, 'S', { fontSize: '20px', fontFamily: 'Arial', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5, 0.5).setResolution(2); hintContainer.add(iconText);
    hintText = this.add.text(65, hintH / 2, 'Hint: ' + MAX_HINT, { fontSize: '18px', fontFamily: 'Arial', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5, 0.5).setResolution(2); hintContainer.add(hintText);

    timeBarGfx = this.add.graphics(); drawTimeBar(this);
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
            const card = this.add.image(x, y, textureKey, frameKey).setDisplaySize(CELL, CELL).setInteractive()
                .setData({ value: values[idx], flipped: false, removed: false, baseTexture: textureKey, baseFrame: frameKey });
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
        this.add.text(180, 320, 'GAME OVER', { fontSize: '40px', color: '#ff0000', backgroundColor: '#000', padding: { x: 10, y: 10 } })
            .setOrigin(0.5).setDepth(100).setResolution(2);
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

            this.cameras.main.shake(200, 0.005);

            playRandomEffect(this, first.x, first.y);
            playRandomEffect(this, second.x, second.y);

            first.setVisible(false);
            second.setVisible(false);

            removePair(first, second);
            if (matchedPairs === 15) {
                this.add.text(180, 320, 'YOU WIN!', { fontSize: '40px', color: '#00ff00', backgroundColor: '#000', padding: { x: 10, y: 10 } })
                    .setOrigin(0.5).setDepth(100).setResolution(2);
                timerEvent.remove();
                this.sound.stopAll();
            }
            resetTurn();
        } else {
            this.sound.play('wrong');
            this.time.delayedCall(800, () => { flipBack(first); flipBack(second); resetTurn(); });
        }
    });
}

// ================= HỆ THỐNG HIỆU ỨNG RANDOM =================

function playRandomEffect(scene, x, y) {
    const type = Phaser.Math.Between(1, 3);
    switch (type) {
        case 1: createFireworkEffect(scene, x, y); break;
        case 2: createGalaxyEffect(scene, x, y); break;
        case 3: createFountainEffect(scene, x, y); break;
    }
}

// 1. Pháo hoa
function createFireworkEffect(scene, x, y) {
    const particles = scene.add.particles(0, 0, 'flare', {
        x: x, y: y,
        speed: { min: 100, max: 200 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.8, end: 0 },
        blendMode: 'ADD',
        lifespan: 600,
        gravityY: 200,
        quantity: 20,
        tint: [0xff0000, 0xffa500, 0xffff00]
    });
    particles.explode(20, x, y);
    scene.time.delayedCall(700, () => particles.destroy());
}

// 2. Galaxy
function createGalaxyEffect(scene, x, y) {
    const particles = scene.add.particles(0, 0, 'star', {
        x: x, y: y,
        speed: { min: 50, max: 120 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.6, end: 0 },
        rotate: { start: 0, end: 360 },
        blendMode: 'SCREEN',
        lifespan: 800,
        gravityY: 0,
        quantity: 15,
        tint: [0x00ffff, 0xff00ff, 0x9b59b6]
    });
    particles.explode(15, x, y);
    scene.time.delayedCall(900, () => particles.destroy());
}

// 3. Fountain
function createFountainEffect(scene, x, y) {
    const particles = scene.add.particles(0, 0, 'flare', {
        x: x, y: y,
        speed: { min: 150, max: 250 },
        angle: { min: 240, max: 300 },
        scale: { start: 0.7, end: 0 },
        blendMode: 'ADD',
        lifespan: 700,
        gravityY: 400,
        quantity: 15,
        tint: [0x2ecc71, 0xaaffff, 0xffffff]
    });
    particles.explode(15, x, y);
    scene.time.delayedCall(800, () => particles.destroy());
}

// ================= CÁC HÀM CŨ =================
function flipBack(card) {
    if (!card.scene) return;
    flipAnimation(card.scene, card, card.getData('baseTexture'), card.getData('baseFrame'), () => card.setData('flipped', false));
}

function flipAnimation(scene, card, texture, frame, onComplete) {
    scene.tweens.add({
        targets: card, scaleX: 0, duration: 150,
        onComplete: () => {
            if (card.active) {
                card.setTexture(texture, frame); card.setDisplaySize(CELL, CELL);
                const currentScale = card.scaleX; card.scaleX = 0;
                scene.tweens.add({ targets: card, scaleX: currentScale, duration: 150, onComplete: onComplete });
            }
        }
    });
}

function removePair(a, b) {
    a.setData('removed', true); b.setData('removed', true);
    a.scene.time.delayedCall(500, () => {
        if (a.active) a.destroy();
        if (b.active) b.destroy();
    });
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
                this.time.delayedCall(1000, () => { flipBack(cards[i]); flipBack(cards[j]); lock = false; });
                return;
            }
        }
    }
}

