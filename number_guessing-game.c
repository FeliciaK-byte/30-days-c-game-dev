#include <ctype.h>
#include <errno.h>
#include <limits.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

enum {
    MIN_NUMBER = 1,
    MAX_NUMBER = 100,
    INPUT_BUFFER_SIZE = 64
};

typedef struct {
    int min_number;
    int max_number;
} GameSettings;

typedef struct {
    int rounds_played;
    int rounds_won;
    int best_score;
} GameStats;

static bool read_line(char buffer[], size_t size);
static bool parse_int(const char *text, int *value);
static bool prompt_for_guess(const GameSettings *settings, int *guess);
static bool prompt_to_play_again(bool *play_again);
static int random_between(int min, int max);
static bool play_round(const GameSettings *settings, int *attempts_used);
static void print_session_summary(const GameStats *stats);

void play_guessing_game(void)
{
    const GameSettings settings = {
        .min_number = MIN_NUMBER,
        .max_number = MAX_NUMBER
    };
    GameStats stats = {0};
    bool play_again = true;

    srand((unsigned int)time(NULL));

    puts("=== Number Guessing Game ===");

    while (play_again) {
        int attempts_used = 0;
        const bool won_round = play_round(&settings, &attempts_used);

        if (!won_round) {
            break;
        }

        stats.rounds_played++;
        stats.rounds_won++;

        if (stats.best_score == 0 || attempts_used < stats.best_score) {
            stats.best_score = attempts_used;
        }

        if (!prompt_to_play_again(&play_again)) {
            break;
        }
    }

    print_session_summary(&stats);
    puts("Thanks for playing!");
}

static bool play_round(const GameSettings *settings, int *attempts_used)
{
    const int secret_number = random_between(settings->min_number, settings->max_number);
    int attempts = 0;

    printf("\nI am thinking of a number between %d and %d.\n",
           settings->min_number,
           settings->max_number);

    while (true) {
        int guess = 0;

        if (!prompt_for_guess(settings, &guess)) {
            return false;
        }

        attempts++;

        if (guess < secret_number) {
            puts("Too low. Try again.");
        } else if (guess > secret_number) {
            puts("Too high. Try again.");
        } else {
            printf("Correct! You guessed the number in %d attempt%s.\n",
                   attempts,
                   attempts == 1 ? "" : "s");
            *attempts_used = attempts;
            return true;
        }
    }
}

static bool prompt_for_guess(const GameSettings *settings, int *guess)
{
    char line[INPUT_BUFFER_SIZE];

    while (true) {
        printf("Enter your guess (%d-%d): ",
               settings->min_number,
               settings->max_number);

        if (!read_line(line, sizeof(line))) {
            return false;
        }

        if (!parse_int(line, guess)) {
            puts("Please enter a whole number.");
            continue;
        }

        if (*guess < settings->min_number || *guess > settings->max_number) {
            printf("Please choose a number from %d to %d.\n",
                   settings->min_number,
                   settings->max_number);
            continue;
        }

        return true;
    }
}

static bool prompt_to_play_again(bool *play_again)
{
    char line[INPUT_BUFFER_SIZE];

    while (true) {
        printf("\nPlay again? (y/n): ");

        if (!read_line(line, sizeof(line))) {
            return false;
        }

        const unsigned char response = (unsigned char)tolower((unsigned char)line[0]);

        if (response == 'y' || response == 'n') {
            *play_again = response == 'y';
            return true;
        }

        puts("Please answer with y or n.");
    }
}

static bool read_line(char buffer[], size_t size)
{
    if (fgets(buffer, size, stdin) == NULL) {
        return false;
    }

    const size_t length = strlen(buffer);

    if (length > 0 && buffer[length - 1] == '\n') {
        buffer[length - 1] = '\0';
        return true;
    }

    int character = 0;
    while ((character = getchar()) != '\n' && character != EOF) {
        // Discard the rest of an overlong input line.
    }

    return true;
}

static bool parse_int(const char *text, int *value)
{
    char *end = NULL;
    errno = 0;

    while (isspace((unsigned char)*text)) {
        text++;
    }

    const long parsed = strtol(text, &end, 10);

    if (text == end || errno == ERANGE || parsed < INT_MIN || parsed > INT_MAX) {
        return false;
    }

    while (isspace((unsigned char)*end)) {
        end++;
    }

    if (*end != '\0') {
        return false;
    }

    *value = (int)parsed;
    return true;
}

static int random_between(int min, int max)
{
    const unsigned int range = (unsigned int)(max - min + 1);
    const unsigned long limit = (((unsigned long)RAND_MAX + 1UL) / range) * range;
    int value = 0;

    do {
        value = rand();
    } while ((unsigned long)value >= limit);

    return min + (value % (int)range);
}

static void print_session_summary(const GameStats *stats)
{
    if (stats->rounds_played == 0) {
        putchar('\n');
        return;
    }

    printf("\nSession summary: %d round%s won",
           stats->rounds_won,
           stats->rounds_won == 1 ? "" : "s");

    if (stats->best_score > 0) {
        printf(", best score: %d guess%s",
               stats->best_score,
               stats->best_score == 1 ? "" : "es");
    }

    puts(".");
}

int main(void)
{
    play_guessing_game();
    return EXIT_SUCCESS;
}
