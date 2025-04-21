# Line Change Timer (Angular Version)

## Description

A simple web application built with Angular to track playing time for individual players during a game (e.g., hockey, soccer, basketball substitutions). This app allows a user (like a coach or parent) to easily manage timers for players on the field/ice/court. It features a dark theme UI and saves player lists locally in the browser.

This is a port of an original Google Apps Script web app.

## Features

* **Dynamic Player Input:** Enter player names as a comma-separated list each time you use the app.
* **Local Storage Persistence:** Player names are saved in the browser's Local Storage, so they are remembered for the next session on the same browser.
* **Interactive Player Circles:** Click player circles to activate/deactivate them, simulating substitutions.
* **Dual Timers:** Tracks two timers per player:
    * **Current Session Time:** Time elapsed since the player was last activated *while the game is running*.
    * **Total Game Time:** Cumulative time the player has been active during the current game session.
* **Game Controls:**
    * **Load Players:** Initializes the timer with the entered player names.
    * **Start Game:** Starts/resumes the timers for all currently active players.
    * **Pause Game:** Pauses the timers for all active players.
    * **Reset Timers:** Resets session and total times to zero for all current players and deactivates them.
    * **Change Players:** Clears the current players and timers, returning to the name input screen.
* **Dark Theme:** Material Design-inspired dark theme for the user interface.

## Technology Stack

* **Framework:** Angular (version 19.2.8)
* **Language:** TypeScript
* **Styling:** CSS (with CSS Variables)
* **State Management:** RxJS (BehaviorSubject for timer display), Local Storage
* **Build Tool:** Angular CLI

## Setup and Installation

**Prerequisites:**

* Node.js and npm (or yarn) installed.

**Steps:**

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/delperdang/line-change-timer.git](https://github.com/delperdang/line-change-timer.git)
    cd line-change-timer
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```

## Development Server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--configuration production` flag for a production build.

## Deployment to GitHub Pages

This project includes a script to simplify deployment to GitHub Pages:

1.  **Run the deployment script:**
    ```bash
    npm run deploy:ghpages
    ```
    This script builds the application for production with the correct base href and uses the `angular-cli-ghpages` package to push the contents of the build output (`dist/line-change-timer/browser`) to the `gh-pages` branch of your repository.

2.  **Configure GitHub Repository:**
    * Go to your repository settings on GitHub (`Settings` -> `Pages`).
    * Under "Build and deployment", select `Deploy from a branch`.
    * Set the branch to `gh-pages` and the folder to `/ (root)`.
    * Save the changes.

Your site should be available shortly at `https://YourUsername.github.io/line-change-timer/`.

## Usage

1.  **Open the App:** Navigate to the deployed GitHub Pages URL (or the local development server).
2.  **Enter Player Names:** Type the names of your players into the input field, separated by commas (e.g., `Player One, Player Two, P. Three`).
3.  **Load Players:** Click the `Load Players` button.
4.  **Select Starters:** Click on the circles of the players starting the game to activate them (they will highlight).
5.  **Start Game:** Click `Start Game` when the match begins. Timers for active players will start counting up.
6.  **Substitutions:**
    * To sub a player **off**: Click their highlighted circle. They become inactive, and their time is recorded.
    * To sub a player **on**: Click their non-highlighted circle. They become active and their timer starts (if the game is running).
7.  **Pause/Resume:** Use `Pause Game` and `Start Game` as needed.
8.  **Reset Timers:** Click `Reset Timers` to clear all times for the *current* set of players (e.g., end of period/game).
9.  **Change Players:** Click `Change Players` to clear the current setup and return to the name input screen (useful for a new game or different team). Saved names in local storage will also be cleared.