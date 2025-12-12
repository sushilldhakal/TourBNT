# TourProvider Developer Guide

## Quick Reference for Using TourProvider

This guide shows developers how to use the migrated TourProvider in their components.

---

## Basic Setup

### 1. Wrap Your Component with TourProvider

```tsx
import { TourProvider } from '@/providers/TourProvider';

function TourEditPage() {
  return (
    <TourProvider isEditing={true}>
      <YourTourEditorComponent />
    </TourProvider>
  );
}
```

### 2. Access Context in Components

```tsx
import { useTourContext } from '@/providers/TourProvider';

function YourComponent() {
  const { form, isLoading, isSaving } = useTourContext();
  
  // Use context values...
}
```

---

## Available Context Values

### Form Management
```tsx
const {
  form,              // React Hook Form instance
  tourId,            // Current tour ID (when editing)
  isEditing,         // Boolean: true when editing existing tour
  isLoading,         // Boolean: true when fetching tour data
  isSaving,          // Boolean: true when saving tour
  onSubmit,          // Form submission handler
} = useTourContext();
```

### Editor Content States
```tsx
const {
  editorContent,           // Main description editor content
  setEditorContent,        // Setter for description
  inclusionsContent,       // Inclusions editor content
  setInclusionsContent,    // Setter for inclusions
  exclusionsContent,       // Exclusions editor content
  setExclusionsContent,    // Setter for exclusions
  itineraryContent,        // Itinerary editor content
  setItineraryContent,     // Setter for itinerary
} = useTourContext();
```

### Field Arrays - Itinerary
```tsx
const {
  itineraryFields,         // Array of itinerary items
  appendItinerary,         // Add new itinerary item
  itineraryRemove,         // Remove itinerary item by index
} = useTourContext();

// Usage:
appendItinerary({
  day: '1',
  title: 'Arrival',
  description: 'Arrive at destination',
  destination: 'Paris',
  dateTime: new Date(),
});

itineraryRemove(0); // Remove first item
```

### Field Arrays - Facts
```tsx
const {
  factsFields,             // Array of fact items
  appendFacts,             // Add new fact
  factsRemove,             // Remove fact by index
} = useTourContext();

// Usage:
appendFacts({
  title: 'Duration',
  icon: 'clock',
  value: '7 Days',
  field_type: 'Plain Text',
});

factsRemove(0); // Remove first item
```

### Field Arrays - FAQs
```tsx
const {
  faqFields,               // Array of FAQ items
  appendFaq,               // Add new FAQ
  faqRemove,               // Remove FAQ by index
} = useTourContext();

// Usage:
appendFaq({
  question: 'What is included?',
  answer: 'All meals and accommodation',
});

faqRemove(0); // Remove first item
```

### Field Arrays - Pricing Options
```tsx
const {
  pricingOptionsFields,    // Array of pricing options
  appendPricingOptions,    // Add new pricing option
  pricingOptionsRemove,    // Remove pricing option by index
} = useTourContext();

// Usage:
appendPricingOptions({
  name: 'Adult',
  category: 'adult',
  price: 1000,
  discount: {
    enabled: false,
    options: [],
  },
  paxRange: {
    minPax: 1,
    maxPax: 10,
  },
});

pricingOptionsRemove(0); // Remove first item
```

### Field Arrays - Date Ranges
```tsx
const {
  dateRangeFields,         // Array of date ranges
  appendDateRange,         // Add new date range
  dateRangeRemove,         // Remove date range by index
} = useTourContext();

// Usage:
appendDateRange({
  label: 'Summer Departure',
  dateRange: {
    from: new Date('2025-06-01'),
    to: new Date('2025-06-08'),
  },
  isRecurring: false,
  selectedPricingOptions: [],
});

dateRangeRemove(0); // Remove first item
```

### Helper Functions
```tsx
const {
  handleGenerateCode,      // Generate unique tour code
} = useTourContext();

// Usage:
const code = handleGenerateCode(); // Returns generated code
```

