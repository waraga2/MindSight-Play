const characterDisplay = document.getElementById('character-display');
const characterContent = document.getElementById('character-content');
const controls = document.getElementById('controls');
const modeSelect = document.getElementById('mode-select');
const scopeControl = document.getElementById('scope-control');
const scopeSelect = document.getElementById('scope-select');
const binaryModeOptions = document.getElementById('binary-mode-options');
const pairSelect = document.getElementById('pair-select');
const mixedModeOptions = document.getElementById('mixed-mode-options');
const soundTypeCheckbox = document.getElementById('sound-type-checkbox');
const frequencySlider = document.getElementById('frequency-slider');
const frequencyValue = document.getElementById('frequency-value');
const startButton = document.getElementById('start-button');

// --- Data ---
const rawCharacterData = {
    numbers: '0123456789'.split(''),
    letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    shapes: [
        { name: 'Circle', svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" /></svg>` },
        { name: 'Square', svg: `<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" /></svg>` },
        { name: 'Triangle', svg: `<svg viewBox="0 0 100 100"><polygon points="50,10 90,90 10,90" /></svg>` },
        { name: 'Plus', svg: `<svg viewBox="0 0 100 100"><g><rect x="40" y="10" width="20" height="80" /><rect x="10" y="40" width="80" height="20" /></g></svg>` },
        { name: 'Rectangle', svg: `<svg viewBox="0 0 100 100"><rect x="10" y="25" width="80" height="50" /></svg>` },
        { name: 'Oval', svg: `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="50" rx="45" ry="30" /></svg>` },
        { name: 'Star', svg: `<svg viewBox="0 0 100 100"><polygon points="50,5 61,40 98,40 68,62 79,95 50,75 21,95 32,62 2,40 39,40" /></svg>` },
        { name: 'Arrow', svg: `<svg viewBox="0 0 100 100"><polygon points="50,10 70,40 60,40 60,90 40,90 40,40 30,40" /></svg>` },
        { name: 'Cresent', svg: `<svg viewBox="0 0 100 100"><path d="M 50,10 A 40,40 0 0 1 50,90 A 60,60 0 0 0 50,10 Z" /></svg>` },
        { name: 'Cross', svg: `<svg viewBox="0 0 100 100"><path d="M 20,10 L 50,40 L 80,10 L 90,20 L 60,50 L 90,80 L 80,90 L 50,60 L 20,90 L 10,80 L 40,50 L 10,20 Z" /></svg>` },
        { name: 'Diamond', svg: `<svg viewBox="0 0 100 100"><polygon points="50,5 95,50 50,95 5,50" /></svg>` },
        { name: 'Heart', svg: `<svg viewBox="0 0 100 100"><path d="M 50 95 C 20 75, 10 55, 10 40 C 10 20, 30 5, 50 25 C 70 5, 90 20, 90 40 C 90 55, 80 75, 50 95 Z" /></svg>` },
        { name: 'Pentagon', svg: `<svg viewBox="0 0 100 100"><polygon points="50,5 95,40 80,95 20,95 5,40" /></svg>` },
        { name: 'Trapezoid', svg: `<svg viewBox="0 0 100 100"><polygon points="20,10 80,10 95,90 5,90" /></svg>` },
    ]
};
let characterData = {};
let binaryCharacterSets = [];
const colorMap = {
    'Red': '#FF0000', 'Green': '#00FF00', 'Blue': '#0000FF', 'Yellow': '#FFFF00',
    'Purple': '#800080', 'Orange': '#FFA500', 'White': '#FFFFFF', 'Pink': '#FF69B4'
};
const colors = Object.keys(colorMap);
const nonInvertibleShapes = ['Circle', 'Square', 'Plus', 'Cross', 'Diamond'];

// --- Application State ---
let currentMode = 'numbers';
let currentScope = 'small';
let displayDuration = 4000;
let isRunning = false;
let isPaused = false;
let cycleTimer = null;
let audio, audioQueue = [], currentAudioPromise = null;
let controlsTimer = null;
const HIDE_CONTROLS_DELAY = 20000;
const RESET_CONTROLS_TIMEOUT = 40000;

// --- Logic ---
function generateScopes(fullArray) {
    const shuffled = [...fullArray].sort(() => 0.5 - Math.random());
    const smallSize = Math.ceil(shuffled.length * 0.33333);
    const mediumSize = Math.ceil(shuffled.length * 0.66666);
    return { small: shuffled.slice(0, smallSize), medium: shuffled.slice(0, mediumSize), full: shuffled };
}

function generatePairs() {
    const permanentPair = { display: '0 and 1', chars: ['0', '1'] };
    const fullPool = [...rawCharacterData.numbers, ...rawCharacterData.letters, ...rawCharacterData.shapes];
    const shuffled = fullPool.sort(() => 0.5 - Math.random());
    const randomPairs = [];
    for (let i = 0; i < 8; i += 2) {
        const char1 = shuffled[i];
        const char2 = shuffled[i + 1];
        const d1 = typeof char1 === 'object' ? char1.name : char1;
        const d2 = typeof char2 === 'object' ? char2.name : char2;
        randomPairs.push({ display: `${d1} and ${d2}`, chars: [char1, char2] });
    }
    return [permanentPair, ...randomPairs];
}

function populatePairSelector() {
    binaryCharacterSets = generatePairs();
    pairSelect.innerHTML = '';
    binaryCharacterSets.forEach((pair, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = pair.display;
        pairSelect.appendChild(option);
    });
}

function getCharacterType(character) {
    if (typeof character === 'object') return 'Shape';
    if (rawCharacterData.letters.includes(character)) return 'Letter';
    return 'Number';
}

function generateCharacter() {
    let characterPool = [];
    if (currentMode === 'binary') {
        const selectedPairIndex = pairSelect.value;
        characterPool = binaryCharacterSets[selectedPairIndex].chars;
    } else if (currentMode === 'mixed') {
        characterPool = [
            ...characterData.numbers[currentScope],
            ...characterData.letters[currentScope],
            ...characterData.shapes[currentScope]
        ];
    } else {
        characterPool = characterData[currentMode][currentScope];
    }
    const character = getRandomElement(characterPool);
    const type = getCharacterType(character);
    const colorName = getRandomElement(colors);
    return { character, colorName, type };
}

function displayCharacter(charInfo) {
    const { character, colorName } = charInfo;
    const colorValue = colorMap[colorName];
    const x = Math.floor(Math.random() * 50) + 25;
    const y = Math.floor(Math.random() * 50) + 25;
    characterDisplay.style.left = `${x}%`;
    characterDisplay.style.top = `${y}%`;
    characterDisplay.style.setProperty('--glow-color', colorValue);
    characterDisplay.classList.add('glow');

    if (typeof character === 'object' && character.svg) {
        let inversion = getRandomInversion();
        if (nonInvertibleShapes.includes(character.name)) inversion = 'none';
        let specialTransform = '';
        if (character.name === 'Oval') {
            inversion = 'none';
            if (Math.random() < 0.5) specialTransform = 'rotate(90 50 50)';
        }
        const transform = getInversionTransform(inversion) + ` ${specialTransform}`;
        const finalSvg = character.svg.replace(/<svg (.*?)>/, `<svg $1 fill="${colorValue}" transform="${transform.trim()}">`);
        characterContent.innerHTML = finalSvg;
    } else {
        characterContent.innerHTML = `<span>${character}</span>`;
        characterContent.style.color = colorValue;
    }
}

function getRandomElement(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function getInversionTransform(inversion) {
    if (inversion === 'lateral') return 'scale(-1, 1) translate(-100, 0)';
    if (inversion === 'vertical') return 'scale(1, -1) translate(0, -100)';
    return '';
}
function getRandomInversion() {
    const rand = Math.random();
    if (rand < 0.33) return 'none';
    if (rand < 0.66) return 'lateral';
    return 'vertical';
}

async function runTrainingCycle() {
    if (!isRunning || isPaused) return;
    characterContent.innerHTML = '';
    characterDisplay.classList.remove('glow');
    if (cycleTimer) clearTimeout(cycleTimer);
    const charInfo = generateCharacter();
    const initialSound = (currentMode === 'mixed' && soundTypeCheckbox.checked) ? `Music/Types/${charInfo.type}.mp3` : 'beep.mp3';
    await playAudioSequence([initialSound]);
    if (!isRunning || isPaused) return;
    displayCharacter(charInfo);
    cycleTimer = new PausableTimer(async () => {
        if (!isRunning || isPaused) return;
        const audioFiles = [];
        audioFiles.push(`Music/Colors/${charInfo.colorName}.mp3`);
        const charValue = (typeof charInfo.character === 'object') ? charInfo.character.name : charInfo.character;
        const audioType = `${charInfo.type}s`;
        audioFiles.push(`Music/${audioType}/${charValue}.mp3`);
        await playAudioSequence(audioFiles);
        if (!isRunning || isPaused) return;
        cycleTimer = new PausableTimer(runTrainingCycle, 200);
    }, displayDuration);
}

// --- Controls & Timers ---
function playAudioSequence(files) {
    return new Promise((resolve) => {
        if (!files || files.length === 0 || isPaused) { resolve(); return; }
        let index = 0;
        if (audio && !audio.paused) { audio.pause(); audio.currentTime = 0; }
        audio = new Audio();
        const playNext = () => {
            if (isPaused) { audioQueue = files.slice(index); resolve(); return; }
            if (index < files.length) {
                audio.src = files[index];
                audio.play().catch(e => { console.error(`Error playing audio: ${files[index]}`, e); index++; playNext(); });
            } else { resolve(); }
        };
        audio.addEventListener('ended', () => { index++; playNext(); });
        audio.addEventListener('error', (e) => { console.error(`Error with audio element for ${files[index]}:`, e); index++; playNext(); });
        playNext();
    });
}

function PausableTimer(callback, delay) {
    let timerId, start, remaining = delay;
    this.pause = function() { window.clearTimeout(timerId); remaining -= Date.now() - start; };
    this.resume = function() { start = Date.now(); window.clearTimeout(timerId); timerId = window.setTimeout(callback, remaining); };
    this.resume();
}

function stopTraining() {
    isRunning = false; isPaused = false;
    if (cycleTimer) { cycleTimer.pause(); cycleTimer = null; }
    if (audio && !audio.paused) audio.pause();
    audioQueue = [];
    characterContent.innerHTML = '';
    characterDisplay.classList.remove('glow');
    startButton.classList.remove('hidden');
    showControls(true);
}

async function togglePause() {
    if (!isRunning) return;
    isPaused = !isPaused;

    if (isPaused) {
        if (cycleTimer) cycleTimer.pause();
        if (audio && !audio.paused) audio.pause();
        showControls(true);
        await playAudioSequence(['Music/States/pause.mp3']);
    } else {
        showControls(false);
        await playAudioSequence(['Music/States/resume.mp3']);
        if (cycleTimer) cycleTimer.resume();
        if (audio && audio.paused) {
             if (audioQueue.length > 0) playAudioSequence(audioQueue);
             else audio.play().catch(e => console.error("Error resuming audio:", e));
        } else if (!currentAudioPromise) runTrainingCycle();
        resetControlsTimer(HIDE_CONTROLS_DELAY);
    }
}

function hideControls() { controls.classList.add('hidden-controls'); }
function showControls(force) {
    controls.classList.remove('hidden-controls');
    clearTimeout(controlsTimer);
    if (isRunning && !isPaused) {
        const timeout = force ? RESET_CONTROLS_TIMEOUT : HIDE_CONTROLS_DELAY;
        controlsTimer = setTimeout(hideControls, timeout);
    }
}
function resetControlsTimer(delay) {
    clearTimeout(controlsTimer);
    controlsTimer = setTimeout(hideControls, delay);
}

// --- Event Listeners ---
function updateControlVisibility() {
    currentMode = modeSelect.value;
    const isBinary = currentMode === 'binary';
    const isMixed = currentMode === 'mixed';

    scopeControl.style.display = (isBinary) ? 'none' : 'flex';
    binaryModeOptions.style.display = (isBinary) ? 'flex' : 'none';
    mixedModeOptions.style.display = (isMixed) ? 'flex' : 'none';

    if (isBinary) {
        populatePairSelector();
    }
}

modeSelect.addEventListener('change', () => {
    if (isRunning) stopTraining();
    updateControlVisibility();
});

pairSelect.addEventListener('change', () => {
    if (isRunning) stopTraining();
});

startButton.addEventListener('click', () => {
    if (isRunning) return;
    characterData.numbers = generateScopes(rawCharacterData.numbers);
    characterData.letters = generateScopes(rawCharacterData.letters);
    characterData.shapes = generateScopes(rawCharacterData.shapes);
    isRunning = true; isPaused = false;
    startButton.classList.add('hidden');
    resetControlsTimer(HIDE_CONTROLS_DELAY);
    runTrainingCycle();
});

['mousemove', 'mousedown', 'keydown'].forEach(evt => document.addEventListener(evt, () => showControls(false)));
scopeSelect.addEventListener('change', (e) => { if(isRunning) stopTraining(); currentScope = e.target.value; });
frequencySlider.addEventListener('input', (e) => {
    if(isRunning) stopTraining();
    displayDuration = parseInt(e.target.value) * 1000;
    frequencyValue.textContent = `${e.target.value}s`;
});
characterDisplay.addEventListener('click', togglePause);
document.addEventListener('keydown', (e) => { if (e.code === 'Space' && isRunning) { e.preventDefault(); togglePause(); } });

// Initial setup
updateControlVisibility();
populatePairSelector();
