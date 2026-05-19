#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <ctype.h>

void play_guessing_game(void) {
    const int MIN = 1;
    const int MAX = 10;
    int secret_number;
    int guess;
    int attempts;
    char play_again = 'Y';

    srand((unsigned int)time(NULL));

    while (toupper(play_again) == 'Y') {
        secret_number = rand() % (MAX - MIN + 1) + MIN;
        attempts = 0;

        printf("\n=== Number Guessing Game ===\n");
        printf("I am thinking of a number between %d and %d.\n", MIN, MAX);

        while (1) {
            printf("Enter your guess: ");
            if (scanf("%d", &guess) != 1) {
                printf("Invalid input. Please enter a whole number.\n");
                while (getchar() != '\n');
                continue;
            }

            attempts++;

            if (guess < secret_number) {
                printf("Too low. Try again.\n");
            } else if (guess > secret_number) {
                printf("Too high. Try again.\n");
            } else {
                printf("Correct! You guessed the number in %d attempt%s.\n", attempts, attempts == 1 ? "" : "s");
                break;
            }
        }

        printf("Would you like to play again? (Y/N): ");
        while (getchar() != '\n');
        play_again = getchar();
        while (getchar() != '\n');
    }

    printf("Thanks for playing!\n");
}

int main(void) {
    play_guessing_game();
    return 0;
}
