# Destination Management

Tour destination management system for the dashboard.

## Features

### For Sellers
- **Add New Destinations**: Create new destination entries with rich descriptions
- **Search Existing Destinations**: Find and add existing destinations to avoid duplicates
- **Manage Destinations**: Edit, activate/deactivate, and remove destinations
- **Featured Tours**: Link tours to destinations
- **Rich Text Editor**: Format destination descriptions with the advanced editor
- **Image Gallery Integration**: Select cover images from the media gallery

### For Admins
- **Approve/Reject Destinations**: Review pending destination submissions
- **Global Destination Management**: Manage all destinations across the platform
- **Rejection Reasons**: Provide feedback when rejecting destinations

## Components

### Destination.tsx
Main list view component that displays:
- Search functionality
- Add destination button
- Pending destinations (admin only)
- Approved destinations grid
- Role-based views (admin vs seller)

### AddDestination.tsx
Form component for creating new destinations with:
- Cover image selector (gallery integration)
- Basic information fields (name, country, region, city)
- Rich text description editor
- Featured tours multi-select
- Search existing destinations to avoid duplicates
- Active status toggle

### SingleDestination.tsx
Individual destination card with:
- View/Edit modes
- Cover image display and management
- Location details
- Featured tours display
- Edit, delete, and toggle active status actions
- Smart change detection (only updates changed fields)

### useDestination.ts
Custom React Query hooks for:
- `useDestination()` - Global destinations (admin)
- `useUserDestinations()` - User-specific destinations (seller)
- `usePendingDestinations()` - Pending approvals (admin)
- `useAllDestinations()` - All destinations for search
- `useSearchDestinations()` - Search with query

## Routes

- `/dashboard/tours/destination` - Main destination management page

## API Integration

The components use the following API endpoints:
- `GET /api/destinations` - Get all destinations
- `GET /api/destinations/user` - Get user's destinations
- `GET /api/destinations/pending` - Get pending destinations (admin)
- `POST /api/destinations` - Create new destination
- `PATCH /api/destinations/:id` - Update destination
- `DELETE /api/destinations/:id` - Delete destination (admin)
- `POST /api/destinations/:id/add` - Add existing destination to seller
- `DELETE /api/destinations/:id/remove` - Remove destination from seller
- `PATCH /api/destinations/:id/toggle-active` - Toggle active status
- `POST /api/destinations/:id/approve` - Approve destination (admin)
- `POST /api/destinations/:id/reject` - Reject destination (admin)

## Dependencies

### UI Components
- SearchableSelect - Multi-select with search and image preview
- MultiSelect - Standard multi-select dropdown
- Form components - React Hook Form integration
- Rich Text Editor - Novel-based editor
- Gallery integration - Media selection

### State Management
- React Query for data fetching and caching
- React Hook Form for form state

## Usage

```tsx
import Destination from '@/components/dashboard/tours/Destination';

export default function DestinationPage() {
    return <Destination />;
}
```

## Role-Based Access

### Seller Role
- Can add new destinations (requires admin approval)
- Can add existing approved destinations to their list
- Can edit their own destinations
- Can toggle active status for their destinations
- Can remove destinations from their list

### Admin Role
- Can approve/reject pending destinations
- Can edit any destination
- Can permanently delete destinations
- Can view all destinations globally
- Can provide rejection reasons

## Smart Features

### Change Detection
The edit form intelligently detects what fields have changed:
- If only `isActive` changed → Uses toggle endpoint (faster)
- If content changed → Uses full update endpoint
- Prevents unnecessary API calls

### Duplicate Prevention
- Search existing destinations before creating new ones
- Visual feedback for already-added destinations
- Auto-add feature for quick selection

### Optimistic UI
- Immediate feedback on actions
- Automatic cache invalidation
- Smooth transitions between states

## Styling

Uses Tailwind CSS with:
- Responsive grid layouts
- Card-based design
- Badge indicators for status
- Hover effects and transitions
- Loading skeletons
- Error states with retry buttons
