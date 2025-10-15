import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class TimeService {
    private startTime = performance.now();

    constructor() { }

    reset(): void {
        this.startTime = performance.now();
    }

    now(): number {
        return performance.now();
    }
}
