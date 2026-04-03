import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { ownerGuard } from './core/guards/owner.guard';
import { LayoutComponent } from './layout/layout.component';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'access-denied',
        loadComponent: () => import('./features/auth/access-denied/access-denied.component').then(m => m.AccessDeniedComponent)
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
                canActivate: [ownerGuard],
                loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
            },
            {
                path: 'orders',
                canActivate: [ownerGuard],
                loadComponent: () => import('./features/orders/order-list/order-list.component').then(m => m.OrderListComponent)
            },
            {
                path: 'orders/new',
                canActivate: [ownerGuard],
                loadComponent: () => import('./features/orders/order-form/order-form.component').then(m => m.OrderFormComponent)
            },
            {
                path: 'orders/:id',
                canActivate: [ownerGuard],
                loadComponent: () => import('./features/orders/order-detail/order-detail.component').then(m => m.OrderDetailComponent)
            },
            {
                path: 'orders/:id/edit',
                canActivate: [ownerGuard],
                loadComponent: () => import('./features/orders/order-form/order-form.component').then(m => m.OrderFormComponent)
            },
            {
                path: 'abandoned-orders',
                canActivate: [ownerGuard],
                loadComponent: () => import('./features/abandoned-orders/abandoned-order-list/abandoned-order-list.component').then(m => m.AbandonedOrderListComponent)
            },
            {
                path: 'abandoned-orders/:id',
                canActivate: [ownerGuard],
                loadComponent: () => import('./features/abandoned-orders/abandoned-order-detail/abandoned-order-detail.component').then(m => m.AbandonedOrderDetailComponent)
            },
            {
                path: 'products',
                canActivate: [ownerGuard],
                loadComponent: () => import('./features/products/product-list/product-list.component').then(m => m.ProductListComponent)
            },
            {
                path: 'messages',
                canActivate: [ownerGuard],
                loadComponent: () => import('./features/messages/message-list/message-list.component').then(m => m.MessageListComponent)
            },
            {
                path: 'settings',
                canActivate: [ownerGuard],
                loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
            }
        ]
    },
    {
        path: '**',
        redirectTo: 'login'
    }
];
