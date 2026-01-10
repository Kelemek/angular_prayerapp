# Blank Page on Idle Issue - ROOT CAUSE & FIX

## The Problem
When you left the browser and came back after some idle time, the page went completely blank instead of staying visible with the cached content. This was a **user experience issue** where the app appeared to be broken rather than gracefully maintaining state.

## Root Causes (Multiple Issues Fixed)

### Issue 1: Loading State During Background Refresh
**Cause**: When the page regained focus, skeleton loaders were shown while fetching fresh data, blanking the content

**Impact**: If network was slow/unreliable, users would see blank skeletons instead of cached data

### Issue 2: Unnecessary Heartbeat on Regular User Sessions
**Cause**: The database heartbeat was running for ALL authenticated sessions (including regular non-admin users), not just admins

**The Heartbeat Problem**:
```typescript
// BEFORE: Heartbeat ran every minute for EVERYONE
if (session?.user) {
  this.isAuthenticatedSubject.next(true);
  this.startDbHeartbeat();  // ❌ Started for regular users too!
}
```

**Why this is bad**:
- Regular users just viewing prayers don't need a database heartbeat
- Unnecessary network calls every ~1 minute (default interval)
- If heartbeat fails during idle, it could trigger unwanted state changes
- Wastes bandwidth and increases latency during idle periods
- Can cause issues on poor network connections

## Solutions Applied

### Fix 1: Silent Background Refresh
Changed all automatic background refreshes to **never show loading state**:
```typescript
// BEFORE: Could blank the page with skeleton loaders
loadPrayers(false) // Shows loading state on visibility change

// AFTER: Keeps UI visible while updating
loadPrayers(true)  // Silent refresh - keeps cached data visible
```

**Files Modified**:
- `PrayerService.setupVisibilityListener()` - Always uses silent refresh
- `AppComponent` - Removed aggressive page reload logic
- `main.ts` - No forced reloads on visibility change

### Fix 2: Heartbeat Only for Admin Sessions
Changed heartbeat to **only run for admin users**:
```typescript
// BEFORE: Every authenticated user got heartbeat
this.startDbHeartbeat();

// AFTER: Only admin sessions get heartbeat
if (this.isAdminSubject.value) {
  this.startDbHeartbeat();
}
```

**Files Modified**:
- `AdminAuthService.initializeAuth()` - Line ~82: Check `isAdmin` before starting heartbeat
- `AdminAuthService.onAuthStateChange()` - Line ~99: Only heartbeat for admin sessions
- `AdminAuthService.setApprovalSession()` - Line ~64: Only heartbeat for admin approval sessions

## What Happens Now

### For Regular Users (viewing prayers)
1. User visits site → content loads and displays
2. User leaves browser idle → content stays visible (no unnecessary activity)
3. User returns → content immediately visible with cached data
4. Background silently fetches fresh data (no loading state)
5. **Result**: Seamless experience, no blank pages, no unnecessary network calls

### For Admin Users
1. User logs into admin panel → heartbeat starts
2. Heartbeat runs every minute to keep database connection active
3. User leaves admin panel → heartbeat stops
4. User returns → data silently refreshes
5. **Result**: Admin sessions stay fresh without blanking

## Performance Improvements
- ✅ **Fewer network requests** - No heartbeat for regular users
- ✅ **Better battery life** - Less background activity
- ✅ **No blank pages** - Cached data always visible
- ✅ **Smoother UX** - No skeleton loaders on auto-refresh
- ✅ **More resilient** - Graceful fallback to cached data
- ✅ **Network-friendly** - Works better on poor connections

## How to Test

### Test 1: Regular User (No Admin)
1. Visit the site (not logged in as admin)
2. Wait for prayers to load
3. Leave the browser idle for 5+ minutes
4. Return to the browser
5. ✅ Prayers should still be visible
6. ✅ No blank pages
7. ✅ No unnecessary database requests (check Network tab)

### Test 2: Admin User
1. Log into admin panel
2. Leave idle for a few minutes
3. Return to admin panel
4. ✅ Should see heartbeat requests in Network tab (every ~1 minute)
5. ✅ Session stays fresh
6. ✅ No blank pages

## Technical Details

### When Heartbeat Runs
```typescript
// Heartbeat ONLY starts in these cases:
1. User logs in via Supabase auth AND is admin
2. User validates approval code AND is admin
3. Auth state changes AND user is admin
```

### When Heartbeat Stops
```typescript
// Heartbeat stops in these cases:
1. User logs out
2. User session ends
3. Admin session expires
4. User is not admin
```

### Silent Refresh Mechanism
```typescript
// For regular users, visibility refresh is always silent:
this.loadPrayers(true).catch(err => {
  // If refresh fails, ensure cached data is shown
  const cached = this.cache.get<PrayerRequest[]>('prayers');
  if (cached && cached.length > 0) {
    this.allPrayersSubject.next(cached);
    this.applyFilters(this.currentFilters);
  }
});
```

## Files Changed
1. `/src/app/services/prayer.service.ts` - Silent background refresh
2. `/src/app/services/admin-auth.service.ts` - Heartbeat only for admins
3. `/src/app/app.component.ts` - Removed error reload logic
4. `/src/main.ts` - Simplified visibility recovery
5. `/src/app/pages/home/home.component.ts` - Proper subscription cleanup

## Why This Works
- **Regular users** no longer see blank pages because:
  1. Cached data is always displayed
  2. Background refresh never shows loading state
  3. No unnecessary heartbeat making network calls
  
- **Admin users** stay secure because:
  1. Heartbeat keeps session active
  2. Proper timeout checks still run
  3. No impact on session management

- **Everyone benefits** because:
  1. Less network traffic overall
  2. Faster perceived load times (cached data immediately visible)
  3. More resilient to network issues
  4. Better battery life on mobile devices

