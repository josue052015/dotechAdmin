import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { LucideAngularModule } from 'lucide-angular';
import {
  LayoutGrid, ShoppingCart, Package, Users, Settings,
  Search, Bell, Pencil, User, ShoppingBag, Truck,
  FileText, ChevronDown, Copy, Send, MessageSquare,
  LogOut, Plus, Filter, MoreVertical, CheckCircle,
  XCircle, Clock, AlertCircle, Trash2, Menu, Calendar,
  BarChart2, ArrowUpRight, AlertTriangle, MapPin, Phone,
  ChevronRight, Camera, RefreshCw, Mail, TrendingUp, TrendingDown, Info,
  LayoutDashboard, ArrowLeft, CheckCheck, Smile, Paperclip, Mic, Banknote,
  History, FilterX, Check, CalendarDays, CalendarRange, Clock3,
  Shield, ShieldCheck, ShieldAlert,
  Download, X, FileSpreadsheet, Activity,
  Edit3, LayoutList, Save, MousePointer2, ArrowRight
} from 'lucide-angular';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    importProvidersFrom(LucideAngularModule.pick({
      LayoutGrid, ShoppingCart, Package, Users, Settings,
      Search, Bell, Pencil, User, ShoppingBag, Truck,
      FileText, ChevronDown, Copy, Send, MessageSquare,
      LogOut, Plus, Filter, MoreVertical, CheckCircle,
      XCircle, Clock, AlertCircle, Trash2, Menu, Calendar,
      BarChart2, ArrowUpRight, AlertTriangle, MapPin, Phone,
      ChevronRight, Camera, RefreshCw, Mail, TrendingUp, TrendingDown, Info,
      ArrowLeft, CheckCheck, Smile, Paperclip, Mic, Banknote,
      History, FilterX, Check, CalendarDays, CalendarRange, Clock3,
      Shield, ShieldCheck, ShieldAlert,
      Download, X, FileSpreadsheet, Activity, LayoutDashboard,
      Edit3, LayoutList, Save, MousePointer2, ArrowRight
    }))
  ]
};
