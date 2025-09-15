import { Component, OnDestroy, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { interval, Subscription, BehaviorSubject } from 'rxjs';
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

const MAX_MINUTES_CAP_MMSS = 99;
const MAX_SECONDS_CAP_MMSS = 59;
const MAX_TIME_MS_MMSS = (MAX_MINUTES_CAP_MMSS * 60 * 1000) + (MAX_SECONDS_CAP_MMSS * 1000);

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
  playersLoaded = false;
  playerNamesInput: string = '';

  gameTimeElapsed = 0;
  isGameTimerRunning = false;
  homeScore = 0;
  awayScore = 0;

  private gameTimerStartTime: number = 0;
  private gameTimerOffset: number = 0;

  private playerTimerIntervalSubscription: Subscription | null = null;
  private gameTimerSubscription: Subscription | null = null;

  private readonly localStorageKey = 'lineChangePlayerNames';

  constructor(private cdr: ChangeDetectorRef) {}
  
  ngOnInit(): void {
    const savedNames = localStorage.getItem(this.localStorageKey);
    if (savedNames) {
      this.playerNamesInput = savedNames;
      this.processPlayerNames(savedNames);
    }
  }

  ngOnDestroy(): void {
    this.stopDisplayUpdateTimer();
    this.stopGameTimer();
  }

  get sortedPlayers(): Player[] {
    const now = Date.now();
    this.players.forEach(p => {
      let currentSessionTime = 0;
      if (p.isActive && p.currentSessionStartTime) {
        currentSessionTime = now - p.currentSessionStartTime;
      }
      p._calculatedTotalTime = Math.min(p.totalGameTime + currentSessionTime, MAX_TIME_MS_MMSS);
    });
    return [...this.players].sort((a, b) => (b._calculatedTotalTime ?? 0) - (a._calculatedTotalTime ?? 0));
  }

  startGameTimer(): void {
    if (this.gameTimerSubscription || this.gameTimeElapsed >= MAX_TIME_MS_MMSS) return;
    
    this.isGameTimerRunning = true;
    this.gameTimerStartTime = Date.now();

    this.gameTimerSubscription = interval(500).subscribe(() => {
      if (this.isGameTimerRunning) {
        const now = Date.now();
        const elapsed = now - this.gameTimerStartTime;
        this.gameTimeElapsed = this.gameTimerOffset + elapsed;

        if (this.gameTimeElapsed >= MAX_TIME_MS_MMSS) {
          this.gameTimeElapsed = MAX_TIME_MS_MMSS;
          this.stopGameTimer();

          if (this.isGameRunning) {
            this.isGameRunning = false;
            this.stopDisplayUpdateTimer();

            const capTime = Date.now();
            this.players.forEach(player => {
              if (player.isActive && player.currentSessionStartTime !== null) {
                const elapsed = capTime - player.currentSessionStartTime;
                player.totalGameTime += elapsed;
                if (player.totalGameTime > MAX_TIME_MS_MMSS) {
                  player.totalGameTime = MAX_TIME_MS_MMSS;
                }
              }
              player.currentSessionStartTime = null;
              player.currentSessionDisplayTime$.next(0);
              player.totalGameDisplayTime$.next(player.totalGameTime);
            });
          }
        }
        this.cdr.detectChanges();
      } else {
        this.stopGameTimer();
      }
    });
  }

  pauseGameTimer(): void {
    if (!this.isGameTimerRunning && !this.gameTimerSubscription) return;
    console.log('Pausing game timer');
    this.gameTimerOffset = this.gameTimeElapsed;
    this.stopGameTimer();
    this.cdr.detectChanges();
  }

  stopGameTimer(): void {
    console.log('Stopping game timer subscription');
    this.isGameTimerRunning = false;
    if (this.gameTimerSubscription) {
      this.gameTimerSubscription.unsubscribe();
      this.gameTimerSubscription = null;
    }
  }

  resetGameTimer(): void {
    console.log('Resetting game timer');
    this.stopGameTimer();
    this.gameTimeElapsed = 0;
    this.gameTimerOffset = 0;
    this.cdr.detectChanges();
  }

  incrementHomeScore(): void { this.homeScore++; this.cdr.detectChanges(); }
  decrementHomeScore(): void { if (this.homeScore > 0) { this.homeScore--; this.cdr.detectChanges(); } }
  incrementAwayScore(): void { this.awayScore++; this.cdr.detectChanges(); }
  decrementAwayScore(): void { if (this.awayScore > 0) { this.awayScore--; this.cdr.detectChanges(); } }

  startDisplayUpdateTimer(): void {
    if (this.playerTimerIntervalSubscription) return;
    console.log('Starting player display update timer');
    this.playerTimerIntervalSubscription = interval(500).subscribe(() => {
      if (!this.isGameRunning) {
        this.players.forEach(player => {
          player.currentSessionDisplayTime$.next(0);
          player.totalGameDisplayTime$.next(player.totalGameTime);
        });
        this.cdr.detectChanges();
        return;
      }

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
    console.log('Stopping player display update timer');
    if (this.playerTimerIntervalSubscription) {
      this.playerTimerIntervalSubscription.unsubscribe();
      this.playerTimerIntervalSubscription = null;
    }
  }

  loadPlayersFromInput(): void { this.processPlayerNames(this.playerNamesInput); }

  processPlayerNames(namesString: string): void {
    const namesArray = namesString.split(',').map(name => name.trim()).filter(name => name.length > 0);
    if (namesArray.length > 0) {
      localStorage.setItem(this.localStorageKey, namesArray.join(','));
      this.initializePlayers(namesArray);
      this.playersLoaded = true;
    } else {
      alert("Please enter at least one valid player name.");
      this.playersLoaded = false;
    }
    this.cdr.detectChanges();
  }

  initializePlayers(names: string[]): void {
    this.resetGameInternal(true);
    this.players = names.map((name, index) => ({
      id: index, name: name, isActive: false, currentSessionStartTime: null,
      totalGameTime: 0,
      currentSessionDisplayTime$: new BehaviorSubject<number>(0),
      totalGameDisplayTime$: new BehaviorSubject<number>(0)
    }));
  }

  clearPlayers(): void {
    if (confirm('Are you sure you want to clear the current players and timers? This cannot be undone.')) {
      this.resetGameInternal(true);
      this.players = [];
      this.playersLoaded = false;
      localStorage.removeItem(this.localStorageKey);
      this.playerNamesInput = '';
      this.cdr.detectChanges();
    }
  }

  private resetGameInternal(resetAll: boolean): void {
    this.stopDisplayUpdateTimer();
    this.stopGameTimer();

    if (resetAll) {
      this.gameTimeElapsed = 0;
      this.homeScore = 0;
      this.awayScore = 0;
    }
    this.isGameRunning = false;
    this.isGameTimerRunning = false;

    this.players.forEach(player => {
      player.isActive = false; player.currentSessionStartTime = null; player.totalGameTime = 0;
      player.currentSessionDisplayTime$?.next(0); player.totalGameDisplayTime$?.next(0);
      player._calculatedTotalTime = 0;
    });
  }

  resetGame(): void {
    if (confirm('Reset all timers for the current players? This will also reset the main game timer and scores.')) {
      this.resetGameInternal(true);
      this.cdr.detectChanges();
    }
  }

  startGame(): void {
    if (this.isGameRunning || this.gameTimeElapsed >= MAX_TIME_MS_MMSS) return;
    this.isGameRunning = true;
    this.startGameTimer();

    const now = Date.now();
    this.players.forEach(player => {
      if (player.isActive) {
        if (player.currentSessionStartTime === null) {
            player.currentSessionStartTime = now;
        }
        const currentSessionElapsed = player.currentSessionStartTime ? now - player.currentSessionStartTime : 0;
        player.currentSessionDisplayTime$.next(currentSessionElapsed);
        player.totalGameDisplayTime$.next(player.totalGameTime + currentSessionElapsed);
      } else {
         player.currentSessionDisplayTime$.next(0);
         player.totalGameDisplayTime$.next(player.totalGameTime);
      }
    });
    this.startDisplayUpdateTimer();
    this.cdr.detectChanges();
  }

  pauseGame(): void {
    if (!this.isGameRunning) return;

    this.isGameRunning = false; 
    this.pauseGameTimer();
    this.stopDisplayUpdateTimer();

    const now = Date.now();
    this.players.forEach(player => {
      if (player.isActive && player.currentSessionStartTime !== null) {
        const elapsed = now - player.currentSessionStartTime;
        player.totalGameTime += elapsed;
        if (player.totalGameTime > MAX_TIME_MS_MMSS) {
          player.totalGameTime = MAX_TIME_MS_MMSS;
        }
      }
      player.currentSessionStartTime = null;
      player.currentSessionDisplayTime$.next(0);
      player.totalGameDisplayTime$.next(player.totalGameTime);
    });
    this.cdr.detectChanges();
  }

  togglePlayer(player: Player): void {
    if (this.gameTimeElapsed >= MAX_TIME_MS_MMSS && !player.isActive) return;

    const wasActive = player.isActive;
    player.isActive = !player.isActive;
    const now = Date.now();

    if (this.isGameRunning) {
      if (wasActive && !player.isActive) {
        if (player.currentSessionStartTime !== null) {
          const elapsed = now - player.currentSessionStartTime;
          player.totalGameTime += elapsed;
          if (player.totalGameTime > MAX_TIME_MS_MMSS) {
            player.totalGameTime = MAX_TIME_MS_MMSS;
          }
          player.currentSessionStartTime = null;
        }
      } else if (!wasActive && player.isActive) {
        player.currentSessionStartTime = now;
      }
    } else {
      if (!player.isActive) {
        player.currentSessionStartTime = null;
     }
    }

    let currentSessionElapsedForDisplay = 0;
    if (player.isActive && player.currentSessionStartTime && this.isGameRunning) {
        currentSessionElapsedForDisplay = now - player.currentSessionStartTime;
    }
    player.currentSessionDisplayTime$.next(currentSessionElapsedForDisplay);
    player.totalGameDisplayTime$.next(player.totalGameTime + (this.isGameRunning ? currentSessionElapsedForDisplay : 0));
    
    this.cdr.detectChanges();
  }

  trackById(index: number, player: Player): number { return player.id; }
}