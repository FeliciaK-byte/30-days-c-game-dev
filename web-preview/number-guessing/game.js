(() => {
    "use strict";

    const STORAGE_KEY = "number-guessing-preview-player-v3";
    const DIFFICULTIES = {
        easy: { label: "Easy", min: 1, max: 50, attempts: 8 },
        normal: { label: "Normal", min: 1, max: 100, attempts: 7 },
        hard: { label: "Hard", min: 1, max: 500, attempts: 9 }
    };

    const defaultProfile = {
        name: "Guest",
        email: ""
    };

    function freshStats() {
        return {
            totalPlayed: 0,
            totalWon: 0,
            totalLost: 0,
            bestScores: {
                easy: null,
                normal: null,
                hard: null
            },
            lastDifficulty: "easy",
            limitedAttempts: true
        };
    }

    const savedData = loadSavedData();

    const state = {
        stats: savedData ? mergeStats(savedData.stats) : freshStats(),
        profile: savedData ? { ...defaultProfile, ...savedData.profile } : { ...defaultProfile },
        saveData: savedData ? savedData.saveData : false,
        difficultyKey: "easy",
        secretNumber: 0,
        attempts: 0,
        lowBound: 1,
        highBound: 50,
        lastGuess: null,
        previousDistance: null,
        active: true,
        gameStarted: false,
        history: []
    };

    const elements = {
        loginView: document.getElementById("login-view"),
        gameView: document.getElementById("game-view"),
        loginForm: document.getElementById("login-form"),
        playerNameInput: document.getElementById("player-name"),
        playerEmailInput: document.getElementById("player-email"),
        loginSaveToggle: document.getElementById("login-save-toggle"),
        loginSaveLabel: document.getElementById("login-save-label"),
        guestButton: document.getElementById("guest-button"),
        form: document.getElementById("guess-form"),
        input: document.getElementById("guess-input"),
        guessButton: document.getElementById("guess-button"),
        message: document.getElementById("message"),
        rangeWindow: document.getElementById("range-window"),
        guessMarker: document.getElementById("guess-marker"),
        minLabel: document.getElementById("min-label"),
        maxLabel: document.getElementById("max-label"),
        boundsLabel: document.getElementById("bounds-label"),
        attemptsValue: document.getElementById("attempts-value"),
        remainingValue: document.getElementById("remaining-value"),
        roundsValue: document.getElementById("rounds-value"),
        bestValue: document.getElementById("best-value"),
        totalValue: document.getElementById("total-value"),
        historyList: document.getElementById("history-list"),
        newRoundButton: document.getElementById("new-round"),
        resetStatsButton: document.getElementById("reset-stats"),
        modeButtons: document.querySelectorAll("[data-difficulty]"),
        limitedToggle: document.getElementById("limited-toggle"),
        limitLabel: document.getElementById("limit-label"),
        roundSummary: document.getElementById("round-summary"),
        summaryTitle: document.getElementById("summary-title"),
        summaryCopy: document.getElementById("summary-copy"),
        summaryNext: document.getElementById("summary-next"),
        playerNameValue: document.getElementById("player-name-value"),
        playerEmailValue: document.getElementById("player-email-value"),
        saveDataToggle: document.getElementById("save-data-toggle"),
        saveStatusValue: document.getElementById("save-status-value"),
        saveNowButton: document.getElementById("save-now"),
        editDetailsButton: document.getElementById("edit-details"),
        clearDataButton: document.getElementById("clear-data")
    };

    function mergeStats(stats) {
        const clean = freshStats();

        if (!stats || typeof stats !== "object") {
            return clean;
        }

        return {
            ...clean,
            ...stats,
            bestScores: {
                ...clean.bestScores,
                ...(stats.bestScores || {})
            },
            lastDifficulty: DIFFICULTIES[stats.lastDifficulty] ? stats.lastDifficulty : clean.lastDifficulty,
            limitedAttempts: typeof stats.limitedAttempts === "boolean"
                ? stats.limitedAttempts
                : clean.limitedAttempts
        };
    }

    function loadSavedData() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

            if (!saved || typeof saved !== "object" || saved.saveData !== true) {
                return null;
            }

            return {
                profile: saved.profile || {},
                stats: saved.stats || {},
                saveData: true
            };
        } catch {
            return null;
        }
    }

    function persistData() {
        try {
            if (!state.saveData) {
                localStorage.removeItem(STORAGE_KEY);
                return;
            }

            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                profile: state.profile,
                stats: state.stats,
                saveData: true
            }));
        } catch {
            state.saveData = false;
        }
    }

    function difficulty() {
        return DIFFICULTIES[state.difficultyKey];
    }

    function maxAttempts() {
        return state.stats.limitedAttempts ? difficulty().attempts : Infinity;
    }

    function attemptsRemaining() {
        const limit = maxAttempts();
        return Number.isFinite(limit) ? Math.max(limit - state.attempts, 0) : "No limit";
    }

    function randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function percentFor(value) {
        const mode = difficulty();
        return ((value - mode.min) / (mode.max - mode.min)) * 100;
    }

    function plural(value, one, many) {
        return value === 1 ? one : many;
    }

    function setMessage(text, tone) {
        elements.message.textContent = text;
        elements.message.className = `message ${tone}`;
    }

    function profileName() {
        const name = state.profile.name.trim();
        return name.length > 0 ? name : "Guest";
    }

    function syncDetailsForm() {
        elements.playerNameInput.value = state.profile.name === "Guest" ? "" : state.profile.name;
        elements.playerEmailInput.value = state.profile.email;
        elements.loginSaveToggle.checked = state.saveData;
        elements.loginSaveLabel.textContent = state.saveData ? "On" : "Off";
    }

    function showLoginView() {
        syncDetailsForm();
        elements.gameView.classList.add("hidden");
        elements.loginView.classList.remove("hidden");
        elements.playerNameInput.focus();
    }

    function showGameView() {
        state.gameStarted = true;
        elements.loginView.classList.add("hidden");
        elements.gameView.classList.remove("hidden");
        startRound();
    }

    function renderModes() {
        elements.modeButtons.forEach((button) => {
            const isActive = button.dataset.difficulty === state.difficultyKey;
            button.classList.toggle("active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
        });
    }

    function renderRange() {
        const mode = difficulty();
        const left = percentFor(state.lowBound);
        const right = percentFor(state.highBound);
        const width = Math.max(right - left, 2);

        elements.minLabel.textContent = mode.min;
        elements.maxLabel.textContent = mode.max;
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
        const bestScore = state.stats.bestScores[state.difficultyKey];

        elements.attemptsValue.textContent = state.attempts;
        elements.remainingValue.textContent = attemptsRemaining();
        elements.roundsValue.textContent = state.stats.totalWon;
        elements.bestValue.textContent = bestScore === null ? "-" : bestScore;
        elements.totalValue.textContent = state.stats.totalPlayed;
        elements.limitLabel.textContent = state.stats.limitedAttempts ? difficulty().attempts : "Off";
        elements.playerNameValue.textContent = profileName();
        elements.playerEmailValue.textContent = state.profile.email || "-";
        elements.saveStatusValue.textContent = state.saveData ? "On" : "Off";
    }

    function renderControls() {
        const mode = difficulty();

        elements.input.min = mode.min;
        elements.input.max = mode.max;
        elements.input.placeholder = `${mode.min}-${mode.max}`;
        elements.input.disabled = !state.active;
        elements.guessButton.disabled = !state.active;
        elements.limitedToggle.checked = state.stats.limitedAttempts;
        elements.saveDataToggle.checked = state.saveData;
        elements.loginSaveToggle.checked = state.saveData;
        elements.loginSaveLabel.textContent = state.saveData ? "On" : "Off";
    }

    function render() {
        renderModes();
        renderRange();
        renderStats();
        renderHistory();
        renderControls();
    }

    function resetRoundState() {
        const mode = difficulty();

        state.secretNumber = randomBetween(mode.min, mode.max);
        state.attempts = 0;
        state.lowBound = mode.min;
        state.highBound = mode.max;
        state.lastGuess = null;
        state.previousDistance = null;
        state.active = true;
        state.history = [];
        elements.input.value = "";
        elements.roundSummary.classList.add("hidden");
        setMessage(`Pick a number from ${mode.min} to ${mode.max}.`, "neutral");
    }

    function startRound() {
        resetRoundState();
        render();
        elements.input.focus();
    }

    function resetStats() {
        state.stats = freshStats();
        state.stats.lastDifficulty = state.difficultyKey;
        state.stats.limitedAttempts = elements.limitedToggle.checked;
        persistData();
        startRound();
    }

    function recordGuess(guess, label, tone) {
        state.history.unshift({ guess, label, tone });
    }

    function feedbackFor(guess) {
        const distance = Math.abs(state.secretNumber - guess);

        if (state.previousDistance === null) {
            state.previousDistance = distance;
            return distance <= Math.ceil((difficulty().max - difficulty().min) * 0.1)
                ? "Close first guess."
                : `Range narrowed to ${state.lowBound}-${state.highBound}.`;
        }

        const feedback = distance < state.previousDistance
            ? "Getting warmer."
            : distance > state.previousDistance
                ? "Getting colder."
                : "Same distance as your last guess.";

        state.previousDistance = distance;
        return feedback;
    }

    function finishRound(won) {
        const mode = difficulty();
        const resultText = won ? "won" : "lost";

        state.active = false;
        state.stats.totalPlayed++;
        state.stats.totalWon += won ? 1 : 0;
        state.stats.totalLost += won ? 0 : 1;

        if (won
            && (state.stats.bestScores[state.difficultyKey] === null
                || state.attempts < state.stats.bestScores[state.difficultyKey])) {
            state.stats.bestScores[state.difficultyKey] = state.attempts;
        }

        state.stats.lastDifficulty = state.difficultyKey;
        persistData();

        const updatedBest = state.stats.bestScores[state.difficultyKey];
        const bestText = updatedBest === null
            ? "No best score yet."
            : `Best ${mode.label} score: ${updatedBest} ${plural(updatedBest, "guess", "guesses")}.`;

        elements.summaryTitle.textContent = won ? "Round won" : "Round lost";
        elements.summaryCopy.textContent = `${mode.label} mode, secret number ${state.secretNumber}, ${state.attempts} ${plural(state.attempts, "attempt", "attempts")} used, ${resultText}. ${bestText}`;
        elements.roundSummary.classList.remove("hidden");
    }

    function handleCorrectGuess(guess) {
        state.lowBound = guess;
        state.highBound = guess;
        recordGuess(guess, "correct", "win");
        setMessage(
            `Correct! You guessed the number in ${state.attempts} ${plural(state.attempts, "attempt", "attempts")}.`,
            "win"
        );
        finishRound(true);
    }

    function handleMiss(guess) {
        const limit = maxAttempts();
        const label = guess < state.secretNumber ? "too low" : "too high";

        if (guess < state.secretNumber) {
            state.lowBound = Math.max(state.lowBound, guess + 1);
        } else {
            state.highBound = Math.min(state.highBound, guess - 1);
        }

        const feedback = feedbackFor(guess);
        const remaining = attemptsRemaining();
        const limitText = Number.isFinite(limit)
            ? `${remaining} ${plural(remaining, "attempt", "attempts")} remaining.`
            : "Unlimited attempts.";

        recordGuess(guess, label, label === "too low" ? "low" : "high");
        setMessage(`${label === "too low" ? "Too low" : "Too high"}. ${feedback} ${limitText}`, label === "too low" ? "low" : "high");

        if (Number.isFinite(limit) && state.attempts >= limit) {
            recordGuess(state.secretNumber, "secret", "error");
            setMessage(`Out of attempts. The secret number was ${state.secretNumber}.`, "error");
            finishRound(false);
        }
    }

    function handleGuess(event) {
        event.preventDefault();

        if (!state.active) {
            return;
        }

        const mode = difficulty();
        const rawGuess = elements.input.value.trim();

        if (!/^-?\d+$/.test(rawGuess)) {
            setMessage("Please enter a whole number.", "error");
            elements.input.select();
            return;
        }

        const guess = Number(rawGuess);

        if (guess < mode.min || guess > mode.max) {
            setMessage(`Please choose a number from ${mode.min} to ${mode.max}.`, "error");
            elements.input.select();
            return;
        }

        state.attempts++;
        state.lastGuess = guess;

        if (guess === state.secretNumber) {
            handleCorrectGuess(guess);
        } else {
            handleMiss(guess);
        }

        elements.input.value = "";
        render();

        if (state.active) {
            elements.input.focus();
        }
    }

    function selectDifficulty(key) {
        if (!DIFFICULTIES[key]) {
            return;
        }

        state.difficultyKey = key;
        state.stats.lastDifficulty = key;
        persistData();
        startRound();
    }

    function toggleLimitedAttempts() {
        state.stats.limitedAttempts = elements.limitedToggle.checked;
        persistData();
        startRound();
    }

    function updateProfileFromForm(saveData) {
        const name = elements.playerNameInput.value.trim();
        const email = elements.playerEmailInput.value.trim();

        state.profile = {
            name: name.length > 0 ? name : "Guest",
            email
        };
        state.saveData = saveData;
        persistData();
    }

    function handleLogin(event) {
        event.preventDefault();
        updateProfileFromForm(elements.loginSaveToggle.checked);
        showGameView();
    }

    function continueAsGuest() {
        state.profile = { ...defaultProfile };
        state.saveData = false;
        persistData();
        showGameView();
    }

    function toggleSaveData() {
        state.saveData = elements.saveDataToggle.checked;
        persistData();
        render();
    }

    function saveNow() {
        state.saveData = true;
        persistData();
        render();
        setMessage("Player details and stats saved on this device.", "neutral");
    }

    function clearSavedData() {
        state.profile = { ...defaultProfile };
        state.saveData = false;
        state.stats = freshStats();
        localStorage.removeItem(STORAGE_KEY);
        render();
        startRound();
    }

    state.difficultyKey = DIFFICULTIES[state.stats.lastDifficulty]
        ? state.stats.lastDifficulty
        : "easy";

    elements.loginForm.addEventListener("submit", handleLogin);
    elements.guestButton.addEventListener("click", continueAsGuest);
    elements.loginSaveToggle.addEventListener("change", () => {
        elements.loginSaveLabel.textContent = elements.loginSaveToggle.checked ? "On" : "Off";
    });
    elements.form.addEventListener("submit", handleGuess);
    elements.newRoundButton.addEventListener("click", startRound);
    elements.summaryNext.addEventListener("click", startRound);
    elements.resetStatsButton.addEventListener("click", resetStats);
    elements.limitedToggle.addEventListener("change", toggleLimitedAttempts);
    elements.saveDataToggle.addEventListener("change", toggleSaveData);
    elements.saveNowButton.addEventListener("click", saveNow);
    elements.editDetailsButton.addEventListener("click", showLoginView);
    elements.clearDataButton.addEventListener("click", clearSavedData);
    elements.modeButtons.forEach((button) => {
        button.addEventListener("click", () => selectDifficulty(button.dataset.difficulty));
    });

    syncDetailsForm();
})();
