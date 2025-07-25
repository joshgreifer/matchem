
interface Array<T> {
    randomElement(): T | undefined;
    randomIndex(): number;
    shuffle(): Array<T>;
    partition<T>(filter: (item: T, index?: number, array?: Array<T>) => string | number): { [key: string]: Array<T> };
}

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
// https://chatgpt.com/c/68760bb4-860c-800a-afb3-e88ba983c6a7
// Type for Trie node (optional, but good practice)
type TrieNode = { [key: string]: TrieNode } & { $?: true };

// Check if word exists in the trie
function isWord(word: string): boolean {
    return _dfs_handling_blanks(word, 0, LEXICON, true);
}

// Check if prefix exists in the trie (as a valid start)
function startsWith(prefix: string): boolean {
    return _dfs_handling_blanks(prefix, 0, LEXICON, false);
}

// Handles blanks (represented as '?') recursively
function _dfs_handling_blanks(
    str: string,
    i: number,
    node: TrieNode,
    end: boolean
): boolean {
    if (i === str.length) {
        return end ? !!node.$ : true;
    }
    const ch = str[i];
    // console.log(`_dfs_handling_blanks: str=${str}, i=${i}, ch=${ch}, end=${end}`);

    if (ch === "?" || ch === " ") {
        // Blank can be any letter a-z
        for (const key in node) {
            if (key === "$") continue;
            if (_dfs_handling_blanks(str, i + 1, node[key], end)) return true;
        }
        return false;
    } else if (node[ch]) {
        return _dfs_handling_blanks(str, i + 1, node[ch], end);
    } else {
        return false;
    }
}
// The global lexicon
declare const LEXICON: TrieNode
declare const WordList70: string[]; // The global word list, used for startsWith and isWord

// https://chatgpt.com/s/t_687e848ccd088191b6e279a5e4367855
function FLIP(
    el: HTMLElement,
    mutator: (el: HTMLElement) => void,
    duration: number = 400
): Promise<void> {
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

    return new Promise<void>(resolve => {
        const cleanup = () => {
            el.style.transition = '';
            el.removeEventListener('transitionend', cleanup);
            resolve();
        };
        el.addEventListener('transitionend', cleanup);
    });
}



