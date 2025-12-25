# Edge on iOS Blank Screen Issue - ROOT CAUSES & SOLUTIONS

## The Problem
When Microsoft Edge on iOS is left alone or minimized for a prolonged period, the app displays a blank screen. When the app is brought back into focus, it remains blank until a manual page refresh is performed. By contrast, Safari automatically refreshes and displays content correctly.

## Root Causes (Edge/iOS Specific)

### Issue 1: DOM Detachment During Background Suspension
**Cause**: iOS aggressively suspends and may detach the DOM when an app goes to the background, especially for browser tabs. Edge's implementation of this differs from Safari's behavior.

**Impact**: 
- When app returns to foreground, Angular's component tree may not be properly reattached
- RouterOutlet exists but components aren't rendered
- Blank page even though the app is technically loaded

**Why Safari Works Better**:
- Safari has better iOS integration and maintains DOM state
- Safari's background process handling is more graceful

### Issue 2: Missing Change Detection on Tab Restore
**Cause**: When a tab regains focus, Edge doesn't always trigger Angular's change detection. Safari triggers this more reliably.

**Impact**:
- Data is in memory but Angular's views don't update
- Component bindings don't re-evaluate
- User sees blank screen even though data is available

### Issue 3: Memory Cleanup Issues During Background
**Cause**: Event listeners, subscriptions, and WebSocket connections may be left in a stale state when the tab goes to background, especially on iOS where memory is constrained.

**Impact**:
- Realtime subscriptions may not reconnect properly
- Event listeners become orphaned
- Previous data requests may be still pending, causing new requests to fail
- Memory bloat eventually causes the app to blank out

### Issue 4: Supabase Realtime Channel Disconnection
**Cause**: iOS may forcibly close WebSocket connections when the app goes to background. Edge's handling of this reconnection differs from Safari.

**Impact**:
- Realtime listeners don't automatically reconnect
- Silent failures - no error is shown
- When app regains focus, no data updates occur

### Issue 5: Viewport/Meta Tag Issues on iOS Edge
**Cause**: Edge on iOS may not properly respect or handle certain viewport meta tags or PWA manifest settings.

**Impact**:
- Layout may be cached incorrectly
- App may not properly scale or refresh when coming back into focus

### Issue 6: Supabase Connection Pooling on iOS
**Cause**: iOS limits background HTTP connections. Supabase may not properly restore connections when the app regains focus.

**Impact**:
- New API requests fail silently
- No error handling triggers a recovery
- Blank screen persists

## Solutions

### Solution 1: Explicit Change Detection on Visibility Change
Force Angular change detection when page regains focus, regardless of whether events fired naturally.

**Files to Modify**: `src/app/app.component.ts`, `src/app/services/prayer.service.ts`

```typescript
// In AppComponent
@HostListener('window:focus')
onWindowFocus(): void {
  console.log('[AppComponent] Window regained focus, triggering change detection');
  // Force change detection
  this.cdr.markForCheck();
  this.cdr.detectChanges();
}

// Also handle visibilitychange event
@HostListener('document:visibilitychange')
onVisibilityChange(): void {
  if (!document.hidden) {
    console.log('[AppComponent] Page became visible, triggering change detection');
    // Force change detection
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }
}
```

### Solution 2: DOM Reattachment Check and Recovery
Check if the router-outlet is still properly attached to the DOM when the app regains focus. If not, reinitialize components.

**Files to Modify**: `src/main.ts`

```typescript
const setupDOMRecovery = () => {
  window.addEventListener('focus', () => {
    console.log('[DOMRecovery] Focus event - checking DOM integrity');
    const routerOutlet = document.querySelector('router-outlet');
    const appRoot = document.querySelector('app-root');
    
    if (appRoot && !appRoot.contains(routerOutlet)) {
      console.warn('[DOMRecovery] RouterOutlet detached from DOM, attempting recovery');
      // Try to trigger change detection in the app
      const event = new Event('app-recover');
      window.dispatchEvent(event);
    }
  });
};
```

### Solution 3: Proper Background State Cleanup
Pause subscriptions and close heavy resources when app goes to background, resume when it comes back.

**Files to Modify**: `src/app/services/prayer.service.ts`

```typescript
private setupBackgroundHandling(): void {
  // When page becomes hidden
  fromEvent(document, 'visibilitychange').subscribe(() => {
    if (document.hidden) {
      console.log('[PrayerService] App going to background - pausing realtime listener');
      this.pauseRealtimeListener();
    } else {
      console.log('[PrayerService] App returning from background - resuming realtime listener');
      this.resumeRealtimeListener();
    }
  });
}

private pauseRealtimeListener(): void {
  // Unsubscribe from realtime updates to prevent orphaned connections
  if (this.realtimeSubscription) {
    this.realtimeSubscription.unsubscribe();
    this.realtimeSubscription = null;
  }
}

private resumeRealtimeListener(): void {
  // Re-establish realtime connection when returning
  this.setupRealtimeListener();
  // Refresh data
  this.loadPrayers(true).catch(err => {
    console.error('[PrayerService] Failed to resume after background:', err);
    // Try to show cached data
    const cached = this.cache.get<PrayerRequest[]>('prayers');
    if (cached && cached.length > 0) {
      this.allPrayersSubject.next(cached);
      this.applyFilters(this.currentFilters);
    }
  });
}
```

### Solution 4: Reconnect Supabase on Focus
Explicitly reconnect Supabase client when app regains focus.

