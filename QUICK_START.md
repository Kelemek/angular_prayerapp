# Quick Start Guide - Continue Angular Migration

## What's Already Done ✅

The Angular foundation is complete and the app compiles successfully!

- ✅ Angular project structure
- ✅ Tailwind CSS configured
- ✅ Supabase service ready
- ✅ Routing configured
- ✅ Build & dev server working
- ✅ All React code backed up to `react-backup/`

**App is running at: http://localhost:4200/**

## Next 3 Critical Steps

### 1️⃣ Create ThemeService (30-45 min)

**File**: `src/app/services/theme.service.ts`  
**Reference**: `react-backup/src/hooks/useTheme.ts`

```bash
# Create the service
ng generate service app/services/theme
```

**What to implement**:
- Store theme in `BehaviorSubject<'light' | 'dark' | 'system'>`
- Load from localStorage on init
- Apply `dark` class to `<html>` element
- Watch for system theme changes
- Save to localStorage on change

**Test**: Add theme toggle button to HomeComponent, verify dark/light mode works

---

### 2️⃣ Create ToastService (20-30 min)

**File**: `src/app/services/toast.service.ts`  
**Reference**: `react-backup/src/contexts/ToastContext.tsx`

```bash
# Create the service
ng generate service app/services/toast
```

**What to implement**:
- `BehaviorSubject<Toast[]>` for toast list
- Methods: `success()`, `error()`, `info()`
- Auto-dismiss after timeout
- Unique IDs for each toast

**Create**: `src/app/components/toast/toast.component.ts` to display toasts

**Test**: Call `toastService.success('Test!')` in HomeComponent

---

### 3️⃣ Create AdminAuthService (45-60 min)

**File**: `src/app/services/admin-auth.service.ts`  
**Reference**: `react-backup/src/contexts/AdminAuthContext.tsx`

```bash
# Create the service
ng generate service app/services/admin-auth
```

**What to implement**:
- `BehaviorSubject<boolean>` for `isAdmin` state
- `login(email: string)` - send magic link
- `logout()` - clear session
- `checkSession()` - verify on load
- Integration with SupabaseService

**Test**: Add admin login button to HomeComponent, verify login flow

---

## Reference Files

All original React code is in `react-backup/`:

### Services to Convert
- `react-backup/src/hooks/useTheme.ts` → ThemeService
- `react-backup/src/contexts/ToastContext.tsx` → ToastService  
- `react-backup/src/contexts/AdminAuthContext.tsx` → AdminAuthService
- `react-backup/src/hooks/usePrayerManager.ts` → PrayerService

### Components to Convert
- `react-backup/src/components/` - All UI components
- Start with: SkeletonLoader, ThemeToggle, AppLogo

### Utilities
- `react-backup/lib/` - Helper functions (can mostly copy)

---

## Helpful Commands

```bash
# Start dev server
npm start

# Build for production
npm run build

# Generate new component
ng generate component app/components/my-component --standalone

# Generate new service  
ng generate service app/services/my-service

# Check for errors
npm run build
```

---

## React → Angular Cheat Sheet

### State Management
```typescript
// React: useState
const [value, setValue] = useState(0);

// Angular: BehaviorSubject
private value$ = new BehaviorSubject<number>(0);
value = this.value$.asObservable();

// Update:
this.value$.next(newValue);
```

### Side Effects
```typescript
// React: useEffect
useEffect(() => {
  // do something
  return () => cleanup();
}, [dependency]);

// Angular: ngOnInit / ngOnDestroy
ngOnInit() {
  this.subscription = this.service.data$.subscribe(...);
}
ngOnDestroy() {
  this.subscription?.unsubscribe();
}
```

### Props & Events
```typescript
// React
function Child({ value, onChange }) { }

// Angular
@Component({ ... })
class ChildComponent {
  @Input() value!: string;
  @Output() valueChange = new EventEmitter<string>();
}
```

### Conditional Rendering
```html
<!-- React -->
{isVisible && <div>Content</div>}

<!-- Angular -->
<div *ngIf="isVisible">Content</div>
```

### Lists
```html
<!-- React -->
{items.map(item => <div key={item.id}>{item.name}</div>)}

<!-- Angular -->
<div *ngFor="let item of items; trackBy: trackById">{{item.name}}</div>
```

---

## Tips

1. **Use async pipe**: `<div>{{ value$ | async }}</div>` - auto subscribes/unsubscribes
2. **Inject services**: `constructor(private myService: MyService) {}`
3. **Standalone components**: All components use `standalone: true`
4. **Import CommonModule**: Needed for `*ngIf`, `*ngFor`, `*ngFor`
5. **RxJS operators**: Use `map`, `filter`, `switchMap` for transforming observables

---

## File Structure Pattern

```typescript
// Service pattern
@Injectable({ providedIn: 'root' })
export class MyService {
  private data$ = new BehaviorSubject<Data[]>([]);
  
  getData$(): Observable<Data[]> {
    return this.data$.asObservable();
  }
  
  loadData(): void {
    this.supabase.client
      .from('table')
      .select('*')
      .then(({ data }) => this.data$.next(data));
  }
}

// Component pattern
@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [CommonModule],
  template: `<div>{{ data$ | async }}</div>`,
  styles: []
})
export class MyComponent implements OnInit, OnDestroy {
  data$!: Observable<Data[]>;
  
  constructor(private myService: MyService) {}
  
  ngOnInit() {
    this.data$ = this.myService.getData$();
    this.myService.loadData();
  }
}
```

---

## Questions?

- Check `MIGRATION_COMPLETE.md` for comprehensive guide
- Check `ANGULAR_MIGRATION.md` for detailed task list
- Reference original React code in `react-backup/`
- Angular docs: https://angular.dev

---

**You're all set! Start with ThemeService and build incrementally. Good luck! 🚀**