async function level(timeoutMs: number = 3000): Promise<number> {

    const lookedUpWordEl = document.querySelector('#looked-up-word') as HTMLDivElement;
    const deckEl = document.querySelector('.deck') as HTMLDivElement;
    const scoreEl = document.querySelector('#score') as HTMLDivElement;
    const bonusBadgeEl = document.querySelector('#bonus-badge') as HTMLDivElement;

    let lastWordTime = 0;



    const ScrabbleLetters: string[] = [];
    Object.values(scrabbleData) .forEach(tile => {
        for (let i = 0; i < tile.frequency; i++) {
            ScrabbleLetters.push(tile.letter);
        }
    });

    const FindWordInLexicon = (word: string, sw: boolean = false): string | undefined => {


        // Convert pattern to a regex: replace ? with .
        // Commented out is case-insensitive version (allowing Proper nouns)
        // const regex = new RegExp('^' + word.replace(/\?/g, '.') + '$', 'i');
        const foundInLexicon = sw ? startsWith(word) : isWord(word)
        if (foundInLexicon) {

            const regex = new RegExp('^' + word.replace(/\?/g, '[a-z]') + (sw ? '' : '$'));
            // console.log(`FindWordInLexicon ${startsWith ? 'startsWith' : 'exact'} regex:`, regex);

            // Will always succeed, because the trie is built from the word list and we check for existence first
            const match = WordList70.find(word => regex.test(word));
            // console.log(`FindWordInLexicon ${startsWith ? 'startsWith' : 'exact'}`, word, "=>", match);
            return match;
        }
        return undefined;
    }

    return new Promise<number>((resolve) => {
        const wordEl = document.querySelector('#word') as HTMLDivElement;
        const submitButtonEl = document.querySelector('.submit-button') as HTMLDivElement;
        const totalScoreEl = document.querySelector('#total-score') as HTMLDivElement;
        const giveUpButtonEl = document.querySelector('.give-up-button') as HTMLDivElement;
        let totalScore = 0;

        type Model = {
            deck: string[][]
            candidateWord: string
        }; // Model of the game state

        type Play = string[];

        let model: Model = { deck: [], candidateWord: "" };



        /**
         * Enumerate all possible "plays" starting from startingWord,
         * by recursively popping from non-empty stacks, allowing blank tiles ("?" or " ") as wildcards.
         * Each play records both the resulting word and the sequence of stacks used to build it.
         */
        function enumeratePlays(
            startingWord: string = "xyz",
            grid: string[][] = model.deck,
            minWordLength: number = 3,
            maxDepth: number = 10
        ): { word: string, fromStack: number[] }[] {
            const plays: { word: string, fromStack: number[] }[] = [];

            function backtrack(
                word: string,
                stacks: string[][],
                path: number[]
            ) {
                // Prune search if prefix is invalid
                if (!startsWith(word)) return;

                // If it's a valid word and long enough, record it
                if (word.length >= minWordLength && isWord(word)) {
                    plays.push({ word, fromStack: [...path] });
                }

                // Avoid runaway recursion
                if (word.length >= maxDepth) return;

                // Try popping from each non-empty stack
                for (let i = 0; i < stacks.length; ++i) {
                    if (stacks[i].length === 0) continue;

                    // Copy stacks to avoid mutation
                    const newStacks = stacks.map(arr => arr.slice());
                    const letter = newStacks[i].pop()!;

                    if (letter === "?" || letter === " ") {
                        // Try every letter for a blank
                        for (const ch of "abcdefghijklmnopqrstuvwxyz") {
                            backtrack(word + ch, newStacks, [...path, i]);
                        }
                    } else {
                        backtrack(word + letter, newStacks, [...path, i]);
                    }
                }
            }

            backtrack(startingWord, grid, []);
            return plays;
        }

// Usage:


        const updateModelFromDOM = () => {
            model = { deck: [], candidateWord: "" };
            /* for every column, add a new array to the model */
            for (let c = 0; c < COLS; ++c) {
                model.deck[c] = [];
                // for every tile in the column, add the letter to the model
                deckEl.querySelectorAll(`.scrabble-tile[data-column="${c}"]`).forEach(tileEl => {
                        model.deck[c].push(getTileElementLetter(tileEl as HTMLDivElement).toLowerCase());
                });

            }
            // Remove empty columns
            for (let c = model.deck.length - 1; c >= 0; --c) {
                if (model.deck[c].length === 0) {
                    model.deck.splice(c, 1);
                }
            }

            // Get the candidate word from the wordEl
            model.candidateWord = candidateWord();
            return model;
        }

        giveUpButtonEl.addEventListener('click', () => {
            const plays = enumeratePlays(model.candidateWord);
            console.log(plays);
            const uniqueWords = [
                ...new Set(plays.map(p => p.word))
            ];
            alert(uniqueWords.join("\n"));
        });

        /// This can only be called if there's a valid word in the wordEl, otherwise the submitButtonEl will  not be visible
        submitButtonEl.addEventListener('click', e => {
            if (submitButtonEl.classList.contains('active')) {
                totalScore += parseInt(submitButtonEl.innerText, 10);
            }

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
                    // console.log(' Tiles added or removed:', mutation);
                    onWordElementChanged();
                }
            });
        });

        observer.observe(wordEl, {
            childList: true,    // watch for added/removed child nodes
            subtree: false      // only direct children
        });

        const candidateWord = (): string => {
            let word = "";

            // get the letters from word divs children
            const wordCells = Array.from(wordEl.children) as HTMLDivElement[];
            for (const cell of wordCells) {
                const letter = getTileElementLetter(cell);
                if (letter) {
                    word += letter == " " ? "?" : letter; // Change blank tiles to wildcards
                }
            }
            return word.toLowerCase();
        }

        const onWordElementChanged = (): void => {

            updateModelFromDOM();


            const madeWord = FindWordInLexicon(candidateWord()) || ""
            // calculate score by summing the values of the letters in the word
            let score = Array.from(madeWord).reduce((acc, letter) => {
                return acc + (scrabbleData[letter.toUpperCase()]?.value || 0);
            }, 0);


            lookedUpWordEl.innerText = madeWord;
            bonusBadgeEl.innerHTML = "";
            submitButtonEl.className = 'submit-button'; // Reset tick element class
            if (madeWord.length >= 10) {
                score *= 5; // Bonus for long words
                bonusBadgeEl.innerHTML = "x5!!";
                bonusBadgeEl.classList.add('x5!!!');
            // playSoundEffect("excellent");
            } else if (madeWord.length >= 9) {
                score *= 3; // Bonus for long words
                bonusBadgeEl.innerHTML = "x3!!";
                bonusBadgeEl.classList.add('x3');

            } else if (madeWord.length >= 7) {
                score *= 2; // Bonus for long words
                bonusBadgeEl.innerHTML = "x2!";
                bonusBadgeEl.classList.add('x2');
            }
            if (score === 0 && deckEl.children.length > 0) {
                submitButtonEl.classList.remove('active');
            } else {
                submitButtonEl.classList.add('active');
                submitButtonEl.innerText = `${score}`;
                if (madeWord.length < MIN_SCORING_WORD_LENGTH || score < MIN_SCORING_SCORE) {
                    submitButtonEl.classList.add('no-score');
                }
            }
            totalScoreEl.innerText = `${totalScore}`; // Update total score
        }


        const setTileElementLetter = (tileEl: HTMLDivElement, letter: string): void => {
            tileEl.dataset['letter'] = tileEl.innerText = letter;
            tileEl.dataset['value'] = `${scrabbleData[letter].value || ""}`
            if (!letter) {
                tileEl.style.display = 'none';
            } else {
                tileEl.style.display = 'block';
            }
        }

        const getTileElementLetter = (tileEl: HTMLDivElement): string => {
            return tileEl.dataset['letter']!;
        }

        const getTileElementRowColumn = (tileEl: HTMLDivElement): [number, number] => {
            const r = parseInt(tileEl.style.gridRow) - 1; // Convert to 0-based index
            const c = parseInt(tileEl.style.gridColumn) - 1; // Convert to 0-based index
            return [r, c];
        }

        const setTileElementRow = (tileEl: HTMLDivElement, r: number): void => {
            tileEl.style.gridRow = `${r + 1}`; // Convert to 1-based index for CSS grid
        }

        const moveTileDownOneRow     = (tileEl: HTMLDivElement): void => {
            const [currentRow, _] = getTileElementRowColumn(tileEl);
            setTileElementRow(tileEl, currentRow + 1);
        }
        const moveTileUpOneRow     = (tileEl: HTMLDivElement): void => {
            const [currentRow, _] = getTileElementRowColumn(tileEl);
            setTileElementRow(tileEl, currentRow - 1);

        }


        const makeTileElementAtColumn = (c:number): HTMLDivElement => {


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

            const touched = async (e: Event) => {

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

                    const cellsToMove = Array.from(document.querySelectorAll<HTMLDivElement>('.scrabble-tile'))
                        .filter(cell => {
                            const computedStyle = window.getComputedStyle(cell);
                            const col = parseInt(computedStyle.gridColumnStart, 10);
                            return col === tileCol + 1;
                        });
                    for (const cell of cellsToMove) {
                        FLIP(cell, (el) => {
                            moveTileUpOneRow(<HTMLDivElement>el);
                        });

                    }
                    // Move the tile back to the deck
                    FLIP(tileEl, (el) => {deckEl.appendChild(el)});

                    return;
                }
                // only allow touch events for tiles on the last row of the deck
                if (parseInt(getComputedStyle(tileEl).gridRowStart, 10) != ROWS) {
                    playSoundEffect("undo");
                    return;
                }

                await FLIP(tileEl, (el) => {wordEl.appendChild(el)}, 100);


                // select all tiles in the same column using their gridColmumn style as selector
                const cellsToMove = Array.from(document.querySelectorAll<HTMLDivElement>('.scrabble-tile'))
                    .filter(cell => {
                        const computedStyle = window.getComputedStyle(cell);
                        const col = parseInt(computedStyle.gridColumnStart, 10);
                        return col === tileCol + 1;
                    });
                for (const cell of cellsToMove) {
                        FLIP(cell, (el) => {
                            moveTileDownOneRow(<HTMLDivElement>el);
                        });

                }



            }

            tileEl.addEventListener('mousedown', touched)
            tileEl.addEventListener('touchstart', touched)

            return tileEl;

        }


        const userFoundWordBeforeTimeout = (): boolean => {
            return Date.now() - lastWordTime < timeoutMs
        }

        const timeoutAction = () => {

            if (!userFoundWordBeforeTimeout()) {
                    resolve(totalScore);
            }
        }

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
                    setTileElementLetter(tileEl, ScrabbleLetters.pop()!);
                }
            }


            setTimerBarTransitionTime(timeoutMs);
            resetTimerBar();
            // Initialize score
            onWordElementChanged();


        }

        const resetTimerBar = () => {
            const onBarEnd = () => {
                timeoutAction();
                fill.removeEventListener('animationend', onBarEnd);
            }
            if (timeoutMs <= 0)
                return;
            const fill = document.querySelector('.timer-fill') as HTMLElement;

            fill.removeEventListener('animationend', onBarEnd);
            fill.style.animation = '';
            void fill.offsetWidth;
            fill.classList.remove('animate');
            void fill.offsetWidth;
            fill.classList.add('animate');

            fill.addEventListener('animationend', onBarEnd, {once: true});
            // fill.addEventListener('animationend', () => alert("Foo"), {once: true});
            lastWordTime = Date.now();

        };

        const setTimerBarTransitionTime = (milliSeconds: number) => {
            document.documentElement.style.setProperty('--TRANSITION_TIME', `${milliSeconds / 1000}s`);
        }


        initialDeal();

    });
}

