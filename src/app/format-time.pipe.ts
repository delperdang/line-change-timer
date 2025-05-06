import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatTimePipe',
  standalone: true
})
export class FormatTimePipe implements PipeTransform {

  transform(milliseconds: number | null | undefined): string {
    if (milliseconds === null || milliseconds === undefined || milliseconds < 0) {
        milliseconds = 0;
    }

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
}