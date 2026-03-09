import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Province {
    name: string;
    cities: string[];
}

@Injectable({
    providedIn: 'root'
})
export class LocationService {
    private data: Province[] = [];

    constructor() {
        this.loadData();
    }

    private async loadData() {
        try {
            const response = await fetch('/assets/data/dr-locations.json');
            const json = await response.json();
            this.data = json.provinces as Province[];
        } catch (e) {
            console.error('Failed to load DR locations', e);
        }
    }

    public getProvinces(): Observable<string[]> {
        if (this.data.length === 0) {
            return new Observable(observer => {
                setTimeout(() => {
                    observer.next(this.data.map(p => p.name).sort());
                    observer.complete();
                }, 500); // give it time to load if called immediately
            });
        }
        return of(this.data.map(p => p.name).sort());
    }

    public getCities(provinceName: string): Observable<string[]> {
        if (this.data.length === 0) {
            return new Observable(observer => {
                setTimeout(() => {
                    const prov = this.data.find(p => p.name === provinceName);
                    observer.next(prov ? prov.cities.sort() : []);
                    observer.complete();
                }, 500);
            });
        }
        const prov = this.data.find(p => p.name === provinceName);
        return of(prov ? prov.cities.sort() : []);
    }
}
