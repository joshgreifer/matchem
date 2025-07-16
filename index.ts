

Object.defineProperty(Array.prototype, 'randomElement', {
    value: function () {
        return this.length ? this[Math.floor(Math.random() * this.length)] : undefined;
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

async function level(levelIndex: number, instructions: string, set: string[], cols: number, rows: number, numInitialSets: number, setSize : number, timeoutMs: number = 3000) {

    const scoreEl = document.querySelector('#score') as HTMLDivElement;

    // const timeoutActionType: "hint" | "add" | "remove" = setsToAddPerTimeout === 0 ? "hint" : setsToAddPerTimeout > 0 ? "add" : "remove"

    // let foundAtLeastOneMatch = false; // We don't do the timeout action until the after the first successful match
    let setsRemaining = 0;

    let lastMatchTime = 0;
// Hack
    let lock: boolean = false;
    let numTilesDealt = 0;
    let totalScore = 0;



    return new Promise<void>((resolve, reject) => {
        (document.querySelector('#instructions') as HTMLDivElement).innerHTML = instructions;


        const grid_len = cols * rows
        // create a grid
        const grid: number[] = new Array<number>(grid_len).fill(0)

        let numMatches = 0;

        let matchingCells: HTMLDivElement[] = [];
        let hintCells: HTMLDivElement[] = []; // Cells that are currently being hinted at
        const i2rc = (i: number): [number, number] => [ Math.floor(i / cols), i % cols]

        const getGridIndexWithFewestTiles = (): number => {
            const p: { i: number, h: number}[] = [];
            for (let i = 0;  i < grid_len; ++i)
                p.push({i: i, h: grid[i]} )
            p.sort((a, b) => a.h - b.h)
            let h = p[0].h
            const lp: number[] = []
            lp.push(p[0].i)
            for (let j = 1; j < grid_len; ++j)
                if (p[j].h > h)
                    break;
                else {
                    lp.push(p[j].i)
                }

            // @ts-ignore
            return lp.shuffle()[0]

        }
        const topTiles =(): HTMLDivElement[] => {
            const tiles: HTMLDivElement[] = new Array(grid_len).fill(undefined)
            for (const el of document.querySelectorAll('.tile')) {
                const [locS, zIndexS] = el.id.split('-')
                const loc = parseInt(locS)
                const zIndex = parseInt(zIndexS)
                if (tiles[loc] === undefined || zIndex > parseInt(tiles[loc].id.split('-')[1]))
                    tiles[loc] = el as HTMLDivElement

            }
            return tiles
        }

        const findAVisibleSet = (): HTMLDivElement[] => {
            const tiles = topTiles()
            const visibleTiles = tiles.filter(t => t !== undefined && !t.classList.contains('dummy') && !t.classList.contains('rotateOut'))
            // @ts-ignore
            const partitions = visibleTiles.partition((t: HTMLDivElement) => set !== emojiImgs ? t.innerText : (<HTMLImageElement>t.firstElementChild).src)
            for (const key in partitions)
                if (partitions[key].length >= setSize)
                    return partitions[key]
            return []
        }
        const makeDummyTileAtIndex = (i: number): HTMLDivElement => {
            const dummyTileEl = document.createElement('div');
            const [r, c] = i2rc(i)
            dummyTileEl.className ='tile dummy'
            dummyTileEl.style.zIndex = -1000 + '';
            dummyTileEl.id = `${i}-${0}`;
            dummyTileEl.style.gridRow = `${r + 1}`
            dummyTileEl.style.gridColumn = `${c + 1}`
            deckEl.appendChild(dummyTileEl);
            return dummyTileEl;
        }
        const makeTileAtIndex = (i: number): void => {

            // Images must always be unique
            if (emoji_idx > emojis.length-1)
                return;

            const v: string = emojis[emoji_idx];

            const comparator = set === emojiImgs  ?
                (a: HTMLDivElement, b: HTMLDivElement) => (<HTMLImageElement>(a.firstElementChild)).src === (<HTMLImageElement>(b.firstElementChild)).src
                : (a: HTMLDivElement, b: HTMLDivElement) => a.innerText === b.innerText
            // https://stackoverflow.com/questions/48419167/how-to-convert-one-emoji-character-to-unicode-codepoint-number-in-javascript
            // @ts-ignore
            // console.log([...v].map(e => e.codePointAt(0).toString(16)).join(`-`)) // gives correctly 1f469-200d-2695-fe0
            const tileEl = document.createElement('div');
            const [r, c] = i2rc(i)

            ++grid[i];
            const zIndex = 1000 + numTilesDealt++;
            tileEl.className ='tile'
            tileEl.style.zIndex = `${zIndex}`
            tileEl.id = `${i}-${zIndex-1000}`;
            if (set === emojiImgs)
                tileEl.innerHTML = `<img src="imgs/${v}.png" alt="${v}">`
            else
                tileEl.innerText = v
            tileEl.style.gridRow = `${r + 1}`
            tileEl.style.gridColumn = `${c + 1}`
            tileEl.classList.add('fade-in', 'grow')

            deckEl.appendChild(tileEl);

            tileEl.onanimationend = () => {
                tileEl.className = 'tile'; // Remove all animation classes

            }
            tileEl.ontransitionend = () => {

                if (tileEl.classList.contains('rotateOut'))
                    tileEl.remove();
                else
                    tileEl.className = 'tile'; // Remove all animation classes

            }
            tileEl.ontransitionstart = () => {
                if (tileEl.classList.contains('rotateOut'))
                    --grid[i];
            }
            const touched = (e: Event) => {
                e.preventDefault();
                if (lock)
                    return;
                lock = true;

                for (const cell of hintCells) {
                    cell.classList.remove('hint');
                }

                if (matchingCells.length == 0) {
                    tileEl.classList.add("selected");
                    matchingCells.push(tileEl)
                } else if (!matchingCells.includes(tileEl) && comparator(tileEl, matchingCells[0])) {

                    matchingCells.push(tileEl);
                    tileEl.classList.add("selected");
                    // Check if we have a match
                    if (++numMatches == setSize-1) {
                        // We have a match
                        let score = 0;  // No score if timeout
                        let msToFindMatch = Date.now() - lastMatchTime;

                        if (msToFindMatch < 1000) {
                            score = 100;
                        } else if (msToFindMatch < 3000) {
                            score = 25;
                        } else if (msToFindMatch < 5000) {
                            score = 10;
                        } else
                            score = 0;

                        totalScore +=  score;

                        numMatches = 0;
                        // foundAtLeastOneMatch = true;
                        setsRemaining -= 1;
                        if (score > 0) {
                            const buffer = score == 100 ? matchExcellentAudioBuffer : ( score == 25 ? matchGoodAudioBuffer : matchOkAudioBuffer);
                            (async () => { await playAudioBuffer(buffer) })();
                            // playAudioBuffer(buffer);
                        }

                        scoreEl.innerHTML = `Level ${levelIndex+1} - Score: ${totalScore.toFixed(0)}  (${setsRemaining.toFixed(0)})`

                        for (const cell of matchingCells)
                            cell.classList.add('rotateOut')
                        matchingCells = []

                        resetTimerBar();
                        if (setsRemaining === 0) {
                            // Level over
                            resolve();
                        }

                    }
                } else {
                    for (const cell of matchingCells) {
                        cell.classList.remove("selected");
                        cell.classList.add('rotateBack')
                    }
                    matchingCells = []
                    numMatches = 0;
                    tileEl.classList.add("rotateBack");
                }
                lock = false;
            }
            tileEl.addEventListener('mousedown', touched)
            tileEl.addEventListener('touchstart', touched)

            return;

        }

        const dealSet = (n: number):number[] => {

            const tileIndices: number[] = [] // Value is irrelevant, gets set in do loop
            // Add a tile at lowest pile
            tileIndices.push(getGridIndexWithFewestTiles())
            let tempIndex = 0; // Value is irrelevant, gets set in do loop

            for (let i = 0; i < n-1; ++i) {
                // Add a matching tile anywhere except on the same grid location as any of the other tiles
                do {
                    tempIndex = Math.floor(Math.random() * grid_len)
                } while (tileIndices.includes(tempIndex));
                tileIndices.push(tempIndex)
            }
            for (const gridIndex of tileIndices)
                makeTileAtIndex(gridIndex)
            ++emoji_idx;
            ++setsRemaining;
            scoreEl.innerHTML = `Level ${levelIndex+1} - Score: ${totalScore.toFixed(0)}  (${setsRemaining.toFixed(0)})`
            return tileIndices
        }

        const userFoundMatchBeforeTimeout = (): boolean => {
            return Date.now() - lastMatchTime < timeoutMs
        }

        const timeoutAction = () => {
            // Find a set of tiles and animate them as a hint
            if (!userFoundMatchBeforeTimeout()) {

                // HACK (shouldn't occur) - remove any tiles still with the "hint" class
                document.querySelectorAll<HTMLDivElement>('.tile.hint')
                    .forEach(el => el.classList.remove('hint'));

                hintCells = findAVisibleSet() // will always find one
                // console.assert(s.length >= setSize, "There should always be a set of size " + setSize + " visible at this point")
                for (const cell of hintCells)
                    // console.log(cell.classList)
                    cell.classList.add('hint')
                showModalDialog("Too slow!").then(() => {reject()});
            }
        }
        const deal = () => {
            setTimerBarTransitionTime(864_000_000); // 1 day, so it doesn't animate
            resetTimerBar();
            // remove any tiles that were hinted at in a previous level (should not happen)
            document.querySelectorAll<HTMLDivElement>('.tile.hint')
                .forEach(el => el.classList.remove('hint'));
            let setNum = 0;
            const to = setInterval(() => {
                if (setNum++ < numInitialSets)
                    dealSet(setSize);
                else {
                    clearInterval(to);


                    setTimerBarTransitionTime(timeoutMs);
                    resetTimerBar();
                }
            }, 50)

            // for (let setNum = 0; set < numInitialSets; ++set)
            //     dealSet();

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
            lastMatchTime = Date.now();

        };

        const setTimerBarTransitionTime = (milliSeconds: number) => {
            document.documentElement.style.setProperty('--TRANSITION_TIME', `${milliSeconds / 1000}s`);
        }
        // @ts-ignore
        // const emojis = set.slice(0,100).shuffle()
        const emojis = set.shuffle()
        let emoji_idx = 0;

        const deckEl = document.querySelector('.deck') as HTMLDivElement;
        // const audioElGood = document.querySelector('#audio_match_good') as HTMLAudioElement;
        // const audioElOk = document.querySelector('#audio_match_ok') as HTMLAudioElement;
        // Make deck

        deckEl.innerHTML = "";
        deckEl.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
        deckEl.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;
        deckEl.style.aspectRatio = `${cols} / ${rows}`; // Set aspect ratio of deck
        // fill with dummy tiles
        for (let i = 0; i < grid_len; ++i) {
            makeDummyTileAtIndex(i);
        }
        deal();


    });
}

const ctx = new AudioContext( {latencyHint: 'playback' });

let matchOkAudioBuffer: AudioBuffer;
let matchGoodAudioBuffer: AudioBuffer;
let matchExcellentAudioBuffer: AudioBuffer;
async function getAudioBufferFromFile(fileName: string) {
    const resp = await fetch(fileName);
    const array = await resp.arrayBuffer();
    return await ctx.decodeAudioData(array);
}

async function playAudioBuffer(buffer: AudioBuffer) {
    if (ctx.state !== "running") {
        await ctx.resume(); // Ensures context is live
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);

    setTimeout(() => {
        src.start();
    }, 0);
    return new Promise<void>((resolve) => {
        src.onended = () => {
            resolve();
        };
    });
}

// Call init() on startup, then playChimeBuffer() whenever you need the chime
// const set = allEmojis
const set = emojiImgs;

const modalDialog = document.querySelector('.modal') as HTMLDivElement;
const modalDialogMessage = document.querySelector('.modal_message') as HTMLDivElement;
const modalDialogOkButton = document.querySelector('.modal__ok') as HTMLButtonElement;

const showModalDialog = async (message: string) => {
    return new Promise<void>((resolve) => {
        modalDialogOkButton.addEventListener('click', e => { modalDialog.classList.remove('active'); resolve(); }, { once: true });

        modalDialogMessage.innerHTML = message;
        modalDialog.classList.add('active');
        modalDialogOkButton.focus();
    })

}
// 1) Define your levels in one place:
interface LevelDef {
    instruction: string;
    set: string[];
    rows: number;
    cols: number;
    numInitialSets: number;
    setSize: number;
    timeoutMs: number;
}

const levels: LevelDef[] = [
    { instruction: "Match  pairs.",               set, rows: 4, cols: 6,  numInitialSets: 24,  setSize: 2, timeoutMs: 30_000 },
    { instruction: "Match  pairs!",               set, rows: 5, cols: 8,  numInitialSets: 40,  setSize: 2, timeoutMs: 30_000 },
    { instruction: "Match  sets of three!",       set, rows: 5, cols: 8,  numInitialSets: 80,  setSize: 3, timeoutMs: 60_000 },
    { instruction: "Match pairs!",                set, rows: 7, cols: 10, numInitialSets: 100, setSize: 2, timeoutMs: 60_000 },
    { instruction: "Match sets of three!",        set, rows: 7, cols: 10, numInitialSets: 100, setSize: 3, timeoutMs: 60_000 },
    { instruction: "Match sets of three!",        set, rows: 7, cols: 11, numInitialSets: 100, setSize: 3, timeoutMs: 60_000 },
    { instruction: "Match sets of three!",        set, rows: 8, cols: 12, numInitialSets: 200, setSize: 3, timeoutMs: 60_000 },
];

// 2) playLevel() simply looks up and invokes level():
async function playLevel(idx: number): Promise<void> {
    if (idx < 0 || idx >= levels.length) {
        throw new RangeError(`Invalid level index ${idx}`);
    }
    const { instruction, set, rows, cols, numInitialSets, setSize, timeoutMs } = levels[idx];
    await level(idx, instruction, set, rows, cols, numInitialSets, setSize, timeoutMs);
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


(async () => {
// Init audio
    matchOkAudioBuffer = await getAudioBufferFromFile('/audio/match_ok.mp3');
    matchGoodAudioBuffer = await getAudioBufferFromFile('/audio/match_good.mp3');
    matchExcellentAudioBuffer = await getAudioBufferFromFile('/audio/match_excellent.mp3');

    await showModalDialog("Ready to play?");
    for (;;)
        await playReachedLevel().catch(async (err) => {
            console.error("Game over or aborted:", err);
            await showModalDialog("Game over!  Try again?");
        });

})();

