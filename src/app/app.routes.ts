import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LayoutComponent } from './layout/layout.component';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: '',
        component: LayoutComponent,
        canActivate: [authGuard],
        children: [
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            },
            {
                path: 'dashboard',
                loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
            },
            {
                path: 'orders',
                loadComponent: () => import('./features/orders/order-list/order-list.component').then(m => m.OrderListComponent)
            },
            {
                path: 'orders/new',
                loadComponent: () => import('./features/orders/order-form/order-form.component').then(m => m.OrderFormComponent)
            },
            {
                path: 'orders/:id',
                loadComponent: () => import('./features/orders/order-detail/order-detail.component').then(m => m.OrderDetailComponent)
            },
            {
                path: 'orders/:id/edit',
                loadComponent: () => import('./features/orders/order-form/order-form.component').then(m => m.OrderFormComponent)
            },
            {
                path: 'products',
                loadComponent: () => import('./features/products/product-list/product-list.component').then(m => m.ProductListComponent)
            },
            {
                path: 'messages',
                loadComponent: () => import('./features/messages/message-list/message-list.component').then(m => m.MessageListComponent)
            },
            {
                path: 'settings',
                loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
            }
        ]
    },
    {
        path: '**',
        redirectTo: 'login'
    }
];
