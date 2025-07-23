const characterDisplay = document.getElementById('character-display');
const modeSelect = document.getElementById('mode-select');
const mixedModeOptions = document.getElementById('mixed-mode-options');
const soundTypeCheckbox = document.getElementById('sound-type-checkbox');
const frequencySlider = document.getElementById('frequency-slider');
const frequencyValue = document.getElementById('frequency-value');
const startButton = document.getElementById('start-button');

const numbers = '0123456789'.split('');
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const shapes = ['Square', 'Triangle', 'Circle', 'Plus', 'Rectangle', 'Oval', 'Star', 'Arrow', 'Cresent', 'Cross', 'Diamond', 'Heart', 'Pentagon', 'Trapezoid'];

// Map color names to hex codes for display
const colorMap = {
    'Red': '#FF0000',
    'Green': '#00FF00',
    'Blue': '#0000FF',
    'Yellow': '#FFFF00',
    'Purple': '#800080',
    'Orange': '#FFA500',
    'White': '#FFFFFF',
    'Pink': '#FF69B4' // Use a more vibrant pink (HotPink)
};
const colors = Object.keys(colorMap); // Used for random selection and audio file names

let currentMode = 'numbers';
let displayDuration = 4000;
let isRunning = false;
let isPaused = false;
let cycleTimer = null;
let audio; // Keep a reference to the current audio object
let audioQueue = [];
let currentAudioPromise = null;


function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateCharacter() {
    let character;
    let color = getRandomElement(colors); // Get color name
    let type = '';

    switch (currentMode) {
        case 'numbers':
            character = getRandomElement(numbers);
            type = 'Number';
            break;
        case 'letters':
            character = getRandomElement(letters);
            type = 'Letter';
            break;
        case 'shapes':
            character = getRandomElement(shapes);
            type = 'Shape';
            break;
        case 'mixed':
            const typeChoice = getRandomElement(['Number', 'Letter', 'Shape']);
            type = typeChoice;
            switch (typeChoice) {
                case 'Number':
                    character = getRandomElement(numbers);
                    break;
                case 'Letter':
                    character = getRandomElement(letters);
                    break;
                case 'Shape':
                    character = getRandomElement(shapes);
                    break;
            }
            break;
    }
    return { character, color, type }; // Return color name
}

function playAudioSequence(files) {
    if (isPaused) {
        audioQueue = files;
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        if (!files || files.length === 0) {
            resolve();
            return;
        }

        let index = 0;
        // Stop any previously playing audio
        if (audio && !audio.paused) {
            audio.pause();
            audio.currentTime = 0;
        }
        audio = new Audio();

        const playNext = () => {
            if (isPaused) {
                // Save the rest of the queue
                audioQueue = files.slice(index);
                resolve(); // Resolve the promise to let the cycle continue if needed
                return;
            }
            if (index < files.length) {
                audio.src = files[index];
                audio.play().catch(e => {
                    console.error(`Error playing audio: ${files[index]}`, e);
                    index++;
                    playNext(); // Try next file
                });
            } else {
                resolve();
            }
        };

        audio.addEventListener('ended', () => {
            index++;
            playNext();
        });

        audio.addEventListener('error', (e) => {
            console.error(`Error with audio element for ${files[index]}:`, e);
            index++;
            playNext(); // Try next file
        });

        playNext();
    });
}


async function runTrainingCycle() {
    if (!isRunning || isPaused) return;

    characterDisplay.innerHTML = '';
    if (cycleTimer) clearTimeout(cycleTimer);

    const { character, color, type } = generateCharacter();
    const colorValue = colorMap[color]; // Get hex value for display

    const initialSound = (currentMode === 'mixed' && soundTypeCheckbox.checked)
        ? `Music/Types/${type}.mp3`
        : 'beep.mp3';

    currentAudioPromise = playAudioSequence([initialSound]);
    await currentAudioPromise;
    currentAudioPromise = null;


    if (!isRunning || isPaused) return;

    if (shapes.includes(character)) {
        const inversion = getRandomInversion();
        characterDisplay.innerHTML = createShape(character, colorValue, inversion);
    } else {
        characterDisplay.textContent = character;
        characterDisplay.style.color = colorValue;
    }

    cycleTimer = new PausableTimer(async () => {
        if (!isRunning || isPaused) return;

        const audioFiles = [];
        audioFiles.push(`Music/Colors/${color}.mp3`); // Use color name for audio

        if (numbers.includes(character)) {
            audioFiles.push(`Music/Numbers/${character}.mp3`);
        } else if (letters.includes(character)) {
            audioFiles.push(`Music/Letters/${character}.mp3`);
        } else if (shapes.includes(character)) {
            audioFiles.push(`Music/Shapes/${character}.mp3`);
        }

        currentAudioPromise = playAudioSequence(audioFiles);
        await currentAudioPromise;
        currentAudioPromise = null;


        if (!isRunning || isPaused) return;

        cycleTimer = new PausableTimer(runTrainingCycle, 2000);

    }, displayDuration);
}

function getRandomInversion() {
    const rand = Math.random();
    if (rand < 0.33) {
        return 'none';
    } else if (rand < 0.66) {
        return 'lateral';
    } else {
        return 'vertical';
    }
}

