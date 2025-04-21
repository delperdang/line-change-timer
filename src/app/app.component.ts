import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { interval, Subscription, Observable, BehaviorSubject } from 'rxjs'; // Use BehaviorSubject for display time
import { map, startWith } from 'rxjs/operators';
import { FormatTimePipe } from './format-time.pipe';

interface Player {
  id: number;
  name: string;
  isActive: boolean;
  currentSessionStartTime: number | null;
  totalGameTime: number;
  currentSessionDisplayTime$: BehaviorSubject<number>;
  totalGameDisplayTime$: BehaviorSubject<number>;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormatTimePipe,
    FormsModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Line Change Timer';
  players: Player[] = [];
  isGameRunning = false;
  playersLoaded = false; // Track if players are set
  playerNamesInput: string = ''; // Bound to the input field

  private timerIntervalSubscription: Subscription | null = null;
  private readonly localStorageKey = 'lineChangePlayerNames'; // Key for local storage

  ngOnInit(): void {
    // Try loading names from local storage on init
    const savedNames = localStorage.getItem(this.localStorageKey);
    if (savedNames) {
      this.playerNamesInput = savedNames; // Pre-fill input for potential editing
      this.processPlayerNames(savedNames); // Load players
    }
    // Start the interval timer that updates display values
    this.startDisplayUpdateTimer();
  }

  ngOnDestroy(): void {
    this.stopDisplayUpdateTimer();
  }

  startDisplayUpdateTimer(): void {
      if (this.timerIntervalSubscription) return; // Already running
      // Update display roughly 10 times/sec if game is running
      this.timerIntervalSubscription = interval(100).subscribe(() => {
          if (!this.isGameRunning) return;
          const now = Date.now();
          this.players.forEach(player => {
              let currentSessionElapsed = 0;
              if (player.isActive && player.currentSessionStartTime !== null) {
                  currentSessionElapsed = now - player.currentSessionStartTime;
              }
              // Emit new values to the BehaviorSubjects
              player.currentSessionDisplayTime$.next(currentSessionElapsed);
              player.totalGameDisplayTime$.next(player.totalGameTime + currentSessionElapsed);
          });
      });
  }

  stopDisplayUpdateTimer(): void {
      this.timerIntervalSubscription?.unsubscribe();
      this.timerIntervalSubscription = null;
  }


  loadPlayersFromInput(): void {
    this.processPlayerNames(this.playerNamesInput);
  }

  processPlayerNames(namesString: string): void {
    const namesArray = namesString.split(',')
                                  .map(name => name.trim())
                                  .filter(name => name.length > 0);

    if (namesArray.length > 0) {
      // Save the valid processed string back to local storage
      localStorage.setItem(this.localStorageKey, namesArray.join(','));
      this.initializePlayers(namesArray); // Use the names from input/storage
      this.playersLoaded = true;
    } else {
      // Handle case where input is empty or invalid
      alert("Please enter at least one valid player name.");
      this.playersLoaded = false;
    }
  }

  // Modified to accept names array
  initializePlayers(names: string[]): void {
    this.resetGameInternal(); // Reset state before loading new players
    this.players = names.map((name, index) => {
      // Use BehaviorSubject for easier updates
      const currentSessionDisplayTime$ = new BehaviorSubject<number>(0);
      const totalGameDisplayTime$ = new BehaviorSubject<number>(0);

      const player: Player = {
        id: index,
        name: name,
        isActive: false,
        currentSessionStartTime: null,
        totalGameTime: 0,
        currentSessionDisplayTime$,
        totalGameDisplayTime$
      };
      return player;
    });
  }

   clearPlayers(): void {
      if (confirm('Are you sure you want to clear the current players and timers? This cannot be undone.')) {
           this.resetGameInternal(); // Stop timers, reset counts
           this.players = []; // Clear player array
           this.playersLoaded = false; // Go back to input screen
           localStorage.removeItem(this.localStorageKey); // Clear saved names
           this.playerNamesInput = ''; // Clear the input field
      }
   }

