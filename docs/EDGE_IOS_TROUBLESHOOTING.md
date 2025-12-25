# Troubleshooting Guide: Edge on iOS Blank Screen Issues

## Still Having Issues? Follow This Guide

### Symptom 1: App Still Shows Blank Screen on Return

**Quick Checks**
1. Is the device running iOS 12 or later? (Earlier versions have known WebKit issues)
2. Is Edge updated to the latest version?
3. Does Safari work fine with the same app?
4. Is device memory adequate (not critically low)?

**Debugging Steps**
1. Open Safari's Developer Console (Enable Web Inspector in Settings → Safari → Advanced)
2. Reproduce the issue and check for any error messages
3. Look specifically for:
   - Network errors when app returns to focus
   - "Failed to fetch" errors
   - "Cannot find router-outlet" warnings
   
4. Try these in JavaScript console:
   ```javascript
   // Check if router outlet exists
   document.querySelector('router-outlet');  // Should return element, not null
   
   // Check if app root is intact
   document.querySelector('app-root');  // Should return element
   
   // Check if content elements exist
   document.querySelectorAll('[class*="prayer"]');  // Should find prayer cards
   
   // Check visibility state
   document.hidden;  // Should be false when app is visible
   ```

5. Check local storage for cached data:
   ```javascript
   // View all cached data
   JSON.stringify(Object.keys(localStorage));
   
   // Check if prayers are cached
   localStorage.getItem('prayers');  // Should have data
   ```

