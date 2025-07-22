
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

/**
 * Partition an array according to a partition function.
 * The partition function is of the form (elem: T, index?: number, array?: Array<T>) => string | number
 * and returns a key value for the item.
 * Returns an object whose properties are the partitioned keys.  The value of these properties
 * is an array of items belonging to the partition.
 * @example
 `const lookup: { [key: string]: string; } =
 {H: 'Hearts', D: 'Diamonds', S: 'Spades', C: 'Clubs' };
 ['4H', 'KD', '3S', 'AS', '9H'].partition( (e: string) => lookup[e[1]]);`

 { Hearts: ["4H", "9H"], Diamonds: ["KD"], Spades: ["3S", "AS"] }

 * @param filter A PartitionFunc
 */

type Partition<T> = {
    [Key in string | number]: Array<T>;
};

type PartitionFunc<T> = (item: T, index?: number, array?: Array<T>) => string | number

Object.defineProperty(Array.prototype, 'partition', {
    value:
        function <T>(filter: PartitionFunc<T>) {
            const partitions: Partition<T> = {};
            let index = 0;
            for (const item of this) {
                const k = filter(item, index++, this);
                if (partitions[k] === undefined)
                    partitions[k] = [];
                partitions[k].push(item);
            }
            return partitions;
        }
})

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




