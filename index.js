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
class DeckModel {
    _rows;
    _cols;
    _names;
    _deck = [];
    _selectedTiles = [];
    constructor(_rows, _cols, _names = emojiImgs) {
        this._rows = _rows;
        this._cols = _cols;
        this._names = _names;
        this._names = this._names.shuffle();
        for (let i = 0; i < _rows * _cols; ++i) {
            this._deck.push([]);
        }
    }
    get deck() {
        return this._deck;
    }
    dealSet(setSize) {
    }
    deal(numSets) {
    }
    GetTileAt(i, positionInPile = -1) {
        const deckPile = this._deck[i];
        if (positionInPile < 0)
            positionInPile = deckPile.length - positionInPile; // Use -1 for top tile, -2 for second from top, etc.
        return deckPile[positionInPile];
    }
    get Rows() {
        return this._rows;
    }
    get Cols() {
        return this._cols;
    }
}
class DeckView {
    _rows;
    _cols;
    _imageSet;
    _el;
    _visibleTiles = [];
    constructor(_rows, _cols, _imageSet = emojiImgs) {
        this._rows = _rows;
        this._cols = _cols;
        this._imageSet = _imageSet;
        const el = document.querySelector('.deck');
        // const audioElGood = document.querySelector('#audio_match_good') as HTMLAudioElement;
        // const audioElOk = document.querySelector('#audio_match_ok') as HTMLAudioElement;
        // Make deck
        el.innerHTML = "";
        el.style.gridTemplateColumns = `repeat(${_cols}, minmax(0, 1fr))`;
        el.style.gridTemplateRows = `repeat(${_rows}, minmax(0, 1fr))`;
        el.style.aspectRatio = `${_cols} / ${_rows}`; // Set aspect ratio of deck
        this._el = el;
        // create TileView objects for each pile in the deck
        for (let i = 0; i < _rows * _cols; ++i) {
            const view = new TileView(this, i);
            this._visibleTiles.push(view);
        }
    }
    getPileAtIndex(i) {
        return this._visibleTiles[i];
    }
    RC(i) {
        return [Math.floor(i / this._cols), i % this._cols];
    }
    get ImageSet() {
        return this._imageSet;
    }
    get Element() {
        return this._el;
    }
    get Rows() {
        return this._rows;
    }
    get Cols() {
        return this._cols;
    }
    clearDeck() {
        this._el.innerHTML = "";
    }
}
class TileView {
    _deckView;
    _el;
    constructor(_deckView, index) {
        this._deckView = _deckView;
        const el = document.createElement('div');
        el.className = 'tile';
        el.id = `pile-${index}`;
        el.dataset['index'] = index.toString(); // Store the index in a data attribute for easy access
        // Get the row and column for this from the deck view
        const [r, c] = this._deckView.RC(index);
        el.style.gridRow = `${r + 1}`;
        el.style.gridColumn = `${c + 1}`;
        el.classList.add('fade-in', 'grow');
        _deckView.Element.appendChild(el);
        el.onanimationend = el.ontransitionend = () => {
            el.className = 'tile'; // Remove all animation classes at the end of every animation
        };
        this._el = el;
    }
    get Element() {
        return this._el;
    }
    clear() {
        this._el.innerHTML = "";
    }
    set Name(tileName) {
        this._el.dataset['name'] = tileName;
        if (this._deckView.ImageSet === emojiImgs)
            this._el.innerHTML = `<img src="imgs/${tileName}.png" alt="${tileName}">`;
        else
            this._el.innerText = tileName;
    }
    get Name() {
        return this._el.dataset['name'] || '';
    }
}
async function level(levelIndex, instructions, glbImageSet, cols, rows, numInitialSets, setSize, timeoutMs = 3000) {
    const scoreEl = document.querySelector('#score');
    // const timeoutActionType: "hint" | "add" | "remove" = setsToAddPerTimeout === 0 ? "hint" : setsToAddPerTimeout > 0 ? "add" : "remove"
    // let foundAtLeastOneMatch = false; // We don't do the timeout action until the after the first successful match
    let setsRemaining = 0;
    let lastMatchTime = 0;
    let totalScore = 0;
    if (numInitialSets < 0) {
        numInitialSets = rows * cols / setSize; // Deal just enough
    }
    return new Promise((resolve, reject) => {
        document.querySelector('#instructions').innerHTML = instructions;
        const grid_len = cols * rows;
        // create a grid
        // const grid: number[] = new Array<number>(grid_len).fill(0)
        const deckView = new DeckView(rows, cols, glbImageSet);
        let currentMatchString = 0;
        let matchingSelectedPiles = [];
        let hintPiles = []; // Cells that are currently being hinted at
        const i2rc = (i) => [Math.floor(i / cols), i % cols];
        const topTiles = () => {
            console.log("topTiles() is broken - TODO fix it");
            return [];
            const tiles = new Array(rows * cols).fill(undefined);
            for (const el of document.querySelectorAll('.tile')) {
                const [locS, zIndexS] = el.id.split('-');
                const loc = parseInt(locS);
                const zIndex = parseInt(zIndexS);
                if (tiles[loc] === undefined || zIndex > parseInt(tiles[loc].id.split('-')[1]))
                    tiles[loc] = el;
            }
            return tiles;
        };
        const findAVisibleSet = () => {
            const tiles = topTiles();
            const visibleTiles = tiles.filter(t => t !== undefined && !t.classList.contains('dummy') && !t.classList.contains('rotateOut'));
            const partitions = visibleTiles.partition((t) => glbImageSet !== emojiImgs ? t.innerText : t.firstElementChild.src);
            for (const key in partitions)
                if (partitions[key].length >= setSize)
                    return partitions[key];
            return [];
        };
        const getPileAtIndex = (i) => {
            return document.querySelector(`#pile-${i}`);
        };
        const makePileAtIndex = (i) => {
            const setValFromPositionInPile = (positionInPile) => {
                const deckPile = deck[i];
                if (positionInPile < 0)
                    positionInPile = deckPile.length - positionInPile; // Last tile in the pile
                if (deckPile.length === 0) {
                    pileEl.style.display = 'none';
                    return;
                }
                pileEl.style.display = 'block';
                const v = deckPile[positionInPile];
                if (glbImageSet === emojiImgs)
                    pileEl.innerHTML = `<img src="imgs/${v}.png" alt="${v}">`;
                else
                    pileEl.innerText = v;
            };
            const displayTopTileInThisPile = () => {
                setValFromPositionInPile(-1);
            };
            const comparator = glbImageSet === emojiImgs ?
                (a, b) => a === (b.firstElementChild).alt
                : (a, b) => a === b.innerText;
            // https://stackoverflow.com/questions/48419167/how-to-convert-one-emoji-character-to-unicode-codepoint-number-in-javascript
            // console.log([...v].map(e => e.codePointAt(0).toString(16)).join(`-`)) // gives correctly 1f469-200d-2695-fe0
            const pileEl = document.createElement('div');
            const [r, c] = i2rc(i);
            pileEl.className = 'tile';
            pileEl.id = `pile-${i}`;
            pileEl.style.gridRow = `${r + 1}`;
            pileEl.style.gridColumn = `${c + 1}`;
            pileEl.classList.add('fade-in', 'grow');
            deckEl.appendChild(pileEl);
            pileEl.onanimationend = pileEl.ontransitionend = () => {
                pileEl.className = 'tile'; // Remove all animation classes
            };
            const rotate = () => {
                pileEl.className = 'tile'; // remove all animation classes
                // clone the pile element to remove the event listeners
                const tempEl = pileEl.cloneNode(true);
                tempEl.id = `temp-${i}`;
                // place it above the original pile (z-order)
                tempEl.style.zIndex = "1000";
                // add it to the deck so it's visible
                deckEl.appendChild(tempEl);
                tempEl.ontransitionend = () => {
                    displayTopTileInThisPile();
                    tempEl.remove();
                };
                // https://stackoverflow.com/questions/24148403/trigger-css-transition-on-appended-element/24195559#24195559
                void tempEl.offsetWidth;
                tempEl.classList.add('rotateOut'); // Add the rotateOut class to start the animation
                // Show the tile underneath, if any.  It will be reset after the animation ends
                setValFromPositionInPile(-2);
            };
            const touched = async (e) => {
                // if (lock)
                //     return;
                // lock = true;
                for (const pile of hintPiles) {
                    pile.classList.remove('hint');
                }
                if (matchingSelectedPiles.length == 0) {
                    pileEl.classList.add("selected");
                    playSoundEffect("selected");
                    matchingSelectedPiles.push(i);
                }
                else if (!matchingSelectedPiles.includes(i) && comparator(TileAt(matchingSelectedPiles[0]), pileEl)) {
                    matchingSelectedPiles.push(i);
                    pileEl.classList.add("selected");
                    // Check if we have a match
                    if (matchingSelectedPiles.length == setSize) {
                        // We have a match
                        let score = 0; // No score if timeout
                        let msToFindMatch = Date.now() - lastMatchTime;
                        if (msToFindMatch < 1000) {
                            score = 100;
                        }
                        else if (msToFindMatch < 3000) {
                            score = 25;
                            // } else if (msToFindMatch < 5000) {
                            //     score = 10;
                        }
                        else
                            score = 10;
                        totalScore += score;
                        // foundAtLeastOneMatch = true;
                        setsRemaining -= 1;
                        if (score > 0) {
                            const soundEffectName = score == 100 ? "excellent" : (score == 25 ? "good" : "selected3");
                            // Don't await, these sounds take a long time to play
                            playSoundEffect(soundEffectName);
                        }
                        scoreEl.innerHTML = `Level ${levelIndex + 1} - Score: ${totalScore.toFixed(0)}  (${setsRemaining.toFixed(0)})`;
                        // Begin the removal animation
                        for (const index of matchingSelectedPiles) {
                            deck[index].pop();
                            // Remove the top tile from the deck
                            displayTopTileInThisPile();
                        }
                        matchingSelectedPiles = [];
                        // deck[i].pop(); // Remove the top tile from the deck
                        resetTimerBar();
                        if (setsRemaining === 0) {
                            // Level over
                            resolve();
                        }
                    }
                    else { // Not a match yet
                        playSoundEffect(matchingSelectedPiles.length == 2 ? "selected2" : "selected3");
                    }
                }
                else {
                    for (const index of matchingSelectedPiles) {
                        const el = getPileAtIndex(index);
                        el.classList.remove("selected");
                        el.classList.add('rotateBack');
                    }
                    matchingSelectedPiles = [];
                    pileEl.classList.add("rotateBack");
                    playSoundEffect("deselected");
                }
                lock = false;
            };
            pileEl.addEventListener('mousedown', touched);
            pileEl.addEventListener('touchstart', touched);
            displayTopTileInThisPile();
            return;
        };
        const dealSet = (n) => {
            // get candidate grid positions, initially all grid positions
            const candidateGridIndexes = [...Array(deck.length).keys()];
            /**
             * Chooses a grid index for a new set:
             * - If any grid positions have zero tiles, returns one of those at random.
             * - Otherwise, returns a random position from all grid slots.
             * Note, this closure returns an index into candidateGridIndexes, NOT a pile index.
             * To get the pile index on which to place the new tile, use candidateGridIndexes[indexOfCandidate].
             *
             */
            const getIndexForNewTile = () => {
                const initialCandidateIndex = candidateGridIndexes.randomIndex();
                // from this index, search for the first grid position with zero tiles forward...
                for (let i = initialCandidateIndex; i < candidateGridIndexes.length; i++) {
                    if (deck[candidateGridIndexes[i]].length === 0)
                        return i;
                }
                // ...and if not found, search backwards
                for (let i = initialCandidateIndex - 1; i >= 0; i--) {
                    if (deck[candidateGridIndexes[i]].length === 0)
                        return i;
                }
                // otherwise, return a random index from the candidates
                return initialCandidateIndex;
            };
            for (let i = 0; i < n; ++i) {
                const indexOfCandidate = getIndexForNewTile();
                deck[candidateGridIndexes[indexOfCandidate]].push(emojis[emoji_idx]); // Add the emoji to the deck at this index
                // makeTileAtIndex(candidateGridIndexes[indexOfCandidate]);
                // Don't choose this index again for this set, to prevent any tiles in the set being dealt to the same grid position (making it impossible to match)
                candidateGridIndexes.splice(indexOfCandidate, 1);
            }
            // Next tile to be dealt is the next emoji in the shuffled set
            ++emoji_idx;
            ++setsRemaining;
            scoreEl.innerHTML = `Level ${levelIndex + 1} - Score: ${totalScore.toFixed(0)}  (${setsRemaining.toFixed(0)})`;
        };
        const userFoundMatchBeforeTimeout = () => {
            return Date.now() - lastMatchTime < timeoutMs;
        };
        const timeoutAction = () => {
            // Find a set of tiles and animate them as a hint
            if (!userFoundMatchBeforeTimeout()) {
                // HACK (shouldn't occur) - remove any tiles still with the "hint" class
                document.querySelectorAll('.tile.hint')
                    .forEach(el => el.classList.remove('hint'));
                hintPiles = findAVisibleSet(); // will always find one
                // console.assert(s.length >= setSize, "There should always be a set of size " + setSize + " visible at this point")
                for (const cell of hintPiles)
                    // console.log(cell.classList)
                    cell.classList.add('hint');
                showModalDialog("Too slow!").then(() => { reject(); });
            }
        };
        const deal = () => {
            setTimerBarTransitionTime(864_000_000); // 1 day, so it doesn't animate
            resetTimerBar();
            // remove any tiles that were hinted at in a previous level (should not happen)
            document.querySelectorAll('.tile.hint')
                .forEach(el => el.classList.remove('hint'));
            let setNum = 0;
            const to = setInterval(() => {
                if (setNum++ < numInitialSets)
                    dealSet(setSize);
                else {
                    clearInterval(to);
                    setTimerBarTransitionTime(timeoutMs);
                    resetTimerBar();
                    for (let i = 0; i < grid_len; ++i)
                        makePileAtIndex(i);
                    // playClockTick();
                }
            }, 1);
            setTimerBarTransitionTime(timeoutMs);
            resetTimerBar();
            // for (let setNum = 0; set < numInitialSets; ++set)
            //     dealSet();
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
            lastMatchTime = Date.now();
        };
        const setTimerBarTransitionTime = (milliSeconds) => {
            document.documentElement.style.setProperty('--TRANSITION_TIME', `${milliSeconds / 1000}s`);
        };
        const emojis = glbImageSet.shuffle();
        let emoji_idx = 0;
        const deckEl = document.querySelector('.deck');
        // const audioElGood = document.querySelector('#audio_match_good') as HTMLAudioElement;
        // const audioElOk = document.querySelector('#audio_match_ok') as HTMLAudioElement;
        // Make deck
        deckEl.innerHTML = "";
        deckEl.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
        deckEl.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;
        deckEl.style.aspectRatio = `${cols} / ${rows}`; // Set aspect ratio of deck
        // fill with dummy tiles
        for (let i = 0; i < grid_len; ++i) {
            // makeDummyTileAtIndex(i);
        }
        deal();
    });
}
const ctx = new AudioContext({ latencyHint: 'interactive' });
// Keep soundbars from going into standby mode by playing a very high frequency sound
// https://www.reddit.com/r/Soundbars/comments/nyxpzp/soundbar_standby_blocker_prevent_soundbar_from/?utm_source=chatgpt.com
const oscTick = ctx.createOscillator();
oscTick.frequency.value = ctx.sampleRate / 2 - 2; // Just below nyquist frequency
oscTick.connect(ctx.destination);
oscTick.start();
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
// Example usage: 440 Hz, 0.1s rise, 0.2s fall
// Call init() on startup, then playChimeBuffer() whenever you need the chime
// const set = allEmojis
const set = emojiImgs;
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
    { instruction: "Match  pairs.", set, cols: 4, rows: 6, numInitialSets: 24, setSize: 2, timeoutMs: 30_000 },
    { instruction: "Match  pairs!", set, cols: 5, rows: 8, numInitialSets: 40, setSize: 2, timeoutMs: 30_000 },
    { instruction: "Match  sets of three!", set, cols: 5, rows: 8, numInitialSets: 80, setSize: 3, timeoutMs: 60_000 },
    { instruction: "Match pairs!", set, cols: 7, rows: 10, numInitialSets: 100, setSize: 2, timeoutMs: 60_000 },
    { instruction: "Match sets of three!", set, cols: 7, rows: 10, numInitialSets: 100, setSize: 3, timeoutMs: 60_000 },
    { instruction: "Match sets of three!", set, cols: 7, rows: 11, numInitialSets: 100, setSize: 3, timeoutMs: 60_000 },
    { instruction: "Match sets of three!", set, cols: 8, rows: 12, numInitialSets: 200, setSize: 3, timeoutMs: 60_000 },
];
const levelsDesktop = [
    { instruction: "Match  pairs.", set, cols: 3, rows: 4, numInitialSets: 10, setSize: 2, timeoutMs: 3000_000 },
    { instruction: "Match  pairs!", set, cols: 21, rows: 14, numInitialSets: -1, setSize: 2, timeoutMs: 30_000 },
    { instruction: "Match  sets of three!", set, cols: 5, rows: 8, numInitialSets: 80, setSize: 3, timeoutMs: 60_000 },
    { instruction: "Match pairs!", set, cols: 7, rows: 10, numInitialSets: 100, setSize: 2, timeoutMs: 60_000 },
    { instruction: "Match sets of three!", set, cols: 7, rows: 10, numInitialSets: 100, setSize: 3, timeoutMs: 60_000 },
    { instruction: "Match sets of three!", set, cols: 7, rows: 11, numInitialSets: 100, setSize: 3, timeoutMs: 60_000 },
    { instruction: "Match sets of three!", set, cols: 8, rows: 12, numInitialSets: 200, setSize: 3, timeoutMs: 60_000 },
];
const levels = screen.width > screen.height && screen.width >= 1280 ? levelsDesktop : levelsMobile; // Use desktop levels on larger screens
// 2) playLevel() simply looks up and invokes level():
async function playLevel(idx) {
    if (idx < 0 || idx >= levels.length) {
        throw new RangeError(`Invalid level index ${idx}`);
    }
    const { instruction, set, cols, rows, numInitialSets, setSize, timeoutMs } = levels[idx];
    await level(idx, instruction, set, cols, rows, numInitialSets, setSize, timeoutMs);
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
const strLevel = prompt(`Level: (0-${levels.length - 1})\n\n:`, getReachedLevel().toString());
const levelIndex = strLevel !== null ? parseInt(strLevel, 10) : 0;
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
    await showModalDialog("Ready to play?");
    for (;;)
        await playReachedLevel().catch(async (err) => {
            console.error("Game over or aborted:", err);
            await showModalDialog("Game over!  Try again?");
        });
})();
//# sourceMappingURL=index.js.map