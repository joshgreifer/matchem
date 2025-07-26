
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
function isWord(word: string, lexicon: TrieNode): boolean {
    return _dfs_handling_blanks(word, 0, lexicon, true);
}

// Check if prefix exists in the trie (as a valid start)
function startsWith(prefix: string, lexicon: TrieNode): boolean {
    return _dfs_handling_blanks(prefix, 0, lexicon, false);
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
// The global lexicons
declare const LEXICON40: TrieNode
declare const LEXICON95: TrieNode
declare const WordList95: string[]; // The global word list, used for startsWith and isWord
// const LEXICON: TrieNode = LEXICON40;

// https://chatgpt.com/s/t_687e848ccd088191b6e279a5e4367855
function FLIP(
    els: HTMLElement[],
    mutator: () => void,
    duration: number
): Promise<void> {
    // 1. capture first bounds
    const firstRects = els.map(el => el.getBoundingClientRect());

    // 2. mutate DOM
    mutator();

    // 3. capture last bounds
    const lastRects = els.map(el => el.getBoundingClientRect());

    // 4. apply inverted transforms
    els.forEach((el, idx) => {
        const dx = firstRects[idx].left - lastRects[idx].left;
        const dy = firstRects[idx].top  - lastRects[idx].top;

        el.style.transition = 'none';
        el.style.transform = `translate(${dx}px,${dy}px)`;
        el.style.transformOrigin = '0 0';
        void el.offsetWidth;
    });

    return new Promise<void>(resolve => {
        let count = els.length;
        let resolved = false;
        const cleanup = (e: Event) => {
            const el = e.target as HTMLElement;
            el.style.transition = '';
            el.style.transform = '';
            el.removeEventListener('transitionend', cleanup);
            count--;
            if (count === 0)
                resolved = true;
        };

        // 5. enable transitions
        els.forEach((el, idx) => {
            el.addEventListener('transitionend', cleanup, { once: true });
            el.style.transition = `transform ${duration}ms cubic-bezier(.4,0,.2,1)`;
            el.style.transform = '';
        });
        setTimeout(() => {
            if (!resolved) {
                els.forEach(el => {
                    el.style.transition = '';
                    el.style.transform = '';
                    el.removeEventListener('transitionend', cleanup);
                });
                resolve();
            }
        }, duration + 50);
    });
}




async function level(): Promise<number> {

    const appEl = document.querySelector(`.app`)! as HTMLDivElement;
    if (!appEl) {
        console.error(`Container element with class "app" not found.`);
    }
    appEl.innerHTML = ""; // Clear the app element
    // Create elements
    const layoutEl = document.createElement('div');
    layoutEl.id = 'layout';



// Deck
    const deckEl = document.createElement('div');
    deckEl.className = 'deck';
    layoutEl.appendChild(deckEl);

// Create columns in the deck
    for (let c = 0; c < COLS; ++c) {
        const columnEl = document.createElement('div');
        columnEl.className = 'column';
        deckEl.appendChild(columnEl);
    }

// Stock (containing the available tiles to deal) hidden for now
    const stockEl = document.createElement('div');
    stockEl.className = 'stock';
    document.body.appendChild(stockEl);
    // layoutEl.appendChild(stockEl);

// Fill the stock with tiles (one for each scrabble tile)
    const ScrabbleTiles: TileInfo[] = [];
    Object.values(scrabbleData) .forEach(tile => {
        for (let i = 0; i < tile.frequency; i++) {
            ScrabbleTiles.push(tile);
        }
    });
    ScrabbleTiles.shuffle();
    // Add all tiles to the stock
    for (const tile of ScrabbleTiles) {
        const tileEl = document.createElement('div');
        tileEl.className = 'scrabble-tile';
        tileEl.dataset['letter'] = tile.letter;
        tileEl.dataset['value'] = `${tile.value}`;
        tileEl.innerText = tile.letter;
        // tileEl.ontransitionend = tileEl.onanimationend = () => {
        //     tileEl.className = (`scrabble-tile`); // Remove all animation classes
        //
        // };
        tileEl.addEventListener('mousedown', onTileTouched)
        tileEl.addEventListener('touchstart', onTileTouched)
        stockEl.appendChild(tileEl);
    }

// Timer Bar
    const timerBarEl = document.createElement('div');
    timerBarEl.id = 'timer-bar';
    const timerFillEl = document.createElement('div');
    timerFillEl.className = 'timer-fill';
    timerBarEl.appendChild(timerFillEl);

    layoutEl.appendChild(timerBarEl);

// Build Word Container
    const buildWordContainerEl = document.createElement('div');
    buildWordContainerEl.className = 'build-word-container';

    const wordEl = document.createElement('div');
    wordEl.id = 'word';
    buildWordContainerEl.appendChild(wordEl);

    const wordScoreContainerEl = document.createElement('div');
    wordScoreContainerEl.className = 'word-score-container';
    buildWordContainerEl.appendChild(wordScoreContainerEl);

    const bonusBadgeEl = document.createElement('div');
    bonusBadgeEl.id = 'bonus-badge';
    wordScoreContainerEl.appendChild(bonusBadgeEl);

    const submitButtonEl = document.createElement('div');
    submitButtonEl.className = 'submit-button';
    submitButtonEl.title = 'Click to confirm word';
    submitButtonEl.textContent = '✔'; // Unicode checkmark
    wordScoreContainerEl.appendChild(submitButtonEl);

    layoutEl.appendChild(buildWordContainerEl);

// // Valid Word
//     const validWordEl = document.createElement('div');
//     validWordEl.id = 'valid-word';
//
//     buildWordContainerEl.appendChild(validWordEl);

// Game Status
    const gameStatusEl = document.createElement('div');
    gameStatusEl.id = 'game-status';
    const gameStatusSpan = document.createElement('span');
    const giveUpButtonEl = document.createElement('button');
    giveUpButtonEl.className = 'give-up-button';
    giveUpButtonEl.textContent = `Give Up (${MAX_GIVE_UPS})`;
    gameStatusSpan.appendChild(giveUpButtonEl);
    gameStatusEl.appendChild(gameStatusSpan);
    layoutEl.appendChild(gameStatusEl);

// Total Score
    const totalScoreEl = document.createElement('span');
    totalScoreEl.id = 'total-score';
    layoutEl.appendChild(totalScoreEl);

// Add the layout to the app element
    appEl!.appendChild(layoutEl);


    let totalScore = 0;
    let lastWordTime = 0;
    let giveUpsAllowed = MAX_GIVE_UPS; // Number of give-ups allowed in a level

    type Model = {
        deck: string[][]
        candidateWord: string
    }; // Model of the game state



    let model: Model = { deck: [], candidateWord: "" };

    function numTilesInDeck(): number {
        return [...deckEl.children].reduce((sum, col) => sum + col.children.length, 0)
    }

    function getTileElementColumn(tileEl: HTMLDivElement): number {
        return parseInt(tileEl.dataset['column'] || "0", 10);
    }
    function setTileElementColumn(tileEl: HTMLDivElement, column: number): void {
        tileEl.dataset['column'] = `${column}`;
    }
    async function moveTile(tileEl: HTMLDivElement, durationMs: number = 300): Promise<void> {
        const tileCol = getTileElementColumn(tileEl);
        const columnEl = deckEl.children[tileCol] as HTMLDivElement;
        const parent = tileEl.parentElement!;
        const newParent = parent.className.includes('column') ? wordEl :columnEl; // If it's a column, move to deck, otherwise stay in parent
        const tilesToAnimate = [...columnEl.children, tileEl];
        return FLIP(tilesToAnimate as HTMLDivElement[], () => {newParent.appendChild(tileEl)}, durationMs);

    }
    async function onTileTouched (e: Event) {

        e.preventDefault();
        e.stopPropagation();
        const el = e.target as HTMLDivElement;
        const parent = el.parentElement!;
        if (el != parent?.lastElementChild) {
            playSoundEffect("undo");
            return; // Only allow moving the last tile in the column or the word
        }
        if (el.classList.contains('substituted')) {
            el.innerText = " "; // Change back to a blank tile
            el.classList.remove('substituted'); // Remove any substitution class
        }
        await moveTile(el);

    }
    type Play = { word: string, fromStack: number[] }[]
    const FindWordInLexicon = (word: string, sw: boolean = false): string | undefined => {
        if (word.length < MIN_WORD_LENGTH) {
            // console.log(`FindWordInLexicon: word "${word}" is too short`);
            return undefined; // Ignore words shorter than MIN_WORD_LENGTH
        }

        // Convert pattern to a regex: replace ? with .
        // Commented out is case-insensitive version (allowing Proper nouns)
        // const regex = new RegExp('^' + word.replace(/\?/g, '.') + '$', 'i');
        const foundInLexicon = sw ? startsWith(word, LEXICON) : isWord(word, LEXICON)
        if (foundInLexicon) {

            const regex = new RegExp('^' + word.replace(/\?/g, '[a-z]') + (sw ? '' : '$'));
            // console.log(`FindWordInLexicon ${startsWith ? 'startsWith' : 'exact'} regex:`, regex);

            // Will always succeed, because the trie is built from the word list and we check for existence first
            const match = WordList95.find(word => regex.test(word));
            // console.log(`FindWordInLexicon ${startsWith ? 'startsWith' : 'exact'}`, word, "=>", match);
            return match;
        }
        return undefined;
    }

    return new Promise<number>((resolve) => {

        /**
         * Enumerate all possible "plays" starting from startingWord,
         * by recursively popping from non-empty stacks, allowing blank tiles ("?" or " ") as wildcards.
         * Each play records both the resulting word and the sequence of stacks used to build it.
         */
        function enumeratePlays(

            startingWord: string = "xyz",
            returnFirstWordFound: boolean = false,
            lexicon: TrieNode = LEXICON,
            grid: string[][] = model.deck,
            minWordLength: number = MIN_WORD_LENGTH,
            maxDepth: number = MAX_WORD_LENGTH_FOR_SEARCH

        ): { word: string, fromStack: number[] }[] {
            const plays: Play = [];

            function backtrack(
                word: string,
                stacks: string[][],
                path: number[]
            ) {
                // Prune search if prefix is invalid
                if (!startsWith(word, lexicon)) return;

                // If it's a valid word and long enough, record it
                if (word.length >= minWordLength && isWord(word, lexicon)) {
                    plays.push({ word, fromStack: [...path] });
                    if (returnFirstWordFound) {
                        // If we only want the first valid word, return immediately
                        return plays;
                    }
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

        function noMorePlays(): boolean {
            return enumeratePlays("", true).length == 0
        }


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
            // for (let c = model.deck.length - 1; c >= 0; --c) {
            //     if (model.deck[c].length === 0) {
            //         model.deck.splice(c, 1);
            //     }
            // }

            // Get the candidate word from the wordEl
            model.candidateWord = candidateWord();
            if (model.candidateWord.length === 0) {
                if (noMorePlays()) {
                    if (totalScore > 0)
                        playSoundEffect("excellent");
                    resolve(totalScore);   // level finished
                }
            }
            return model;
        }
        async function giveUpButtonElClicked(e:MouseEvent)  {

            const plays = enumeratePlays(model.candidateWord);
            console.log(plays);
            // const uniqueWords = [
            //     ...new Set(plays.map(p => p.word))
            // ];


            // alert(
            //     uniqueWords
            //         .map(word => ({ word, score: scoreWord(word) }))
            //         .sort((a, b) => b.score - a.score)
            //         .map(({ score, word }) => `${score} - ${word}`)
            //         .join('\n')
            // );
            // alert(uniqueWords.join("\n"));
            if (plays.length === 0 || giveUpsAllowed <= 0) {
                await playSoundEffect("undo");
            } else {
                if (--giveUpsAllowed <= 0) {
                    giveUpButtonEl.className = 'hidden';
                }
                giveUpButtonEl.textContent = `Give Up (${giveUpsAllowed})`;
                const bestPlay = plays
                    .map(play => ({...play, score: scoreWord(play.word)}))
                    .sort((a, b) => b.score - a.score)[0];
                const fromStack = bestPlay.fromStack.slice();
                while (fromStack.length > 0) {
                    const colIdx = fromStack.shift(); // or .pop() depending on direction
                    if (colIdx !== undefined) {
                        const tileEl = getLastColumnTile(colIdx);
                        if (tileEl) {
                            await moveTile(tileEl, 200);
                        }
                    }
                }
            }
        }

        giveUpButtonEl.removeEventListener('click', giveUpButtonElClicked);
        giveUpButtonEl.addEventListener('click', giveUpButtonElClicked);


        const submitButtonElClicked = async (e: MouseEvent) => {
            lastWordTime = Date.now();
            resetTimerBar();
            const score = parseInt(submitButtonEl.innerText, 10);
            if (submitButtonEl.classList.contains('active')) {
                totalScore += score;
            }

            playSoundEffect("selected3");


            // move all tiles in the wordElement to the stockElement
            while (wordEl.firstChild) {
                const el = wordEl.firstChild as HTMLDivElement;

                if (el.classList.contains('substituted')) {
                    el.innerText = " "; // Change back to a blank tile
                    el.classList.remove('substituted'); // Remove any substitution class
                }
                stockEl.appendChild(el);
                dealTileFromStock();
            }


        }
        /// This can only be called if there's a valid word in the wordEl, otherwise the submitButtonEl will  not be visible
        submitButtonEl.removeEventListener('click', submitButtonElClicked );
        submitButtonEl.addEventListener('click', submitButtonElClicked );

        const observer = new MutationObserver((mutationList) => {
            mutationList.forEach(mutation => {
                if (mutation.type === 'childList') {
                    // console.log(' Tiles added or removed:', mutation);
                    onViewChanged();
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

        const remainingTilesAsString = (): string => {
            // Get all tiles in the deck and concatenate their letters
            return Array.from(deckEl.children)
                    .map(tile => getTileElementLetter(tile as HTMLDivElement))
                    .join('')
                + Array.from(wordEl.children)
                    .map(tile => getTileElementLetter(tile as HTMLDivElement))
                    .join('');

        }
        const scoreWord = (word: string): number => {
            // calculate score by summing the values of the letters in the word
            let score = Array.from(word).reduce((acc, letter) => {
                return acc + (scrabbleData[letter.toUpperCase()]?.value || 0);
            }, 0);

            if (word.length >= LENGTH_5X_WORD_SCORE) {
                score *= 5; // Bonus for long words
            } else if (word.length >= LENGTH_TRIPLE_WORD_SCORE) {
                score *= 3; // Bonus for long words
            }
            if (word.length >= LENGTH_FIFTY_BONUS) {
                score += 50; // Bonus for long words
            }
            return score;
        }
        const onViewChanged = (): void => {

            updateModelFromDOM();

            const candidate = candidateWord();
            const foundWord = FindWordInLexicon(candidate) || "";

            const score = scoreWord(candidate);

            submitButtonEl.innerText = `${score}`;
            bonusBadgeEl.innerText = "";
            bonusBadgeEl.className = "hidden";
            submitButtonEl.className = 'submit-button'; // Reset tick element class

            if (foundWord === "") {
                giveUpButtonEl.classList.remove('hidden');
            } else {
                giveUpButtonEl.classList.add('hidden');
            }
            if (foundWord.length >= LENGTH_5X_WORD_SCORE) {

                bonusBadgeEl.innerText += "x5!!!";
                bonusBadgeEl.classList.add('x5');
                // playSoundEffect("excellent");
            } else if (foundWord.length >= LENGTH_TRIPLE_WORD_SCORE) {

                bonusBadgeEl.innerText += "x3!!";
                bonusBadgeEl.classList.add('x3');

            }

            if (foundWord.length >= LENGTH_FIFTY_BONUS) {

                bonusBadgeEl.innerText += " +50!";
                bonusBadgeEl.classList.add('starburst');
            }
            if (foundWord === "" && numTilesInDeck() > 0) {
                submitButtonEl.classList.remove('active');
            } else {
                submitButtonEl.classList.add('active');
                if (numTilesInDeck() === 0) {
                    if (foundWord === "") {
                        submitButtonEl.innerText = `-${score}`;
                    } else {
                        submitButtonEl.innerText = `${score + 200}`; // Add bonus for finishing on a word
                    }
                }
                if (foundWord.length < MIN_SCORING_WORD_LENGTH || score < MIN_SCORING_SCORE) {
                    submitButtonEl.classList.add('no-score');
                }
            }
            const doSubstitution = foundWord !== "";

            // find all the indexes in the candidate word of "?"
            const blankIndexes = candidate.split('').reduce((acc, letter, index) => {
                if (letter === '?') {
                    acc.push(index);
                }
                return acc;
            }, [] as number[]);
            if (blankIndexes.length > 0) {
                for (const index of blankIndexes) {

                    // replace the ? with the letter from the found word
                    const letter = foundWord[index];

                    const tileEl = wordEl.children[index] as HTMLDivElement;
                    if (doSubstitution) {
                        // Don't set the data-letter attribute, otherwise it will be considered a  letter tile
                        tileEl.innerText = letter.toUpperCase();
                        tileEl.classList.add('substituted');
                    } else {
                        tileEl.innerText = " "; // Change back to a blank tile
                        tileEl.classList.remove('substituted'); // Remove any substitution class
                    }
                }

            }

            totalScoreEl.innerText = `${totalScore}`; // Update total score
        }

        const getLastColumnTile = (c: number): HTMLDivElement | undefined => {
            const el  =deckEl.children[c].lastElementChild;
            return el ? el as HTMLDivElement : undefined;
        }

        const getTileElementLetter = (tileEl: HTMLDivElement): string => {
            return tileEl.dataset['letter']!;
        }

        const userFoundWordBeforeTimeout = (): boolean => {
            return Date.now() - lastWordTime < TIMER_BAR_DURATION
        }

        const timeoutAction = () => {
                resolve(totalScore);
        }

        async function dealTileFromStock(): Promise<void> {
// Get the first child of the stock element
            const tileToDeal = stockEl.firstElementChild as HTMLDivElement | null;
            if (!tileToDeal) {
                console.warn("No tiles left in stock to deal.");
                return;
            }
            // Find the column with the least tiles
            const columns = Array.from(deckEl.querySelectorAll('.column'));
            const columnHeights = columns.map(col => col.children.length);
            const minHeight = Math.min(...columnHeights);
            const targetColumnIndex = columnHeights.indexOf(minHeight);
            setTileElementColumn(tileToDeal, targetColumnIndex); // Set the column index on the tile
            // Move the tile to the target column
            const targetColumn = columns[targetColumnIndex];
            await FLIP([tileToDeal], () => {
                targetColumn.insertBefore(tileToDeal, targetColumn.firstChild);
            }, 500);

        }
        function initialDeal(numberToDeal: number = INITIAL_DEAL_TILES): void {
            for (let i = 0; i < numberToDeal; ++i) {
                dealTileFromStock();
            }
        }

        const resetTimerBar = () => {
            const onBarEnd = () => {
                resolve(totalScore);
            }

            const fill = document.querySelector('.timer-fill') as HTMLElement;

            fill.removeEventListener('animationend', onBarEnd);
            fill.style.animation = '';
            void fill.offsetWidth;
            fill.classList.remove('animate');
            void fill.offsetWidth;
            fill.classList.add('animate');

            fill.addEventListener('animationend', onBarEnd, {once: true});
            // fill.addEventListener('animationend', () => alert("Foo"), {once: true});


        };

        const setTimerBarTransitionTime = (milliSeconds: number) => {
            document.documentElement.style.setProperty('--TRANSITION_TIME', `${milliSeconds / 1000}s`);
        }


        initialDeal();
        setTimerBarTransitionTime(TIMER_BAR_DURATION);
        resetTimerBar();
        // Initialize score
        onViewChanged();

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
    // console.log("Elapsed since last call :", (ctx.currentTime - ctxLastTime).toFixed(1) + "s");
    ctxLastTime = ctx.currentTime;
    src.connect(ctx.destination);

    src.start();

    // console.log("started playing audio buffer", buffer);
    return new Promise<void>((resolve) => {
        src.onended = () => {
            // console.log("onended playing audio buffer", buffer);
            src.disconnect(ctx.destination); // Disconnect after playback
            resolve();
        };
    });
}


async function playSoundEffect(name: string) {
    // console.log(name, "sound effect requested");
    const buffer = SoundEffect[name];

    if (buffer) {
        await playAudioBuffer(buffer);
        // console.log(name, "sound effect played");
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





let COLS = 7; // Number of columns in the game grid
let INITIAL_DEAL_TILES = 49; // Number of tiles to deal at the start of the game
let MIN_WORD_LENGTH = 2; // Minimum word length allowed
let MAX_WORD_LENGTH_FOR_SEARCH = 10; // Maximum word length allowed for search (== search-depth during dfs)
let MIN_SCORING_WORD_LENGTH = 3; // Minimum word length to score
let MIN_SCORING_SCORE = 10; // Minimum score to consider a word valid for scoring
let MAX_GIVE_UPS = 1000; // Maximum number of give-ups allowed in a level
let LENGTH_FIFTY_BONUS = 7; // Bonus for words of length 7 or more
let LENGTH_TRIPLE_WORD_SCORE = 9; // Bonus for words of length 10 or more
let LENGTH_5X_WORD_SCORE = 10; // Bonus for words of length 10 or more
let TIMER_BAR_DURATION = 60_000; // Duration of the timer bar animation in milliseconds
let LEXICON = LEXICON95; // Use the 95 lexicon for word validation
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

// Show options panel before starting game loop
async function showOptionsPanel() : Promise<void> {
    return new Promise(resolve => {
        const panel = document.getElementById('game-options-panel') as HTMLDivElement;
        panel.style.display = '';
        const form = document.getElementById('game-options-form') as HTMLFormElement;
        form.onsubmit = function(e) {
            e.preventDefault();
            // Update game settings from form fields
            LEXICON = form.BIG_DIC.checked ? LEXICON95 : LEXICON40;
            COLS = parseInt(form.COLS.value, 10);
            INITIAL_DEAL_TILES = parseInt(form.INITIAL_DEAL_TILES.value, 10);
            MIN_WORD_LENGTH = parseInt(form.MIN_WORD_LENGTH.value, 10);
            MAX_WORD_LENGTH_FOR_SEARCH = parseInt(form.MAX_WORD_LENGTH_FOR_SEARCH.value, 10);
            MIN_SCORING_WORD_LENGTH = parseInt(form.MIN_SCORING_WORD_LENGTH.value, 10);
            MIN_SCORING_SCORE = parseInt(form.MIN_SCORING_SCORE.value, 10);
            MAX_GIVE_UPS = parseInt(form.MAX_GIVE_UPS.value, 10);
            LENGTH_FIFTY_BONUS = parseInt(form.LENGTH_FIFTY_BONUS.value, 10);
            LENGTH_TRIPLE_WORD_SCORE = parseInt(form.LENGTH_TRIPLE_WORD_SCORE.value, 10);
            LENGTH_5X_WORD_SCORE = parseInt(form.LENGTH_5X_WORD_SCORE.value, 10);
            TIMER_BAR_DURATION = parseInt(form.TIMER_BAR_DURATION.value, 10);
            panel.style.display = 'none';
            resolve();
        }
    });
}


(async () => {

// Init audio
    SoundEffect["selected"] = getBlip(1000, 0.01, 0.03);
    SoundEffect["selected2"] = getBlip(1250, 0.01, 0.03);
    SoundEffect["selected3"] = getBlip(1500, 0.01, 0.03);
    SoundEffect["undo"] = getBlip(200, 0.01, 0.05);
    SoundEffect["good"]  = await getAudioBufferFromFile('assets/audio/match_good.mp3');
    SoundEffect["excellent"] = await getAudioBufferFromFile('assets/audio/match_excellent.mp3');
    SoundEffect["ok"] = await getAudioBufferFromFile('assets/audio/match_ok.mp3');
    SoundEffect["clock-tick"] = await getAudioBufferFromFile('assets/audio/clock_tick.wav');

    // await showModalDialog("" +
    //     "<p>Make words of three letters or more from the tiles at the bottom row. When you use a tile, the tile above it will become available.<p>" +
    //     "<p>When you've made a word, click the  <span style='color:red'>score button</span> to score that word, or see if you keep going and make a longer word!.</p>" +
    //     "<p>You can undo by clicking the last tile in the words you're building.</p>" +
    //     "<p>If you finish all the tiles by making a word, you get a 200 point bonus!</p>"
    //
    //
    // );

    // Keep soundbars from going into standby mode by playing a very high frequency sound
// https://www.reddit.com/r/Soundbars/comments/nyxpzp/soundbar_standby_blocker_prevent_soundbar_from/?utm_source=chatgpt.com
    const oscTick = ctx.createOscillator();
    oscTick.frequency.value = ctx.sampleRate / 2 - 2;  // Just below nyquist frequency
    oscTick.connect(ctx.destination);
    oscTick.start();
    await showOptionsPanel();
    for (;;) {

        const levelScore = await level();

        await showModalDialog(`You scored ${levelScore}.<br> Play again?`);
    }

})();

