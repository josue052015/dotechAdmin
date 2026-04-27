import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class GoogleSheetsService {
    private http = inject(HttpClient);
    private readonly API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${environment.spreadsheetId}`;

    // Generic Read
    public readRange(range: string): Observable<any> {
        return this.http.get(`${this.API_URL}/values/${encodeURIComponent(range)}`);
    }

    // Chunked Read
    public readSheetChunk(sheetName: string, startRow: number, endRow: number, columnsRange: string = 'A:Z'): Observable<any> {
        const range = `'${sheetName}'!${columnsRange.split(':')[0]}${startRow}:${columnsRange.split(':')[1]}${endRow}`;
        return this.readRange(range);
    }

    // Read Header Only (Row 1)
    public readHeader(sheetName: string, columnsRange: string = 'A:Z'): Observable<string[]> {
        const range = `'${sheetName}'!${columnsRange.split(':')[0]}1:${columnsRange.split(':')[1]}1`;
        return this.readRange(range).pipe(
            map(response => (response.values && response.values.length > 0) ? response.values[0] : [])
        );
    }

    // Batch Read multiple ranges
    public batchReadRanges(ranges: string[]): Observable<any> {
        const params = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
        return this.http.get(`${this.API_URL}/values:batchGet?${params}`);
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
