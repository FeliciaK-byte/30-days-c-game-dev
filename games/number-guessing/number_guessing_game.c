#include <ctype.h>
#include <errno.h>
#include <limits.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

enum {
    INPUT_BUFFER_SIZE = 64,
    DIFFICULTY_COUNT = 3
};

static const char *STATS_FILE = "number_guessing_stats.txt";

typedef struct {
    const char *name;
    int min_number;
    int max_number;
    int max_attempts;
} Difficulty;

typedef struct {
    int rounds_played;
    int rounds_won;
    int best_scores[DIFFICULTY_COUNT];
} SavedStats;

typedef struct {
    int rounds_played;
    int rounds_won;
    int best_score;
} SessionStats;

typedef struct {
    bool won;
    int attempts_used;
    int secret_number;
} RoundResult;

static const Difficulty DIFFICULTIES[DIFFICULTY_COUNT] = {
    {"Easy", 1, 50, 8},
    {"Normal", 1, 100, 7},
    {"Hard", 1, 500, 9}
};

static bool load_stats(SavedStats *stats);
static bool save_stats(const SavedStats *stats);
static bool read_line(char buffer[], size_t size);
static bool parse_int(const char *text, int *value);
static bool parse_difficulty_choice(const char *text, int *difficulty_index);
static bool prompt_for_difficulty(int *difficulty_index);
static bool prompt_for_guess(const Difficulty *difficulty, int *guess);
static bool prompt_to_play_again(bool *play_again);
static int random_between(int min, int max);
static bool play_round(const Difficulty *difficulty, RoundResult *result);
static void print_saved_stats(const SavedStats *stats);
static void print_hint(int guess, int secret_number, int previous_distance);
static void print_round_summary(const Difficulty *difficulty,
                                const RoundResult *result,
                                const SavedStats *stats,
                                int difficulty_index);
static void update_stats(SavedStats *saved_stats,
                         SessionStats *session_stats,
                         const RoundResult *result,
                         int difficulty_index);
static void print_session_summary(const SessionStats *stats);

void play_guessing_game(void)
{
    SavedStats saved_stats = {0};
    SessionStats session_stats = {0};
    bool play_again = true;

    srand((unsigned int)time(NULL));

    puts("=== Number Guessing Game ===");

    if (load_stats(&saved_stats)) {
        print_saved_stats(&saved_stats);
    }

    while (play_again) {
        int difficulty_index = 1;
        const Difficulty *difficulty = NULL;
        RoundResult result = {0};

        if (!prompt_for_difficulty(&difficulty_index)) {
            break;
        }

        difficulty = &DIFFICULTIES[difficulty_index];

        if (!play_round(difficulty, &result)) {
            break;
        }

        update_stats(&saved_stats, &session_stats, &result, difficulty_index);
        print_round_summary(difficulty, &result, &saved_stats, difficulty_index);

        if (!save_stats(&saved_stats)) {
            puts("Warning: your saved stats could not be updated.");
        }

        if (!prompt_to_play_again(&play_again)) {
            break;
        }
    }

    print_session_summary(&session_stats);
    puts("Thanks for playing!");
}

static bool load_stats(SavedStats *stats)
{
    FILE *file = fopen(STATS_FILE, "r");

    if (file == NULL) {
        return false;
    }

    if (fscanf(file,
               "%d %d %d %d %d",
               &stats->rounds_played,
               &stats->rounds_won,
               &stats->best_scores[0],
               &stats->best_scores[1],
               &stats->best_scores[2]) != 5) {
        *stats = (SavedStats){0};
        fclose(file);
        return false;
    }

    fclose(file);

    if (stats->rounds_played < 0 || stats->rounds_won < 0) {
        *stats = (SavedStats){0};
        return false;
    }

    for (int i = 0; i < DIFFICULTY_COUNT; i++) {
        if (stats->best_scores[i] < 0) {
            stats->best_scores[i] = 0;
        }
    }

    return true;
}

static bool save_stats(const SavedStats *stats)
{
    FILE *file = fopen(STATS_FILE, "w");

    if (file == NULL) {
        return false;
    }

    fprintf(file,
            "%d %d %d %d %d\n",
            stats->rounds_played,
            stats->rounds_won,
            stats->best_scores[0],
            stats->best_scores[1],
            stats->best_scores[2]);

    return fclose(file) == 0;
}

static bool play_round(const Difficulty *difficulty, RoundResult *result)
{
    const int secret_number = random_between(difficulty->min_number, difficulty->max_number);
    int low_bound = difficulty->min_number;
    int high_bound = difficulty->max_number;
    int previous_distance = -1;

    result->secret_number = secret_number;

    printf("\n%s mode: guess a number from %d to %d in %d attempt%s.\n",
           difficulty->name,
           difficulty->min_number,
           difficulty->max_number,
           difficulty->max_attempts,
           difficulty->max_attempts == 1 ? "" : "s");

    while (result->attempts_used < difficulty->max_attempts) {
        int guess = 0;
        const int attempts_remaining = difficulty->max_attempts - result->attempts_used - 1;

        if (!prompt_for_guess(difficulty, &guess)) {
            return false;
        }

        result->attempts_used++;

        if (guess == secret_number) {
            result->won = true;
            printf("Correct! You guessed the number in %d attempt%s.\n",
                   result->attempts_used,
                   result->attempts_used == 1 ? "" : "s");
            return true;
        }

        if (guess < secret_number) {
            low_bound = guess + 1 > low_bound ? guess + 1 : low_bound;
            puts("Too low.");
        } else {
            high_bound = guess - 1 < high_bound ? guess - 1 : high_bound;
            puts("Too high.");
        }

        print_hint(guess, secret_number, previous_distance);
        previous_distance = abs(secret_number - guess);

        if (attempts_remaining > 0) {
            printf("Current range: %d-%d. %d attempt%s remaining.\n",
                   low_bound,
                   high_bound,
                   attempts_remaining,
                   attempts_remaining == 1 ? "" : "s");
        }
    }

    printf("Out of attempts. The secret number was %d.\n", secret_number);
    return true;
}