const ctx = new AudioContext( {latencyHint: 'interactive' } );

const SoundEffect: { [key: string]: AudioBuffer | undefined } = {
    "selected": undefined,
    "selected2": undefined,
    "selected3": undefined,
    "undo": undefined,
    "good": undefined,
    "excellent": undefined,
    "ok": undefined
}

async function getAudioBufferFromFile(fileName: string) {
    const resp = await fetch(fileName);
    const array = await resp.arrayBuffer();
    return await ctx.decodeAudioData(array);
}

let ctxLastTime = 0;
async function playAudioBuffer(buffer: AudioBuffer) {

    if (ctx.state != 'running')
        await ctx.resume();

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    console.log("Elapsed since last call :", (ctx.currentTime - ctxLastTime).toFixed(1) + "s");
    ctxLastTime = ctx.currentTime;
    src.connect(ctx.destination);

    src.start();

    console.log("started playing audio buffer", buffer);
    return new Promise<void>((resolve) => {
        src.onended = () => {
            console.log("onended playing audio buffer", buffer);
            src.disconnect(ctx.destination); // Disconnect after playback
            resolve();
        };
    });
}


async function playSoundEffect(name: string) {
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
function getBlip(
    frequency: number,
    risingDuration: number,
    fallingDuration: number
): AudioBuffer {

    const sampleRate = ctx.sampleRate; // Use the context's actual sample rate
    const totalDuration = risingDuration + fallingDuration;
    const length = Math.floor(sampleRate * totalDuration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        let amplitude: number;
        if (t < risingDuration) {
            amplitude = t / risingDuration;
        } else {
            amplitude = 1 - ((t - risingDuration) / fallingDuration);
        }
        amplitude = Math.max(0, Math.min(1, amplitude)); // Clamp to [0,1]
        const chord = Math.sin(2 * Math.PI * frequency * t) + .2 * Math.sin(2 * Math.PI * frequency * 1.5 * t) + .1 * Math.sin(2 * Math.PI * frequency * 1.25 * t);

        data[i] = amplitude * chord / 3;
    }

    return buffer;
}

// Example usage: 440 Hz, 0.1s rise, 0.2s fall

interface TileInfo {
    letter: string;
    value: number;
    frequency: number;  // as there are 100 tiles in total, the frequency is the number of instances of the tile in the deck
}

const scrabbleData: { [letter: string]: TileInfo } = {
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


const modalDialog = document.querySelector('.modal') as HTMLDivElement;
const modalDialogMessage = document.querySelector('.modal_message') as HTMLDivElement;
const modalDialogOkButton = document.querySelector('.modal__ok') as HTMLButtonElement;

const showModalDialog = async (message: string) => {
    return new Promise<void>((resolve) => {
        modalDialogOkButton.addEventListener('click', () => { modalDialog.classList.remove('active'); resolve(); }, { once: true });

        modalDialogMessage.innerHTML = message;
        modalDialog.classList.add('active');
        modalDialogOkButton.focus();
    })

}
// 1) Define your levels in one place:
interface LevelDef {
    instruction: string;

    cols: number;
    rows: number;

    timeoutMs: number;
}



const ROWS = 10; // Number of rows in the game grid
const COLS = 10; // Number of columns in the game grid
const MIN_WORD_LENGTH = 3; // Minimum word length allowed
const MIN_SCORING_WORD_LENGTH = 4; // Minimum word length to score
const MIN_SCORING_SCORE = 10; // Minimum score to consider a word valid for scoring

/**
 * Retrieve the persisted reached level (defaulting to 0).
 */
function getReachedLevel(): number {
    const stored = localStorage.getItem('reached_level');
    return stored !== null ? parseInt(stored, 10) : 0;  //
}

/**
 * Persist a new reached level.
 */
function setReachedLevel(level: number): void {
    localStorage.setItem('reached_level', String(level));  //
}



(async () => {

// Init audio
    SoundEffect["selected"] = getBlip(1000, 0.01, 0.03);
    SoundEffect["selected2"] = getBlip(1250, 0.01, 0.03);
    SoundEffect["selected3"] = getBlip(1500, 0.01, 0.03);
    SoundEffect["undo"] = getBlip(200, 0.01, 0.05);
    SoundEffect["good"]  = await getAudioBufferFromFile('audio/match_good.mp3');
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
    oscTick.frequency.value = ctx.sampleRate / 2 - 2;  // Just below nyquist frequency
    oscTick.connect(ctx.destination);
    oscTick.start();

    for (;;) {
        const levelScore = await level(3600_000);

        await showModalDialog(`You scored ${levelScore}.<br> Play again?`);
    }

})();

