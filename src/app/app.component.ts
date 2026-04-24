import { Component, inject, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SyncService } from './core/services/sync.service';
import { GoogleAuthService } from './core/services/google-auth.service';
import { SplashScreenComponent } from './shared/components/splash-screen/splash-screen.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SplashScreenComponent],
  template: `
    @if (showSplash()) {
      <app-splash-screen></app-splash-screen>
    } @else {
      <router-outlet></router-outlet>
    }
  `
})
export class AppComponent {
  title = 'adminApp';
  public syncService = inject(SyncService);
  public auth = inject(GoogleAuthService);

  constructor() {
    // Safety timeout: If splash screen persists for more than 5 seconds,
    // force redirect to login to avoid getting stuck in a blank or infinite loading state.
    setTimeout(() => {
      if (this.showSplash()) {
        console.warn('[App] Splash screen safety timeout reached. Redirecting to login...');
        this.auth.clearLocalSession(); 
        window.location.href = '/login';
      }
    }, 5000);
  }

  showSplash = computed(() => {
    // Keep splash while:
    // 1. Auth is booting (script loading, initial check)
    // 2. Auth is verifying session (fetching profile, checking spreadsheet access)
    // 3. User is already authorized but we haven't finished the first data sync
    return this.auth.isInitializing() || 
           this.auth.isVerifying() || 
           (this.auth.isAuthorized() && !this.syncService.isInitialSyncDone());
  });
}
