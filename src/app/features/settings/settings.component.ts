import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
   selector: 'app-settings',
   standalone: true,
   imports: [
      CommonModule, ReactiveFormsModule, FormsModule, LucideAngularModule, MatProgressSpinnerModule
   ],
   template: `
    <div class="max-w-[1000px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div class="space-y-1">
        <h1 class="text-2xl font-black text-slate-900 tracking-tight">System Settings</h1>
        <p class="text-sm text-slate-500 font-medium">Configure your account, preferences, and external integrations.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        <!-- Sidebar Navigation (Desktop: Vertical, Mobile: Horizontal Scroll) -->
         <div class="md:col-span-3">
            <div class="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 gap-2 md:gap-1 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
               <button *ngFor="let tab of tabs" 
                       (click)="activeTab = tab.id"
                       [class]="activeTab === tab.id ? 'bg-primary text-white shadow-md md:bg-white md:text-primary md:shadow-sm md:border md:border-slate-200' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80'"
                       class="flex-shrink-0 flex items-center space-x-2 md:space-x-3 px-4 py-2.5 md:py-3 rounded-xl transition-all font-bold text-xs md:text-sm whitespace-nowrap">
                  <lucide-icon [name]="tab.icon" class="w-4 h-4 md:w-5 md:h-5"></lucide-icon>
                  <span>{{ tab.label }}</span>
               </button>
            </div>
         </div>

        <!-- Content Area -->
        <div class="md:col-span-9 space-y-6">
           
           <!-- Account Settings -->
            <div *ngIf="activeTab === 'account'" class="card-stitch p-5 md:p-8 bg-white space-y-6 md:space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
               <div class="flex items-center justify-between">
                  <h2 class="text-base md:text-lg font-black text-slate-900 uppercase tracking-wider">Account Details</h2>
                  <button class="text-primary font-bold text-[10px] md:text-xs uppercase tracking-widest hover:underline">Update</button>
               </div>

               <div class="flex flex-col lg:flex-row items-center lg:items-start gap-6 md:gap-8">
                  <div class="relative group cursor-pointer">
                     <div class="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary/50 shadow-sm">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" alt="Avatar" class="w-full h-full object-cover">
                        <div class="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                           <lucide-icon name="camera" class="text-white w-6 h-6"></lucide-icon>
                        </div>
                     </div>
                  </div>
                  <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full">
                     <div class="space-y-1.5">
                        <label class="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                        <input type="text" value="Alex Rivera" class="input-stitch font-bold text-slate-700 h-11 md:h-12 text-sm">
                     </div>
                     <div class="space-y-1.5">
                        <label class="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role Type</label>
                        <input type="text" value="Administrator" readonly class="input-stitch font-bold text-slate-400 bg-slate-100/50 cursor-not-allowed h-11 md:h-12 text-sm">
                     </div>
                     <div class="space-y-1.5 md:col-span-2">
                        <label class="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                        <input type="email" value="alex.rivera@example.com" class="input-stitch font-bold text-slate-700 h-11 md:h-12 text-sm">
                     </div>
                  </div>
               </div>
            </div>

           <!-- Notification Preferences -->
            <div *ngIf="activeTab === 'notifications'" class="card-stitch p-5 md:p-8 bg-white space-y-6 md:space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
               <h2 class="text-base md:text-lg font-black text-slate-900 uppercase tracking-wider">Notification Preferences</h2>
               
               <div class="space-y-3 md:space-y-4">
                  <div *ngFor="let pref of notifications" class="flex items-center justify-between p-4 rounded-xl bg-slate-50/50 border border-slate-100 transition-all hover:bg-slate-50">
                     <div class="flex items-center space-x-3 md:space-x-4 min-w-0">
                        <div class="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm flex-shrink-0">
                           <lucide-icon [name]="pref.icon" class="w-4 h-4 md:w-5 md:h-5"></lucide-icon>
                        </div>
                        <div class="min-w-0">
                           <p class="text-xs md:text-[13px] font-bold text-slate-800 leading-tight truncate">{{ pref.label }}</p>
                           <p class="text-[10px] md:text-[11px] text-slate-500 font-medium mt-0.5 truncate">{{ pref.desc }}</p>
                        </div>
                     </div>
                     <button class="w-10 md:w-12 h-5 md:h-6 rounded-full bg-primary relative transition-all flex items-center flex-shrink-0">
                        <div class="w-3 md:w-4 h-3 md:h-4 bg-white rounded-full ml-auto mr-1 shadow-sm"></div>
                     </button>
                  </div>
               </div>
            </div>

            <!-- Sync Status -->
            <div *ngIf="activeTab === 'sync'" class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               <div class="card-stitch p-5 md:p-8 bg-white space-y-6 relative overflow-hidden">
                  <div class="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-primary/5 rounded-bl-full -mr-12 md:-mr-16 -mt-12 md:-mt-16 border border-primary/20"></div>
                  
                  <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:space-x-4">
                     <div class="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-success/10 flex items-center justify-center shadow-lg shadow-success/20 border border-success/20">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/3/30/Google_Sheets_logo_%282014-2020%29.svg" alt="Sheets" class="w-6 h-6 md:w-7 md:h-7">
                     </div>
                     <div>
                        <h2 class="text-base md:text-lg font-black text-slate-900 uppercase tracking-wider">Google Sheets Sync</h2>
                        <div class="flex items-center space-x-2 mt-0.5">
                           <span class="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                           <span class="text-[10px] md:text-[11px] font-black text-success-text uppercase tracking-widest italic">Live & Connected</span>
                        </div>
                     </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 pt-2">
                     <div class="p-4 rounded-xl border border-slate-100 bg-slate-50/30">
                        <span class="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Master Database</span>
                        <p class="text-xs md:text-sm font-bold text-slate-700 truncate">Ecommerce Admin DB - Main V2</p>
                     </div>
                     <div class="p-4 rounded-xl border border-slate-100 bg-slate-50/30">
                        <span class="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Last Full Sync</span>
                        <p class="text-xs md:text-sm font-bold text-slate-700">Mar 10, 2026 - 08:45 AM</p>
                     </div>
                  </div>

                  <div class="pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                     <button class="text-primary font-bold text-[10px] md:text-xs uppercase tracking-widest hover:underline px-2 py-1">Connection Details</button>
                     <button class="w-full sm:w-auto bg-primary hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all font-bold text-xs md:text-sm flex items-center justify-center space-x-2 active:scale-95">
                        <lucide-icon name="refresh-cw" class="w-4 h-4 md:w-5 md:h-5"></lucide-icon>
                        <span>Force Re-sync</span>
                     </button>
                  </div>
               </div>

               <!-- Integration Log -->
               <div class="card-stitch bg-slate-900 text-white p-5 md:p-6 font-mono text-[9px] md:text-[11px] space-y-2 opacity-95 shadow-2xl relative overflow-hidden">
                  <div class="absolute top-0 left-0 w-1 h-full bg-success/50"></div>
                  <p class="text-success/90">[08:45:01] INFO: Connecting to Google Sheets API...</p>
                  <p class="text-success/90">[08:45:02] INFO: Fetching range 'Orders!A1:Z500'</p>
                  <p class="text-success/90">[08:45:03] SUCCESS: Synchronized 432 entries.</p>
                  <p class="text-slate-500">[08:45:03] IDLE: Awaiting next trigger...</p>
               </div>
            </div>

        </div>
      </div>
    </div>
  `,
   styles: [`
    :host { display: block; }
  `]
})
export class SettingsComponent {
   activeTab = 'account';

   tabs = [
      { id: 'account', label: 'Account Settings', icon: 'user' },
      { id: 'notifications', label: 'Notifications', icon: 'bell' },
      { id: 'sync', label: 'Google Sheets Sync', icon: 'refresh-cw' },
      { id: 'team', label: 'Team Management', icon: 'users' }
   ];

   notifications = [
      { label: 'New Order Email', desc: 'Get notified immediately when a new order is received.', icon: 'mail' },
      { label: 'Daily Sales Summary', desc: 'A recap of all transactions delivered at 8:00 AM.', icon: 'trending-up' },
      { label: 'Low Stock Alerts', desc: 'Alert when products fall below the safety threshold.', icon: 'package' },
      { label: 'Sync Failures', desc: 'Notify if the Google Sheets connection is interrupted.', icon: 'alert-triangle' }
   ];
}
