# Tour Settings Components

## 📋 Overview

This directory contains all components for managing tour presets and settings. These components allow users (sellers) to create, edit, and manage reusable templates for their tours.

## 🗂️ Structure

```
Setting/
├── PricingPresets.tsx      # Manage pricing option presets (age groups, categories)
├── PaxPresets.tsx           # Manage group size presets (min/max participants)
├── DiscountPresets.tsx      # Manage discount presets (percentage/fixed amount)
├── index.ts                 # Barrel exports
└── README.md                # This file
```

## 🎯 Features

### Pricing Presets
- **Purpose**: Create reusable pricing option groups (Adult, Child, Senior, etc.)
- **Features**:
  - Multiple pricing options per preset
  - Category selection (adult, child, senior, student, custom)
  - Optional base price
  - Pax range (min/max) per option
  - Active/inactive toggle
  - Usage tracking
- **Use Case**: Quickly apply "Age Groups" or "Seasonal Pricing" to new tours

### Pax Presets
- **Purpose**: Define common group size configurations
- **Features**:
  - Minimum and maximum group size
  - Price per person or per group toggle
  - Group size specification
  - Usage tracking
- **Use Case**: Apply "Small Group (2-8)" or "Large Group (10-30)" to tours

### Discount Presets
- **Purpose**: Create reusable discount configurations
- **Features**:
  - Percentage or fixed amount discounts
  - Validation (percentage cannot exceed 100%)
  - Usage tracking
- **Use Case**: Apply "Early Bird 20%" or "Summer Sale $50 off" to tours

## 🔌 API Integration

All components use the centralized API client:

```typescript
import {
  getPricingPresets,
  createPricingPreset,
  updatePricingPreset,
  deletePricingPreset,
  duplicatePricingPreset,
} from '@/lib/api/tourSettingsApi';
```

### API Endpoints

**Base URL**: `/api/v1/users/:userId/tour-settings`

#### Pricing Presets
- `GET /pricing-presets` - List all
- `POST /pricing-presets` - Create new
- `GET /pricing-presets/:id` - Get single
- `PUT /pricing-presets/:id` - Update
- `DELETE /pricing-presets/:id` - Archive
- `POST /pricing-presets/:id/duplicate` - Duplicate

#### Pax Presets
- Same pattern as pricing presets
- Endpoint: `/pax-presets`

#### Discount Presets
- Same pattern as pricing presets
- Endpoint: `/discount-presets`

## 🎨 UI Components Used

### shadcn/ui Components
- `Button` - Actions (create, edit, delete, duplicate)
- `Card`, `CardHeader`, `CardContent` - Preset display
- `Dialog` - Create/edit modals
- `Input` - Form fields
- `Label` - Form labels
- `Select` - Dropdowns
- `Switch` - Toggles
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` - Navigation

### Icons (lucide-react)
- `Plus` - Create new
- `Edit` - Edit preset
- `Trash2` - Delete preset
- `Copy` - Duplicate preset
- `Settings`, `DollarSign`, `Users`, `Percent` - Tab icons

## 🔄 State Management

### React Query
All components use `@tanstack/react-query` for:
- **Queries**: Fetching presets with caching
- **Mutations**: Create, update, delete operations
- **Invalidation**: Auto-refresh after mutations

### Local State
- Dialog open/close state
- Form data (controlled inputs)
- Editing mode (create vs update)

## 📱 Responsive Design

All components are fully responsive:
- **Mobile**: Single column, simplified layout
- **Tablet**: 2 columns grid
- **Desktop**: 3 columns grid

## ✨ User Experience

### Empty States
Each component shows a helpful empty state when no presets exist:
- Relevant icon
- Clear explanation
- Call-to-action hint

### Loading States
- Skeleton loaders while fetching
- Disabled buttons during mutations
- Loading text on save buttons

### Toast Notifications
Using `sonner` for:
- ✅ Success messages (green)
- ❌ Error messages (red)
- ℹ️ Info messages (blue)

### Confirmation Dialogs
- Delete actions require confirmation
- Prevents accidental data loss

## 🔐 Authentication

All components require authentication:
```typescript
const { user } = useAuth();
```

Queries are only enabled when `user._id` exists:
```typescript
enabled: !!user?._id
```

## 🧪 Usage Example

### In a Tour Form
```typescript
// 1. User clicks "Use Preset" in tour pricing section
// 2. Select a pricing preset from dropdown
// 3. Backend applies preset (deep copy with new IDs)
// 4. Tour receives pricing options from preset
```

### Creating a New Preset
```typescript
// 1. Click "New Preset" button
// 2. Fill in preset details
// 3. Add multiple options (for pricing)
// 4. Save preset
// 5. Preset appears in grid
// 6. Can now be applied to tours
```

## 🛠️ Extending

### Adding a New Preset Type

1. **Create API functions** in `tourSettingsApi.ts`:
```typescript
export const getNewPresets = async (userId: string) => {
  const response = await apiClient.get(`/users/${userId}/tour-settings/new-presets`);
  return response.data;
};
```

2. **Create component** in `Setting/NewPresets.tsx`:
```typescript
export function NewPresets() {
  // Follow same pattern as PricingPresets
}
```

3. **Export** in `index.ts`:
```typescript
export { NewPresets } from './NewPresets';
```

4. **Add tab** in `settings/page.tsx`:
```typescript
<TabsTrigger value="new">New Presets</TabsTrigger>
<TabsContent value="new">
  <NewPresets />
</TabsContent>
```

## 🐛 Known Limitations

1. **No Date Presets Component**: Currently, Date Presets are not implemented in the UI (API exists)
2. **No Preferences Component**: User preferences (default presets) not yet implemented
3. **No Search/Filter**: Large preset lists cannot be filtered or searched
4. **No Bulk Actions**: Cannot delete/duplicate multiple presets at once

## 🚀 Future Enhancements

- [ ] Date Presets component
- [ ] Preferences component (set default presets)
- [ ] Search and filter presets
- [ ] Bulk actions (select multiple)
- [ ] Preset tags and categories
- [ ] Import/export presets
- [ ] Preset templates gallery
- [ ] Analytics (most used presets)
- [ ] Share presets with team

## 📝 Notes

### Copy, Not Reference
- Presets are **copied** to tours, not linked
- Editing a preset doesn't affect existing tours
- This ensures tour data integrity

### Usage Tracking
- Backend tracks how many times each preset is used
- Displayed in preset cards
- Helps identify popular presets

### Soft Delete
- Deleting a preset archives it (soft delete)
- Doesn't permanently remove data
- Can be recovered if needed

## 🤝 Contributing

When adding new features:
1. Follow existing patterns
2. Use React Query for data fetching
3. Add proper loading and error states
4. Include toast notifications
5. Test responsive design
6. Update this README

---

**Last Updated**: January 2026
**Maintained By**: Development Team
