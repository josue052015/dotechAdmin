import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SyncService } from './core/services/sync.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`
})
export class AppComponent {
  title = 'adminApp';
  private syncService = inject(SyncService);
}
