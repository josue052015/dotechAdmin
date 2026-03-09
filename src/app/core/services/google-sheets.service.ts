import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { GoogleAuthService } from './google-auth.service';

@Injectable({
    providedIn: 'root'
})
export class GoogleSheetsService {
    private http = inject(HttpClient);
    private auth = inject(GoogleAuthService);

    private readonly API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${environment.spreadsheetId}`;

    private getHeaders(): HttpHeaders {
        const token = this.auth.accessToken();
        if (!token) {
            throw new Error('Not authenticated');
        }
        return new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });
    }

    // Generic Read
    public readRange(range: string): Observable<any> {
        return this.http.get(`${this.API_URL}/values/${range}`, { headers: this.getHeaders() }).pipe(
            catchError(error => {
                console.error('Error reading from Sheets API', error);
                return throwError(() => error);
            })
        );
    }

    // Generic Append (Insert Row)
    public appendRow(range: string, values: any[][]): Observable<any> {
        const body = {
            values: values
        };
        return this.http.post(`${this.API_URL}/values/${range}:append?valueInputOption=USER_ENTERED`, body, { headers: this.getHeaders() }).pipe(
            catchError(error => {
                console.error('Error appending to Sheets API', error);
                return throwError(() => error);
            })
        );
    }

    // Generic Update (Update Row)
    public updateRow(range: string, values: any[][]): Observable<any> {
        const body = {
            values: values
        };
        return this.http.put(`${this.API_URL}/values/${range}?valueInputOption=USER_ENTERED`, body, { headers: this.getHeaders() }).pipe(
            catchError(error => {
                console.error('Error updating Sheets API', error);
                return throwError(() => error);
            })
        );
    }

    // Generic Clear (Delete Row / Clear Range)
    public clearRange(range: string): Observable<any> {
        return this.http.post(`${this.API_URL}/values/${range}:clear`, {}, { headers: this.getHeaders() }).pipe(
            catchError(error => {
                console.error('Error clearing Sheets API', error);
                return throwError(() => error);
            })
        );
    }
}
