import { Component, Input, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngClass]="['bg-white border text-text rounded-card shadow-card', noPadding ? '' : 'p-6', customClasses]">
      <!-- Card Header -->
      <div *ngIf="title || subtitle || hasHeaderAction" class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 *ngIf="title" class="text-base font-bold text-text">{{ title }}</h3>
          <p *ngIf="subtitle" class="text-sm text-text-muted mt-1">{{ subtitle }}</p>
        </div>
        <div *ngIf="hasHeaderAction">
          <ng-content select="[card-action]"></ng-content>
        </div>
      </div>
      
      <!-- Card Body -->
      <ng-content></ng-content>

      <!-- Card Footer -->
      <div *ngIf="hasFooter" class="mt-6 pt-6 border-t border-border">
        <ng-content select="[card-footer]"></ng-content>
      </div>
    </div>
  `,
  encapsulation: ViewEncapsulation.None
})
export class CardComponent {
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() noPadding: boolean = false;
  @Input() hasHeaderAction: boolean = false;
  @Input() hasFooter: boolean = false;
  @Input() customClasses: string = 'border-border';
}
