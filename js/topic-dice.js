/* topic-dice.js — 教員用 index.html
 * - 動的なテーマ入力（最小2/最大6）
 * - 初期モード選択（サイコロ／ルーレット）
 * - URL生成 + 結果カード表示（URL／コピー／QRオーバーレイ）
 * - 「テーマを修正する」で入力エリアに戻る（入力値保持）
 */

(function () {
    'use strict';

    const MIN_TOPICS = 2;
    const MAX_TOPICS = 6;
    const INITIAL_ROWS = 6;

    let currentMode = 'dice';
    let qr = null;
    let dom = {};

    function $(id) { return document.getElementById(id); }

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        dom = {
            titleInput: $('titleInput'),
            topicInputs: $('topicInputs'),
            addTopicBtn: $('addTopicBtn'),
            generateBtn: $('generateBtn'),
            modeBtnDice: $('modeBtnDice'),
            modeBtnRoulette: $('modeBtnRoulette'),
            inputArea: $('inputArea'),
            actionBar: $('actionBar'),
            resultArea: $('resultArea'),
            generatedUrl: $('generatedUrl'),
            copyBtn: $('copyBtn'),
            qrLargeBtn: $('qrLargeBtn'),
            summaryCount: $('summaryCount'),
            summaryMode: $('summaryMode'),
            playLink: $('playLink'),
            editBtn: $('editBtn'),
            qrOverlay: $('qrOverlay'),
            qrTitleDisplay: $('qrTitleDisplay'),
            qrUrlDisplay: $('qrUrlDisplay'),
            qrCanvas: $('qrCanvas'),
        };

        for (let i = 0; i < INITIAL_ROWS; i++) addTopicRow();

        dom.addTopicBtn.addEventListener('click', () => addTopicRow());
        dom.generateBtn.addEventListener('click', generateUrl);
        dom.copyBtn.addEventListener('click', copyUrl);
        dom.qrLargeBtn.addEventListener('click', showQrLarge);
        dom.editBtn.addEventListener('click', editSettings);
        dom.modeBtnDice.addEventListener('click', () => setMode('dice'));
        dom.modeBtnRoulette.addEventListener('click', () => setMode('roulette'));
    }

    /* ---- テーマ入力行 ---- */
    function addTopicRow(value) {
        const rows = dom.topicInputs.querySelectorAll('.topic-row');
        if (rows.length >= MAX_TOPICS) return;
        const idx = rows.length + 1;
        const row = document.createElement('div');
        row.className = 'topic-row';
        row.innerHTML = `
            <span class="topic-num"></span>
            <input type="text" class="topic-input" placeholder="テーマ${idx}（例：Sports）" maxlength="30">
            <button type="button" class="topic-delete" title="このテーマを削除">
                <i class="fas fa-trash"></i>
            </button>
        `;
        if (value) row.querySelector('input').value = value;
        row.querySelector('.topic-delete').addEventListener('click', () => removeTopicRow(row));
        dom.topicInputs.appendChild(row);
        refreshRows();
    }

    function removeTopicRow(row) {
        const rows = dom.topicInputs.querySelectorAll('.topic-row');
        if (rows.length <= MIN_TOPICS) return;
        row.remove();
        refreshRows();
    }

    function refreshRows() {
        const rows = dom.topicInputs.querySelectorAll('.topic-row');
        rows.forEach((r, i) => {
            r.querySelector('.topic-num').textContent = i + 1;
            r.querySelector('.topic-input').setAttribute('placeholder', `テーマ${i + 1}${i < 2 ? '（必須）' : '（任意）'}`);
            r.querySelector('.topic-delete').disabled = (rows.length <= MIN_TOPICS);
        });
        dom.addTopicBtn.disabled = (rows.length >= MAX_TOPICS);
    }

    function getTopics() {
        return Array.from(dom.topicInputs.querySelectorAll('.topic-input'))
            .map(i => i.value.trim())
            .filter(v => v !== '');
    }

    /* ---- モード切替 ---- */
    function setMode(mode) {
        currentMode = mode;
        dom.modeBtnDice.classList.toggle('active', mode === 'dice');
        dom.modeBtnRoulette.classList.toggle('active', mode === 'roulette');
    }

    /* ---- URL 生成 ---- */
    function generateUrl() {
        const topics = getTopics();
        if (topics.length < 2) {
            Modal.alert('テーマを2つ以上入力してください。');
            return;
        }

        const title = dom.titleInput.value.trim();
        const data = { topics, mode: currentMode };
        if (title) data.title = title;

        const base = location.origin + location.pathname.replace('index.html', '');
        const url = base + 'play.html#' + encodeURIComponent(JSON.stringify(data));

        dom.generatedUrl.value = url;
        dom.playLink.href = url;
        dom.summaryCount.textContent = topics.length;
        dom.summaryMode.textContent = currentMode === 'dice' ? 'サイコロ' : 'ルーレット';

        if (title && dom.qrTitleDisplay) dom.qrTitleDisplay.textContent = title;

        dom.inputArea.style.display = 'none';
        dom.actionBar.style.display = 'none';
        dom.resultArea.style.display = 'block';
        dom.resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });

        qr = null;
    }

    function copyUrl() {
        const v = dom.generatedUrl.value;
        if (!v) return;
        navigator.clipboard.writeText(v).then(() => {
            const orig = dom.copyBtn.innerHTML;
            dom.copyBtn.innerHTML = '<i class="fas fa-check"></i> コピー済';
            setTimeout(() => { dom.copyBtn.innerHTML = orig; }, 1800);
        });
    }

    function showQrLarge() {
        const url = dom.generatedUrl.value;
        if (!url) return;
        if (!qr) {
            qr = new QRious({
                element: dom.qrCanvas,
                value: url,
                size: 320,
                level: 'H',
            });
        } else {
            qr.value = url;
        }
        dom.qrUrlDisplay.textContent = url;
        dom.qrOverlay.classList.add('active');
    }

    window.closeQr = function () {
        dom.qrOverlay.classList.remove('active');
    };

    function editSettings() {
        dom.inputArea.style.display = '';
        dom.actionBar.style.display = '';
        dom.resultArea.style.display = 'none';
        dom.inputArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
})();
