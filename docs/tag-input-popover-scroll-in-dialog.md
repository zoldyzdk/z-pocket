# TagInput: mouse wheel scroll in a dialog

## Symptom

Inside a **Radix `Dialog`** (e.g. Add Link modal), opening the **categories** combobox (`TagInput` popover) shows a long list in `Command` / `CommandList`, but **the mouse wheel does not scroll** the list. Dragging the scrollbar may still work.

## Root cause

1. **`TagInput`** uses **`Popover`** for desktop; popover content is **rendered in a portal** (typically under `document.body`), not inside the dialog’s DOM subtree.

2. **`Dialog`** (via Radix) uses **`react-remove-scroll`** to lock background scrolling while the modal is open. It listens for **`wheel`** on `document` and may call **`preventDefault()`** when it decides the event should not drive scroll.

3. Because the portalled popover is **outside** the node tree that scroll-lock treats as “inside” the dialog, wheel events over the command list are often **incorrectly canceled**. The list never receives a normal scroll from the wheel, even though `CommandList` has `overflow-y-auto`.

This is a known interaction between Radix **Dialog + Popover** and third-party scroll locking, documented in:

- [radix-ui/primitives#1159 — Scrolling issue when Popover inside Dialog](https://github.com/radix-ui/primitives/issues/1159)
- [pacocoursey/cmdk#272 — Can’t scroll CommandList inside a Dialog using mouse wheel](https://github.com/pacocoursey/cmdk/issues/272)

The **`CommandGroup`** `overflow-hidden` class from the shared `command` UI is **not** the primary cause; the failure is at the **document-level wheel handling** for portalled content.

## Fix (implemented)

On **`PopoverContent`** in `src/components/ui/tag-input.tsx`, stop the wheel event from **bubbling to `document`** so `react-remove-scroll` does not cancel it, while the browser still scrolls the actual overflow container (`CommandList`):

```tsx
<PopoverContent
  className="w-full p-0"
  align="start"
  onWheel={(e) => e.stopPropagation()}
>
```

Use **`onWheel`** (bubble phase), not **`onWheelCapture`**, so the event still reaches the list/items for default scrolling behavior; only propagation past the popover surface is stopped.

## Alternatives (not used here)

- **`Popover modal={true}`** — reported to help in some setups; changes focus/pointer behavior.
- **Manual `scrollTop` in a `wheel` listener** — fragile compared to `stopPropagation`.
- **Restructuring DOM** so portalled content is accounted for by scroll-lock — usually not practical for app code.

## Related paths

- **Mobile / coarse pointer:** `TagInput` switches to **`CommandDialog`** (nested dialog). If wheel/touch scrolling misbehaves there, treat it as a separate case (nested modals + `RemoveScroll`).

## Files

- Fix: `src/components/ui/tag-input.tsx` (`PopoverContent` `onWheel`)
- Typical consumer: `src/components/add-link-modal.tsx` (`TagInput` inside `Dialog`)
