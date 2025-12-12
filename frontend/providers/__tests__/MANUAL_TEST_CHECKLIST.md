# TourProvider Migration - Manual Test Checklist

This checklist provides step-by-step instructions to manually test the TourProvider migration in your browser.

---

## Prerequisites

1. ✅ Start the development server:
   ```bash
   cd frontend
   npm run dev
   ```

2. ✅ Navigate to the dashboard tours section:
   - URL: `http://localhost:3000/dashboard/tours`

---

## Test 1: Create New Tour - Basic Functionality

### Steps:
1. Click "Add New Tour" or navigate to `/dashboard/tours/add`
2. Fill in the basic information:
   - **Title**: "Test Tour Migration"
   - **Click "Generate" button** for Trip Code
   - **Category**: Select at least one category
   - **Excerpt**: "This is a test tour to verify the migration"
   - **Description**: Add some rich text content

### Expected Results:
- ✅ Generate button creates a unique 6-character code
- ✅ Code appears in the Trip Code field
- ✅ All fields accept input without errors
- ✅ Description editor loads and accepts content

### Verification:
- [ ] Trip code is generated successfully
- [ ] Form fields are responsive
- [ ] No console errors

---

## Test 2: Test Field Arrays - Itinerary

### Steps:
1. Navigate to the "Itinerary" tab
2. Click "Add Day" or similar button to add itinerary items
3. Fill in itinerary details:
   - Day: "1"
   - Title: "Arrival Day"
   - Description: "Arrive at destination"
4. Add another itinerary item
5. Try removing an itinerary item

### Expected Results:
- ✅ Can add multiple itinerary items
- ✅ Each item has proper default values
- ✅ Can remove items without errors
- ✅ Form updates correctly

### Verification:
- [ ] Itinerary items can be added
- [ ] Itinerary items can be removed
- [ ] No console errors
- [ ] Data persists in form state

---

## Test 3: Test Field Arrays - Facts

### Steps:
1. Navigate to the "Facts" or "Tour Details" tab
2. Click "Add Fact" button
3. Fill in fact details:
   - Title: "Duration"
   - Value: "7 Days"
   - Icon: Select an icon
4. Add another fact
5. Try removing a fact

### Expected Results:
- ✅ Can add multiple facts
- ✅ Each fact has proper default values
- ✅ Can remove facts without errors
- ✅ Form updates correctly

### Verification:
- [ ] Facts can be added
- [ ] Facts can be removed
- [ ] No console errors
- [ ] Data persists in form state

---

## Test 4: Test Field Arrays - FAQs

### Steps:
1. Navigate to the "FAQs" tab
2. Click "Add FAQ" button
3. Fill in FAQ details:
   - Question: "What is included?"
   - Answer: "All meals and accommodation"
4. Add another FAQ
5. Try removing an FAQ

### Expected Results:
- ✅ Can add multiple FAQs
- ✅ Each FAQ has proper default values
- ✅ Can remove FAQs without errors
- ✅ Form updates correctly

### Verification:
- [ ] FAQs can be added
- [ ] FAQs can be removed
- [ ] No console errors
- [ ] Data persists in form state

---

## Test 5: Test Field Arrays - Pricing Options

### Steps:
1. Navigate to the "Pricing" tab
2. Click "Add Pricing Option" button
3. Fill in pricing details:
   - Name: "Adult"
   - Category: "adult"
   - Price: 1000
   - Min Pax: 1
   - Max Pax: 10
4. Add another pricing option
5. Try removing a pricing option

### Expected Results:
- ✅ Can add multiple pricing options
- ✅ Each option has proper default values and unique ID
- ✅ Can remove options without errors
- ✅ Form updates correctly

### Verification:
- [ ] Pricing options can be added
- [ ] Pricing options can be removed
- [ ] Each option has a unique ID
- [ ] No console errors
- [ ] Data persists in form state

---

## Test 6: Test Field Arrays - Date Ranges

### Steps:
1. Navigate to the "Dates" or "Schedule" tab
2. Click "Add Departure" or "Add Date Range" button
3. Fill in date range details:
   - Label: "Summer Departure"
   - From Date: Select a date
   - To Date: Select a date
4. Add another date range
5. Try removing a date range

### Expected Results:
- ✅ Can add multiple date ranges
- ✅ Each range has proper default values and unique ID
- ✅ Can remove ranges without errors
- ✅ Form updates correctly

### Verification:
- [ ] Date ranges can be added
- [ ] Date ranges can be removed
- [ ] Each range has a unique ID
- [ ] No console errors
- [ ] Data persists in form state

---

## Test 7: Test Editor Content - Inclusions/Exclusions

### Steps:
1. Navigate to the "Inclusions/Exclusions" tab
2. Add content to the "What's Included" editor:
   - Type some text
   - Format it (bold, lists, etc.)
3. Add content to the "What's Not Included" editor
4. Switch to another tab and back

### Expected Results:
- ✅ Editors load without errors
- ✅ Content can be added and formatted
- ✅ Content persists when switching tabs
- ✅ Both editors work independently

### Verification:
- [ ] Inclusions editor works
- [ ] Exclusions editor works
- [ ] Content persists across tab switches
- [ ] No console errors

---

## Test 8: Save New Tour

### Steps:
1. Fill in all required fields across all tabs
2. Click "Save Tour" button
3. Wait for the save operation to complete
4. Check for success message

### Expected Results:
- ✅ Form submits without errors
- ✅ Success toast notification appears
- ✅ Redirects to edit page or tour list
- ✅ No console errors

### Verification:
- [ ] Form submits successfully
- [ ] Success message appears
- [ ] Redirects correctly
- [ ] No console errors
- [ ] Check browser network tab for successful API call

