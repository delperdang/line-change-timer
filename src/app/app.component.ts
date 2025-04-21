import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, Subscription, Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { FormatTimePipe } from './format-time.pipe';

interface Player {
  id: number;
  name: string;
  isActive: boolean;
  currentSessionStartTime: number | null;
  totalGameTime: number; // Total time in milliseconds
  // For display, we'll use observables now
  currentSessionDisplayTime$: Observable<number>;
  totalGameDisplayTime$: Observable<number>;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, // <-- For async pipe, ngFor
    FormatTimePipe
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Line Change Timer';
  players: Player[] = [];
  isGameRunning = false;

  private globalTimerSubscription: Subscription | null = null;
  // Define player names directly here - modify as needed
  private playerNames: string[] = ["Player1", "Player2", "Player3", "Wayne", "Mario", "Sidney", "Alex", "Connor"];

  ngOnInit(): void {
    this.initializePlayers();
  }

  ngOnDestroy(): void {
    // this.stopGlobalTimer(); // Ensure timer stops when component is destroyed
  }

  trackById(index: number, player: Player): number {
    return player.id;
  }

  initializePlayers(): void {
    this.players = this.playerNames.map((name, index) => {
      const player: Player = {
        id: index,
        name: name,
        isActive: false,
        currentSessionStartTime: null,
        totalGameTime: 0,
        // Initialize observables for display time
        currentSessionDisplayTime$: new Observable<number>(subscriber => {
          subscriber.next(0); // Initial value
        }),
        totalGameDisplayTime$: new Observable<number>(subscriber => {
          subscriber.next(0); // Initial value
        }),
      };
      // Set up the display observables
      this.updatePlayerObservables(player);
      return player;
    });
  }

  updatePlayerObservables(player: Player): void {
    player.currentSessionDisplayTime$ = new Observable<number>(subscriber => {
      const update = () => {
        if (player.isActive && this.isGameRunning && player.currentSessionStartTime !== null) {
          subscriber.next(Date.now() - player.currentSessionStartTime);
        } else {
          // If not active or game not running, session time is 0 unless it was just stopped
           if (!player.isActive && !this.isGameRunning && player.currentSessionStartTime === null) {
             // Show 0 if paused/reset AND player is inactive
             subscriber.next(0);
           } else if (player.isActive && !this.isGameRunning && player.currentSessionStartTime !== null) {
             // If game is paused but player still marked active (e.g., pause clicked), show the time at pause
             subscriber.next(Date.now() - player.currentSessionStartTime);
           } else {
             // Otherwise show 0
             subscriber.next(0);
           }
        }
      };

      let intervalId: any;
      if (this.isGameRunning && player.isActive) {
           // Only run interval if necessary
           intervalId = setInterval(update, 100); // Update ~10 times/sec
           update(); // Initial update
      } else {
          update(); // Update once to show 0 or paused time
      }


      // Cleanup function
      return () => {
        if (intervalId) {
          clearInterval(intervalId);
        }
      };
    }).pipe(startWith(0)); // Ensure it emits 0 immediately

    player.totalGameDisplayTime$ = new Observable<number>(subscriber => {
       const update = () => {
           let currentSessionElapsed = 0;
           if (player.isActive && this.isGameRunning && player.currentSessionStartTime !== null) {
               currentSessionElapsed = Date.now() - player.currentSessionStartTime;
           }
           subscriber.next(player.totalGameTime + currentSessionElapsed);
       }

       let intervalId: any;
       if (this.isGameRunning && player.isActive) {
          intervalId = setInterval(update, 100);
          update(); // Initial update
       } else {
          update(); // Update once
       }

        // Cleanup
        return () => {
          if (intervalId) {
             clearInterval(intervalId);
          }
        };
    }).pipe(startWith(player.totalGameTime)); // Start with the current total
}


  startGame(): void {
    if (this.isGameRunning) return;
    this.isGameRunning = true;
    const now = Date.now();

    this.players.forEach(player => {
      if (player.isActive) {
        if (player.currentSessionStartTime === null) {
          player.currentSessionStartTime = now;
        }
      }
      // Re-setup observables to potentially start intervals
      this.updatePlayerObservables(player);
    });
    // No need for a separate global timer with this Observable approach
  }

  pauseGame(): void {
    if (!this.isGameRunning) return;
    this.isGameRunning = false;
    const now = Date.now();

    this.players.forEach(player => {
      if (player.isActive && player.currentSessionStartTime !== null) {
        const elapsed = now - player.currentSessionStartTime;
        player.totalGameTime += elapsed;
        player.currentSessionStartTime = null; // Mark session as ended time-wise
      }
       // Re-setup observables to stop intervals and update display
       this.updatePlayerObservables(player);
    });
  }

  resetGame(): void {
     // Ensure game is paused state first to correctly calculate final times
    if (this.isGameRunning) {
      this.pauseGame();
    }
    this.isGameRunning = false; // Explicitly set to false again

    this.players.forEach(player => {
      player.isActive = false;
      player.currentSessionStartTime = null;
      player.totalGameTime = 0;
      // Re-setup observables to reset display
      this.updatePlayerObservables(player);
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
        }
        player.currentSessionStartTime = null;
      } else if (!wasActive && player.isActive) { // Activating while running
        player.currentSessionStartTime = now;
      }
    } else {
       // If game is not running, toggling active state doesn't start timer
       // But if we deactivate, clear any potential start time from before pause
       if (wasActive && !player.isActive) {
          player.currentSessionStartTime = null;
       }
    }

    // Re-setup observables to reflect the new state and potentially start/stop intervals
    this.updatePlayerObservables(player);
  }

  // Utility to format time (moved from controller to component method)
  formatTime(milliseconds: number | null): string {
    if (milliseconds === null || milliseconds < 0) milliseconds = 0;

    let totalSeconds = Math.floor(milliseconds / 1000);
    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = totalSeconds % 60;

    let formattedMinutes = String(minutes).padStart(2, '0');
    let formattedSeconds = String(seconds).padStart(2, '0');

    if (hours > 0) {
      let formattedHours = String(hours).padStart(2, '0');
      return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
    } else {
      return `${formattedMinutes}:${formattedSeconds}`;
    }
  }

  // --- No need for global timer methods with RxJS per-player observable approach ---
  // stopGlobalTimer(): void {
  //   if (this.globalTimerSubscription) {
  //     this.globalTimerSubscription.unsubscribe();
  //     this.globalTimerSubscription = null;
  //   }
  // }
}