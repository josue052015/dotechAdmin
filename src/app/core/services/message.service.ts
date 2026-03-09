import { Injectable, inject, signal } from '@angular/core';
import { GoogleSheetsService } from './google-sheets.service';
import { MessageTemplate } from '../models/message.model';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Order } from '../models/order.model';

@Injectable({
    providedIn: 'root'
})
export class MessageService {
    private sheetsService = inject(GoogleSheetsService);
    private readonly SHEET_NAME = 'Templates';
    private readonly BUSINESS_PHONE = '+18297024201';

    public templates = signal<MessageTemplate[]>([]);
    public isLoading = signal<boolean>(false);

    public loadTemplates(): void {
        this.isLoading.set(true);
        this.sheetsService.readRange(`${this.SHEET_NAME}!A2:C`).subscribe({
            next: (response) => {
                const rows = response.values || [];
                const parsed: MessageTemplate[] = rows.map((row: any[], index: number) => ({
                    _rowNumber: index + 2,
                    id: row[0] || '',
                    name: row[1] || '',
                    text: row[2] || ''
                }));
                this.templates.set(parsed);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error loading templates', err);
                this.isLoading.set(false);
            }
        });
    }

    public createTemplate(template: MessageTemplate): Observable<any> {
        template.id = crypto.randomUUID();
        const row = [template.id, template.name, template.text];
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
        let replacedText = templateText
            .replace(/{{FullName}}/g, order.fullName || '')
            .replace(/{{ProductName}}/g, order.productName || '')
            .replace(/{{Price}}/g, (order.productPrice || 0).toString())
            .replace(/{{Status}}/g, order.status || '')
            .replace(/{{City}}/g, order.city || '');

        const encodedText = encodeURIComponent(replacedText);
        // Use the customer's phone number as the recipient
        // Using business phone if we were to send it to the business? The prompt says "SEND WHATSAPP MESSAGE"
        // "The system opens WhatsApp Web with the prepared message. Use this format: https://wa.me/PHONE?text=MESSAGE"
        // Usually, you send TO the customer FROM the business.
        // The link format uses the customer's phone here:
        const cleanPhone = (order.phone || '').replace(/\D/g, '');
        return `https://wa.me/${cleanPhone}?text=${encodedText}`;
    }
}
