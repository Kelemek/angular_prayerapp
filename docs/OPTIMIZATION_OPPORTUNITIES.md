# UserSessionService Optimization Opportunities

This document identifies all remaining places in the codebase where database queries for the currently logged-in user's name, email, or preferences could benefit from using `UserSessionService` caching.

## Already Refactored ✅

These components have already been optimized to use `UserSessionService`:
- **PrayerFormComponent** - Uses cache for user name on prayer submission
- **PrayerCardComponent** - Uses cache for user name on prayer update submission
- **HomeComponent** - Uses cache for displaying user email in header

## High Priority - Database Queries Every Session

### 1. **UserSettingsComponent** - Email Preference Lookups
**File:** `src/app/components/user-settings/user-settings.component.ts`

**Current Behavior:**
- Makes database query to `email_subscribers` table on every ngOnChanges (when modal opens)
- Queries again on email change with 800ms debounce
- Multiple queries for loading preferences, checking if user exists, and updating notifications

**Affected Methods:**
- `ngOnChanges()` - line 533: Loads preferences from database
- `loadPreferencesAutomatically()` - line 662: Queries `email_subscribers` table
- `onNotificationToggle()` - line 714: Queries to check/update subscriber status

**Cache Opportunity:**
The UserSessionService already loads email and user info. The email preference status could be:
1. Loaded once in UserSessionService when user data is loaded
2. Updated in UserSessionService cache when user changes preferences
3. Accessed synchronously from cache in UserSettingsComponent

**Current Query:**
```typescript
const { data, error } = await this.supabase.client
  .from('email_subscribers')
  .select('receive_notifications, receive_admin_emails')
  .eq('email', emailAddress.toLowerCase().trim())
  .maybeSingle();
```

**Optimization Impact:** Eliminates 2-3 database queries per session

---

### 2. **UserSessionService** - Email Subscriber Check
**File:** `src/app/services/user-session.service.ts`

**Current Behavior:**
- Line 71-79: Queries `email_subscribers` table during session initialization to get user name and isActive status

**Current Query:**
```typescript
const { data, error } = await this.supabase.client
  .from('email_subscribers')
  .select('email, first_name, last_name, is_active')
  .eq('email', email.toLowerCase().trim())
  .maybeSingle();
```

**Enhancement Opportunity:**
This could cache additional fields that are frequently queried:
- `receive_notifications` (for notification preferences)
- `receive_admin_emails` (for admin email preferences)
- `in_planning_center` (for Planning Center membership status)

This single query could provide all user preference data needed for the session instead of multiple queries in UserSettingsComponent.

**Optimization Impact:** Consolidates multiple queries into one, reduces load on UserSettingsComponent

---

## Medium Priority - Fallback/Optional Queries

### 3. **EmailNotificationService** - Preference Updates
**File:** `src/app/services/email-notification.service.ts`

**Current Behavior:**
- Line 406+: Queries `email_subscribers` table to update notification preferences

**Usage:** Used by UserSettingsComponent and other components to update user preferences

**Cache Opportunity:**
When preferences are updated here, the UserSessionService cache could be invalidated/updated to keep preferences in sync across the application.

**Optimization Impact:** Prevents multiple queries for the same preference data

---

### 4. **PrayerService** - Subscriber Notification Lookups
**File:** `src/app/services/prayer.service.ts`

**Current Behavior:**
- Lines 352-359: Queries `email_subscribers` table when sending prayer notifications to check notification preferences

**Usage:** When creating new prayers or updates, queries to find subscribers who want notifications

**Note:** This is less critical because it's backend-focused notification sending, but could still benefit from caching subscriber preferences.

---

## Lower Priority - Admin/Bulk Operations

These have lower optimization priority as they're either admin-only operations or bulk data operations:

### 5. **AdminService** - Subscriber Management
**File:** `src/app/services/admin.service.ts`
- Lines 77, 89: Queries for subscriber/admin data
- Note: Used for admin operations, not session-based user operations

### 6. **AnalyticsService** - Subscriber Stats
**File:** `src/app/services/analytics.service.ts`
- Lines 170, 175: Queries for analytics data
- Note: Background/analytics operations, not user-specific

### 7. **AdminDataService** - Bulk Data Operations
**File:** `src/app/services/admin-data.service.ts`
- Line 852: Bulk subscriber queries
- Note: Admin operation, not session-based

### 8. **EmailSubscribersComponent** - List Management
**File:** `src/app/components/email-subscribers/email-subscribers.component.ts`
- Multiple queries for subscriber list management
- Note: Admin interface for managing subscribers, not user preferences

---

## Recommended Optimization Path

### Phase 1 (High Value, Medium Effort)
1. **Extend UserSessionService** to cache email preferences
   - Add `receiveNotifications` and `receiveAdminEmails` to `UserSessionData` interface
   - Include these in the initial database query
   - Add getter methods for preferences

2. **Refactor UserSettingsComponent** to use cached preferences
   - Use `userSessionService.getCurrentSession()` for preferences
   - Remove `loadPreferencesAutomatically()` initial database query
   - Update UserSessionService cache when preferences change via `updateUserSession()`

### Phase 2 (Medium Value, Low Effort)
3. **Update EmailNotificationService** to update UserSessionService cache
   - After database update, call `userSessionService.updateUserSession()`
   - Ensures cache stays synchronized

### Phase 3 (Lower Priority)
4. **Review PrayerService subscriber queries**
   - Evaluate if subscriber preference caching is beneficial
   - Consider if this is better handled at database/backend level

---

## Implementation Pattern

The refactoring pattern already established with PrayerFormComponent and PrayerCardComponent:

**Before:**
```typescript
const fullName = await this.fetchUserNameFromDatabase(userEmail);
```

**After:**
```typescript
const userSession = this.userSessionService.getCurrentSession();
const fullName = userSession?.fullName || this.getCurrentUserName(); // fallback
```

This pattern ensures:
- ✅ Synchronous cache access (no await needed)
- ✅ Automatic fallback to localStorage if service hasn't loaded yet
- ✅ Single source of truth for user data
- ✅ Reduced database queries
- ✅ Better performance and responsiveness

---

## Testing Impact

As demonstrated in the previous refactoring:
- Existing database query tests should be removed or converted to cache tests
- Mock `UserSessionService.getCurrentSession()` in component tests
- Test fallback paths with mocked `getCurrentSession()` returning null
- Expected test count reduction: ~10-15% for affected components

---

## Estimated Impact

**Queries Eliminated:** 5-8 per session
- UserSettingsComponent: 2-3 queries (preferences load + optional updates)
- Additional potential eliminates from consolidation

**Benefits:**
- Faster preference loading (cached vs. database lookup)
- Reduced database load
- Consistent user data across application
- Better offline resilience (preferences persist in cache)
