(() => {
    "use strict";

    const MIN_NUMBER = 1;
    const MAX_NUMBER = 100;

    const state = {
        secretNumber: 0,
        attempts: 0,
        roundsWon: 0,
        bestScore: null,
        lowBound: MIN_NUMBER,
        highBound: MAX_NUMBER,
        lastGuess: null,
        active: true,
        history: []
    };

    const elements = {
        form: document.getElementById("guess-form"),
        input: document.getElementById("guess-input"),
        guessButton: document.getElementById("guess-button"),
        message: document.getElementById("message"),
        rangeWindow: document.getElementById("range-window"),
        guessMarker: document.getElementById("guess-marker"),
        boundsLabel: document.getElementById("bounds-label"),
        attemptsValue: document.getElementById("attempts-value"),
        roundsValue: document.getElementById("rounds-value"),
        bestValue: document.getElementById("best-value"),
        historyList: document.getElementById("history-list"),
        newRoundButton: document.getElementById("new-round"),
        resetStatsButton: document.getElementById("reset-stats")
    };

    function randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function percentFor(value) {
        return ((value - MIN_NUMBER) / (MAX_NUMBER - MIN_NUMBER)) * 100;
    }

    function setMessage(text, tone) {
        elements.message.textContent = text;
        elements.message.className = `message ${tone}`;
    }

    function renderRange() {
        const left = percentFor(state.lowBound);
        const right = percentFor(state.highBound);
        const width = Math.max(right - left, 2);

        elements.rangeWindow.style.left = `${clamp(left, 0, 100 - width)}%`;
        elements.rangeWindow.style.width = `${width}%`;
        elements.boundsLabel.textContent = `Current range: ${state.lowBound}-${state.highBound}`;

        if (state.lastGuess === null) {
            elements.guessMarker.classList.remove("visible");
            return;
        }

        elements.guessMarker.style.left = `${clamp(percentFor(state.lastGuess), 0, 100)}%`;
        elements.guessMarker.classList.add("visible");
    }

    function renderHistory() {
        elements.historyList.replaceChildren();

        state.history.forEach((entry) => {
            const item = document.createElement("li");
            const value = document.createElement("span");
            const result = document.createElement("span");

            item.className = `history-item ${entry.tone}`;
            value.textContent = entry.guess;
            result.textContent = entry.label;

            item.append(value, result);
            elements.historyList.append(item);
        });
    }

    function renderStats() {
        elements.attemptsValue.textContent = state.attempts;
        elements.roundsValue.textContent = state.roundsWon;
        elements.bestValue.textContent = state.bestScore === null ? "-" : state.bestScore;
    }

    function render() {
        renderRange();
        renderStats();
        renderHistory();

        elements.input.disabled = !state.active;
        elements.guessButton.disabled = !state.active;
    }

    function startRound() {
        state.secretNumber = randomBetween(MIN_NUMBER, MAX_NUMBER);
        state.attempts = 0;
        state.lowBound = MIN_NUMBER;
        state.highBound = MAX_NUMBER;
        state.lastGuess = null;
        state.active = true;
        state.history = [];

        elements.input.value = "";
        setMessage(`Pick a number from ${MIN_NUMBER} to ${MAX_NUMBER}.`, "neutral");
        render();
        elements.input.focus();
    }

    function resetStats() {
        state.roundsWon = 0;
        state.bestScore = null;
        startRound();
    }

    function recordGuess(guess, label, tone) {
        state.history.unshift({ guess, label, tone });
    }

    function handleCorrectGuess(guess) {
        state.roundsWon++;
        state.bestScore = state.bestScore === null
            ? state.attempts
            : Math.min(state.bestScore, state.attempts);
        state.active = false;
        state.lowBound = guess;
        state.highBound = guess;
        recordGuess(guess, "correct", "win");
        setMessage(
            `Correct! You guessed the number in ${state.attempts} attempt${state.attempts === 1 ? "" : "s"}.`,
            "win"
        );
    }

    function handleGuess(event) {
        event.preventDefault();

        if (!state.active) {
            return;
        }

        const rawGuess = elements.input.value.trim();

        if (!/^-?\d+$/.test(rawGuess)) {
            setMessage("Please enter a whole number.", "error");
            elements.input.select();
            return;
        }

        const guess = Number(rawGuess);

        if (guess < MIN_NUMBER || guess > MAX_NUMBER) {
            setMessage(`Please choose a number from ${MIN_NUMBER} to ${MAX_NUMBER}.`, "error");
            elements.input.select();
            return;
        }

        state.attempts++;
        state.lastGuess = guess;

        if (guess < state.secretNumber) {
            state.lowBound = Math.max(state.lowBound, guess + 1);
            recordGuess(guess, "too low", "low");
            setMessage("Too low. Try again.", "low");
        } else if (guess > state.secretNumber) {
            state.highBound = Math.min(state.highBound, guess - 1);
            recordGuess(guess, "too high", "high");
            setMessage("Too high. Try again.", "high");
        } else {
            handleCorrectGuess(guess);
        }

        elements.input.value = "";
        render();

        if (state.active) {
            elements.input.focus();
        }
    }

    elements.form.addEventListener("submit", handleGuess);
    elements.newRoundButton.addEventListener("click", startRound);
    elements.resetStatsButton.addEventListener("click", resetStats);

    startRound();
})();
