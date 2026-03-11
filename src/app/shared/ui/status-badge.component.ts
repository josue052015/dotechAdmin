import { Component, Input, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-status-badge',
    standalone: true,
    imports: [CommonModule],
    template: `
    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" [ngClass]="colorClass">
      {{ status }}
    </span>
  `
})
export class StatusBadgeComponent {
    @Input() set status(val: string) {
        this._status.set(val || 'Desconocido');
    }

    get status() {
        return this._status();
    }

    private _status = signal<string>('Desconocido');

    get colorClass(): string {
        const s = this._status().toLowerCase();

        if (s.includes('cancelado') || s.includes('desaparecido')) return 'bg-danger text-danger-text';
        if (s.includes('dinero recibido') || s.includes('entregado') || s.includes('completado')) return 'bg-success text-success-text';
        if (s.includes('confirmado completo') || s.includes('empacado') || s.includes('en proceso')) return 'bg-info text-info-text';
        if (s.includes('envio')) return 'bg-primary/10 text-primary';

        // pending / unconfirmed
        return 'bg-warning text-warning-text';
    }
}
