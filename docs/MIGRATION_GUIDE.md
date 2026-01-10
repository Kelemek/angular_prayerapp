# Angular Control Flow Migration Guide

## Overview
This document provides a systematic approach to migrate all Angular components from deprecated structural directives (*ngIf, *ngFor) to the new Angular 21 control flow syntax (@if, @for).

**Total Directives to Migrate:**
- 153 × `*ngIf` → `@if`
- 21 × `*ngFor` → `@for`
- Across 14 component files

## Migration Strategy

### Phase 1: Remove CommonModule Imports (COMPLETED for login.component.ts)
- [x] src/app/pages/login/login.component.ts
- [ ] src/app/pages/admin/admin.component.ts
- [ ] src/app/pages/presentation/presentation.component.ts
- [ ] src/app/components/prayer-form/prayer-form.component.ts
- [ ] src/app/components/email-subscribers/email-subscribers.component.ts
- [ ] src/app/components/prompt-manager/prompt-manager.component.ts
- [ ] src/app/components/skeleton-loader/skeleton-loader.component.ts
- [ ] src/app/components/toast-container/toast-container.component.ts
- [ ] src/app/components/email-templates-manager/email-templates-manager.component.ts
- [ ] src/app/components/prayer-types-manager/prayer-types-manager.component.ts
- [ ] src/app/components/admin-user-management/admin-user-management.component.ts
- [ ] src/app/components/prayer-card/prayer-card.component.ts
- [ ] src/app/components/prayer-display-card/prayer-display-card.component.ts
- [ ] src/app/components/presentation-settings-modal/presentation-settings-modal.component.ts

### Phase 2: Template Conversion Rules

#### Rule 1: *ngIf to @if
**Pattern:**
```html
<element *ngIf="condition">
  content
</element>
```

**Convert to:**
```html
@if (condition) {
<element>
  content
</element>
}
```

#### Rule 2: *ngFor to @for (with track)
**Pattern:**
```html
<element *ngFor="let item of items; trackBy: trackFunc">
  content
</element>
```

**Convert to:**
```html
@for (item of items; track trackFunc) {
<element>
  content
</element>
}
```

**If no trackBy exists:**
```html
@for (item of items; track item.id) {
<element>
  content
</element>
}
```

### VS Code Find and Replace Regex Patterns

Use these patterns in VS Code's Find/Replace feature (Enable Regex):

