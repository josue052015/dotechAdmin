import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class GoogleSheetsService {
    private http = inject(HttpClient);
    private readonly API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${environment.spreadsheetId}`;

    // Generic Read
    public readRange(range: string): Observable<any> {
        return this.http.get(`${this.API_URL}/values/${range}`);
    }

    // Generic Append (Insert Row)
    public appendRow(range: string, values: any[][]): Observable<any> {
        const body = { values };
        return this.http.post(`${this.API_URL}/values/${range}:append?valueInputOption=USER_ENTERED`, body);
    }

    // Generic Update (Update Row)
    public updateRow(range: string, values: any[][]): Observable<any> {
        const body = { values };
        return this.http.put(`${this.API_URL}/values/${range}?valueInputOption=USER_ENTERED`, body);
    }

    // Generic Clear (Delete Row / Clear Range)
    public clearRange(range: string): Observable<any> {
        return this.http.post(`${this.API_URL}/values/${range}:clear`, {});
    }
}