  // Renamed internal reset logic
  private resetGameInternal(): void {
    this.isGameRunning = false;
    // No need to update BehaviorSubjects here, initializePlayers creates new ones

    this.players.forEach(player => {
        // Ensure any lingering time calc is done (though pause should handle it)
        if (player.isActive && player.currentSessionStartTime !== null) {
             const elapsed = Date.now() - player.currentSessionStartTime;
             player.totalGameTime += elapsed;
        }
        player.isActive = false;
        player.currentSessionStartTime = null;
        player.totalGameTime = 0;
        // Reset display subjects
        player.currentSessionDisplayTime$?.next(0);
        player.totalGameDisplayTime$?.next(0);
    });
  }

  // Public reset function called by button, keeps players
  resetGame(): void {
       if (confirm('Reset all timers for the current players?')) {
            const now = Date.now();
            // Update totals before resetting
             this.players.forEach(player => {
                if (player.isActive && player.currentSessionStartTime !== null) {
                    const elapsed = now - player.currentSessionStartTime;
                    player.totalGameTime += elapsed;
                }
                player.isActive = false; // Deactivate everyone
                player.currentSessionStartTime = null;
                player.totalGameTime = 0;
                // Reset display subjects
                 player.currentSessionDisplayTime$.next(0);
                 player.totalGameDisplayTime$.next(0);
            });
           this.isGameRunning = false; // Ensure game stops
       }
  }


  startGame(): void {
    if (this.isGameRunning) return;
    this.isGameRunning = true;
    const now = Date.now();

    this.players.forEach(player => {
      if (player.isActive) {
        if (player.currentSessionStartTime === null) {
          player.currentSessionStartTime = now;
          // Reset current session display time on start/resume
          player.currentSessionDisplayTime$.next(0);
        }
      }
       // Ensure total time display starts correctly if player was already active
       player.totalGameDisplayTime$.next(player.totalGameTime + (player.isActive ? 0 : 0));
    });
  }

  pauseGame(): void {
    if (!this.isGameRunning) return;
    this.isGameRunning = false;
    const now = Date.now();

    this.players.forEach(player => {
      if (player.isActive && player.currentSessionStartTime !== null) {
        const elapsed = now - player.currentSessionStartTime;
        player.totalGameTime += elapsed;
        // Update total display immediately on pause
         player.totalGameDisplayTime$.next(player.totalGameTime);
         // Current session is over for timing purposes
         player.currentSessionDisplayTime$.next(0); // Reset session display
      }
       player.currentSessionStartTime = null; // Clear start time regardless of active state on pause
    });
  }


  togglePlayer(player: Player): void {
    const wasActive = player.isActive;
    player.isActive = !player.isActive;
    const now = Date.now();

    if (this.isGameRunning) {
      if (wasActive && !player.isActive) { // Deactivating while running
        if (player.currentSessionStartTime !== null) {
          const elapsed = now - player.currentSessionStartTime;
          player.totalGameTime += elapsed;
          player.totalGameDisplayTime$.next(player.totalGameTime); // Update total display
        }
        player.currentSessionStartTime = null;
        player.currentSessionDisplayTime$.next(0); // Reset session display
      } else if (!wasActive && player.isActive) { // Activating while running
        player.currentSessionStartTime = now;
        player.currentSessionDisplayTime$.next(0); // Start session display from 0
      }
    } else {
       // If game is not running, toggling active state doesn't start timer
       if (wasActive && !player.isActive) {
          player.currentSessionStartTime = null; // Ensure start time is cleared if deactivated while paused
           player.currentSessionDisplayTime$.next(0); // Reset session display
       }
       // Ensure total time is displayed correctly even when paused
       player.totalGameDisplayTime$.next(player.totalGameTime);
    }
  }


  // --- Utility Functions ---
  trackById(index: number, player: Player): number {
    return player.id;
  }


}