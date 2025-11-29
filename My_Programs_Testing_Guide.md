# My Programs Testing Guide

## Overview
This document provides comprehensive test scenarios and edge cases for the **My Programs** page and all related functionality including workouts, plans, and scheduling.

## Key Concepts
- **Workout**: A collection of exercises (e.g., "Push Day", "Pull Day")
- **Plan/Program**: A collection of workouts with optional scheduling (e.g., "PPL Split")
- **Schedule**: How workouts are organized (weekly or rotation-based)

---

## 📱 My Programs Page Tests

### Page Load & Display
- [ ] Page loads without errors
- [ ] Three sections display: "My Workouts", "My Plans", "My Schedule"
- [ ] Empty states show appropriate messages when no data exists
- [ ] Data persists across app restarts
- [ ] UI updates immediately after adding/editing/deleting items

---

## 💪 My Workouts Section Tests

### Basic Functionality
- [ ] Custom workouts display with exercise count
- [ ] Program workouts display with "ProgramName • X exercises" format
- [ ] Workouts sort alphabetically by name
- [ ] No duplicate workouts appear (deduplication works)
- [ ] Tap workout expands to show action buttons

### Workout Actions
- [ ] **Start Workout**: Opens workout session with correct exercises
- [ ] **Edit Workout**: Opens create-workout page with pre-filled data
- [ ] **Delete Workout**: Shows confirmation dialog and removes workout
- [ ] **Back Button**: Collapses expanded view

### Edge Cases
- [ ] Workout with 0 exercises (should not appear in list)
- [ ] Workout with very long name (text truncation)
- [ ] Large number of workouts (scrolling performance)
- [ ] Workout name conflicts between custom and program workouts
- [ ] Deleting a workout that's part of an active plan

### Data Integrity
- [ ] Deleting program workout removes it from plan
- [ ] Deleting program workout cleans up duplicate custom workouts
- [ ] Empty program is automatically deleted when last workout removed
- [ ] Workout edits persist in both standalone and program contexts

---

## 🎯 My Plans Section Tests

### Basic Functionality
- [ ] Plans display with workout/rest day counts
- [ ] Plan summary shows correct format based on schedule type
- [ ] Tap plan expands to show action buttons
- [ ] Plans sort alphabetically by name

### Plan Actions
- [ ] **Edit Plan**: Opens edit-plan page with current data
- [ ] **Delete Plan**: Shows confirmation and removes entire plan
- [ ] **Back Button**: Collapses expanded view

### Schedule Display Logic
- [ ] **Rotation plans**: Show "X workouts • Y rest days • Z day plan"
- [ ] **Weekly plans**: Show "X workouts • Y rest days • 7 day plan"
- [ ] **No schedule**: Show fallback "X workouts • Y days/week"

### Edge Cases
- [ ] Plan with all rest days (0 workouts)
- [ ] Plan with very long name
- [ ] Plan with maximum number of workouts
- [ ] Plan with mixed workout and rest days
- [ ] Plan name conflicts with existing plans

---

## 📅 My Schedule Section Tests

### Schedule Display
- [ ] **Active Weekly Schedule**: Shows all 7 days with assigned workouts
- [ ] **Active Rotation Schedule**: Shows current workout and rotation progress
- [ ] **Legacy Schedule**: Shows old format when no active plan
- [ ] **No Schedule**: Shows appropriate empty state message

### Weekly Schedule Tests
- [ ] All 7 days display correctly (Monday-Sunday)
- [ ] Assigned workouts show correct names
- [ ] Unassigned days show "Rest Day"
- [ ] Active plan name displays above schedule
- [ ] Schedule updates immediately after plan edits

### Rotation Schedule Tests
- [ ] Current workout displays correctly
- [ ] Rest days show "Rest Day" instead of workout name
- [ ] Progress indicator shows "Day X of Y"
- [ ] Rotation advances correctly after workout completion
- [ ] Rest days are counted in rotation progress

### Edge Cases
- [ ] Schedule with all rest days
- [ ] Schedule with duplicate workout assignments
- [ ] Plan activation/deactivation affects schedule display
- [ ] Multiple plans with same names
- [ ] Corrupted schedule data handling

---

## 🔗 Cross-Feature Integration Tests

