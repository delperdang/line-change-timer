import { Component, OnDestroy, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { FormatTimePipe } from './format-time.pipe';

interface Player {
  id: number;
  name: string;
  isActive: boolean;
  highlightColor: string;
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

  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;

  isColorPickerVisible = false;
  playerForColorChange: Player | null = null;
  availableColors = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8', '#6f42c1'];
  private longPressTimer: any;

  private readonly localStorageKey = 'lineChangePlayers';

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    const savedPlayers = localStorage.getItem(this.localStorageKey);
    if (savedPlayers) {
      try {
        const data = JSON.parse(savedPlayers);
        if (Array.isArray(data) && typeof data[0] === 'object') {
          this.players = data.map(p => ({ ...p, currentSessionDisplayTime$: new BehaviorSubject(0), totalGameDisplayTime$: new BehaviorSubject(p.totalGameTime) }));
        } else {
          this.initializePlayers(savedPlayers.split(','));
        }
      } catch (e) {
        this.initializePlayers(savedPlayers.split(','));
      }
      this.playersLoaded = true;
      this.playerNamesInput = this.players.map(p => p.name).join(', ');
    }
  }

  ngOnDestroy(): void {
    this.stopGameLoop();
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


  incrementHomeScore(): void { this.homeScore++; this.cdr.detectChanges(); }
  decrementHomeScore(): void { if (this.homeScore > 0) { this.homeScore--; this.cdr.detectChanges(); } }
  incrementAwayScore(): void { this.awayScore++; this.cdr.detectChanges(); }
  decrementAwayScore(): void { if (this.awayScore > 0) { this.awayScore--; this.cdr.detectChanges(); } }


  loadPlayersFromInput(): void { this.processPlayerNames(this.playerNamesInput); }

  processPlayerNames(namesString: string): void {
    const namesArray = namesString.split(',').map(name => name.trim()).filter(name => name.length > 0);
    if (namesArray.length > 0) {
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
      id: index,
      name: name,
      isActive: false,
      highlightColor: this.availableColors[0],
      currentSessionStartTime: null,
      totalGameTime: 0,
      currentSessionDisplayTime$: new BehaviorSubject<number>(0),
      totalGameDisplayTime$: new BehaviorSubject<number>(0)
    }));
    this.savePlayers();
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
    this.stopGameLoop();

    if (resetAll) {
      this.gameTimeElapsed = 0;
      this.homeScore = 0;
      this.awayScore = 0;
    }
    this.isGameRunning = false;

    this.players.forEach(player => {
      player.isActive = false;
      player.currentSessionStartTime = null;
      player.totalGameTime = 0;
      player.currentSessionDisplayTime$?.next(0);
      player.totalGameDisplayTime$?.next(0);
      player._calculatedTotalTime = 0;
    });

    this.updatePlayerDisplay();
    this.cdr.detectChanges();
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
    const now = Date.now();
    this.players.forEach(player => {
      if (player.isActive && player.currentSessionStartTime === null) {
        player.currentSessionStartTime = now;
      }
    });

    this.startGameLoop();
  }

  pauseGame(): void {
    if (!this.isGameRunning) return;

    this.isGameRunning = false;
    this.stopGameLoop();

    const now = Date.now();
    this.players.forEach(player => {
      if (player.isActive && player.currentSessionStartTime !== null) {
        const elapsed = now - player.currentSessionStartTime;
        player.totalGameTime = Math.min(player.totalGameTime + elapsed, MAX_TIME_MS_MMSS);
      }
      player.currentSessionStartTime = null;
    });

    this.updatePlayerDisplay();
    this.cdr.detectChanges();
  }

  onPress(player: Player): void {
    this.longPressTimer = setTimeout(() => {
      this.openColorPicker(player);
      this.longPressTimer = null;
    }, 500);
  }

  cancelPress(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  onRelease(player: Player): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.togglePlayer(player);
    }
  }

  openColorPicker(player: Player): void {
    this.playerForColorChange = player;
    this.isColorPickerVisible = true;
  }

  selectColor(color: string): void {
    if (this.playerForColorChange) {
      this.playerForColorChange.highlightColor = color;
      this.savePlayers();
    }
    this.closeColorPicker();
  }

  closeColorPicker(): void {
    this.isColorPickerVisible = false;
    this.playerForColorChange = null;
  }

  savePlayers(): void {
    const playersToSave = this.players.map(p => {
      const { currentSessionDisplayTime$, totalGameDisplayTime$, ...rest } = p;
      return rest;
    });
    localStorage.setItem(this.localStorageKey, JSON.stringify(playersToSave));
  }

  togglePlayer(player: Player): void {
    if (this.gameTimeElapsed >= MAX_TIME_MS_MMSS && !player.isActive) return;

    const now = Date.now();
    const playerIndex = this.players.findIndex(p => p.id === player.id);
    if (playerIndex === -1) return;

    const updatedPlayer = { ...this.players[playerIndex] };
    const wasActive = updatedPlayer.isActive;
    updatedPlayer.isActive = !updatedPlayer.isActive;

    if (this.isGameRunning) {
      if (wasActive && !updatedPlayer.isActive) {
        if (updatedPlayer.currentSessionStartTime !== null) {
          const elapsed = now - updatedPlayer.currentSessionStartTime;
          updatedPlayer.totalGameTime = Math.min(updatedPlayer.totalGameTime + elapsed, MAX_TIME_MS_MMSS);
          updatedPlayer.currentSessionStartTime = null;
        }
      } else if (!wasActive && updatedPlayer.isActive) {
        updatedPlayer.currentSessionStartTime = now;
      }
    } else {
      if (!updatedPlayer.isActive) {
        updatedPlayer.currentSessionStartTime = null;
      }
    }

    const newPlayers = [...this.players];
    newPlayers[playerIndex] = updatedPlayer;
    this.players = newPlayers;

    this.updatePlayerDisplay();
    this.cdr.detectChanges();
  }

  trackById(index: number, player: Player): number { return player.id; }

  private startGameLoop(): void {
    if (this.animationFrameId) return;

    this.lastFrameTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
  }

  private stopGameLoop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private gameLoop(timestamp: number): void {
    if (!this.isGameRunning) {
      this.animationFrameId = null;
      return;
    }

    const deltaTime = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;

    this.gameTimeElapsed = Math.min(this.gameTimeElapsed + deltaTime, MAX_TIME_MS_MMSS);

    this.updatePlayerDisplay();

    if (this.gameTimeElapsed >= MAX_TIME_MS_MMSS) {
      this.handleGameEnd();
    } else {
      this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
    }

    this.cdr.detectChanges();
  }

  private updatePlayerDisplay(): void {
    const now = Date.now();
    this.players.forEach(player => {
      let currentSessionElapsed = 0;
      if (player.isActive && player.currentSessionStartTime !== null) {
        currentSessionElapsed = now - player.currentSessionStartTime;
      }
      player.currentSessionDisplayTime$.next(currentSessionElapsed);
      player.totalGameDisplayTime$.next(Math.min(player.totalGameTime + currentSessionElapsed, MAX_TIME_MS_MMSS));
    });
  }

  private handleGameEnd(): void {
    this.isGameRunning = false;
    this.stopGameLoop();

    const capTime = Date.now();
    this.players.forEach(player => {
      if (player.isActive && player.currentSessionStartTime !== null) {
        const elapsed = capTime - player.currentSessionStartTime;
        player.totalGameTime = Math.min(player.totalGameTime + elapsed, MAX_TIME_MS_MMSS);
      }
      player.currentSessionStartTime = null;
    });

    this.updatePlayerDisplay();
  }
}