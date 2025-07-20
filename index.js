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
async function level(levelIndex, instructions, cols, rows, numInitialSets, maxSetSize, timeoutMs = 3000) {
    const scoreEl = document.querySelector('#score');
    // const timeoutActionType: "hint" | "add" | "remove" = setsToAddPerTimeout === 0 ? "hint" : setsToAddPerTimeout > 0 ? "add" : "remove"
    // let foundAtLeastOneMatch = false; // We don't do the timeout action until the after the first successful match
    let setsRemaining = 0;
    let lastMatchTime = 0;
    // Hack
    // let lock: boolean = false;
    let totalScore = 0;
    return new Promise((resolve, reject) => {
        document.querySelector('#instructions').innerHTML = instructions;
        const grid_len = cols * rows;
        // create a grid
        // const grid: number[] = new Array<number>(grid_len).fill(0)
        const deck = Array.from({ length: grid_len }, () => []);
        const setSizes = {};
        let matchingCells = [];
        let hintCells = []; // Cells that are currently being hinted at
        const i2rc = (i) => [Math.floor(i / cols), i % cols];
        const topTiles = () => {
            const tiles = new Array(grid_len).fill(undefined);
            for (const el of document.querySelectorAll('.tile')) {
                const [locS, zIndexS] = el.id.split('-');
                const loc = parseInt(locS);
                const zIndex = parseInt(zIndexS);
                if (tiles[loc] === undefined || zIndex > parseInt(tiles[loc].id.split('-')[1]))
                    tiles[loc] = el;
            }
            return tiles;
        };
        function findAVisibleSet() {
            const sameValueIndexes = {};
            for (let i = 0; i < deck.length; i++) {
                const stack = deck[i];
                if (stack.length === 0)
                    continue;
                const valueAtTopOfStack = stack[stack.length - 1];
                if (!sameValueIndexes[valueAtTopOfStack])
                    sameValueIndexes[valueAtTopOfStack] = [];
                sameValueIndexes[valueAtTopOfStack].push(i);
                if (sameValueIndexes[valueAtTopOfStack].length === setSizes[valueAtTopOfStack]) {
                    return sameValueIndexes[valueAtTopOfStack].map(idx => index2TopTileElement(idx));
                }
            }
            return [];
        }
        const el2Index = (el) => {
            return parseInt(el.dataset['index'] || '0');
        };
        const index2Stack = (i) => {
            return [...document.querySelectorAll(`.tile[data-index="${i}"]`)];
        };
        const index2TopTileElement = (i) => document.querySelector(`.tile[data-index="${i}"][data-stack-position="top"]`);
        const index2BottomTileElement = (i) => document.querySelector(`.tile[data-index="${i}"][data-stack-position="bottom"]`);
        const setTileElementValue = (tileEl, value) => {
            tileEl.dataset['value'] = value;
            if (!value) {
                tileEl.innerHTML = '';
                tileEl.style.display = 'none';
                tileEl.dataset['setSize'] = '';
            }
            else {
                tileEl.innerHTML = `<img src="imgs/${value}.png" alt="${value}">`;
                tileEl.dataset['setSize'] = setSizes[value].toString();
                tileEl.style.display = 'block';
                tileEl.className = `tile set-size-${setSizes[tileEl.dataset['value']]}`; // Remove all animation classes
            }
        };
        const getTileElementValue = (tileEl) => {
            return tileEl.dataset['value'];
        };
        const makeTileElementAtIndex = (i, isTop) => {
            // https://stackoverflow.com/questions/48419167/how-to-convert-one-emoji-character-to-unicode-codepoint-number-in-javascript
            // console.log([...v].map(e => e.codePointAt(0).toString(16)).join(`-`)) // gives correctly 1f469-200d-2695-fe0
            const tileEl = document.createElement('div');
            const [r, c] = i2rc(i);
            const zIndex = isTop ? 1001 : 1000;
            tileEl.className = (`tile set-size-0`);
            tileEl.style.zIndex = `${zIndex}`;
            tileEl.id = `${i}-${zIndex - 1000}`;
            tileEl.dataset['setSize'] = tileEl.dataset['setSize'];
            tileEl.dataset['index'] = i.toString();
            tileEl.dataset['stackPosition'] = isTop ? 'top' : 'bottom';
            tileEl.dataset['value'] = "0";
            tileEl.innerHTML = `<img src="" alt="">`;
            tileEl.style.gridRow = `${r + 1}`;
            tileEl.style.gridColumn = `${c + 1}`;
            // tileEl.classList.add('fade-in', 'grow')
            tileEl.onanimationend = () => {
                tileEl.className = (`tile set-size-${setSizes[tileEl.dataset['value']]}`); // Remove all animation classes
            };
            tileEl.ontransitionend = () => {
                if (tileEl.classList.contains('rotateOut'))
                    // Update the display of the stack at this index. The deck will have been updated by the transitionstart handler
                    displayStackAtIndex(i);
                tileEl.className = (`tile set-size-${setSizes[tileEl.dataset['value']]}`); // Remove all animation classes
            };
            tileEl.ontransitionstart = () => {
                if (tileEl.classList.contains('rotateOut'))
                    deck[i].pop(); // Remove the top tile from the deck, we won't update the display until animation ends
            };
            const touched = async (e) => {
                e.preventDefault();
                // if (lock)
                //     return;
                // lock = true;
                for (const cell of hintCells) {
                    cell.classList.remove('hint');
                }
                const tileValue = getTileElementValue(tileEl);
                if (matchingCells.length == 0) {
                    tileEl.classList.add("selected");
                    playSoundEffect("selected");
                    matchingCells.push(tileEl);
                }
                else if (!matchingCells.includes(tileEl) && tileValue === getTileElementValue(matchingCells[0])) {
                    matchingCells.push(tileEl);
                    tileEl.classList.add("selected");
                    // Check if we have a match
                    if (matchingCells.length == setSizes[tileValue]) {
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
                        for (const cell of matchingCells) {
                            cell.classList.add('rotateOut');
                        }
                        matchingCells = [];
                        resetTimerBar();
                        if (setsRemaining === 0) {
                            // Level over
                            resolve();
                        }
                    }
                    else { // Not a match yet
                        playSoundEffect(matchingCells.length == 2 ? "selected2" : "selected3");
                    }
                }
                else {
                    for (const cell of matchingCells) {
                        cell.classList.remove("selected");
                        cell.classList.add('rotateBack');
                    }
                    matchingCells = [];
                    tileEl.classList.add("rotateBack");
                    playSoundEffect("deselected");
                }
                // lock = false;
            };
            // Add event listeners for touch and mouse events if this is the top tile in the stack
            if (isTop) {
                tileEl.addEventListener('mousedown', touched);
                tileEl.addEventListener('touchstart', touched);
            }
            return tileEl;
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
                hintCells = findAVisibleSet(); // will always find one
                // console.assert(s.length >= setSize, "There should always be a set of size " + setSize + " visible at this point")
                for (const cell of hintCells)
                    // console.log(cell.classList)
                    cell.classList.add('hint');
                showModalDialog("Too slow!").then(() => { reject(); });
            }
        };
        const makeEmptyDeck = () => {
            const deckEl = document.querySelector('.deck');
            // const audioElGood = document.querySelector('#audio_match_good') as HTMLAudioElement;
            // const audioElOk = document.querySelector('#audio_match_ok') as HTMLAudioElement;
            // Make deck
            deckEl.innerHTML = "";
            deckEl.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
            deckEl.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;
            deckEl.style.aspectRatio = `${cols} / ${rows}`; // Set aspect ratio of deck
            // For each grid position, create a pile of two tiles, one on top of the other
            for (let i = 0; i < grid_len; ++i) {
                deckEl.appendChild(makeTileElementAtIndex(i, true));
                deckEl.appendChild(makeTileElementAtIndex(i, false));
            }
        };
        const displayStackAtIndex = (i) => {
            const stack = deck[i];
            const bottomTile = index2BottomTileElement(i);
            const topTile = index2TopTileElement(i);
            setTileElementValue(bottomTile, stack.length >= 2 ? stack[stack.length - 2] : '');
            setTileElementValue(topTile, stack.length >= 1 ? stack[stack.length - 1] : '');
        };
        const displayDeck = () => {
            for (let i = 0; i < deck.length; ++i)
                displayStackAtIndex(i);
        };
        const getNewTileValue = (() => {
            let _idx = 0;
            return () => {
                if (_idx >= allValues.length)
                    _idx = 0;
                return allValues[_idx++];
            };
        })();
        let no_more_empty_stacks = false; // If true, don't search for empty stacks anymore when dealing a new set (speed optimization)
        const dealSet = (setSize, toTheBottom = false) => {
            const value = getNewTileValue();
            setSizes[value] = setSize;
            // get candidate grid positions, initially all grid positions
            // Filter out indexes of stacks that contain a tile with this value
            let candidateDeckIndexes = [...Array(deck.length).keys()];
            /**
             * Chooses a deck index for a new set:
             * - If any deck positions have zero tiles, returns one of those at random.
             * - Otherwise, returns a random position from all grid slots.
             * returns the index of the deck index in candidateDeckIndexes!!
             * Be careful to distinguish between the index in the deck and the index in candidateDeckIndexes:
             * deck[candidateDeckIndexes[index]] is the tile stack at that index in the deck.
             */
            const getIndexForNewTile = () => {
                // Make sure we don't deal the same tile to a stack that already has this tile, guaranteeing that the no tiles with the same value will ever be in the same stack
                candidateDeckIndexes = candidateDeckIndexes.filter(i => {
                    const stack = deck[i];
                    return stack.length === 0 || !stack.includes(value);
                });
                const initialCandidateIndex = candidateDeckIndexes.randomIndex();
                if (!no_more_empty_stacks) {
                    // from this index, search for the first deck position with zero tiles forward...
                    for (let i = initialCandidateIndex; i < candidateDeckIndexes.length; i++) {
                        if (deck[candidateDeckIndexes[i]].length === 0)
                            return i;
                    }
                    // ...and if not found, search backwards
                    for (let i = initialCandidateIndex - 1; i >= 0; i--) {
                        if (deck[candidateDeckIndexes[i]].length === 0)
                            return i;
                    }
                    // If we didn't find any empty stacks, set the flag so we don't search for empty stacks again
                    no_more_empty_stacks = true;
                }
                // otherwise, return a random index from the candidates
                return initialCandidateIndex;
            };
            for (let i = 0; i < setSize; ++i) {
                const indexOfCandidate = getIndexForNewTile();
                // Add a new tile to the deck at the candidate index
                const indexInDeck = candidateDeckIndexes[indexOfCandidate];
                if (toTheBottom)
                    deck[indexInDeck].unshift(value); // Add to the bottom of the stack
                else
                    deck[indexInDeck].push(value);
            }
            ++setsRemaining;
            scoreEl.innerHTML = `Level ${levelIndex + 1} - Score: ${totalScore.toFixed(0)}  (${setsRemaining.toFixed(0)})`;
        };
        const initialDeal = () => {
            setTimerBarTransitionTime(864_000_000); // 1 day, so it doesn't animate
            resetTimerBar();
            // remove any tiles that were hinted at in a previous level (should not happen)
            // document.querySelectorAll<HTMLDivElement>('.tile.hint')
            //     .forEach(el => el.classList.remove('hint'));
            no_more_empty_stacks = false; // Reset the flag so we search for empty stacks again
            for (let setNum = 0; setNum < numInitialSets; ++setNum) {
                const setSize = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 5].randomElement();
                dealSet(setSize);
            }
            setTimerBarTransitionTime(timeoutMs);
            resetTimerBar();
            displayDeck();
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
        makeEmptyDeck();
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
// Example usage: 440 Hz, 0.1s rise, 0.2s fall
const allValues = emojiImgs.shuffle();
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
    { instruction: "Match sets of three.", cols: 5, rows: 7, numInitialSets: allValues.length, setSize: 3, timeoutMs: 600_000 },
    { instruction: "Match pairs!", cols: 5, rows: 8, numInitialSets: 40, setSize: 2, timeoutMs: 30_000 },
    { instruction: "Match sets of three!", cols: 5, rows: 8, numInitialSets: 80, setSize: 3, timeoutMs: 60_000 },
    { instruction: "Match pairs!", cols: 7, rows: 10, numInitialSets: 100, setSize: 2, timeoutMs: 60_000 },
    { instruction: "Match sets of three!", cols: 7, rows: 10, numInitialSets: 100, setSize: 3, timeoutMs: 60_000 },
    { instruction: "Match sets of three!", cols: 7, rows: 11, numInitialSets: 100, setSize: 3, timeoutMs: 60_000 },
    { instruction: "Match sets of three!", cols: 8, rows: 12, numInitialSets: 200, setSize: 3, timeoutMs: 60_000 },
];
const levelsDesktop = [
    { instruction: "Match sets of three", cols: 7, rows: 7, numInitialSets: allValues.length, setSize: 3, timeoutMs: 600_000 },
    { instruction: "Match pairs!", cols: 21, rows: 14, numInitialSets: 2000, setSize: 2, timeoutMs: 30_000 },
    { instruction: "Match sets of three!", cols: 5, rows: 8, numInitialSets: 80, setSize: 3, timeoutMs: 60_000 },
    { instruction: "Match pairs!", cols: 7, rows: 10, numInitialSets: 100, setSize: 2, timeoutMs: 60_000 },
    { instruction: "Match sets of three!", cols: 7, rows: 10, numInitialSets: 100, setSize: 3, timeoutMs: 60_000 },
    { instruction: "Match sets of three!", cols: 7, rows: 11, numInitialSets: 100, setSize: 3, timeoutMs: 60_000 },
    { instruction: "Match sets of three!", cols: 8, rows: 12, numInitialSets: 200, setSize: 3, timeoutMs: 60_000 },
];
const levels = screen.width > screen.height && screen.width >= 1280 ? levelsDesktop : levelsMobile; // Use desktop levels on larger screens
// 2) playLevel() simply looks up and invokes level():
async function playLevel(idx) {
    if (idx < 0 || idx >= levels.length) {
        throw new RangeError(`Invalid level index ${idx}`);
    }
    const { instruction, cols, rows, numInitialSets, setSize, timeoutMs } = levels[idx];
    await level(idx, instruction, cols, rows, numInitialSets, setSize, timeoutMs);
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
    // Keep soundbars from going into standby mode by playing a very high frequency sound
    // https://www.reddit.com/r/Soundbars/comments/nyxpzp/soundbar_standby_blocker_prevent_soundbar_from/?utm_source=chatgpt.com
    const oscTick = ctx.createOscillator();
    oscTick.frequency.value = ctx.sampleRate / 2 - 2; // Just below nyquist frequency
    oscTick.connect(ctx.destination);
    oscTick.start();
    for (;;)
        await playReachedLevel().catch(async (err) => {
            console.error("Game over or aborted:", err);
            await showModalDialog("Game over!  Try again?");
        });
})();
//# sourceMappingURL=index.js.map