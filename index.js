"use strict";
Object.defineProperty(Array.prototype, 'randomIndex', {
    value: function () {
        return this.length ? Math.floor(Math.random() * this.length) : undefined;
    }
});
Object.defineProperty(Array.prototype, 'randomElement', {
    value: function () {
        return this.length ? this[this.randomIndex()] : undefined;
    }
});
Object.defineProperty(Array.prototype, 'shuffle', {
    value: function () {
        // Knuth shuffle https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
        for (let i = this.length; i > 0;) {
            const j = Math.floor(Math.random() * i);
            --i;
            const tmp = this[i];
            this[i] = this[j];
            this[j] = tmp;
        }
        return this;
    }
});
Object.defineProperty(Array.prototype, 'partition', {
    value: function (filter) {
        const partitions = {};
        let index = 0;
        for (const item of this) {
            const k = filter(item, index++, this);
            if (partitions[k] === undefined)
                partitions[k] = [];
            partitions[k].push(item);
        }
        return partitions;
    }
});
// https://chatgpt.com/s/t_687e848ccd088191b6e279a5e4367855
function FLIP(el, mutator, duration = 400) {
    const first = el.getBoundingClientRect();
    mutator(el);
    const last = el.getBoundingClientRect();
    const dx = first.left - last.left;
    const dy = first.top - last.top;
    el.style.transition = 'none';
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    void el.offsetWidth;
    el.style.transition = `transform ${duration}ms cubic-bezier(.4,0,.2,1)`;
    el.style.transform = '';
    return new Promise(resolve => {
        const cleanup = () => {
            el.style.transition = '';
            el.removeEventListener('transitionend', cleanup);
            resolve();
        };
        el.addEventListener('transitionend', cleanup);
    });
}
async function level(levelIndex, instructions, cols, rows, timeoutMs = 3000) {
    const scoreEl = document.querySelector('#score');
    const deckEl = document.querySelector('.deck');
    // const timeoutActionType: "hint" | "add" | "remove" = setsToAddPerTimeout === 0 ? "hint" : setsToAddPerTimeout > 0 ? "add" : "remove"
    let setsRemaining = 0;
    let lastWordTime = 0;
    // Hack
    // let lock: boolean = false;
    let totalScore = 0;
    return new Promise((resolve, reject) => {
        const wordEl = document.querySelector('#word');
        const tickEl = document.querySelector('.tick');
        /// TODO: Make this do real stuff
        tickEl.addEventListener('click', e => {
            if (scoreEl.innerText != "No word") {
                // User clicked the tick, so we assume they want to submit the word
                wordEl.innerHTML = ""; // Clear the word
                playSoundEffect("good");
            }
        });
        const grid_len = cols * rows;
        const columns = [];
        const setSizes = {};
        let wordCells = [];
        let hintCells = []; // Cells that are currently being hinted at
        const i2rc = (i) => [Math.floor(i / cols), i % cols];
        const candidateWord = () => {
            let word = "";
            // get the letters from word divs children
            const wordCells = Array.from(wordEl.children);
            for (const cell of wordCells) {
                const letter = getTileElementLetter(cell);
                if (letter) {
                    word += letter == " " ? "?" : letter; // Change blank tiles to wildcards
                }
            }
            return word.toLowerCase();
        };
        const GetDictWord = (word) => {
            // Convert pattern to a regex: replace ? with .
            // Commented out is case-insensitive version
            // const regex = new RegExp('^' + word.replace(/\?/g, '.') + '$', 'i');
            const regex = new RegExp('^' + word.replace(/\?/g, '.') + '$');
            const match = WordList60.find(word => regex.test(word));
            console.log("GetDictWord", word, "=>", match);
            return match;
        };
        const index2TileElement = (i) => document.querySelector(`.scrabble-tile[data-index="${i}"]`);
        const setTileElementLetter = (tileEl, letter) => {
            tileEl.dataset['letter'] = tileEl.innerText = letter;
            tileEl.dataset['value'] = `${scrabbleData[letter].value}`;
            if (!letter) {
                tileEl.style.display = 'none';
            }
            else {
                tileEl.style.display = 'block';
            }
        };
        const getTileElementLetter = (tileEl) => {
            return tileEl.dataset['letter'];
        };
        const getTileElementRowColumn = (tileEl) => {
            const r = parseInt(tileEl.style.gridRow) - 1; // Convert to 0-based index
            const c = parseInt(tileEl.style.gridColumn) - 1; // Convert to 0-based index
            return [r, c];
        };
        const setTileElementRow = (tileEl, r) => {
            tileEl.style.gridRow = `${r + 1}`; // Convert to 1-based index for CSS grid
        };
        const moveTileDownOneRow = (tileEl) => {
            const [currentRow, currentCol] = getTileElementRowColumn(tileEl);
            setTileElementRow(tileEl, currentRow + 1);
        };
        const moveTileUpOneRow = (tileEl) => {
            const [currentRow, currentCol] = getTileElementRowColumn(tileEl);
            setTileElementRow(tileEl, currentRow - 1);
        };
        const makeTileElementAtColumn = (c) => {
            // https://stackoverflow.com/questions/48419167/how-to-convert-one-emoji-character-to-unicode-codepoint-number-in-javascript
            // console.log([...v].map(e => e.codePointAt(0).toString(16)).join(`-`)) // gives correctly 1f469-200d-2695-fe0
            const tileEl = document.createElement('div');
            tileEl.style.gridColumn = `${c + 1}`; // Convert to 1-based index for CSS grid
            tileEl.className = (`scrabble-tile`); // Set the class to the default tile class
            tileEl.dataset['letter'] = "";
            tileEl.dataset['column'] = `${c}`;
            tileEl.innerText = "";
            tileEl.ontransitionend = tileEl.onanimationend = () => {
                tileEl.className = (`scrabble-tile`); // Remove all animation classes
            };
            const touched = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const [_, tileCol] = getTileElementRowColumn(tileEl);
                // if the parent element is the wordEl, then we are moving the tile back to the deck
                if (tileEl.parentElement === wordEl) {
                    // only allow touch events for the second-to-last child of the wordEl
                    if (tileEl != wordEl.lastElementChild) {
                        playSoundEffect("deselected");
                        return;
                    }
                    const cellsToMove = Array.from(document.querySelectorAll('.scrabble-tile'))
                        .filter(cell => {
                        const computedStyle = window.getComputedStyle(cell);
                        const col = parseInt(computedStyle.gridColumnStart, 10);
                        return col === tileCol + 1;
                    });
                    for (const cell of cellsToMove) {
                        FLIP(cell, (el) => {
                            moveTileUpOneRow(el);
                        });
                    }
                    // Move the tile back to the deck
                    FLIP(tileEl, (el) => { deckEl.appendChild(el); });
                    scoreEl.innerHTML = GetDictWord(candidateWord()) || "No word";
                    return;
                }
                // only allow touch events for tiles on the last row of the deck
                if (parseInt(getComputedStyle(tileEl).gridRowStart, 10) != rows) {
                    playSoundEffect("deselected");
                    return;
                }
                FLIP(tileEl, (el) => { wordEl.appendChild(tileEl); });
                scoreEl.innerHTML = GetDictWord(candidateWord()) || "No word";
                // select all tiles in the same column using their gridColmumn style as selector
                const cellsToMove = Array.from(document.querySelectorAll('.scrabble-tile'))
                    .filter(cell => {
                    const computedStyle = window.getComputedStyle(cell);
                    const col = parseInt(computedStyle.gridColumnStart, 10);
                    return col === tileCol + 1;
                });
                for (const cell of cellsToMove) {
                    FLIP(cell, (el) => {
                        moveTileDownOneRow(el);
                    });
                }
                for (const cell of wordCells) {
                    cell.classList.remove('rotateOut');
                }
                // wordCells.push(tileEl);
                tileEl.classList.add("selected");
                const madeWord = (cells) => false;
                if (madeWord(wordCells)) {
                    // We have a match
                    let score = 0; // No score if timeout
                    let msToFindWord = Date.now() - lastWordTime;
                    if (msToFindWord < 1000) {
                        score = 100;
                    }
                    else if (msToFindWord < 3000) {
                        score = 25;
                        // } else if (msToFindWord < 5000) {
                        //     score = 10;
                    }
                    else
                        score = 10;
                    totalScore += score;
                    if (score > 0) {
                        const soundEffectName = score == 100 ? "excellent" : (score == 25 ? "good" : "selected3");
                        // Don't await, these sounds take a long time to play
                        playSoundEffect(soundEffectName);
                    }
                    scoreEl.innerHTML = `Level ${levelIndex + 1} - Score: ${totalScore.toFixed(0)}  (${setsRemaining.toFixed(0)})`;
                    for (const cell of wordCells) {
                        cell.classList.add('rotateOut');
                    }
                    wordCells = [];
                    resetTimerBar();
                    if (setsRemaining === 0) {
                        // Level over
                        resolve();
                    }
                }
                else { // Not a word yet
                    playSoundEffect(wordCells.length == 2 ? "selected2" : "selected3");
                }
                // lock = false;
            };
            tileEl.addEventListener('mousedown', touched);
            tileEl.addEventListener('touchstart', touched);
            return tileEl;
        };
        const userFoundWordBeforeTimeout = () => {
            return Date.now() - lastWordTime < timeoutMs;
        };
        const timeoutAction = () => {
            // Find a set of tiles and animate them as a hint
            if (!userFoundWordBeforeTimeout()) {
                showModalDialog("Too slow!").then(() => { reject(); });
            }
        };
        const initialDeal = () => {
            // const audioElGood = document.querySelector('#audio_match_good') as HTMLAudioElement;
            // const audioElOk = document.querySelector('#audio_match_ok') as HTMLAudioElement;
            // Make deck
            deckEl.innerHTML = "";
            deckEl.style.gridTemplateColumns = `repeat(10, minmax(0, 1fr))`;
            deckEl.style.gridTemplateRows = `repeat(10, minmax(0, 1fr))`;
            deckEl.style.aspectRatio = `1 / 1`; // Set aspect ratio of deck
            ScrabbleLetters.shuffle();
            for (let c = 0; c < 10; ++c) {
                columns[c] = [];
                for (let r = 0; r < rows; ++r) {
                    const i = c * rows + r;
                    const tileEl = makeTileElementAtColumn(c);
                    deckEl.appendChild(tileEl);
                    setTileElementRow(tileEl, r);
                    setTileElementLetter(tileEl, ScrabbleLetters.pop());
                    columns[c].push(getTileElementLetter(tileEl));
                }
            }
            setTimerBarTransitionTime(timeoutMs);
            resetTimerBar();
        };
        const resetTimerBar = () => {
            const onBarEnd = () => {
                timeoutAction();
                fill.removeEventListener('animationend', onBarEnd);
            };
            if (timeoutMs <= 0)
                return;
            const fill = document.querySelector('.timer-fill');
            fill.removeEventListener('animationend', onBarEnd);
            fill.style.animation = '';
            void fill.offsetWidth;
            fill.classList.remove('animate');
            void fill.offsetWidth;
            fill.classList.add('animate');
            fill.addEventListener('animationend', onBarEnd, { once: true });
            // fill.addEventListener('animationend', () => alert("Foo"), {once: true});
            lastWordTime = Date.now();
        };
        const setTimerBarTransitionTime = (milliSeconds) => {
            document.documentElement.style.setProperty('--TRANSITION_TIME', `${milliSeconds / 1000}s`);
        };
        initialDeal();
    });
}
const ctx = new AudioContext({ latencyHint: 'interactive' });
const SoundEffect = {
    "selected": undefined,
    "selected2": undefined,
    "selected3": undefined,
    "deselected": undefined,
    "good": undefined,
    "excellent": undefined,
    "ok": undefined
};
async function getAudioBufferFromFile(fileName) {
    const resp = await fetch(fileName);
    const array = await resp.arrayBuffer();
    return await ctx.decodeAudioData(array);
}
let ctxLastTime = 0;
async function playAudioBuffer(buffer) {
    if (ctx.state != 'running')
        await ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    console.log("Elapsed since last call :", (ctx.currentTime - ctxLastTime).toFixed(1) + "s");
    ctxLastTime = ctx.currentTime;
    src.connect(ctx.destination);
    src.start();
    console.log("started playing audio buffer", buffer);
    return new Promise((resolve) => {
        src.onended = () => {
            console.log("onended playing audio buffer", buffer);
            src.disconnect(ctx.destination); // Disconnect after playback
            resolve();
        };
    });
}
async function playSoundEffect(name) {
    console.log(name, "sound effect requested");
    const buffer = SoundEffect[name];
    if (buffer) {
        await playAudioBuffer(buffer);
        console.log(name, "sound effect played");
    }
}
// repeatedly play a clock tick sound every second
function playClockTick() {
    if (ctx.state !== 'running') {
        ctx.resume();
    }
    const src = ctx.createBufferSource();
    if (!SoundEffect["clock-tick"]) {
        console.warn("Clock tick sound effect not loaded");
        return;
    }
    src.buffer = SoundEffect["clock-tick"];
    src.connect(ctx.destination);
    src.start();
    setTimeout(playClockTick, 1000); // Play again after 1 second
}
function getBlip(frequency, risingDuration, fallingDuration) {
    const sampleRate = ctx.sampleRate; // Use the context's actual sample rate
    const totalDuration = risingDuration + fallingDuration;
    const length = Math.floor(sampleRate * totalDuration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        let amplitude;
        if (t < risingDuration) {
            amplitude = t / risingDuration;
        }
        else {
            amplitude = 1 - ((t - risingDuration) / fallingDuration);
        }
        amplitude = Math.max(0, Math.min(1, amplitude)); // Clamp to [0,1]
        const chord = Math.sin(2 * Math.PI * frequency * t) + .2 * Math.sin(2 * Math.PI * frequency * 1.5 * t) + .1 * Math.sin(2 * Math.PI * frequency * 1.25 * t);
        data[i] = amplitude * chord / 3;
    }
    return buffer;
}
const scrabbleData = {
    A: { letter: 'A', value: 1, frequency: 9 },
    B: { letter: 'B', value: 3, frequency: 2 },
    C: { letter: 'C', value: 3, frequency: 2 },
    D: { letter: 'D', value: 2, frequency: 4 },
    E: { letter: 'E', value: 1, frequency: 12 },
    F: { letter: 'F', value: 4, frequency: 2 },
    G: { letter: 'G', value: 2, frequency: 3 },
    H: { letter: 'H', value: 4, frequency: 2 },
    I: { letter: 'I', value: 1, frequency: 9 },
    J: { letter: 'J', value: 8, frequency: 1 },
    K: { letter: 'K', value: 5, frequency: 1 },
    L: { letter: 'L', value: 1, frequency: 4 },
    M: { letter: 'M', value: 3, frequency: 2 },
    N: { letter: 'N', value: 1, frequency: 6 },
    O: { letter: 'O', value: 1, frequency: 8 },
    P: { letter: 'P', value: 3, frequency: 2 },
    Q: { letter: 'Q', value: 10, frequency: 1 },
    R: { letter: 'R', value: 1, frequency: 6 },
    S: { letter: 'S', value: 1, frequency: 4 },
    T: { letter: 'T', value: 1, frequency: 6 },
    U: { letter: 'U', value: 1, frequency: 4 },
    V: { letter: 'V', value: 4, frequency: 2 },
    W: { letter: 'W', value: 4, frequency: 2 },
    X: { letter: 'X', value: 8, frequency: 1 },
    Y: { letter: 'Y', value: 4, frequency: 2 },
    Z: { letter: 'Z', value: 10, frequency: 1 },
    " ": { letter: ' ', value: 0, frequency: 2 } // Blank tile
};
const ScrabbleLetters = [];
Object.values(scrabbleData).forEach(tile => {
    for (let i = 0; i < tile.frequency; i++) {
        ScrabbleLetters.push(tile.letter);
    }
});
const modalDialog = document.querySelector('.modal');
const modalDialogMessage = document.querySelector('.modal_message');
const modalDialogOkButton = document.querySelector('.modal__ok');
const showModalDialog = async (message) => {
    return new Promise((resolve) => {
        modalDialogOkButton.addEventListener('click', () => { modalDialog.classList.remove('active'); resolve(); }, { once: true });
        modalDialogMessage.innerHTML = message;
        modalDialog.classList.add('active');
        modalDialogOkButton.focus();
    });
};
const levelsMobile = [
    { instruction: "Match sets of three.", cols: 5, rows: 7, timeoutMs: 600_000 },
    { instruction: "Match pairs!", cols: 5, rows: 8, timeoutMs: 30_000 },
    { instruction: "Match sets of three!", cols: 5, rows: 8, timeoutMs: 60_000 },
    { instruction: "Match pairs!", cols: 7, rows: 10, timeoutMs: 60_000 },
    { instruction: "Match sets of three!", cols: 7, rows: 10, timeoutMs: 60_000 },
    { instruction: "Match sets of three!", cols: 7, rows: 11, timeoutMs: 60_000 },
    { instruction: "Match sets of three!", cols: 8, rows: 12, timeoutMs: 60_000 },
];
const levelsDesktop = [
    { instruction: "Match sets of three", cols: 10, rows: 10, timeoutMs: 600_000 },
    { instruction: "Match pairs!", cols: 21, rows: 14, timeoutMs: 30_000 },
    { instruction: "Match sets of three!", cols: 5, rows: 8, timeoutMs: 60_000 },
    { instruction: "Match pairs!", cols: 7, rows: 10, timeoutMs: 60_000 },
    { instruction: "Match sets of three!", cols: 7, rows: 10, timeoutMs: 60_000 },
    { instruction: "Match sets of three!", cols: 7, rows: 11, timeoutMs: 60_000 },
    { instruction: "Match sets of three!", cols: 8, rows: 12, timeoutMs: 60_000 },
];
const levels = screen.width > screen.height && screen.width >= 1280 ? levelsDesktop : levelsMobile; // Use desktop levels on larger screens
// 2) playLevel() simply looks up and invokes level():
async function playLevel(idx) {
    if (idx < 0 || idx >= levels.length) {
        throw new RangeError(`Invalid level index ${idx}`);
    }
    const { instruction, cols, rows, timeoutMs } = levels[idx];
    await level(idx, instruction, cols, rows, timeoutMs);
}
/**
 * Retrieve the persisted reached level (defaulting to 0).
 */