async function level(levelIndex: number, instructions: string, cols: number, rows: number,timeoutMs: number = 3000) {

    const lookedUpWord = document.querySelector('#looked-up-word') as HTMLDivElement;
    const deckEl = document.querySelector('.deck') as HTMLDivElement;

    // const timeoutActionType: "hint" | "add" | "remove" = setsToAddPerTimeout === 0 ? "hint" : setsToAddPerTimeout > 0 ? "add" : "remove"

    let setsRemaining = 0;

    let lastWordTime = 0;


    return new Promise<void>((resolve, reject) => {
        const wordEl = document.querySelector('#word') as HTMLDivElement;
        const tickEl = document.querySelector('.tick') as HTMLDivElement;

        /// TODO: Make this do real stuff
        tickEl.addEventListener('click', e => {

            if (lookedUpWord.innerText != "") {

                // User clicked the tick, so we assume they want to submit the word
                wordEl.innerHTML = ""; // Clear the word
                UpdateWordMade();
                playSoundEffect("selected3");
                resetTimerBar();
                if (deckEl.children.length == 0)
                    // All tiles are used up, so we resolve the promise
                    resolve();
            }
        })




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
        const GetDictWord = (word: string): string | undefined => {

            // Convert pattern to a regex: replace ? with .
            // Commented out is case-insensitive version
            // const regex = new RegExp('^' + word.replace(/\?/g, '.') + '$', 'i');
            const regex = new RegExp('^' + word.replace(/\?/g, '.') + '$');

            const match = WordList70.find(word => regex.test(word));
            console.log("GetDictWord", word, "=>", match);
            return match;

        }

        const UpdateWordMade = (): void => {
            const madeWord = GetDictWord(candidateWord()) || ""
            if (madeWord === "" ||  madeWord.length < 3) {
                tickEl.classList.remove('hint');
            } else {
                tickEl.classList.add('hint');
            }
            lookedUpWord.innerHTML = madeWord
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
                    UpdateWordMade();
                    return;
                }
                // only allow touch events for tiles on the last row of the deck
                if (parseInt(getComputedStyle(tileEl).gridRowStart, 10) != rows) {
                    playSoundEffect("undo");
                    return;
                }

                await FLIP(tileEl, (el) => {wordEl.appendChild(el)}, 100);
                UpdateWordMade();


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
            // Find a set of tiles and animate them as a hint
            if (!userFoundWordBeforeTimeout()) {

                showModalDialog("Too slow!").then(() => {reject()});
            }
        }

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

                for (let r = 0; r < rows; ++r) {
                    const i = c * rows + r;
                    const tileEl = makeTileElementAtColumn(c);
                    deckEl.appendChild(tileEl);
                    setTileElementRow(tileEl, r);
                    setTileElementLetter(tileEl, ScrabbleLetters.pop()!);
                }
            }


            setTimerBarTransitionTime(timeoutMs);
            resetTimerBar();


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

const ScrabbleLetters: string[] = [];
Object.values(scrabbleData) .forEach(tile => {
    for (let i = 0; i < tile.frequency; i++) {
        ScrabbleLetters.push(tile.letter);
    }
});


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

const levelsMobile: LevelDef[] = [
    { instruction: "Match sets of three.",       cols: 5, rows:7, timeoutMs: 600_000 },
    { instruction: "Match pairs!",               cols: 5, rows: 8, timeoutMs: 30_000 },
    { instruction: "Match sets of three!",       cols: 5, rows: 8, timeoutMs: 60_000 },
    { instruction: "Match pairs!",               cols: 7, rows: 10,timeoutMs: 60_000 },
    { instruction: "Match sets of three!",       cols: 7, rows: 10,timeoutMs: 60_000 },
    { instruction: "Match sets of three!",       cols: 7, rows: 11,timeoutMs: 60_000 },
    { instruction: "Match sets of three!",       cols: 8, rows: 12,timeoutMs: 60_000 },
];

const levelsDesktop: LevelDef[] = [
    { instruction: "Match sets of three",        cols: 10, rows:10, timeoutMs: 600_000 },
    { instruction: "Match pairs!",               cols: 21, rows: 14,timeoutMs: 30_000 },
    { instruction: "Match sets of three!",       cols: 5, rows: 8, timeoutMs: 60_000 },
    { instruction: "Match pairs!",               cols: 7, rows: 10,timeoutMs: 60_000 },
    { instruction: "Match sets of three!",       cols: 7, rows: 10,timeoutMs: 60_000 },
    { instruction: "Match sets of three!",       cols: 7, rows: 11,timeoutMs: 60_000 },
    { instruction: "Match sets of three!",       cols: 8, rows: 12,timeoutMs: 60_000 },
];

const levels = screen.width > screen.height && screen.width >= 1280 ? levelsDesktop : levelsMobile; // Use desktop levels on larger screens

// 2) playLevel() simply looks up and invokes level():
async function playLevel(idx: number): Promise<void> {
    if (idx < 0 || idx >= levels.length) {
        throw new RangeError(`Invalid level index ${idx}`);
    }
    const { instruction, cols, rows,timeoutMs } = levels[idx];
    await level(idx, instruction, cols, rows, timeoutMs);
}


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

/**
 * Plays the next unreached level, then increments the stored reached_level
 * only if playLevel resolves successfully.
 */
async function playReachedLevel(): Promise<void> {
    const levelIndex = getReachedLevel();
    try {
        await playLevel(levelIndex);        // invoke with no args from caller
        setReachedLevel(levelIndex + 1);    // only increment on success
    } catch (err) {
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
    SoundEffect["undo"] = getBlip(200, 0.01, 0.05);
    SoundEffect["good"]  = await getAudioBufferFromFile('/audio/match_good.mp3');
    SoundEffect["excellent"] = await getAudioBufferFromFile('/audio/match_excellent.mp3');
    SoundEffect["ok"] = await getAudioBufferFromFile('/audio/match_ok.mp3');
    SoundEffect["clock-tick"] = await getAudioBufferFromFile('/audio/clock_tick.wav');

    // await showModalDialog("Ready to play?");
    // Keep soundbars from going into standby mode by playing a very high frequency sound
// https://www.reddit.com/r/Soundbars/comments/nyxpzp/soundbar_standby_blocker_prevent_soundbar_from/?utm_source=chatgpt.com
    const oscTick = ctx.createOscillator();
    oscTick.frequency.value = ctx.sampleRate / 2 - 2;  // Just below nyquist frequency
    oscTick.connect(ctx.destination);
    oscTick.start();

    await playReachedLevel();

})();

