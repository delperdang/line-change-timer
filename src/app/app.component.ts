import { Component, OnDestroy, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { interval, Subscription, Observable, BehaviorSubject, timer } from 'rxjs';
import { map, startWith, tap, takeWhile } from 'rxjs/operators';
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
  playersLoaded = false;
  playerNamesInput: string = '';

  gameTimeElapsed = 0;
  isGameTimerRunning = false;
  homeScore = 0;
  awayScore = 0;

  private playerTimerIntervalSubscription: Subscription | null = null;
  private gameTimerSubscription: Subscription | null = null;
  private gameStartTime: number | null = null;
  private gamePauseTime: number | null = null;

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
        p._calculatedTotalTime = p.totalGameTime + (p.isActive && p.currentSessionStartTime ? now - p.currentSessionStartTime : 0);
    });
    return [...this.players].sort((a, b) => (b._calculatedTotalTime ?? 0) - (a._calculatedTotalTime ?? 0));
  }

  startGameTimer(): void {
    if (this.gameTimerSubscription) return;
    console.log('Starting game timer');
    this.isGameTimerRunning = true;
    const initialOffset = this.gamePauseTime ? Date.now() - this.gamePauseTime : 0;
    this.gameStartTime = Date.now() - this.gameTimeElapsed - initialOffset;
    this.gamePauseTime = null;

    this.gameTimerSubscription = interval(1000)
      .pipe(
        map(() => {
          if (this.gameStartTime === null) return 0;
          return Date.now() - this.gameStartTime;
        }),
        takeWhile(() => this.isGameTimerRunning)
      )
      .subscribe(elapsed => {
        this.gameTimeElapsed = elapsed;
        this.cdr.detectChanges();
      });
  }

  pauseGameTimer(): void {
    if (!this.isGameTimerRunning) return;
    console.log('Pausing game timer');
    this.stopGameTimer();
    this.gamePauseTime = Date.now();
  }

  stopGameTimer(): void {
      console.log('Stopping game timer');
      this.isGameTimerRunning = false;
      this.gameTimerSubscription?.unsubscribe();
      this.gameTimerSubscription = null;
  }

  resetGameTimer(): void {
    console.log('Resetting game timer');
    this.stopGameTimer();
    this.gameTimeElapsed = 0;
    this.gameStartTime = null;
    this.gamePauseTime = null;
    this.cdr.detectChanges();
  }

  incrementHomeScore(): void {
    this.homeScore++;
    this.cdr.detectChanges();
  }

  decrementHomeScore(): void {
    if (this.homeScore > 0) {
      this.homeScore--;
      this.cdr.detectChanges();
    }
  }

  incrementAwayScore(): void {
    this.awayScore++;
    this.cdr.detectChanges();
  }

  decrementAwayScore(): void {
    if (this.awayScore > 0) {
      this.awayScore--;
      this.cdr.detectChanges();
    }
  }

  startDisplayUpdateTimer(): void {
    if (this.playerTimerIntervalSubscription) return;
    console.log('Starting display update timer');
    this.playerTimerIntervalSubscription = interval(500).subscribe(() => {
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
    this.playerTimerIntervalSubscription?.unsubscribe();
    this.playerTimerIntervalSubscription = null;
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
      this.initializePlayers(namesArray);
      this.playersLoaded = true;
    } else {
      alert("Please enter at least one valid player name.");
      this.playersLoaded = false;
    }
  }

  initializePlayers(names: string[]): void {
    this.resetGameInternal(false);
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
      this.stopDisplayUpdateTimer();
      this.stopGameTimer();
      this.resetGameInternal(true);
      this.players = [];
      this.playersLoaded = false;
      localStorage.removeItem(this.localStorageKey);
      this.playerNamesInput = '';
      this.cdr.detectChanges();
    }
  }

  private resetGameInternal(resetScoresAndGameTimer: boolean): void {
    this.stopDisplayUpdateTimer();
    if (resetScoresAndGameTimer) {
        this.resetGameTimer();
        this.homeScore = 0;
        this.awayScore = 0;
    }

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
        player._calculatedTotalTime = 0;
    });
  }

  resetGame(): void {
    if (confirm('Reset all timers for the current players? This will also reset the main game timer and scores.')) {
         this.stopDisplayUpdateTimer();
         this.resetGameTimer();
         this.homeScore = 0;
         this.awayScore = 0;

         const now = Date.now();
          this.players.forEach(player => {
             if (player.isActive && player.currentSessionStartTime !== null) {
                 const elapsed = now - player.currentSessionStartTime;
                 player.totalGameTime += elapsed;
             }
             player.isActive = false;
             player.currentSessionStartTime = null;
             player.totalGameTime = 0;
             player.currentSessionDisplayTime$.next(0);
             player.totalGameDisplayTime$.next(0);
             player._calculatedTotalTime = 0;
         });
        this.isGameRunning = false;
        this.cdr.detectChanges();
    }
  }


  startGame(): void {
    if (this.isGameRunning) return;
    this.isGameRunning = true;
    this.startGameTimer();
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
    this.startDisplayUpdateTimer();
  }

  pauseGame(): void {
    if (!this.isGameRunning) return;
    this.stopDisplayUpdateTimer();
    this.pauseGameTimer();
    this.isGameRunning = false;
    const now = Date.now();

    this.players.forEach(player => {
      if (player.isActive && player.currentSessionStartTime !== null) {
        const elapsed = now - player.currentSessionStartTime;
        player.totalGameTime += elapsed;
        player.totalGameDisplayTime$.next(player.totalGameTime);
        player.currentSessionDisplayTime$.next(0);
      }
       player.currentSessionStartTime = null;
    });
    this.cdr.detectChanges();
  }

  togglePlayer(player: Player): void {
    const wasActive = player.isActive;
    player.isActive = !player.isActive;
    const now = Date.now();

    if (this.isGameRunning) {
      if (wasActive && !player.isActive) {
        if (player.currentSessionStartTime !== null) {
          const elapsed = now - player.currentSessionStartTime;
          player.totalGameTime += elapsed;
          player.totalGameDisplayTime$.next(player.totalGameTime);
        }
        player.currentSessionStartTime = null;
        player.currentSessionDisplayTime$.next(0);
      } else if (!wasActive && player.isActive) {
        player.currentSessionStartTime = now;
        player.currentSessionDisplayTime$.next(0);
      }
    } else {
       if (wasActive && !player.isActive) {
          player.currentSessionStartTime = null;
          player.currentSessionDisplayTime$.next(0);
       }
       player.totalGameDisplayTime$.next(player.totalGameTime);
    }
    this.cdr.detectChanges();
  }

  trackById(index: number, player: Player): number {
    return player.id;
  }

}