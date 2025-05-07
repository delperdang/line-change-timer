import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatTimePipe',
  standalone: true
})
export class FormatTimePipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined || isNaN(value) || value < 0) {
      return '00:00';
    }

    const MAX_DISPLAY_MINUTES = 99;
    const MAX_DISPLAY_SECONDS = 59;
    const MAX_TOTAL_SECONDS_FOR_CAP = (MAX_DISPLAY_MINUTES * 60) + MAX_DISPLAY_SECONDS;

    const totalMillis = Math.max(0, value);
    const actualTotalSeconds = Math.floor(totalMillis / 1000);

    let displayMinutes: number;
    let displaySeconds: number;

    if (actualTotalSeconds >= MAX_TOTAL_SECONDS_FOR_CAP) {
      displayMinutes = MAX_DISPLAY_MINUTES;
      displaySeconds = MAX_DISPLAY_SECONDS;
    } else {
      displayMinutes = Math.floor(actualTotalSeconds / 60);
      displaySeconds = actualTotalSeconds % 60;
    }

    const minutesStr = displayMinutes.toString().padStart(2, '0');
    const secondsStr = displaySeconds.toString().padStart(2, '0');

    return `${minutesStr}:${secondsStr}`;
  }
}