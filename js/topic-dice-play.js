/* topic-dice-play.js — 生徒用サイコロ・ルーレットページ */

/* ---- 変数宣言（すべてここに集約） ---- */
let topics        = [];
let currentMode   = 'dice';
let isAnimating   = false;

// サイコロ用
let lastFaceIndex = -1;
let totalRotX     = 0;
let totalRotY     = 0;
let totalRotZ     = 0;

// ルーレット用
let rouletteAngle  = 0;
let rouletteSpinId = null;

// サイコロ面の目的回転（X, Y）
// 選ばれた面がカメラに対して正面を向くよう、純粋な軸合わせ角度のみ。
// 立体カメラ視点は .dice-wrapper 側（CSS）で担当する。
const FACE_TARGETS = [
    [0,    0],     // 0: front
    [0,    180],   // 1: back
    [0,    -90],   // 2: right
    [0,    90],    // 3: left
    [-90,  0],     // 4: top
    [90,   0],     // 5: bottom
];

// ルーレット色定義（多色彩・モックアップ寄り）
const ROULETTE_COLORS = [
    '#A78BFA',  // 紫
    '#60A5FA',  // 青
    '#34D399',  // 緑
    '#FBBF24',  // 黄
    '#FB923C',  // 橙
    '#F472B6',  // ピンク
    '#94A3B8',  // 7番目バックアップ
];

(function init() {
    const hash = location.hash.slice(1);  // '#' を除去

    if (!hash) {
        showError();
        return;
    }

    try {
        const data = JSON.parse(decodeURIComponent(hash));
        topics = data.topics || [];
        if (topics.length < 2) throw new Error('topics < 2');

        if (data.title) {
            document.getElementById('playTitle').textContent = data.title;
        }

        setupFaces();
        renderChips();
        drawRoulette(0);
        document.getElementById('mainUI').style.display = 'block';

        // URLハッシュで指定された初期モードを反映（'dice' | 'roulette'）
        if (data.mode === 'roulette') {
            setMode('roulette');
        }
    } catch (e) {
        showError();
    }
})();

function showError() {
    document.getElementById('errorCard').style.display = 'block';
}

/* ---- テーマチップ ---- */
function renderChips() {
    const container = document.getElementById('topicChips');
    container.innerHTML = '';
    topics.forEach((t, i) => {
        const chip = document.createElement('div');
        chip.className = 'topic-chip';
        chip.innerHTML = `<span class="topic-chip-num">${i + 1}</span>${escHtml(t)}`;
        container.appendChild(chip);
    });
}

function escHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ---- モード切り替え ---- */
function setMode(mode) {
    currentMode = mode;
    document.getElementById('diceMode').style.display     = mode === 'dice'     ? '' : 'none';
    document.getElementById('rouletteMode').style.display = mode === 'roulette' ? '' : 'none';
    document.getElementById('btnDice').classList.toggle('active',     mode === 'dice');
    document.getElementById('btnRoulette').classList.toggle('active', mode === 'roulette');
}

/* ================================================================
   サイコロ
   ================================================================ */

// テーマを6面に割り当て（テーマ数が6未満の場合はループ）
function setupFaces() {
    const count = Math.min(topics.length, 6);
    for (let i = 0; i < 6; i++) {
        const el = document.getElementById('face' + i);
        el.textContent = topics[i % count];
    }
}

function rollDice() {
    if (isAnimating) return;
    isAnimating = true;

    const rollBtn = document.getElementById('rollBtn');
    rollBtn.disabled = true;

    // ランダムな面を選ぶ（直前と同じ面も可）
    const faceIndex = Math.floor(Math.random() * Math.min(topics.length, 6));

    // ランダムな回転量（X/Y は 3〜5周、Z は 2〜4周でカオス感）
    const spinsX = (3 + Math.floor(Math.random() * 3)) * 360;
    const spinsY = (3 + Math.floor(Math.random() * 3)) * 360;
    const spinsZ = (2 + Math.floor(Math.random() * 3)) * 360 * (Math.random() < 0.5 ? -1 : 1);

    const [targetX, targetY] = FACE_TARGETS[faceIndex];

    totalRotX += spinsX + targetX - (totalRotX % 360);
    totalRotY += spinsY + targetY - (totalRotY % 360);
    // Z軸は中間でカオス回転 → 最終的に倍数で 0 に戻す
    totalRotZ += spinsZ - (totalRotZ % 360);

    const dice       = document.getElementById('dice');
    const wrapper    = document.getElementById('diceWrapper');
    const shadow     = document.getElementById('diceShadow');

    // バウンス+影アニメを再発火（クラス付け直し）
    wrapper.classList.remove('rolling');
    shadow.classList.remove('rolling');
    // reflow 強制
    void wrapper.offsetWidth;
    wrapper.classList.add('rolling');
    shadow.classList.add('rolling');

    // dice 内側の3軸回転（CSS の transition に乗る）
    dice.style.transform = `rotateX(${totalRotX}deg) rotateY(${totalRotY}deg) rotateZ(${totalRotZ}deg)`;

    setTimeout(() => {
        isAnimating = false;
        rollBtn.disabled = false;
        wrapper.classList.remove('rolling');
        shadow.classList.remove('rolling');

        const result    = document.getElementById('diceResult');
        const resultTxt = document.getElementById('diceResultText');
        resultTxt.textContent   = topics[faceIndex % topics.length];
        result.style.visibility = 'visible';
        result.style.animation  = 'none';
        result.offsetHeight;
        result.style.animation  = '';
    }, 1450);
}