### Workout ↔ Plan Relationships
- [ ] Adding workout to plan doesn't affect standalone workout
- [ ] Editing program workout updates plan but not standalone version
- [ ] Deleting standalone workout doesn't affect program copy
- [ ] Name conflicts handled correctly (deduplication)

### Plan ↔ Schedule Relationships
- [ ] Setting plan as active updates schedule display
- [ ] Editing plan schedule immediately reflects in My Schedule
- [ ] Deleting active plan clears schedule display
- [ ] Switching between weekly/rotation schedule types

### Data Persistence
- [ ] All changes survive app restart
- [ ] Data survives app background/foreground
- [ ] Corrupted data recovery (graceful handling)
- [ ] Large dataset performance

---

## 🚨 Critical Error Scenarios

### Network/Storage Issues
- [ ] App crashes during save operation
- [ ] Storage quota exceeded
- [ ] Data corruption during save
- [ ] Concurrent modification conflicts

### User Error Recovery
- [ ] Accidental plan deletion (undo functionality?)
- [ ] Invalid schedule configurations
- [ ] Empty workout attempts
- [ ] Duplicate name handling

### Performance Edge Cases
- [ ] 100+ workouts in list
- [ ] 50+ plans in list
- [ ] Complex rotation schedules (20+ workouts)
- [ ] Rapid successive operations

---

## 🧪 Specific Test Scenarios

### Scenario 1: Complete Workflow
1. Create 3 custom workouts
2. Create a plan with those workouts
3. Set up weekly schedule
4. Activate the plan
5. Verify schedule displays correctly
6. Edit one workout
7. Verify changes reflect in plan
8. Delete the plan
9. Verify workouts remain standalone

### Scenario 2: Program Library Integration
1. Browse program library
2. Clone a premade program
3. Edit program workouts
4. Modify schedule
5. Verify original program unchanged
6. Delete cloned program

### Scenario 3: Schedule Type Switching
1. Create plan with weekly schedule
2. Activate plan
3. Edit plan to rotation schedule
4. Verify schedule display updates
5. Complete workout to test rotation advancement

### Scenario 4: Edge Case Handling
1. Create workout with 0 exercises
2. Add to plan
3. Verify it appears as rest day
4. Delete workout from plan
5. Verify plan updates correctly

### Scenario 5: Data Integrity Stress Test
1. Create multiple plans with overlapping workouts
2. Rapidly edit/delete various items
3. Verify no data corruption
4. Check for orphaned data
5. Verify performance remains acceptable

---

## 📝 Bug Report Templates

### When Reporting Issues, Include:
1. **Device/OS**: iOS/Android version
2. **App Version**: Current build
3. **Reproduction Steps**: Exact sequence to reproduce
4. **Expected vs Actual**: What should happen vs what happens
5. **Data State**: What data existed when issue occurred
6. **Screenshots**: If UI-related
7. **Console Logs**: If available

### Example Bug Report:
```
Issue: Plan deletion removes standalone workout unexpectedly

Steps:
1. Create custom workout "Push Day"
2. Create plan "PPL" with "Push Day"
3. Delete "Push Day" from plan
4. Check My Workouts section

Expected: "Push Day" still exists as standalone workout
Actual: "Push Day" completely deleted

Device: iPhone 14 Pro, iOS 17.0
App Version: 1.2.3
```

---

## 🔍 Quick Validation Checklist

Before considering testing complete, verify:
- [ ] All CRUD operations work (Create, Read, Update, Delete)
- [ ] Data persists across sessions
- [ ] UI updates immediately after operations
- [ ] Empty states handle gracefully
- [ ] Error states provide user feedback
- [ ] Performance acceptable with large datasets
- [ ] Cross-feature integration works correctly
- [ ] Edge cases handled without crashes

---

## 📊 Test Metrics to Track

- **Crash Rate**: 0% during normal operations
- **Data Loss**: 0 instances of unintended data deletion
- **UI Responsiveness**: <200ms for most operations
- **Load Times**: <2s for page load with 100+ items
- **Memory Usage**: No significant leaks during extended use
- **Sync Reliability**: 100% data persistence across app restarts

---

*Last Updated: [Date]*
*Version: 1.0*