**Files to Modify**: `src/app/services/supabase.service.ts`

```typescript
async ensureConnected(): Promise<void> {
  try {
    // Ping the Supabase connection with a simple query
    const { error } = await this.supabase.auth.getSession();
    
    if (error) {
      console.warn('[SupabaseService] Connection check failed:', error);
      // Attempt to reconnect
      await this.reconnect();
    } else {
      console.log('[SupabaseService] Connection verified');
    }
  } catch (err) {
    console.error('[SupabaseService] Ensure connected failed:', err);
    await this.reconnect();
  }
}

private async reconnect(): Promise<void> {
  console.log('[SupabaseService] Attempting to reconnect...');
  try {
    // Recreate the Supabase client to reset all connections
    const supabaseUrl = environment.supabaseUrl;
    const supabaseAnonKey = environment.supabaseAnonKey;
    
    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      },
      global: {
        headers: {
          'x-client-info': 'supabase-js'
        }
      },
      db: {
        schema: 'public'
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
    
    console.log('[SupabaseService] Reconnected successfully');
  } catch (err) {
    console.error('[SupabaseService] Reconnect failed:', err);
    throw err;
  }
}
```

### Solution 5: Optimize Viewport and Meta Tags
Ensure index.html has proper meta tags for iOS Edge.

**Files to Modify**: `src/index.html`

```html
<!-- Ensure proper viewport handling -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=5.0, user-scalable=yes">

<!-- iOS App Mode Settings -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Prayer App">

<!-- Prevent iOS Safari from adjusting font sizes -->
<meta name="apple-mobile-web-app-title" content="Prayer App">

<!-- For Edge on iOS (WebKit-based) -->
<meta name="theme-color" content="#2F5F54">

<!-- Prevent zooming on input focus (helps with reflow issues) -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
```

### Solution 6: Service Worker Cache Strategy
Implement a service worker to handle offline scenarios and cache the app properly for background usage.

**Files to Create**: `src/sw.ts` (new service worker)

```typescript
/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_VERSION = 'prayerapp-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Cache critical files
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json'
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith(CACHE_VERSION) && name !== STATIC_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // For HTML documents, try network first with cache fallback
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, response.clone());
            });
          }
          return response;
        })
        .catch(() => {
          // Fall back to cache
          return caches.match(request).then((cached) => {
            return cached || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // For other requests, cache first with network fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      return (
        cached ||
        fetch(request).then((response) => {
          if (response.ok && (request.destination === 'script' || request.destination === 'style')) {
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, response.clone());
            });
          }
          return response;
        })
      );
    })
  );
});
```

### Solution 7: Aggressive Background Recovery
Add a timer that checks the app state periodically and triggers recovery if needed.

**Files to Modify**: `src/app/app.component.ts`

```typescript
private setupBackgroundRecoveryTimer(): void {
  // Check app health every 30 seconds when visible
  setInterval(() => {
    if (!document.hidden && this.lastKnownState === 'visible') {
      // Check if router outlet is functional
      const routerOutlet = document.querySelector('router-outlet');
      if (!routerOutlet?.querySelector('*')) {
        console.warn('[AppComponent] Detected blank router outlet, triggering recovery');
        // Dispatch recovery event
        window.dispatchEvent(new Event('app-needs-recovery'));
      }
    }
  }, 30000);
}
```

## Implementation Priority

1. **High Priority** (Implement First):
   - Solution 1: Change detection on visibility
   - Solution 2: DOM reattachment check
   - Solution 4: Supabase reconnection

2. **Medium Priority** (Implement Next):
   - Solution 3: Background state cleanup
   - Solution 5: Viewport meta tags

3. **Low Priority** (Long-term):
   - Solution 6: Service worker
   - Solution 7: Background recovery timer

## Testing on Edge/iOS

### Test Procedure
1. Open app in Edge on iPhone/iPad
2. Load prayers - should display content
3. Minimize Edge app or switch to another app (put app in background)
4. Wait 5+ minutes
5. Return to Edge app
6. **Expected**: Content should display immediately without blank screen
7. **Optional**: Manual refresh to verify it works

### Test Edge Cases
- **Airplane Mode**: Put device in airplane mode while app is in background, then disable it
- **Network Switch**: Switch from WiFi to cellular while app is backgrounded
- **Low Memory**: Run other apps to consume memory, then return to Edge
- **Rapid Tab Switching**: Quickly switch away and back to app multiple times

## Differences Between Safari and Edge

| Aspect | Safari | Edge |
|--------|--------|------|
| DOM Preservation | Maintains during background | May detach/suspend |
| Change Detection | Automatically triggers on visibility | Manual intervention often needed |
| WebSocket Reconnection | Automatic on tab restore | Manual reconnection needed |
| Memory Management | Conservative, preserves state | May be more aggressive |
| Background Activity | Continues some operations | Suspends more aggressively |

## Additional Notes

- This issue is specific to Edge on iOS because Edge uses WebKit but has different background handling than Safari
- Edge on Android may have similar issues but with different patterns
- The fixes focus on being defensive - checking state and recovering if needed
- All solutions are non-breaking and improve robustness for all browsers

## Related Issues

- GitHub Issue: Blank screens on Edge iOS when minimized
- Platform: iOS (especially iPad where background suspension is more common)
- Affected Component: PrayerService, AppComponent, Supabase connectivity