---

## Test 9: Edit Existing Tour - Data Loading

### Steps:
1. Navigate to an existing tour's edit page
   - URL: `/dashboard/tours/edit/[tour-id]`
2. Wait for data to load
3. Check all tabs to verify data is populated

### Expected Results:
- ✅ Tour data loads successfully
- ✅ All fields are populated with existing data
- ✅ Field arrays (itinerary, facts, FAQs, etc.) show existing items
- ✅ Editor content is loaded correctly
- ✅ No console errors

### Verification:
- [ ] Basic info is loaded
- [ ] Itinerary items are loaded
- [ ] Facts are loaded
- [ ] FAQs are loaded
- [ ] Pricing options are loaded
- [ ] Date ranges are loaded
- [ ] Description content is loaded
- [ ] Inclusions/exclusions content is loaded
- [ ] No console errors

---

## Test 10: Edit Existing Tour - Modify and Save

### Steps:
1. On an existing tour edit page, make changes:
   - Modify the title
   - Add a new itinerary item
   - Remove a fact
   - Update pricing
   - Change description content
2. Click "Save Tour" button
3. Wait for save operation
4. Refresh the page to verify changes persisted

### Expected Results:
- ✅ Changes are saved successfully
- ✅ Only changed fields are sent to API (check network tab)
- ✅ Success message appears
- ✅ Changes persist after page refresh
- ✅ No console errors

### Verification:
- [ ] Changes save successfully
- [ ] Only modified fields are in API payload
- [ ] Success message appears
- [ ] Changes persist after refresh
- [ ] No console errors

---

## Test 11: Data Processing - Categories

### Steps:
1. Create or edit a tour
2. Select multiple categories
3. Save the tour
4. Reload the page
5. Check that categories are still selected

### Expected Results:
- ✅ Categories are processed correctly
- ✅ Categories persist after save
- ✅ Categories load correctly on edit
- ✅ No console errors

### Verification:
- [ ] Categories can be selected
- [ ] Categories save correctly
- [ ] Categories load correctly
- [ ] No console errors

---

## Test 12: Data Processing - Gallery

### Steps:
1. Create or edit a tour
2. Add images to the gallery
3. Save the tour
4. Reload the page
5. Check that gallery images are loaded

### Expected Results:
- ✅ Gallery images are processed correctly
- ✅ Temporary IDs are removed before save
- ✅ Gallery persists after save
- ✅ Gallery loads correctly on edit
- ✅ No console errors

### Verification:
- [ ] Gallery images can be added
- [ ] Gallery saves correctly (check network payload)
- [ ] Gallery loads correctly
- [ ] No temporary IDs in saved data
- [ ] No console errors

---

## Test 13: Days/Nights Calculation

### Steps:
1. Navigate to the "Dates" tab
2. Set a date range (e.g., 7 days)
3. Check if days/nights are calculated automatically
4. Save the tour
5. Check the API payload for days/nights values

### Expected Results:
- ✅ Days/nights are calculated from date range
- ✅ Calculation is correct (nights = days - 1)
- ✅ Values are included in save payload
- ✅ No console errors

### Verification:
- [ ] Days/nights are calculated
- [ ] Calculation is correct
- [ ] Values are in API payload
- [ ] No console errors

---

## Test 14: Error Handling

### Steps:
1. Try to save a tour with missing required fields
2. Try to add invalid data (e.g., negative prices)
3. Check for appropriate error messages

### Expected Results:
- ✅ Validation errors are shown
- ✅ Error messages are clear
- ✅ Form doesn't submit with invalid data
- ✅ No console errors (except expected validation errors)

### Verification:
- [ ] Validation works correctly
- [ ] Error messages are displayed
- [ ] Form prevents invalid submission
- [ ] No unexpected console errors

---

## Test 15: Browser Console Check

### Steps:
1. Open browser developer tools (F12)
2. Go to the Console tab
3. Perform all the above tests
4. Monitor for any errors or warnings

### Expected Results:
- ✅ No critical errors
- ✅ No React warnings
- ✅ No TypeScript errors
- ✅ Only expected API calls

### Verification:
- [ ] No critical errors in console
- [ ] No React warnings
- [ ] No TypeScript errors
- [ ] API calls are successful

---

## 🎯 Final Verification Checklist

After completing all tests above, verify:

- [ ] All field arrays work (add/remove items)
- [ ] Code generation works
- [ ] Data loads correctly when editing
- [ ] Data saves correctly (create and update)
- [ ] Editor content persists
- [ ] Form validation works
- [ ] No console errors during normal operation
- [ ] Components are responsive and performant
- [ ] All tabs are accessible and functional
- [ ] Success/error messages appear appropriately

---

## 📊 Test Results Summary

**Date Tested**: _______________

**Tested By**: _______________

**Browser**: _______________

**Results**:
- Tests Passed: _____ / 15
- Tests Failed: _____ / 15
- Critical Issues Found: _____

**Notes**:
_____________________________________________
_____________________________________________
_____________________________________________

---

## 🐛 Issue Reporting Template

If you find any issues during testing, use this template:

**Issue #**: _____
**Test**: _____
**Severity**: Critical / High / Medium / Low
**Description**: _____
**Steps to Reproduce**:
1. _____
2. _____
3. _____

**Expected Behavior**: _____
**Actual Behavior**: _____
**Console Errors**: _____
**Screenshots**: (if applicable)

---

## ✅ Sign-Off

Once all tests pass:

**Migration Status**: ✅ COMPLETE / ❌ INCOMPLETE

**Signed Off By**: _______________
**Date**: _______________
**Notes**: _____________________________________