---

## Common Patterns

### Pattern 1: Display Field Array Items

```tsx
function ItineraryList() {
  const { itineraryFields, itineraryRemove } = useTourContext();
  
  return (
    <div>
      {itineraryFields.map((field, index) => (
        <div key={field.id}>
          <h3>{field.title}</h3>
          <p>{field.description}</p>
          <button onClick={() => itineraryRemove(index)}>
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Pattern 2: Add New Field Array Item

```tsx
function AddItineraryButton() {
  const { appendItinerary } = useTourContext();
  
  const handleAdd = () => {
    appendItinerary({
      day: String(itineraryFields.length + 1),
      title: '',
      description: '',
    });
  };
  
  return (
    <button onClick={handleAdd}>
      Add Itinerary Day
    </button>
  );
}
```

### Pattern 3: Use Editor Content

```tsx
function DescriptionEditor() {
  const { editorContent, setEditorContent } = useTourContext();
  const { setValue } = useFormContext();
  
  const handleChange = (content: JSONContent) => {
    setEditorContent(content);
    setValue('description', JSON.stringify(content));
  };
  
  return (
    <NovelEditor
      initialValue={editorContent}
      onContentChange={handleChange}
      placeholder="Enter tour description..."
    />
  );
}
```

### Pattern 4: Generate Tour Code

```tsx
function TourCodeField() {
  const { handleGenerateCode, isEditing } = useTourContext();
  const { register } = useFormContext();
  
  return (
    <div>
      <input {...register('code')} disabled />
      {!isEditing && (
        <button onClick={handleGenerateCode}>
          Generate Code
        </button>
      )}
    </div>
  );
}
```

### Pattern 5: Submit Form

```tsx
function SaveButton() {
  const { onSubmit, isSaving } = useTourContext();
  const { handleSubmit } = useFormContext();
  
  return (
    <button 
      onClick={handleSubmit(onSubmit)}
      disabled={isSaving}
    >
      {isSaving ? 'Saving...' : 'Save Tour'}
    </button>
  );
}
```

### Pattern 6: Show Loading State

```tsx
function TourEditor() {
  const { isLoading } = useTourContext();
  
  if (isLoading) {
    return <div>Loading tour data...</div>;
  }
  
  return <div>Tour editor content...</div>;
}
```

---

## Default Values

### Itinerary Item
```tsx
{
  day: '',
  title: '',
  description: '',
  destination: '',
  dateTime: new Date(),
}
```

### Fact Item
```tsx
{
  title: '',
  icon: 'info',
  value: '',
  field_type: 'Plain Text',
}
```

### FAQ Item
```tsx
{
  question: '',
  answer: '',
}
```

### Pricing Option
```tsx
{
  id: makeId(),              // Auto-generated unique ID
  name: '',
  category: 'adult',
  customCategory: '',
  price: 0,
  discount: {
    enabled: false,
    options: [],
  },
  paxRange: {
    minPax: 1,
    maxPax: 10,
  },
}
```

### Date Range
```tsx
{
  id: makeId(),              // Auto-generated unique ID
  label: 'New Departure',
  dateRange: {
    from: new Date(),
    to: new Date() + 7 days,
  },
  isRecurring: false,
  recurrencePattern: undefined,
  recurrenceEndDate: undefined,
  selectedPricingOptions: [],
}
```

---

## Best Practices

### ✅ DO

1. **Use the context for all tour-related state**
   ```tsx
   const { form, itineraryFields } = useTourContext();
   ```

2. **Use append functions instead of manual array manipulation**
   ```tsx
   appendItinerary({ title: 'New Day' }); // ✅ Good
   ```

3. **Keep components focused on UI**
   ```tsx
   // Component only handles rendering and user interactions
   function MyComponent() {
     const { itineraryFields, appendItinerary } = useTourContext();
     return <button onClick={() => appendItinerary()}>Add</button>;
   }
   ```

4. **Use provided helper functions**
   ```tsx
   const code = handleGenerateCode(); // ✅ Good
   ```

### ❌ DON'T

1. **Don't manipulate field arrays directly**
   ```tsx
   form.setValue('itinerary', [...itinerary, newItem]); // ❌ Bad
   ```

2. **Don't implement business logic in components**
   ```tsx
   // ❌ Bad - logic should be in provider
   const processData = (data) => { /* complex logic */ };
   ```

3. **Don't bypass the context**
   ```tsx
   // ❌ Bad - use context instead
   const [localItinerary, setLocalItinerary] = useState([]);
   ```

4. **Don't create duplicate state**
   ```tsx
   // ❌ Bad - state already exists in context
   const [tourCode, setTourCode] = useState('');
   ```

---

## Troubleshooting

### Issue: "useTourContext must be used within TourProvider"

**Solution**: Make sure your component is wrapped with TourProvider:
```tsx
<TourProvider>
  <YourComponent />