function getReachedLevel() {
    const stored = localStorage.getItem('reached_level');
    return stored !== null ? parseInt(stored, 10) : 0; //
}
/**
 * Persist a new reached level.
 */
function setReachedLevel(level) {
    localStorage.setItem('reached_level', String(level)); //
}
/**
 * Plays the next unreached level, then increments the stored reached_level
 * only if playLevel resolves successfully.
 */
async function playReachedLevel() {
    const levelIndex = getReachedLevel();
    try {
        await playLevel(levelIndex); // invoke with no args from caller
        setReachedLevel(levelIndex + 1); // only increment on success
    }
    catch (err) {
        // playLevel rejected (e.g. user lost); do not advance reached_level
        console.error(`Level ${levelIndex} failed or was aborted:`, err);
        // throw err;  // rethrow if you want callers to handle it
    }
}
// const strLevel =    prompt(`Level: (0-${levels.length-1})\n\n:`, getReachedLevel().toString());
const levelIndex = 0; // strLevel !== null ? parseInt(strLevel, 10) : 0;
if (!(isNaN(levelIndex) || levelIndex < 0 || levelIndex >= levels.length)) {
    setReachedLevel(levelIndex); // Reset reached level to 0 on startup
}
(async () => {
    // Init audio
    SoundEffect["selected"] = getBlip(1000, 0.01, 0.03);
    SoundEffect["selected2"] = getBlip(1250, 0.01, 0.03);
    SoundEffect["selected3"] = getBlip(1500, 0.01, 0.03);
    SoundEffect["deselected"] = getBlip(200, 0.01, 0.05);
    SoundEffect["good"] = await getAudioBufferFromFile('/audio/match_good.mp3');
    SoundEffect["excellent"] = await getAudioBufferFromFile('/audio/match_excellent.mp3');
    SoundEffect["ok"] = await getAudioBufferFromFile('/audio/match_ok.mp3');
    SoundEffect["clock-tick"] = await getAudioBufferFromFile('/audio/clock_tick.wav');
    // await showModalDialog("Ready to play?");
    // Keep soundbars from going into standby mode by playing a very high frequency sound
    // https://www.reddit.com/r/Soundbars/comments/nyxpzp/soundbar_standby_blocker_prevent_soundbar_from/?utm_source=chatgpt.com
    const oscTick = ctx.createOscillator();
    oscTick.frequency.value = ctx.sampleRate / 2 - 2; // Just below nyquist frequency
    oscTick.connect(ctx.destination);
    oscTick.start();
    await playReachedLevel();
})();
//# sourceMappingURL=index.js.map