function createShape(shape, colorValue, inversion = 'none') {
    let svg;
    let transform = '';
    if (inversion === 'lateral') {
        transform = 'scale(-1, 1) translate(-100, 0)';
    } else if (inversion === 'vertical') {
        transform = 'scale(1, -1) translate(0, -100)';
    }

    switch (shape) {
        case 'Square':
            svg = `<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" fill="${colorValue}" transform="${transform}" /></svg>`;
            break;
        case 'Triangle':
            svg = `<svg viewBox="0 0 100 100"><polygon points="50,10 90,90 10,90" fill="${colorValue}" transform="${transform}" /></svg>`;
            break;
        case 'Circle':
            svg = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="${colorValue}" transform="${transform}" /></svg>`;
            break;
        case 'Plus': // Slimmer plus sign
            svg = `<svg viewBox="0 0 100 100"><g transform="${transform}"><rect x="40" y="10" width="20" height="80" fill="${colorValue}" /><rect x="10" y="40" width="80" height="20" fill="${colorValue}" /></g></svg>`;
            break;
        case 'Rectangle':
            svg = `<svg viewBox="0 0 100 100"><rect x="10" y="25" width="80" height="50" fill="${colorValue}" transform="${transform}" /></svg>`;
            break;
        case 'Oval':
            svg = `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="50" rx="45" ry="30" fill="${colorValue}" transform="${transform}" /></svg>`;
            break;
        case 'Star':
            svg = `<svg viewBox="0 0 100 100"><polygon points="50,5 61,40 98,40 68,62 79,95 50,75 21,95 32,62 2,40 39,40" fill="${colorValue}" transform="${transform}" /></svg>`;
            break;
        case 'Arrow':
            svg = `<svg viewBox="0 0 100 100"><polygon points="50,10 70,40 60,40 60,90 40,90 40,40 30,40" fill="${colorValue}" transform="${transform}" /></svg>`;
            break;
        case 'Cresent': // Corrected SVG path, linked to the misspelled name to match audio file
            svg = `<svg viewBox="0 0 100 100"><path d="M 50,10 A 40,40 0 0 1 50,90 A 60,60 0 0 0 50,10 Z" fill="${colorValue}" transform="${transform}" /></svg>`;
            break;
        case 'Cross':
            svg = `<svg viewBox="0 0 100 100"><path d="M 20,10 L 50,40 L 80,10 L 90,20 L 60,50 L 90,80 L 80,90 L 50,60 L 20,90 L 10,80 L 40,50 L 10,20 Z" fill="${colorValue}" transform="${transform}" /></svg>`;
            break;
        case 'Diamond':
            svg = `<svg viewBox="0 0 100 100"><polygon points="50,5 95,50 50,95 5,50" fill="${colorValue}" transform="${transform}" /></svg>`;
            break;
        case 'Heart':
            svg = `<svg viewBox="0 0 100 100"><path d="M 50 95 C 20 75, 10 55, 10 40 C 10 20, 30 5, 50 25 C 70 5, 90 20, 90 40 C 90 55, 80 75, 50 95 Z" fill="${colorValue}" transform="${transform}" /></svg>`;
            break;
        case 'Pentagon':
            svg = `<svg viewBox="0 0 100 100"><polygon points="50,5 95,40 80,95 20,95 5,40" fill="${colorValue}" transform="${transform}" /></svg>`;
            break;
        case 'Trapezoid':
            svg = `<svg viewBox="0 0 100 100"><polygon points="20,10 80,10 95,90 5,90" fill="${colorValue}" transform="${transform}" /></svg>`;
            break;
    }
    return svg;
}

function stopTraining() {
    isRunning = false;
    isPaused = false;
    if (cycleTimer) {
        cycleTimer.pause(); // Effectively clears the timer
        cycleTimer = null;
    }
    if (audio && !audio.paused) {
        audio.pause();
    }
    audioQueue = [];
    characterDisplay.innerHTML = '';
    startButton.classList.remove('hidden');
}

function PausableTimer(callback, delay) {
    let timerId, start, remaining = delay;

    this.pause = function() {
        window.clearTimeout(timerId);
        remaining -= Date.now() - start;
    };

    this.resume = function() {
        start = Date.now();
        window.clearTimeout(timerId);
        timerId = window.setTimeout(callback, remaining);
    };

    this.resume();
}


function togglePause() {
    if (!isRunning) return;
    isPaused = !isPaused;

    if (isPaused) {
        // Pause the main cycle timer
        if (cycleTimer) {
            cycleTimer.pause();
        }
        // Pause the audio if it's playing
        if (audio && !audio.paused) {
            audio.pause();
        }
    } else {
        // Resume the main cycle timer
        if (cycleTimer) {
            cycleTimer.resume();
        }
        // Resume audio if there's a queue
        if (audio && audio.paused) {
             // If there was a queue, play it. Otherwise, the main flow will handle it.
             if (audioQueue.length > 0) {
                playAudioSequence(audioQueue);
                audioQueue = []; // Clear queue after starting
             } else {
                // If no queue, just resume the sound if it was paused mid-sound
                audio.play().catch(e => console.error("Error resuming audio:", e));
             }
        } else if (!currentAudioPromise) {
            // If no audio was playing and no promise is pending, continue the cycle
            runTrainingCycle();
        }
    }
}


// --- Event Listeners ---

modeSelect.addEventListener('change', (e) => {
    stopTraining();
    currentMode = e.target.value;
    if (currentMode === 'mixed') {
        mixedModeOptions.classList.remove('hidden');
    } else {
        mixedModeOptions.classList.add('hidden');
    }
});

frequencySlider.addEventListener('input', (e) => {
    const seconds = e.target.value;
    displayDuration = parseInt(seconds) * 1000;
    frequencyValue.textContent = `${seconds}s`;
});

startButton.addEventListener('click', () => {
    if (isRunning) return;
    isRunning = true;
    isPaused = false;
    startButton.classList.add('hidden');
    runTrainingCycle();
});

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (isRunning) {
            togglePause();
        }
    }
});

characterDisplay.addEventListener('click', () => {
    if (isRunning) {
        togglePause();
    }
});