</TourProvider>
```

### Issue: Field array items not updating

**Solution**: Use the provided append/remove functions:
```tsx
const { appendItinerary, itineraryRemove } = useTourContext();
```

### Issue: Form data not persisting

**Solution**: Make sure you're using the form from context:
```tsx
const { form } = useTourContext();
const { register, setValue } = form;
```

### Issue: Editor content not loading

**Solution**: Check that you're using the correct content state:
```tsx
const { editorContent, setEditorContent } = useTourContext();
```

---

## Migration Notes

### Changes from Vite Version

1. **Import Path Changed**
   - Old: `import { useTourContext } from '@/Provider/TourContext'`
   - New: `import { useTourContext } from '@/providers/TourProvider'`

2. **Context Hook Name**
   - Remains the same: `useTourContext()`

3. **All Features Maintained**
   - All field arrays work the same way
   - All helper functions work the same way
   - All editor states work the same way

### New Features

1. **Better TypeScript Support**
   - Full type definitions for all context values
   - Better autocomplete in IDEs

2. **Enhanced Error Handling**
   - More robust data processing
   - Better error messages

3. **Next.js Optimizations**
   - Uses Next.js router
   - Uses TanStack Query for data fetching

---

## Examples from Codebase

### Example 1: TourBasicInfo Component
```tsx
// frontend/components/dashboard/tours/TourBasicInfo.tsx
const { 
  editorContent, 
  setEditorContent, 
  handleGenerateCode 
} = useTourContext();

// Generate code button
<Button onClick={handleGenerateCode}>
  Generate
</Button>

// Description editor
<NovelEditor
  initialValue={editorContent}
  onContentChange={(content) => {
    setEditorContent(content);
    setValue('description', JSON.stringify(content));
  }}
/>
```

### Example 2: TourInclusionsExclusions Component
```tsx
// frontend/components/dashboard/tours/TourInclusionsExclusions.tsx
const { 
  inclusionsContent, 
  setInclusionsContent,
  exclusionsContent,
  setExclusionsContent 
} = useTourContext();

// Inclusions editor
<NovelEditor
  initialValue={inclusionsContent}
  onContentChange={(content) => {
    setInclusionsContent(content);
    setValue('include', JSON.stringify(content));
  }}
/>
```

### Example 3: TourEditorLayout Component
```tsx
// frontend/components/dashboard/tours/TourEditorLayout.tsx
const { isSaving } = useTourContext();

// Save button
<Button disabled={isSaving}>
  {isSaving ? 'Saving...' : 'Save Tour'}
</Button>
```

---

## Additional Resources

- **TourProvider Source**: `frontend/providers/TourProvider.tsx`
- **Type Definitions**: See `TourContextType` interface in TourProvider
- **Example Components**: `frontend/components/dashboard/tours/`
- **Test Documentation**: `frontend/providers/__tests__/TourProvider.migration-test.md`

---

**Last Updated**: December 6, 2025
**Version**: 1.0.0
**Status**: ✅ Production Ready
