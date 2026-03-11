import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled || loading"
      (click)="onClick.emit($event)"
      [ngClass]="[baseClasses, variantClasses[variant], sizeClasses[size], customClasses, disabled ? disabledClasses : 'active:scale-95']"
      class="inline-flex items-center justify-center transition-all focus:outline-none"
    >
      <ng-container *ngIf="loading">
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </ng-container>
      
      <span class="flex items-center space-x-2" [class.opacity-0]="loading">
        <ng-content></ng-content>
      </span>
    </button>
  `
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled: boolean = false;
  @Input() loading: boolean = false;
  @Input() customClasses: string = '';
  
  @Output() onClick = new EventEmitter<Event>();

  baseClasses = 'font-bold rounded-ui shadow-sm disabled:opacity-50 disabled:cursor-not-allowed';
  
  disabledClasses = 'opacity-50 cursor-not-allowed';

  variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-primary text-primary-foreground hover:bg-blue-700 shadow-md',
    secondary: 'bg-white text-text border border-border hover:bg-slate-50',
    tertiary: 'bg-slate-100 text-text hover:bg-slate-200',
    ghost: 'bg-transparent text-text-muted hover:bg-slate-100 hover:text-text shadow-none',
    danger: 'bg-danger text-danger-text hover:bg-red-200'
  };

  sizeClasses: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
}
