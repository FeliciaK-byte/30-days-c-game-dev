# 30 Days  Game Development Challenge

This project documents a 30-day journey learning C programming by building games.

## Current Game

- Number Guessing Game

## Project Structure

```text
games/
  number-guessing/
    number_guessing_game.c
web-preview/
  index.html
  number-guessing/
    index.html
    game.js
    styles.css
    assets/
```

## Run the C Game

Compile the game:

```sh
gcc games/number-guessing/number_guessing_game.c -o games/number-guessing/number_guessing_game
```

Run it:

```sh
./games/number-guessing/number_guessing_game
```

On Windows, run:

```powershell
.\games\number-guessing\number_guessing_game.exe
```

The C game saves persistent stats to `number_guessing_stats.txt` in the directory where you run it.

## Web Preview

A browser version of the Number Guessing Game is available at:

```text
web-preview/index.html
```

The preview includes a login details screen, an explicit save-data option, difficulty modes, optional limited attempts, browser stats, warmer/colder hints, and round summaries.

## Planned Games

- Calculator
- Rock Paper Scissors
- Tic Tac Toe
- Snake Game

## Goal

Improve problem-solving, logic building, and C programming skills through game development.

## Tools

- C Language
- GCC or Clang
- HTML, CSS, and JavaScript
- VS Code
