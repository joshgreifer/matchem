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
async function level(timeoutMs = 3000) {
    const lookedUpWordEl = document.querySelector('#looked-up-word');
    const deckEl = document.querySelector('.deck');
    const scoreEl = document.querySelector('#score');
    const bonusBadgeEl = document.querySelector('#bonus-badge');
    let lastWordTime = 0;
    const ScrabbleLetters = [];
    Object.values(scrabbleData).forEach(tile => {
        for (let i = 0; i < tile.frequency; i++) {
            ScrabbleLetters.push(tile.letter);
        }
    });
    return new Promise((resolve) => {
        const wordEl = document.querySelector('#word');
        const tickEl = document.querySelector('.tick');
        let totalScore = 0;
        /// TODO: Make this do real stuff
        tickEl.addEventListener('click', e => {
            totalScore += parseInt(tickEl.innerText, 10);
            playSoundEffect("selected3");
            resetTimerBar();
            if (deckEl.children.length == 0) {
                if (wordEl.children.length >= MIN_WORD_LENGTH) {
                    playSoundEffect("excellent");
                    totalScore += 200; // Bonus for finishing on a word of at least 3 letters
                }
                resolve(totalScore);
            }
            wordEl.innerHTML = ""; // Clear the word
        });
        const observer = new MutationObserver((mutationList) => {
            mutationList.forEach(mutation => {
                if (mutation.type === 'childList') {
                    console.log(' Tiles added or removed:', mutation);
                    onWordElementChanged();
                }
            });
        });
        observer.observe(wordEl, {
            childList: true, // watch for added/removed child nodes
            subtree: false // only direct children
        });
        const onWordElementChanged = () => {
            const updateMadeWord = () => {
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
                    if (word.length < MIN_WORD_LENGTH)
                        return undefined;
                    // Convert pattern to a regex: replace ? with .
                    // Commented out is case-insensitive version (allowing Proper nouns)
                    // const regex = new RegExp('^' + word.replace(/\?/g, '.') + '$', 'i');
                    const regex = new RegExp('^' + word.replace(/\?/g, '[a-z]') + '$');
                    const match = WordList70.find(word => regex.test(word));
                    console.log("GetDictWord", word, "=>", match);
                    return match;
                };
                return GetDictWord(candidateWord()) || "";
            };
            const madeWord = updateMadeWord();
            // calculate score by summing the values of the letters in the word
            let score = Array.from(madeWord).reduce((acc, letter) => {
                return acc + (scrabbleData[letter.toUpperCase()]?.value || 0);
            }, 0);
            lookedUpWordEl.innerHTML = madeWord;
            bonusBadgeEl.innerHTML = "";
            tickEl.className = 'tick'; // Reset tick element class
            if (madeWord.length >= 10) {
                score *= 5; // Bonus for long words
                bonusBadgeEl.innerHTML = "x5!!";
                bonusBadgeEl.classList.add('x5!!!');
                // playSoundEffect("excellent");
            }
            else if (madeWord.length >= 9) {
                score *= 3; // Bonus for long words
                bonusBadgeEl.innerHTML = "x3!!";
                bonusBadgeEl.classList.add('x3');
            }
            else if (madeWord.length >= 7) {
                score *= 2; // Bonus for long words
                bonusBadgeEl.innerHTML = "x2!";
                bonusBadgeEl.classList.add('x2');
            }
            if (score === 0 && deckEl.children.length > 0) {
                tickEl.classList.remove('active');
            }
            else {
                tickEl.classList.add('active');
                tickEl.innerText = `${score}`;
                if (madeWord.length < MIN_SCORING_WORD_LENGTH || score < MIN_SCORING_SCORE) {
                    tickEl.classList.add('no-score');
                }
            }
        };
        const setTileElementLetter = (tileEl, letter) => {
            tileEl.dataset['letter'] = tileEl.innerText = letter;
            tileEl.dataset['value'] = `${scrabbleData[letter].value || ""}`;
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
            const [currentRow, _] = getTileElementRowColumn(tileEl);
            setTileElementRow(tileEl, currentRow + 1);
        };
        const moveTileUpOneRow = (tileEl) => {
            const [currentRow, _] = getTileElementRowColumn(tileEl);
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
                        playSoundEffect("undo");
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
                    return;
                }
                // only allow touch events for tiles on the last row of the deck
                if (parseInt(getComputedStyle(tileEl).gridRowStart, 10) != ROWS) {
                    playSoundEffect("undo");
                    return;
                }
                await FLIP(tileEl, (el) => { wordEl.appendChild(el); }, 100);
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
            };
            tileEl.addEventListener('mousedown', touched);
            tileEl.addEventListener('touchstart', touched);
            return tileEl;
        };
        const userFoundWordBeforeTimeout = () => {
            return Date.now() - lastWordTime < timeoutMs;
        };
        const timeoutAction = () => {
            if (!userFoundWordBeforeTimeout()) {
                resolve(totalScore);
            }
        };
        const initialDeal = () => {
            // const audioElGood = document.querySelector('#audio_match_good') as HTMLAudioElement;
            // const audioElOk = document.querySelector('#audio_match_ok') as HTMLAudioElement;
            // Make deck
            deckEl.innerHTML = "";
            wordEl.innerHTML = "";
            // deckEl.style.aspectRatio = `1 / 1`; // Set aspect ratio of deck
            ScrabbleLetters.shuffle();
            for (let c = 0; c < COLS; ++c) {
                for (let r = 0; r < ROWS; ++r) {
                    const tileEl = makeTileElementAtColumn(c);
                    deckEl.appendChild(tileEl);
                    setTileElementRow(tileEl, r);
                    setTileElementLetter(tileEl, ScrabbleLetters.pop());
                }
            }
            setTimerBarTransitionTime(timeoutMs);
            resetTimerBar();
            // Initialize score
            onWordElementChanged();
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
    "undo": undefined,
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
const ROWS = 10; // Number of rows in the game grid
const COLS = 10; // Number of columns in the game grid
const MIN_WORD_LENGTH = 3; // Minimum word length allowed
const MIN_SCORING_WORD_LENGTH = 4; // Minimum word length to score
const MIN_SCORING_SCORE = 10; // Minimum score to consider a word valid for scoring
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
(async () => {
    // Init audio
    SoundEffect["selected"] = getBlip(1000, 0.01, 0.03);
    SoundEffect["selected2"] = getBlip(1250, 0.01, 0.03);
    SoundEffect["selected3"] = getBlip(1500, 0.01, 0.03);
    SoundEffect["undo"] = getBlip(200, 0.01, 0.05);
    SoundEffect["good"] = await getAudioBufferFromFile('audio/match_good.mp3');
    SoundEffect["excellent"] = await getAudioBufferFromFile('audio/match_excellent.mp3');
    SoundEffect["ok"] = await getAudioBufferFromFile('audio/match_ok.mp3');
    SoundEffect["clock-tick"] = await getAudioBufferFromFile('audio/clock_tick.wav');
    await showModalDialog("" +
        "<p>Make words of three letters or more from the tiles at the bottom row. When you use a tile, the tile above it will become available.<p>" +
        "<p>When you've made a word, click the  <span style='color:green'>✓</span> to score that word, or see if you keep going and make a longer word!.</p>" +
        "<p>You can undo by clicking the last tile in the words you're building.</p>" +
        "<p>Good luck!</p>");
    // Keep soundbars from going into standby mode by playing a very high frequency sound
    // https://www.reddit.com/r/Soundbars/comments/nyxpzp/soundbar_standby_blocker_prevent_soundbar_from/?utm_source=chatgpt.com
    const oscTick = ctx.createOscillator();
    oscTick.frequency.value = ctx.sampleRate / 2 - 2; // Just below nyquist frequency
    oscTick.connect(ctx.destination);
    oscTick.start();
    for (;;) {
        const levelScore = await level(120_000);
        await showModalDialog(`You scored ${levelScore}.<br> Play again?`);
    }
})();
//# sourceMappingURL=index.js.map