/* ================================================================
   ルーレット
   ================================================================ */

function drawRoulette(highlightIndex) {
    const canvas = document.getElementById('rouletteCanvas');
    if (!canvas) return;
    const ctx    = canvas.getContext('2d');
    const n      = Math.min(topics.length, 6);
    const cx     = canvas.width  / 2;
    const cy     = canvas.height / 2;
    const r      = cx - 10;
    const slice  = (2 * Math.PI) / n;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < n; i++) {
        const start = rouletteAngle * Math.PI / 180 + i * slice;
        const end   = start + slice;

        // 扇形
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, start, end);
        ctx.closePath();
        ctx.fillStyle = ROULETTE_COLORS[i % ROULETTE_COLORS.length];
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth   = 2;
        ctx.stroke();

        // テキスト（常に水平表示）
        const midAngle = start + slice / 2;
        const tx = cx + (r * 0.62) * Math.cos(midAngle);
        const ty = cy + (r * 0.62) * Math.sin(midAngle);

        ctx.save();
        ctx.translate(tx, ty);

        ctx.font         = 'bold 15px sans-serif';
        ctx.fillStyle    = 'white';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor  = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur   = 4;

        const text   = topics[i % topics.length];
        const maxLen = 4;
        if (text.length <= maxLen) {
            ctx.fillText(text, 0, 0);
        } else if (text.length <= maxLen * 2) {
            ctx.fillText(text.slice(0, maxLen),      0, -10);
            ctx.fillText(text.slice(maxLen),         0,  10);
        } else {
            ctx.fillText(text.slice(0, maxLen),      0, -12);
            ctx.fillText(text.slice(maxLen, maxLen * 2), 0,   2);
            ctx.fillText(text.slice(maxLen * 2),     0,  16);
        }
        ctx.restore();
    }

    // 中心円
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, 2 * Math.PI);
    ctx.fillStyle   = 'white';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,96,100,0.3)';
    ctx.lineWidth   = 2;
    ctx.stroke();
}

function spinRoulette() {
    if (isAnimating) return;
    isAnimating = true;

    const spinBtn = document.getElementById('spinBtn');
    spinBtn.disabled = true;

    const n        = Math.min(topics.length, 6);
    const winIndex = Math.floor(Math.random() * n);

    const startAngle = rouletteAngle;

    // winIndex のスライス中心が針（上=270°）に来る rouletteAngle を逆算
    const targetRoulette = ((270 - (winIndex * 360 + 180) / n) % 360 + 360) % 360;
    // 現在位置からの相対回転量
    const delta      = ((targetRoulette - startAngle) % 360 + 360) % 360 || 360;
    const totalSpins = (5 + Math.floor(Math.random() * 3)) * 360;
    const finalAngle = totalSpins + delta;
    const startTime  = performance.now();
    const duration   = 3000 + Math.random() * 500;

    function easeOut(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function frame(now) {
        const elapsed  = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        rouletteAngle  = startAngle + finalAngle * easeOut(progress);
        drawRoulette(winIndex);

        if (progress < 1) {
            rouletteSpinId = requestAnimationFrame(frame);
        } else {
            rouletteAngle = ((startAngle + finalAngle) % 360 + 360) % 360;
            drawRoulette(winIndex);

            isAnimating = false;
            spinBtn.disabled = false;

            const result    = document.getElementById('rouletteResult');
            const resultTxt = document.getElementById('rouletteResultText');
            resultTxt.textContent    = topics[winIndex];
            result.style.visibility  = 'visible';
            result.style.animation   = 'none';
            result.offsetHeight;
            result.style.animation   = '';
        }
    }

    document.getElementById('rouletteResult').style.visibility = 'hidden';
    rouletteSpinId = requestAnimationFrame(frame);
}
