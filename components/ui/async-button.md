# AsyncButton Component

A reusable button component that extends the standard UI Button with automatic async loading states and accessibility features.

## Features

- **Automatic Loading State**: Automatically handles `isLoading` state when `onClick` returns a Promise.
- **Explicit Loading**: Can be controlled via `loading` prop.
- **Visual Feedback**: Shows a spinner and custom `loadingText`.
- **Accessibility**: Adds `aria-busy` and disables interaction during loading.
- **Type Safe**: Fully typed with TypeScript.

## Usage

```tsx
import { AsyncButton } from "@/components/ui/async-button"

// Automatic async handling
<AsyncButton 
  onClick={async () => {
    await saveData()
  }}
  loadingText="Saving..."
>
  Save Changes
</AsyncButton>

// Manual control
<AsyncButton 
  loading={isLoading} 
  loadingText="Creating..."
  type="submit"
>
  Create Item
</AsyncButton>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onClick` | `(e) => Promise<void> | void` | - | Async function to execute. Triggers loading state. |
| `loading` | `boolean` | `undefined` | Manually control loading state. |
| `loadingText` | `string` | `undefined` | Text to display while loading. |
| `showSpinner` | `boolean` | `true` | Whether to show the spinner icon. |
| ...ButtonProps | | | All standard Button props (variant, size, etc.) |