**If Debug Shows Empty Content**
- The issue may be that Angular change detection never triggers
- Try manually calling change detection in console (if you have access to Angular's reference):
  ```javascript
  ng.probe(document.querySelector('app-root')).componentInstance.cdr.detectChanges();
  ```
- If this shows content, then the fix is working but needs refinement

**Solution Steps**
1. Hard refresh the app: Pull down to refresh multiple times
2. Clear browser cache: Settings → Safari → Clear History and Website Data
3. Uninstall and reinstall Edge
4. Restart device
5. If still failing, check network connectivity

---

### Symptom 2: App Shows Stale Data Instead of Fresh Data

**This is Expected Behavior**
- Cached data shows immediately (avoids blank screen)
- Fresh data loads in background
- Delay of 1-3 seconds is normal

**To Verify This is Working**
1. Make a prayer request while app is in focus
2. Minimize app
3. Return after 5+ minutes
4. You should see the old list first, then it updates
5. Refresh the page - new prayer should appear

**If Data Never Updates**
1. Check network connection (WiFi or cellular)
2. Check if prayer was actually submitted (verify in another browser)
3. Verify Supabase connection is working
4. Check console for Supabase errors

---

### Symptom 3: Seeing Error Messages in Console

#### "RouterOutlet detached from DOM"
- **Severity**: High
- **Cause**: iOS forcibly removed DOM during background suspension
- **Expected**: Should be recovered automatically
- **Action**: If persists, hard refresh browser

#### "Connection health check failed"
- **Severity**: Medium
- **Cause**: Network issue or Supabase unreachable
- **Expected**: Should reconnect automatically
- **Action**: Check network, try again in a moment

#### "Unhandled promise rejection"
- **Severity**: Depends on content
- **Action**: Note the error and check with dev team

#### "Supabase connection error"
- **Severity**: High
- **Cause**: Network connectivity issue
- **Action**: 
  1. Check internet connection
  2. Try switching between WiFi and cellular
  3. Restart device

---

### Symptom 4: App Works Sometimes, Fails Other Times

**This Suggests Intermittent Issue**

**Possible Causes**
1. Network connectivity is flaky
2. Device memory is sometimes constrained
3. Edge has memory leak with this specific app (rare)
4. iOS is more aggressive with background suspension on some days

**Testing Steps**
1. Note the conditions when it fails:
   - Time of day?
   - How long was app backgrounded?
   - What other apps were running?
   - WiFi or cellular?
   - How much device storage available?

2. Try to reproduce consistently:
   - Always let it idle for exactly 10 minutes
   - Always have X number of other apps open
   - Always on same network type

3. If you find a pattern, report it with these details

**Temporary Workaround**
- Don't leave app idle for more than 5 minutes
- Return to app if you've switched away
- Refresh if blank screen appears

---

### Symptom 5: Change Detection Isn't Triggering

**Signs of This**
- Screen is blank but network request succeeded (data is in memory)
- Console shows data was loaded but page is still blank
- Manually triggered refresh shows content

**Root Cause**
- Angular's change detection didn't run
- Angular's ChangeDetectionStrategy might be issue

**Debug Check**
```javascript
// Add this to console to manually trigger detection
const appComponent = ng.probe(document.querySelector('app-root')).componentInstance;
appComponent.cdr.markForCheck();
appComponent.cdr.detectChanges();

// If content appears, change detection was the issue
```

**Reporting for Dev**
- Include timestamp of when it happened
- Include browser version (Settings → About Edge)
- Include iOS version (Settings → General → About)
- Screenshot of Network tab showing requests

---

### Symptom 6: Network Requests Are Failing

**Check These**
1. Open Network tab in DevTools
2. Return app to focus
3. Watch for requests to `eqiafsygvfaifhoaewxi.supabase.co`
4. Check if they fail or succeed

**If Requests Fail**
- Check device connectivity
- Try on cellular instead of WiFi
- Try hard-refresh after reconnecting

**If Requests Succeed But Page is Blank**
- This is not a network issue
- This is likely a rendering issue (see Change Detection section)

---

### Symptom 7: Prayers Load but Filter/Search Doesn't Work

**This Suggests UI Event Issue**

**Test**
1. Close and reopen Edge
2. App loads
3. Try filter/search - works?
4. Minimize for 5+ minutes
5. Return and try filter/search - doesn't work?

**If Yes**: 
- Event listeners were lost during background suspension
- Should be fixed by the recovery system
- If still fails, may need additional event listener recovery

**What to Try**
1. Try scrolling - resets event listeners sometimes
2. Try pressing back/forward navigation
3. Hard refresh browser

---

### Symptom 8: App Uses Excessive Data/Battery

**Check Usage**
1. Settings → Cellular → Scroll to Edge → Check data usage
2. Check battery drain in battery usage settings

**If Excessive**
1. Disable background app refresh if possible
2. Check how long you normally keep app idle
3. This fix should not increase data usage (only recovered lost connections)

**Expected Behavior**
- Should use less battery due to better background handling
- Should use same or less cellular data (only recovered connections)

---

## Advanced Debugging

### Enable Extra Logging
Add this to `main.ts` before bootstrap:

```typescript
// For extra debugging
const originalLog = console.log;
console.log = function(...args) {
  if (String(args).includes('Prayer') || String(args).includes('visible')) {
    originalLog.apply(console, args);
    
    // Also log to local storage for persistence across refreshes
    const logs = JSON.parse(localStorage.getItem('debugLogs') || '[]');
    logs.push({
      timestamp: new Date().toISOString(),
      message: String(args[0])
    });
    // Keep only last 50 logs
    if (logs.length > 50) logs.shift();
    localStorage.setItem('debugLogs', JSON.stringify(logs));
  }
};
```

Then view logs:
```javascript
JSON.parse(localStorage.getItem('debugLogs')).forEach(log => console.log(log));
```

### Monitor DOM Changes
```javascript
// Watch for DOM changes
const observer = new MutationObserver((mutations) => {
  console.log('DOM changed:', mutations);
});

observer.observe(document.querySelector('app-root'), {
  childList: true,
  subtree: true,
  attributes: true
});
```

### Check Component State
```javascript
// Get app component reference
const appRoot = document.querySelector('app-root');
const componentRef = ng.probe(appRoot);
const component = componentRef.componentInstance;

// Check state
console.log('Component visible:', !document.hidden);
console.log('Has change detector:', !!component.cdr);
console.log('Last visibility:', component.lastVisibilityState);
```

---

## When to Reach Out for Help

Include these details when reporting issues:

**Essential Information**
- [ ] Device model (iPhone X, iPhone 14, iPad Air, etc)
- [ ] iOS version (Settings → General → About → Version)
- [ ] Edge version (Settings → About Edge)
- [ ] When issue happens (immediate? after X minutes?)
- [ ] Console errors (exact error messages)
- [ ] Network tab findings (requests failing?)
- [ ] Reproducibility (always? sometimes? never?)

**Optional Information**
- Screenshot of blank screen
- Network tab recording (HTTP requests shown)
- Console logs (screenshot or copy-paste)
- Video of the issue occurring
- Comparison with Safari behavior

**Include**
- Time of day issue occurred
- Device storage available (Settings → General → iPhone Storage)
- Approximate device memory available
- Any recent iOS updates
- Any recent Edge updates

---

## Quick Diagnostic Script

Copy and paste this into console to get diagnostic info:

```javascript
console.log('=== DIAGNOSTIC REPORT ===');
console.log('Device:', {
  hidden: document.hidden,
  title: document.title,
  readyState: document.readyState,
  visibilityState: document.visibilityState
});

console.log('DOM:', {
  appRoot: !!document.querySelector('app-root'),
  routerOutlet: !!document.querySelector('router-outlet'),
  prayerContent: document.querySelectorAll('[class*="prayer"]').length,
  contentSize: new Blob([document.body.innerHTML]).size
});

console.log('Storage:', {
  localStorage: Object.keys(localStorage).length,
  hasTheme: !!localStorage.getItem('theme'),
  hasUser: !!localStorage.getItem('user')
});

console.log('Performance:', {
  navigationTiming: performance.timing.loadEventEnd - performance.timing.navigationStart,
  memory: performance.memory?.usedJSHeapSize / 1048576 + ' MB' || 'N/A'
});

console.log('=== END DIAGNOSTIC ===');
```

---

## Prevention Tips

1. **Don't Force-Close App**: Always use home button to minimize, don't swipe away
2. **Keep Edge Updated**: Automatic updates should handle, but verify in Settings
3. **Manage Memory**: Close other apps if device is running slow
4. **Network Stability**: Use good WiFi or strong cellular signal
5. **Regular Refreshes**: Refresh app at least once per session

---

## Contact for Help

If none of these steps resolve the issue:
1. Collect diagnostic information from above
2. Take screenshots/videos of the issue
3. Contact the development team with all collected information
4. Include the diagnostic report output

The more details provided, the faster we can identify and fix any remaining issues.
