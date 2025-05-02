import { Component, OnDestroy, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { interval, Subscription, Observable, BehaviorSubject } from 'rxjs'; // Use BehaviorSubject for display time
import { map, startWith, tap } from 'rxjs/operators';
import { FormatTimePipe } from './format-time.pipe';

interface Player {
  id: number;
  name: string;
  isActive: boolean;
  currentSessionStartTime: number | null;
  totalGameTime: number;
  currentSessionDisplayTime$: BehaviorSubject<number>;
  totalGameDisplayTime$: BehaviorSubject<number>;
  _calculatedTotalTime?: number;
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
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Line Change Timer';
  players: Player[] = [];
  isGameRunning = false;
  playersLoaded = false; // Track if players are set
  playerNamesInput: string = ''; // Bound to the input field

  private timerIntervalSubscription: Subscription | null = null;
  private readonly localStorageKey = 'lineChangePlayerNames'; // Key for local storage

  constructor(private cdr: ChangeDetectorRef) {}
  
  ngOnInit(): void {
    const savedNames = localStorage.getItem(this.localStorageKey);
    if (savedNames) {
      this.playerNamesInput = savedNames; // Pre-fill input for potential editing
      this.processPlayerNames(savedNames); // Load players
    }
  }

  ngOnDestroy(): void {
    this.stopDisplayUpdateTimer();
  }

  get sortedPlayers(): Player[] {
    const now = Date.now();
    this.players.forEach(p => {
        p._calculatedTotalTime = p.totalGameTime + (p.isActive && p.currentSessionStartTime ? now - p.currentSessionStartTime : 0);
    });
    return [...this.players].sort((a, b) => (b._calculatedTotalTime ?? 0) - (a._calculatedTotalTime ?? 0));
  }

  startDisplayUpdateTimer(): void {
    if (this.timerIntervalSubscription) return;
    console.log('Starting display update timer');
    this.timerIntervalSubscription = interval(500).subscribe(() => {
        if (!this.isGameRunning) return;
        const now = Date.now();
        this.players.forEach(player => {
            let currentSessionElapsed = 0;
            if (player.isActive && player.currentSessionStartTime !== null) {
                currentSessionElapsed = now - player.currentSessionStartTime;
            }
            player.currentSessionDisplayTime$.next(currentSessionElapsed);
            player.totalGameDisplayTime$.next(player.totalGameTime + currentSessionElapsed);
        });
         this.cdr.detectChanges();
    });
  }

  stopDisplayUpdateTimer(): void {
    console.log('Stopping display update timer');
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
      localStorage.setItem(this.localStorageKey, namesArray.join(','));
      this.initializePlayers(namesArray); // Use the names from input/storage
      this.playersLoaded = true;
    } else {
      alert("Please enter at least one valid player name.");
      this.playersLoaded = false;
    }
  }

  initializePlayers(names: string[]): void {
    this.resetGameInternal(); // Reset state before loading new players
    this.players = names.map((name, index) => {
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
          this.stopDisplayUpdateTimer(); // Stop timer before clearing
          this.resetGameInternal(); // Stop timers, reset counts
          this.players = []; // Clear player array
          this.playersLoaded = false; // Go back to input screen
          localStorage.removeItem(this.localStorageKey); // Clear saved names
          this.playerNamesInput = ''; // Clear the input field
      }
   }

  private resetGameInternal(): void {
    this.stopDisplayUpdateTimer(); // Stop timer
    this.isGameRunning = false;

    this.players.forEach(player => {
        if (player.isActive && player.currentSessionStartTime !== null) {
             const elapsed = Date.now() - player.currentSessionStartTime;
             player.totalGameTime += elapsed;
        }
        player.isActive = false;
        player.currentSessionStartTime = null;
        player.totalGameTime = 0;
        player.currentSessionDisplayTime$?.next(0);
        player.totalGameDisplayTime$?.next(0);
        player._calculatedTotalTime = 0; // Reset calculated time
    });
  }

  resetGame(): void {
       if (confirm('Reset all timers for the current players?')) {
            this.stopDisplayUpdateTimer(); // Stop timer
            const now = Date.now();
             this.players.forEach(player => {
                if (player.isActive && player.currentSessionStartTime !== null) {
                    const elapsed = now - player.currentSessionStartTime;
                    player.totalGameTime += elapsed;
                }
                player.isActive = false; // Deactivate everyone
                player.currentSessionStartTime = null;
                player.totalGameTime = 0;
                player.currentSessionDisplayTime$.next(0);
                player.totalGameDisplayTime$.next(0);
                player._calculatedTotalTime = 0; // Reset calculated time
            });
           this.isGameRunning = false; // Ensure game stops
           this.cdr.detectChanges();
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
          player.currentSessionDisplayTime$.next(0);
        }
      }
        const currentSessionElapsed = player.isActive && player.currentSessionStartTime ? now - player.currentSessionStartTime : 0;
        player.totalGameDisplayTime$.next(player.totalGameTime + (player.isActive ? 0 : 0));
    });
    this.startDisplayUpdateTimer(); // Start the update timer ONLY when game starts
  }

  pauseGame(): void {
    if (!this.isGameRunning) return;
    this.stopDisplayUpdateTimer(); // Stop the update timer
    this.isGameRunning = false;
    const now = Date.now();

    this.players.forEach(player => {
      if (player.isActive && player.currentSessionStartTime !== null) {
        const elapsed = now - player.currentSessionStartTime;
        player.totalGameTime += elapsed;
         player.totalGameDisplayTime$.next(player.totalGameTime);
         player.currentSessionDisplayTime$.next(0); // Reset session display
      }
       player.currentSessionStartTime = null; // Clear start time regardless of active state on pause
    });
    this.cdr.detectChanges();
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
       if (wasActive && !player.isActive) {
          player.currentSessionStartTime = null; // Ensure start time is cleared if deactivated while paused
           player.currentSessionDisplayTime$.next(0); // Reset session display
       }
       player.totalGameDisplayTime$.next(player.totalGameTime);
    }
    this.cdr.detectChanges();
  }

  trackById(index: number, player: Player): number {
    return player.id;
  }

}