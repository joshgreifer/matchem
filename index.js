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
// Check if word exists in the trie
function isWord(word, lexicon) {
    return _dfs_handling_blanks(word, 0, lexicon, true);
}
// Check if prefix exists in the trie (as a valid start)
function startsWith(prefix, lexicon) {
    return _dfs_handling_blanks(prefix, 0, lexicon, false);
}
// Handles blanks (represented as '?') recursively
function _dfs_handling_blanks(str, i, node, end) {
    if (i === str.length) {
        return end ? !!node.$ : true;
    }
    const ch = str[i];
    // console.log(`_dfs_handling_blanks: str=${str}, i=${i}, ch=${ch}, end=${end}`);
    if (ch === "?" || ch === " ") {
        // Blank can be any letter a-z
        for (const key in node) {
            if (key === "$")
                continue;
            if (_dfs_handling_blanks(str, i + 1, node[key], end))
                return true;
        }
        return false;
    }
    else if (node[ch]) {
        return _dfs_handling_blanks(str, i + 1, node[ch], end);
    }
    else {
        return false;
    }
}
// const LEXICON: TrieNode = LEXICON40;
// https://chatgpt.com/s/t_687e848ccd088191b6e279a5e4367855
function FLIP(els, mutator, duration) {
    // 1. capture first bounds
    const firstRects = els.map(el => el.getBoundingClientRect());
    // 2. mutate DOM
    mutator();
    // 3. capture last bounds
    const lastRects = els.map(el => el.getBoundingClientRect());
    // 4. apply inverted transforms
    els.forEach((el, idx) => {
        const dx = firstRects[idx].left - lastRects[idx].left;
        const dy = firstRects[idx].top - lastRects[idx].top;
        el.style.transition = 'none';
        el.style.transform = `translate(${dx}px,${dy}px)`;
        el.style.transformOrigin = '0 0';
        void el.offsetWidth;
    });
    return new Promise(resolve => {
        let count = els.length;
        let resolved = false;
        const cleanup = (e) => {
            const el = e.target;
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
async function level() {
    const appEl = document.querySelector(`.app`);
    if (!appEl) {
        console.error(`Container element with class "app" not found.`);
    }
    appEl.innerHTML = ""; // Clear the app element
    // Create elements
    const layoutEl = document.createElement('div');
    layoutEl.id = 'layout';
    // Stock (containing the available tiles to deal) hidden for now
    const stockEl = document.createElement('div');
    stockEl.className = 'stock';
    // document.body.appendChild(stockEl);
    layoutEl.appendChild(stockEl);
    // Any tiles added to the stock will be rotated randomly, and reset when removed
    new MutationObserver((mutationList) => {
        for (const mutation of mutationList) {
            if (mutation.type === 'childList') {
                // Use mutation.target as the container being mutated
                const container = mutation.target;
                const STOCK_W = container.clientWidth;
                const STOCK_H = container.clientHeight;
                const TILE_W = 56, TILE_H = 56;
                const SCALE = 0.5;
                // Added nodes
                mutation.addedNodes.forEach(node => {
                    const tileW = TILE_W * SCALE;
                    const tileH = TILE_H * SCALE;
                    const x = Math.random() * (STOCK_W - tileW);
                    const y = Math.random() * (STOCK_H - tileH);
                    const rot = (Math.random() * 80) - 40;
                    const el = node;
                    el.style.left = `${x}px`;
                    el.style.top = `${y}px`;
                    el.style.transform = `rotate(${rot}deg) scale(${SCALE})`;
                    el.style.transformOrigin = 'center center';
                });
                // Removed nodes
                mutation.removedNodes.forEach(node => {
                    const el = node;
                    el.style.left = '';
                    el.style.top = '';
                    el.style.transform = '';
                    el.style.transformOrigin = '';
                });
            }
        }
    }).observe(stockEl, { childList: true, subtree: false });
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
    // Fill the stock with tiles (one for each scrabble tile)
    const ScrabbleTiles = [];
    Object.values(scrabbleData).forEach(tile => {
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
        tileEl.addEventListener('mousedown', onTileTouched);
        tileEl.addEventListener('touchstart', onTileTouched);
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
    const hintButtonEl = document.createElement('div');
    hintButtonEl.className = 'hint-button';
    hintButtonEl.dataset['hintsLeft'] = `${INITIAL_HINTS}`;
    gameStatusSpan.appendChild(hintButtonEl);
    gameStatusEl.appendChild(gameStatusSpan);
    layoutEl.appendChild(gameStatusEl);
    // Total Score
    const totalScoreEl = document.createElement('span');
    totalScoreEl.id = 'total-score';
    layoutEl.appendChild(totalScoreEl);
    // Add the layout to the app element
    appEl.appendChild(layoutEl);
    let hintsRemaining = INITIAL_HINTS; // Number of hints allowed in a level
    function gameOver() {
        return model.gameOverReason !== "";
    }
    let model = { deck: [], candidateWord: "", gameOverReason: "", penalty: 0, totalScore: 0, streakOfFives: 0 };
    function numDeckTiles() {
        return [...deckEl.children].reduce((sum, col) => sum + col.children.length, 0);
    }
    function getTotalValueOfTiles(tileEls) {
        return tileEls.reduce((sum, tileEl) => {
            const value = parseInt(tileEl.dataset['value'] || "0", 10);
            return sum + value;
        }, 0);
    }
    function deckTiles() {
        return [...deckEl.children].reduce((tiles, col) => {
            return tiles.concat([...col.children]);
        }, []);
    }
    function stockTiles() {
        return [...stockEl.children];
    }
    function wordTiles() {
        return [...wordEl.children];
    }
    function getTileElementColumn(tileEl) {
        return parseInt(tileEl.dataset['column'] || "0", 10);
    }
    function setTileElementColumn(tileEl, column) {
        tileEl.dataset['column'] = `${column}`;
    }
    async function moveTile(tileEl, durationMs = 300) {
        const tileCol = getTileElementColumn(tileEl);
        const columnEl = deckEl.children[tileCol];
        const parent = tileEl.parentElement;
        const newParent = parent.className.includes('column') ? wordEl : columnEl; // If it's a column, move to deck, otherwise stay in parent
        const tilesToAnimate = [...columnEl.children, tileEl];
        return FLIP(tilesToAnimate, () => { newParent.appendChild(tileEl); }, durationMs);
    }
    async function onTileTouched(e) {
        e.preventDefault();
        e.stopPropagation();
        const el = e.target;
        const parent = el.parentElement;
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
    const toProperCase = (word) => {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    };
    const isProperCase = (word) => {
        // Check if the first letter is uppercase and the rest are lowercase
        return word.length > 0 && word[0] === word[0].toUpperCase() && word.slice(1) === word.slice(1).toLowerCase();
    };
    const dictionaryLookup = (word, lexicon, sw = false) => {
        // if (word.length < MIN_WORD_LENGTH) {
        //     // console.log(`dictionaryLookup: word "${word}" is too short`);
        //     return undefined; // Ignore words shorter than MIN_WORD_LENGTH
        // }
        // Convert pattern to a regex: replace ? with .
        // Commented out is case-insensitive version (allowing Proper nouns)
        // const regex = new RegExp('^' + word.replace(/\?/g, '.') + '$', 'i');
        const foundInLexicon = sw ? startsWith(word, lexicon) : isWord(word, lexicon);
        if (foundInLexicon) {
            const regex = new RegExp('^' + word.replace(/\?/g, '[a-z]') + (sw ? '' : '$'));
            // console.log(`dictionaryLookup ${startsWith ? 'startsWith' : 'exact'} regex:`, regex);
            // Will always succeed, because the trie is built from the word list and we check for existence first
            const match = WordList95.find(word => regex.test(word));
            // console.log(`dictionaryLookup ${startsWith ? 'startsWith' : 'exact'}`, word, "=>", match);
            return match;
        }
        if (ALLOW_PROPER_NOUNS && !isProperCase(word)) {
            return dictionaryLookup(toProperCase(word), lexicon, sw); // Try with first letter capitalized
        }
        return undefined;
    };
    return new Promise((resolve) => {
        /**
         * Enumerate all possible "plays" starting from startingWord,
         * by recursively popping from non-empty stacks, allowing blank tiles ("?" or " ") as wildcards.
         * Each play records both the resulting word and the sequence of stacks used to build it.
         */
        function enumeratePlays(startingWord = "xyz", returnFirstWordFound = false, lexicon = LEXICON_SMALL, grid = model.deck, minWordLength = MIN_WORD_LENGTH, maxDepth = MAX_WORD_LENGTH_FOR_SEARCH) {
            const plays = [];
            function backtrack(word, stacks, path) {
                // Prune search if prefix is invalid
                if (!startsWith(word, lexicon))
                    return;
                // If it's a valid word and long enough, record it
                if (word.length >= minWordLength && isWord(word, lexicon)) {
                    plays.push({ word, fromStack: [...path] });
                    if (returnFirstWordFound) {
                        // If we only want the first valid word, return immediately
                        return plays;
                    }
                }
                // Avoid runaway recursion
                if (word.length >= maxDepth)
                    return;
                // Try popping from each non-empty stack
                for (let i = 0; i < stacks.length; ++i) {
                    if (stacks[i].length === 0)
                        continue;
                    // Copy stacks to avoid mutation
                    const newStacks = stacks.map(arr => arr.slice());
                    const letter = newStacks[i].pop();
                    if (letter === "?" || letter === " ") {
                        // Try every letter for a blank
                        for (const ch of "abcdefghijklmnopqrstuvwxyz") {
                            backtrack(word + ch, newStacks, [...path, i]);
                        }
                    }
                    else {
                        backtrack(word + letter, newStacks, [...path, i]);
                    }
                }
            }
            backtrack(startingWord, grid, []);
            return plays;
        }
        function noMorePlays(fromWord) {
            return enumeratePlays(fromWord, true).length == 0;
        }
        const updateModelFromDOM = () => {
            model.gameOverReason = ""; // Reset the game over reason
            model.deck = [];
            /* for every column, add a new array to the model */
            for (let c = 0; c < COLS; ++c) {
                model.deck[c] = [];
                // for every tile in the column, add the letter to the model
                deckEl.querySelectorAll(`.scrabble-tile[data-column="${c}"]`).forEach(tileEl => {
                    model.deck[c].push(getTileElementLetter(tileEl).toLowerCase());
                });
            }
            if (noMorePlays("") && wordTiles().length === 0) {
                model.gameOverReason = "no more plays";
                // get the total value of all remaining tiles
                const penaltyTiles = INFINITE_GAME ? [...wordTiles(), ...deckTiles()] : [...stockTiles(), ...wordTiles(), ...deckTiles()];
                model.penalty = getTotalValueOfTiles(penaltyTiles);
            }
            // Get the candidate word from the wordEl
            model.candidateWord = candidateWord();
            return model;
        };
        async function hintButtonElClicked(e) {
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
            if (hintsRemaining <= 0) {
                await playSoundEffect("undo");
            }
            else {
                --hintsRemaining;
                while (wordEl.lastChild) {
                    const el = wordEl.lastChild;
                    moveTile(el);
                }
                updateModelFromDOM();
                const plays = enumeratePlays("");
                console.log(plays);
                hintButtonEl.dataset['hintsLeft'] = `${hintsRemaining}`;
                const bestPlay = plays
                    .map(play => ({ ...play, score: scoreWord(play.word) }))
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
        hintButtonEl.removeEventListener('click', hintButtonElClicked);
        hintButtonEl.addEventListener('click', hintButtonElClicked);
        const submitButtonElClicked = async (e) => {
            // Only allow submitting if the current word is valid, or if letters can be added to it to make a valid word
            if (!submitButtonEl.classList.contains('is-word') || submitButtonEl.classList.contains('cant-make-a-word')) {
                playSoundEffect("undo");
                return;
            }
            // From copilot
            // Track streak of consecutive 5+ letter words
            if (model.candidateWord.length >= 5) {
                model.streakOfFives++;
                console.log(model.candidateWord, "-> Streak of fives increased", model.streakOfFives);
                if (model.streakOfFives === 5) {
                    ++hintsRemaining;
                    model.streakOfFives = 0; // Reset streak after bonus
                    hintButtonEl.dataset['hintsLeft'] = `${hintsRemaining}`;
                    hintButtonEl.classList.remove('hidden');
                }
            }
            else {
                model.streakOfFives = 0;
            }
            // end from copilot
            resetTimerBar();
            const score = parseInt(submitButtonEl.innerText, 10);
            model.totalScore += score;
            const soundToPlay = score >= 50 ? "excellent" : score >= 50 ? "good" : score >= 10 ? "ok" : "selected3";
            playSoundEffect(soundToPlay);
            // move all tiles in the wordElement to the stockElement
            while (wordEl.firstChild) {
                const el = wordEl.firstChild;
                if (el.classList.contains('substituted')) {
                    el.innerText = " "; // Change back to a blank tile
                    el.classList.remove('substituted'); // Remove any substitution class
                }
                if (INFINITE_GAME) {
                    stockEl.insertBefore(el, stockEl.firstChild);
                    // stockEl.appendChild(el);
                }
                else {
                    el.remove();
                }
                // If the word has too low a score, we keep dealing.
                // if (score < MIN_SCORE_FOR_REMOVAL)
                dealTileFromStock();
            }
        };
        /// This can only be called if there's a valid word in the wordEl, otherwise the submitButtonEl will  not be visible
        submitButtonEl.removeEventListener('click', submitButtonElClicked);
        submitButtonEl.addEventListener('click', submitButtonElClicked);
        new MutationObserver((mutationList) => {
            mutationList.forEach(mutation => {
                if (mutation.type === 'childList') {
                    // console.log(' Tiles added or removed:', mutation);
                    onViewChanged();
                }
            });
        }).observe(wordEl, { childList: true, subtree: false });
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
        const scoreWord = (word) => {
            // calculate score by summing the values of the letters in the word
            let score = Array.from(word).reduce((acc, letter) => {
                return acc + (scrabbleData[letter.toUpperCase()]?.value || 0);
            }, 0);
            if (word.length >= LENGTH_5X_WORD_SCORE) {
                score *= 5; // Bonus for long words
            }
            else if (word.length >= LENGTH_TRIPLE_WORD_SCORE) {
                score *= 3; // Bonus for long words
            }
            if (word.length >= LENGTH_FIFTY_BONUS) {
                score += 50; // Bonus for long words
            }
            return score;
        };
        const onViewChanged = () => {
            updateModelFromDOM();
            const candidate = candidateWord();
            let foundWord = "";
            let isObscure = false;
            let isStartOfSomeWord = false;
            let isAWord = candidate.length >= MIN_WORD_LENGTH && isWord(candidate, LEXICON_SMALL);
            if (!isAWord) {
                isAWord = candidate.length >= MIN_WORD_LENGTH && isWord(candidate, LEXICON_LARGE);
                if (isAWord)
                    isObscure = true;
            }
            const lexicon = isObscure ? LEXICON_LARGE : LEXICON_SMALL;
            if (!isAWord) { // perhaps it's the start of a word?
                isStartOfSomeWord = startsWith(candidate, lexicon);
            }
            foundWord = dictionaryLookup(candidate, lexicon, isStartOfSomeWord) || ""; // Dictionary lookup always succeed, because we check for existence first
            const score = scoreWord(candidate);
            submitButtonEl.innerText = `${score}`;
            bonusBadgeEl.innerText = "";
            bonusBadgeEl.className = "hidden";
            submitButtonEl.className = 'submit-button'; // Reset tick element class
            if (!isAWord && !isStartOfSomeWord) {
                submitButtonEl.classList.add('cant-make-a-word');
            }
            // Allow cheat only if the candidate word is not valid
            // if (!isAWord && hintsRemaining > 0 && !noMorePlays(candidate)) {
            //     hintButtonEl.classList.remove('hidden');
            // } else {
            //     hintButtonEl.classList.add('hidden');
            // }
            if (isAWord) {
                submitButtonEl.classList.add('is-word');
                if (foundWord.length >= LENGTH_5X_WORD_SCORE) {
                    bonusBadgeEl.innerText += "x5!!!";
                    bonusBadgeEl.classList.add('x5');
                    // playSoundEffect("excellent");
                }
                else if (foundWord.length >= LENGTH_TRIPLE_WORD_SCORE) {
                    bonusBadgeEl.innerText += "x3!!";
                    bonusBadgeEl.classList.add('x3');
                }
                if (foundWord.length >= LENGTH_FIFTY_BONUS) {
                    bonusBadgeEl.innerText += " +50!";
                    bonusBadgeEl.classList.add('starburst');
                }
            }
            // If there are no more tiles remaining, we can submit the "word" even if it's not a valid word, but the score will be negative
            const doSubstitution = isAWord;
            // find all the indexes in the candidate word of "?"
            const blankIndexes = candidate.split('').reduce((acc, letter, index) => {
                if (letter === '?') {
                    acc.push(index);
                }
                return acc;
            }, []);
            if (blankIndexes.length > 0) {
                for (const index of blankIndexes) {
                    // replace the ? with the letter from the found word
                    const letter = foundWord[index];
                    const tileEl = wordEl.children[index];
                    if (doSubstitution) {
                        // Don't set the data-letter attribute, otherwise it will be considered a  letter tile
                        tileEl.innerText = letter.toUpperCase();
                        tileEl.classList.add('substituted');
                    }
                    else {
                        tileEl.innerText = " "; // Change back to a blank tile
                        tileEl.classList.remove('substituted'); // Remove any substitution class
                    }
                }
            }
            if (gameOver() && !isAWord) {
                resolve(model);
                return;
            }
            totalScoreEl.innerText = `${model.totalScore}`; // Update total score
        };
        const getLastColumnTile = (c) => {
            const el = deckEl.children[c].lastElementChild;
            return el ? el : undefined;
        };
        const getTileElementLetter = (tileEl) => {
            return tileEl.dataset['letter'];
        };
        async function dealTileFromStock() {
            // Get the first child of the stock element
            const tileToDeal = stockEl.lastElementChild;
            if (!tileToDeal) {
                // console.warn("No tiles left in stock to deal.");
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
        function initialDeal(numberToDeal = INITIAL_DEAL_TILES) {
            for (let i = 0; i < numberToDeal; ++i) {
                dealTileFromStock();
            }
        }
        const resetTimerBar = () => {
            const onBarEnd = () => {
                model.gameOverReason = "timeout";
                resolve(model);
            };
            const fill = document.querySelector('.timer-fill');
            fill.removeEventListener('animationend', onBarEnd);
            fill.style.animation = '';
            void fill.offsetWidth;
            fill.classList.remove('animate');
            void fill.offsetWidth;
            fill.classList.add('animate');
            fill.addEventListener('animationend', onBarEnd, { once: true });
            // fill.addEventListener('animationend', () => alert("Foo"), {once: true});
        };
        const setTimerBarTransitionTime = (milliSeconds) => {
            document.documentElement.style.setProperty('--TRANSITION_TIME', `${milliSeconds / 1000}s`);
        };
        initialDeal();
        setTimerBarTransitionTime(TIMER_BAR_DURATION);
        resetTimerBar();
        // Initialize score
        onViewChanged();
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
    // console.log("Elapsed since last call :", (ctx.currentTime - ctxLastTime).toFixed(1) + "s");
    ctxLastTime = ctx.currentTime;
    src.connect(ctx.destination);
    src.start();
    // console.log("started playing audio buffer", buffer);
    return new Promise((resolve) => {
        src.onended = () => {
            // console.log("onended playing audio buffer", buffer);
            src.disconnect(ctx.destination); // Disconnect after playback
            resolve();
        };
    });
}
async function playSoundEffect(name) {
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
// 1) Define your levels in one place:
let COLS = 7; // Number of columns in the game grid
let INITIAL_DEAL_TILES = 49; // Number of tiles to deal at the start of the game
let MIN_WORD_LENGTH = 2; // Minimum word length allowed
let MAX_WORD_LENGTH_FOR_SEARCH = 10; // Maximum word length allowed for search (== search-depth during dfs)
let MIN_SCORING_WORD_LENGTH = 3; // Minimum word length to score
let MIN_SCORE_FOR_REMOVAL = 10; // Minimum score to you need to achieve to remove tiles from the board
let INITIAL_HINTS = 0; // Initial number of hints in a level
let LENGTH_FIFTY_BONUS = 7; // Bonus for words of length 7 or more
let LENGTH_TRIPLE_WORD_SCORE = 9; // Bonus for words of length 10 or more
let LENGTH_5X_WORD_SCORE = 10; // Bonus for words of length 10 or more
let TIMER_BAR_DURATION = 600_000; // Duration of the timer bar animation in milliseconds
const LEXICON_LARGE = LEXICON95; // Use the 95 lexicon for obscure word validation
const LEXICON_SMALL = LEXICON40; // Use the 40 lexicon for word validation
let ALLOW_PROPER_NOUNS = false; // Whether to allow proper nouns in the game
let INFINITE_GAME = false; // If true, tiles are recycled to the stock when the player finishes a word, otherwise the game ends when all tiles are used up
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
// Show options panel before starting game loop
async function showOptionsPanel() {
    return new Promise(resolve => {
        const panel = document.getElementById('game-options-panel');
        panel.style.display = '';
        const form = document.getElementById('game-options-form');
        form.onsubmit = function (e) {
            e.preventDefault();
            // Update game settings from form fields
            // LEXICON = form.BIG_DIC.checked ? LEXICON95 : LEXICON40;
            ALLOW_PROPER_NOUNS = form.ALLOW_PROPER_NOUNS.checked;
            COLS = parseInt(form.COLS.value, 10);
            INITIAL_DEAL_TILES = parseInt(form.INITIAL_DEAL_TILES.value, 10);
            MIN_WORD_LENGTH = parseInt(form.MIN_WORD_LENGTH.value, 10);
            MAX_WORD_LENGTH_FOR_SEARCH = parseInt(form.MAX_WORD_LENGTH_FOR_SEARCH.value, 10);
            MIN_SCORING_WORD_LENGTH = parseInt(form.MIN_SCORING_WORD_LENGTH.value, 10);
            MIN_SCORE_FOR_REMOVAL = parseInt(form.MIN_SCORING_SCORE.value, 10);
            INITIAL_HINTS = parseInt(form.INITIAL_HINTS.value, 10);
            LENGTH_FIFTY_BONUS = parseInt(form.LENGTH_FIFTY_BONUS.value, 10);
            LENGTH_TRIPLE_WORD_SCORE = parseInt(form.LENGTH_TRIPLE_WORD_SCORE.value, 10);
            LENGTH_5X_WORD_SCORE = parseInt(form.LENGTH_5X_WORD_SCORE.value, 10);
            TIMER_BAR_DURATION = parseInt(form.TIMER_BAR_DURATION.value, 10) * 1000; // Convert seconds to milliseconds
            panel.style.display = 'none';
            resolve();
        };
    });
}
(async () => {
    // Init audio
    SoundEffect["selected"] = getBlip(1000, 0.01, 0.03);
    SoundEffect["selected2"] = getBlip(1250, 0.01, 0.03);
    SoundEffect["selected3"] = getBlip(1500, 0.01, 0.03);
    SoundEffect["undo"] = getBlip(200, 0.01, 0.05);
    SoundEffect["good"] = await getAudioBufferFromFile('assets/audio/match_good.mp3');
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
    oscTick.frequency.value = ctx.sampleRate / 2 - 2; // Just below nyquist frequency
    oscTick.connect(ctx.destination);
    oscTick.start();
    await showOptionsPanel();
    for (;;) {
        const gameState = await level();
        let levelScore = gameState.totalScore;
        let message = `You scored: ${levelScore}<br>`;
        switch (gameState.gameOverReason) {
            case "no more plays":
                message = "<p>No more words can be made from the remaining tiles.</p>";
                if (gameState.penalty == 0) {
                    levelScore += 200; // Bonus for clearing the board
                    await playSoundEffect("excellent"); // Cleared the board, so play an excellent sound
                    message += "+ 200 point bonus for clearing the deck!<br>";
                }
                else {
                    message += `Minus remaining tiles: ${gameState.penalty}<br>`;
                    levelScore -= gameState.penalty; // Subtract penalty for remaining tiles
                }
                break;
            case "timeout":
                message = "Timed out! No score for you!<br>";
                levelScore = 0;
        }
        message += `<br>Total score: ${levelScore}<br>`;
        await showModalDialog(message);
    }
})();
//# sourceMappingURL=index.js.map