static bool prompt_for_difficulty(int *difficulty_index)
{
    char line[INPUT_BUFFER_SIZE];

    puts("\nChoose a difficulty:");

    for (int i = 0; i < DIFFICULTY_COUNT; i++) {
        printf("  %d. %s (%d-%d, %d attempts)\n",
               i + 1,
               DIFFICULTIES[i].name,
               DIFFICULTIES[i].min_number,
               DIFFICULTIES[i].max_number,
               DIFFICULTIES[i].max_attempts);
    }

    while (true) {
        printf("Enter 1, 2, 3, or a difficulty name: ");

        if (!read_line(line, sizeof(line))) {
            return false;
        }

        if (parse_difficulty_choice(line, difficulty_index)) {
            return true;
        }

        puts("Please choose Easy, Normal, or Hard.");
    }
}

static bool parse_difficulty_choice(const char *text, int *difficulty_index)
{
    int choice = 0;

    if (parse_int(text, &choice) && choice >= 1 && choice <= DIFFICULTY_COUNT) {
        *difficulty_index = choice - 1;
        return true;
    }

    while (isspace((unsigned char)*text)) {
        text++;
    }

    switch (tolower((unsigned char)*text)) {
        case 'e':
            *difficulty_index = 0;
            return true;
        case 'n':
            *difficulty_index = 1;
            return true;
        case 'h':
            *difficulty_index = 2;
            return true;
        default:
            return false;
    }
}

static bool prompt_for_guess(const Difficulty *difficulty, int *guess)
{
    char line[INPUT_BUFFER_SIZE];

    while (true) {
        printf("Enter your guess (%d-%d): ",
               difficulty->min_number,
               difficulty->max_number);

        if (!read_line(line, sizeof(line))) {
            return false;
        }

        if (!parse_int(line, guess)) {
            puts("Please enter a whole number.");
            continue;
        }

        if (*guess < difficulty->min_number || *guess > difficulty->max_number) {
            printf("Please choose a number from %d to %d.\n",
                   difficulty->min_number,
                   difficulty->max_number);
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

static void print_saved_stats(const SavedStats *stats)
{
    if (stats->rounds_played == 0) {
        return;
    }

    printf("Saved stats: %d round%s played, %d won.\n",
           stats->rounds_played,
           stats->rounds_played == 1 ? "" : "s",
           stats->rounds_won);

    for (int i = 0; i < DIFFICULTY_COUNT; i++) {
        if (stats->best_scores[i] > 0) {
            printf("  Best %s score: %d guess%s.\n",
                   DIFFICULTIES[i].name,
                   stats->best_scores[i],
                   stats->best_scores[i] == 1 ? "" : "es");
        }
    }
}

static void print_hint(int guess, int secret_number, int previous_distance)
{
    const int distance = abs(secret_number - guess);

    if (previous_distance < 0) {
        puts(distance <= 10 ? "Close first guess." : "Use the narrowed range.");
        return;
    }

    if (distance < previous_distance) {
        puts("Getting warmer.");
    } else if (distance > previous_distance) {
        puts("Getting colder.");
    } else {
        puts("Same distance as your last guess.");
    }
}

static void print_round_summary(const Difficulty *difficulty,
                                const RoundResult *result,
                                const SavedStats *stats,
                                int difficulty_index)
{
    printf("\nRound summary: %s mode, secret number %d, %d attempt%s used, %s.\n",
           difficulty->name,
           result->secret_number,
           result->attempts_used,
           result->attempts_used == 1 ? "" : "s",
           result->won ? "won" : "lost");

    if (stats->best_scores[difficulty_index] > 0) {
        printf("Best %s score: %d guess%s.\n",
               difficulty->name,
               stats->best_scores[difficulty_index],
               stats->best_scores[difficulty_index] == 1 ? "" : "es");
    }
}

static void update_stats(SavedStats *saved_stats,
                         SessionStats *session_stats,
                         const RoundResult *result,
                         int difficulty_index)
{
    saved_stats->rounds_played++;
    session_stats->rounds_played++;

    if (!result->won) {
        return;
    }

    saved_stats->rounds_won++;
    session_stats->rounds_won++;

    if (saved_stats->best_scores[difficulty_index] == 0
        || result->attempts_used < saved_stats->best_scores[difficulty_index]) {
        saved_stats->best_scores[difficulty_index] = result->attempts_used;
    }

    if (session_stats->best_score == 0 || result->attempts_used < session_stats->best_score) {
        session_stats->best_score = result->attempts_used;
    }
}

static void print_session_summary(const SessionStats *stats)
{
    if (stats->rounds_played == 0) {
        putchar('\n');
        return;
    }

    printf("\nSession summary: %d round%s played, %d won",
           stats->rounds_played,
           stats->rounds_played == 1 ? "" : "s",
           stats->rounds_won);

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