#### 1. Convert *ngIf opening tags
**Find:** `\s+\*ngIf="([^"]+)"`
**Replace:** ` `
(This removes the *ngIf attribute; we'll handle @if separately)

#### 2. Find lines with *ngIf to manually convert
**Find:** `\*ngIf="`
**Replace:** (do manual review)

#### 3. Convert *ngFor with trackBy
**Find:** `\*ngFor="let\s+(\w+)\s+of\s+(\w+);\s+trackBy:\s+(\w+)"`
**Replace:** (manual conversion needed)

## Files to Migrate (In Order)

### 1. src/app/pages/login/login.component.ts
**Status:** In Progress
**Directives:** 18 *ngIf, 0 *ngFor
- [x] Remove CommonModule import
- [ ] Convert 18 *ngIf to @if
- [ ] Add closing braces

### 2. src/app/pages/admin/admin.component.ts
**Directives:** 26 *ngIf, 5 *ngFor
- [ ] Remove CommonModule import
- [ ] Convert 26 *ngIf to @if  
- [ ] Convert 5 *ngFor to @for with trackBy
- [ ] Add closing braces

### 3. src/app/pages/presentation/presentation.component.ts
**Directives:** 4 *ngIf, 0 *ngFor
- [ ] Remove CommonModule import
- [ ] Convert 4 *ngIf to @if
- [ ] Add closing braces

### 4. src/app/components/prayer-form/prayer-form.component.ts
**Directives:** 2 *ngIf, 0 *ngFor
- [ ] Remove CommonModule import
- [ ] Convert 2 *ngIf to @if
- [ ] Add closing braces

### 5. src/app/components/email-subscribers/email-subscribers.component.ts
**Directives:** 24 *ngIf, 3 *ngFor
- [ ] Remove CommonModule import
- [ ] Convert 24 *ngIf to @if
- [ ] Convert 3 *ngFor to @for
- [ ] Add closing braces

### 6. src/app/components/prompt-manager/prompt-manager.component.ts
**Directives:** 14 *ngIf, 4 *ngFor
- [ ] Remove CommonModule import
- [ ] Convert 14 *ngIf to @if
- [ ] Convert 4 *ngFor to @for
- [ ] Add closing braces

### 7. src/app/components/skeleton-loader/skeleton-loader.component.ts
**Directives:** 3 *ngIf, 2 *ngFor
- [ ] Remove CommonModule import
- [ ] Convert 3 *ngIf to @if
- [ ] Convert 2 *ngFor to @for
- [ ] Add closing braces

### 8. src/app/components/toast-container/toast-container.component.ts
**Directives:** 0 *ngIf, 1 *ngFor
- [ ] Remove CommonModule import
- [ ] Convert 1 *ngFor to @for
- [ ] Add closing braces

### 9. src/app/components/email-templates-manager/email-templates-manager.component.ts
**Directives:** 12 *ngIf, 1 *ngFor
- [ ] Remove CommonModule import
- [ ] Convert 12 *ngIf to @if
- [ ] Convert 1 *ngFor to @for
- [ ] Add closing braces

### 10. src/app/components/prayer-types-manager/prayer-types-manager.component.ts
**Directives:** 11 *ngIf, 1 *ngFor
- [ ] Remove CommonModule import
- [ ] Convert 11 *ngIf to @if
- [ ] Convert 1 *ngFor to @for
- [ ] Add closing braces

### 11. src/app/components/admin-user-management/admin-user-management.component.ts
**Directives:** 15 *ngIf, 1 *ngFor
- [ ] Remove CommonModule import
- [ ] Convert 15 *ngIf to @if
- [ ] Convert 1 *ngFor to @for
- [ ] Add closing braces

### 12. src/app/components/prayer-card/prayer-card.component.ts
**Directives:** 10 *ngIf, 1 *ngFor
- [ ] Remove CommonModule import
- [ ] Convert 10 *ngIf to @if
- [ ] Convert 1 *ngFor to @for
- [ ] Add closing braces

### 13. src/app/components/prayer-display-card/prayer-display-card.component.ts
**Directives:** 5 *ngIf, 1 *ngFor
- [ ] Remove CommonModule import
- [ ] Convert 5 *ngIf to @if
- [ ] Convert 1 *ngFor to @for
- [ ] Add closing braces

### 14. src/app/components/presentation-settings-modal/presentation-settings-modal.component.ts
**Directives:** 9 *ngIf, 1 *ngFor
- [ ] Remove CommonModule import
- [ ] Convert 9 *ngIf to @if
- [ ] Convert 1 *ngFor to @for
- [ ] Add closing braces

## Testing After Migration

1. Run `npm run build` to check for TypeScript/template compilation errors
2. Run `npm run lint` to check for linting errors
3. Run `npm test` to verify all unit tests pass
4. Perform manual testing of each migrated component in the UI

## Key Considerations

1. **Semicolons:** Keep semicolons at the end of @if/@for blocks when appropriate
2. **Track Function:** Always provide a track function for @for loops:
   - Use existing `trackBy` functions from component
   - Or track by unique property (e.g., `track item.id`)
   - Fallback to `track $index` if no better option exists
3. **Formatting:** Maintain consistent indentation and spacing
4. **Closing Braces:** Each `@if` and `@for` must have a matching `}`

## Next Steps

1. Complete login.component.ts migration manually or with assisted tooling
2. Once one file is complete, pattern can be applied to others
3. Consider using VS Code multi-cursor editing for repetitive conversions
4. Test after each file completion
