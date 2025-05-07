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

    const MAX_DISPLAY_HOURS = 99;
    const MAX_DISPLAY_MINUTES = 59;
    const MAX_TOTAL_MINUTES_FOR_CAP = (MAX_DISPLAY_HOURS * 60) + MAX_DISPLAY_MINUTES;

    const totalMillis = Math.max(0, value);
    const actualTotalSeconds = Math.floor(totalMillis / 1000);
    const actualTotalMinutes = Math.floor(actualTotalSeconds / 60);

    let displayHours: number;
    let displayMinutesInHour: number;

    if (actualTotalMinutes >= MAX_TOTAL_MINUTES_FOR_CAP) {
      displayHours = MAX_DISPLAY_HOURS;
      displayMinutesInHour = MAX_DISPLAY_MINUTES;
    } else {
      displayHours = Math.floor(actualTotalMinutes / 60);
      displayMinutesInHour = actualTotalMinutes % 60;
    }

    const hoursStr = displayHours.toString().padStart(2, '0');
    const minutesStr = displayMinutesInHour.toString().padStart(2, '0');

    return `${hoursStr}:${minutesStr}`;
  }
}
