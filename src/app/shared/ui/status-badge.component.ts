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

        if (s.includes('cancelado') || s.includes('desaparecido')) return 'bg-red-100 text-red-800';
        if (s.includes('dinero recibido') || s.includes('entregado')) return 'bg-green-100 text-green-800';
        if (s.includes('confirmado completo') || s.includes('empacado')) return 'bg-blue-100 text-blue-800';
        if (s.includes('envio en proceso')) return 'bg-indigo-100 text-indigo-800';

        // pending / unconfirmed
        return 'bg-yellow-100 text-yellow-800';
    }
}
