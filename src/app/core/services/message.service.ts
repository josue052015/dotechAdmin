import { Injectable, inject, signal } from '@angular/core';
import { GoogleSheetsService } from './google-sheets.service';
import { MessageTemplate } from '../models/message.model';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Order } from '../models/order.model';
import { GoogleAuthService } from './google-auth.service';
import { effect, untracked } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class MessageService {
    private sheetsService = inject(GoogleSheetsService);
    private auth = inject(GoogleAuthService);
    private readonly SHEET_NAME = 'Templates';
    private readonly BUSINESS_PHONE = '+18297024201';

    public templates = signal<MessageTemplate[]>([]);
    public isLoading = signal<boolean>(false);

    constructor() {
        effect(() => {
            if (this.auth.isAuthorized()) {
                untracked(() => this.loadTemplates());
            } else {
                untracked(() => this.templates.set([]));
            }
        });
    }

    public loadTemplates(): void {
        if (!this.auth.isAuthorized()) return;
        this.isLoading.set(true);
        this.sheetsService.readRange(`${this.SHEET_NAME}!A2:C`).subscribe({
            next: (response) => {
                const rows = response.values || [];
                const parsed: MessageTemplate[] = rows
                    .map((row: any[], index: number) => {
                        const rowNumber = index + 2;
                        return {
                            _rowNumber: rowNumber,
                            id: row[0] || rowNumber.toString(),
                            name: row[1] || '',
                            text: row[2] || ''
                        };
                    })
                    .filter((msg: MessageTemplate) => msg.id || msg.name);

                // Fallback if no templates found
                if (parsed.length === 0) {
                    parsed.push({
                        id: 'default',
                        name: 'Mensaje Estándar',
                        text: 'Hola {{FullName}}, te escribimos de Dotech. Tu pedido de {{ProductName}} por RD$ {{Price}} está {{Status}}.'
                    });
                }

                this.templates.set(parsed);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error loading templates', err);
                // Even on error, provide at least one template
                this.templates.set([{
                    id: 'default',
                    name: 'Mensaje Estándar',
                    text: 'Hola {{FullName}}, te escribimos de Dotech. Tu pedido de {{ProductName}} por RD$ {{Price}} está {{Status}}.'
                }]);
                this.isLoading.set(false);
            }
        });
    }

    public createTemplate(template: MessageTemplate): Observable<any> {
        const row = ['', template.name, template.text];
        return this.sheetsService.appendRow(`${this.SHEET_NAME}!A:C`, [row]).pipe(
            tap(() => this.loadTemplates())
        );
    }

    public updateTemplate(rowNumber: number, template: MessageTemplate): Observable<any> {
        const row = [template.id, template.name, template.text];
        return this.sheetsService.updateRow(`${this.SHEET_NAME}!A${rowNumber}:C${rowNumber}`, [row]).pipe(
            tap(() => this.loadTemplates())
        );
    }

    public generateWhatsAppUrl(order: Order, templateText: string): string {
        let replacedText = templateText;

        // Map of friendly aliases and all direct order fields
        const variables: Record<string, any> = {
            ...order,
            'FullName': order.fullName,
            'ProductName': order.productName,
            'Price': order.productPrice,
            'Status': order.status,
            'OrderID': order.id || order['_rowNumber'],
            'Address': order.address1 || '',
            'TrackingNumber': order.id || order['_rowNumber']
        };

        // Dynamically replace any {{variable}} that matches a key in our map
        Object.keys(variables).forEach(key => {
            const value = variables[key];
            const regex = new RegExp(`{{${key}}}`, 'gi');
            replacedText = replacedText.replace(regex, String(value ?? ''));
        });

        const encodedText = encodeURIComponent(replacedText);

        // Ensure phone is a string and remove non-numeric characters
        let cleanPhone = String(order.phone || '').replace(/\D/g, '');

        // If it's a 10-digit local number (common in DR), prepend '1' for international format
        if (cleanPhone.length === 10 && (cleanPhone.startsWith('809') || cleanPhone.startsWith('829') || cleanPhone.startsWith('849'))) {
            cleanPhone = '1' + cleanPhone;
        }
        return `https://wa.me/${cleanPhone}?text=${encodedText}`;
    }

    public deleteTemplate(rowNumber: number): Observable<any> {
        return this.sheetsService.clearRange(`${this.SHEET_NAME}!A${rowNumber}:C${rowNumber}`).pipe(
            tap(() => this.loadTemplates())
        );
    }
}
