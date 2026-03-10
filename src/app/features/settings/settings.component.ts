import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [
        CommonModule, ReactiveFormsModule, FormsModule, MatIconModule, MatProgressSpinnerModule
    ],
    template: `
    <div class="max-w-[1000px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div class="space-y-1">
        <h1 class="text-2xl font-black text-slate-900 tracking-tight">System Settings</h1>
        <p class="text-sm text-slate-500 font-medium">Configure your account, preferences, and external integrations.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        <!-- Sidebar Navigation -->
        <div class="md:col-span-3 space-y-2">
           <button *ngFor="let tab of tabs" 
                   (click)="activeTab = tab.id"
                   [class]="activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'"
                   class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-bold text-sm">
              <mat-icon class="!text-xl">{{ tab.icon }}</mat-icon>
              <span>{{ tab.label }}</span>
           </button>
        </div>

        <!-- Content Area -->
        <div class="md:col-span-9 space-y-6">
           
           <!-- Account Settings -->
           <div *ngIf="activeTab === 'account'" class="card-stitch p-8 bg-white space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div class="flex items-center justify-between">
                 <h2 class="text-lg font-black text-slate-900">Account Details</h2>
                 <button class="text-blue-600 font-bold text-xs uppercase tracking-widest hover:underline">Update Profile</button>
              </div>

              <div class="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8">
                 <div class="relative group cursor-pointer">
                    <div class="w-24 h-24 rounded-3xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-400">
                       <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" alt="Avatar" class="w-full h-full object-cover">
                       <div class="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <mat-icon class="text-white">photo_camera</mat-icon>
                       </div>
                    </div>
                 </div>
                 <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    <div class="space-y-1.5">
                       <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                       <input type="text" value="Alex Rivera" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-700">
                    </div>
                    <div class="space-y-1.5">
                       <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role Type</label>
                       <input type="text" value="Administrator" readonly class="w-full bg-slate-100 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-400 cursor-not-allowed">
                    </div>
                    <div class="space-y-1.5 md:col-span-2">
                       <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                       <input type="email" value="alex.rivera@example.com" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-700">
                    </div>
                 </div>
              </div>
           </div>

           <!-- Notification Preferences -->
           <div *ngIf="activeTab === 'notifications'" class="card-stitch p-8 bg-white space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 class="text-lg font-black text-slate-900">Notification Preferences</h2>
              
              <div class="space-y-4">
                 <div *ngFor="let pref of notifications" class="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-100 transition-all hover:bg-slate-50">
                    <div class="flex items-center space-x-4">
                       <div class="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
                          <mat-icon class="!text-lg">{{ pref.icon }}</mat-icon>
                       </div>
                       <div>
                          <p class="text-[13px] font-bold text-slate-800 leading-tight">{{ pref.label }}</p>
                          <p class="text-[11px] text-slate-400 font-medium mt-0.5">{{ pref.desc }}</p>
                       </div>
                    </div>
                    <button class="w-12 h-6 rounded-full bg-blue-600 relative transition-all flex items-center">
                       <div class="w-4 h-4 bg-white rounded-full ml-auto mr-1 shadow-sm"></div>
                    </button>
                 </div>
              </div>
           </div>

           <!-- Sync Status -->
           <div *ngIf="activeTab === 'sync'" class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div class="card-stitch p-8 bg-white space-y-6 relative overflow-hidden">
                 <div class="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-bl-full -mr-16 -mt-16 border border-blue-100"></div>
                 
                 <div class="flex items-center space-x-4">
                    <div class="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center shadow-lg shadow-emerald-100">
                       <img src="https://upload.wikimedia.org/wikipedia/commons/3/30/Google_Sheets_logo_%282014-2020%29.svg" alt="Sheets" class="w-7 h-7">
                    </div>
                    <div>
                       <h2 class="text-lg font-black text-slate-900">Google Sheets Integration</h2>
                       <div class="flex items-center space-x-2 mt-0.5">
                          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span class="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">Connected & Healthy</span>
                       </div>
                    </div>
                 </div>

                 <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div class="p-4 rounded-2xl border border-slate-100 bg-slate-50/30">
                       <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Target Spreadsheet</span>
                       <p class="text-sm font-bold text-slate-700 truncate">Ecommerce Admin DB - Main V2</p>
                    </div>
                    <div class="p-4 rounded-2xl border border-slate-100 bg-slate-50/30">
                       <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Last Synchronized</span>
                       <p class="text-sm font-bold text-slate-700">Mar 10, 2026 - 08:45 AM</p>
                    </div>
                 </div>

                 <div class="pt-6 border-t border-slate-100 flex justify-between items-center">
                    <button class="text-blue-600 font-bold text-xs uppercase tracking-widest hover:underline px-2 py-1">Advanced Connection Settings</button>
                    <button class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow-xl shadow-blue-100 transition-all font-bold text-[13px] flex items-center space-x-2 active:scale-95">
                       <mat-icon class="!text-lg">sync</mat-icon>
                       <span>Force Re-sync</span>
                    </button>
                 </div>
              </div>

              <!-- Integration Log -->
              <div class="card-stitch bg-slate-900 text-white p-6 font-mono text-[11px] space-y-2 opacity-90 shadow-2xl">
                 <p class="text-emerald-400">[08:45:01] INFO: Connecting to Google Sheets API...</p>
                 <p class="text-emerald-400">[08:45:02] INFO: Fetching range 'Orders!A1:Z500'</p>
                 <p class="text-emerald-400">[08:45:03] SUCCESS: Successfully synchronized 432 entries.</p>
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
        { id: 'account', label: 'Account Settings', icon: 'person' },
        { id: 'notifications', label: 'Notifications', icon: 'notifications' },
        { id: 'sync', label: 'Google Sheets Sync', icon: 'sync' },
        { id: 'team', label: 'Team Management', icon: 'groups' }
    ];

    notifications = [
        { label: 'New Order Email', desc: 'Get notified immediately when a new order is received.', icon: 'mail' },
        { label: 'Daily Sales Summary', desc: 'A recap of all transactions delivered at 8:00 AM.', icon: 'trending_up' },
        { label: 'Low Stock Alerts', desc: 'Alert when products fall below the safety threshold.', icon: 'inventory' },
        { label: 'Sync Failures', desc: 'Notify if the Google Sheets connection is interrupted.', icon: 'error' }
    ];
}
