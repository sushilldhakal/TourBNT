# Role Management System

Centralized role and authentication management for the application.

## Overview

This system provides centralized utilities for managing user roles and authentication across both frontend and backend.

## User Roles

### Available Roles

1. **admin** - Full system access
2. **seller** - Can sell tours and manage their listings
3. **advertiser** - Can advertise on the platform (future)
4. **guide** - Tour guides (future)
5. **venue** - Venue managers (future)
6. **user** - Regular user with no dashboard access
7. **subscriber** - Subscribed user with no dashboard access

### Role Groups

- **Dashboard Access**: admin, seller, advertiser, guide, venue
- **Admin Only**: admin
- **Seller Only**: seller
- **Admin & Seller**: admin, seller
- **Regular Users**: user, subscriber

## Frontend Utilities

### Location: `frontend/lib/utils/`

#### `auth.ts` - Authentication Utilities

```typescript
import { getAuthState, getValidToken, clearAuth, setAuthToken } from '@/lib/utils/auth';

// Get current auth state
const authState = getAuthState();
// Returns: { isAuthenticated, userRole, userId, isExpired }

// Get and validate token
const token = getValidToken();
// Returns: DecodedToken | null

// Logout
clearAuth();

// Set token
setAuthToken(token);
```

#### `roles.ts` - Role Checking Utilities

```typescript
import { 
    canAccessDashboard, 
    isAdmin, 
    isSeller, 
    isAdminOrSeller,
    UserRole,
    RoleGroups 
} from '@/lib/utils/roles';

// Check dashboard access
if (canAccessDashboard(userRole)) {
    // User can access dashboard
}

// Check specific roles
if (isAdmin(userRole)) { /* Admin only */ }
if (isSeller(userRole)) { /* Seller only */ }
if (isAdminOrSeller(userRole)) { /* Admin or Seller */ }
```

### Custom Hook: `useRole`

```typescript
import { useRole } from '@/lib/hooks/useRole';

function MyComponent() {
    const { 
        isAuthenticated,
        userRole,
        userId,
        canAccessDashboard,
        isAdmin,
        isSeller,
        isAdminOrSeller,
        isRegularUser,
        hasRole
    } = useRole();

    return (
        <>
            {canAccessDashboard && <DashboardLink />}
            {isAdmin && <AdminPanel />}
            {isSeller && <SellerTools />}
        </>
    );
}
```

## Backend Utilities

### Location: `server/src/utils/roles.ts`

```typescript
import { 
    canAccessDashboard, 
    isAdmin, 
    isSeller, 
    isAdminOrSeller,
    UserRole 
} from '../utils/roles';

// Use in controllers
if (canAccessDashboard(user.roles)) {
    // Allow access
}
```

### Middleware: `server/src/middlewares/authenticate.ts`

```typescript
import { authenticate, isAdmin, isSeller, isAdminOrSeller } from '../middlewares/authenticate';

// Protect routes
router.get('/admin-only', authenticate, isAdmin, controller);
router.get('/seller-only', authenticate, isSeller, controller);
router.get('/dashboard', authenticate, isAdminOrSeller, controller);
```

## Usage Examples

### Frontend Component

```typescript
'use client';

import { useRole } from '@/lib/hooks/useRole';

export function UserMenu() {
    const { isAuthenticated, canAccessDashboard, isAdmin } = useRole();

    if (!isAuthenticated) {
        return <LoginButton />;
    }

    return (
        <div>
            {canAccessDashboard && <Link href="/dashboard">Dashboard</Link>}
            {isAdmin && <Link href="/admin">Admin Panel</Link>}
            <Link href="/profile">Profile</Link>
        </div>
    );
}
```

### Backend Route Protection

```typescript
import { authenticate, isAdmin, isSeller, isAdminOrSeller } from '../middlewares/authenticate';

// Admin only route
router.get('/users/all', authenticate, isAdmin, getAllUsers);

// Seller only route
router.post('/tours', authenticate, isSeller, createTour);

// Admin or Seller route
router.get('/dashboard/stats', authenticate, isAdminOrSeller, getStats);
```

### Server-Side Page Protection

```typescript
// app/dashboard/layout.tsx
import { canAccessDashboard } from '@/lib/utils/roles';
import { jwtDecode } from 'jwt-decode';

export default async function DashboardLayout({ children }) {
    const token = cookies().get('token');
    const decoded = jwtDecode(token.value);
    
    if (!canAccessDashboard(decoded.roles)) {
        redirect('/?error=unauthorized');
    }
    
    return <>{children}</>;
}
```

## Benefits

1. **Single Source of Truth**: All role definitions in one place
2. **Type Safety**: TypeScript enums and interfaces
3. **Consistency**: Same role checking logic across frontend and backend
4. **Maintainability**: Easy to add new roles or modify permissions
5. **Reusability**: Import utilities anywhere in the codebase
6. **DRY Principle**: No duplicate role checking code

## Adding New Roles

1. Add role to `UserRole` enum in both `frontend/lib/utils/roles.ts` and `server/src/utils/roles.ts`
2. Update `RoleGroups` if needed
3. Add to database user model enum
4. Update middleware if special permissions needed

## Migration Guide

### Before (Duplicated Code)
```typescript
// In multiple files
const dashboardRoles = ['admin', 'seller', 'advertiser', 'guide', 'venue'];
if (dashboardRoles.includes(userRole)) { /* ... */ }
```

### After (Centralized)
```typescript
// Import once, use everywhere
import { canAccessDashboard } from '@/lib/utils/roles';
if (canAccessDashboard(userRole)) { /* ... */ }
```

## Testing

```typescript
import { canAccessDashboard, isAdmin } from '@/lib/utils/roles';

describe('Role Utilities', () => {
    it('should allow admin to access dashboard', () => {
        expect(canAccessDashboard('admin')).toBe(true);
    });
    
    it('should not allow user to access dashboard', () => {
        expect(canAccessDashboard('user')).toBe(false);
    });
});
```
