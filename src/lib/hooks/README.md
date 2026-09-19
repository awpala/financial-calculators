# Component lifecycle integrations

The `hooks` module packages reusable integrations between a Svelte component's lifetime and behavior outside its component tree. Each integration makes acquisition, activation conditions, and cleanup part of its public contract. Its caller owns the interaction's application meaning; the hook owns the lifecycle mechanics it acquires.

A hook belongs here when several consumers share the same lifecycle policy and it can be used independently of their domain. Element-specific behavior can be an attachment in its responsible library, pure value transformations belong with their data responsibility, and application state belongs with its owner. A `use` prefix alone does not establish a reason to add a helper here.

## Responsibilities and boundaries

| Integration          | Responsibility                                                                     | Lifetime                                                                          |
| -------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Keyboard interaction | Filter document-level keydown events before passing them to a caller-owned command | Register during component initialization; acquire on mount and release on unmount |

Keyboard handling illustrates these lifecycle obligations below. Each integration states its own environment, activation policy, and cleanup requirements.

## Keyboard registration

`useKeyboard` registers one document-level keydown handler for one mounted Svelte component. Call it during component initialization. Its `onMount` callback acquires the listener through `svelte/events`; the returned cleanup releases it on unmount. Importing the module or rendering on the server creates no listener.

## Filters protect the active interaction

The helper calls the supplied handler only when its optional `enabled()` predicate returns true and all of these filters permit the event:

| Condition                                                                     | Behavior                                       |
| ----------------------------------------------------------------------------- | ---------------------------------------------- |
| Repeated keydown or IME composition                                           | Ignore the event                               |
| A textarea, select, contenteditable element, or text-like input is the target | Leave the keystroke to editing                 |
| An open native dialog or ARIA modal dialog exists                             | Leave the interaction to the modal             |
| Otherwise                                                                     | Pass the original `KeyboardEvent` to the owner |

Input types `button`, `checkbox`, `radio`, `reset`, and `submit` are treated as controls rather than text entry. The modal query intentionally suppresses shortcuts for any `dialog[open]`, including a nonmodal native dialog, and for `[role="dialog"][aria-modal="true"]`. It does not infer whether an ARIA dialog is visually hidden. Keep attributes synchronized with actual modal visibility.

## The caller chooses the command

The default enabled predicate always returns true. A supplied predicate is evaluated for each event, so it can read the owner's current state without repeatedly installing the listener. The helper does not select a key, interpret modifiers, stop propagation, or call `preventDefault`; the accepted event still needs a command policy:

```svelte
<script lang="ts">
  import { useKeyboard } from '#lib/hooks/useKeyboard.js';

  let helpOpen = $state(false);
  useKeyboard((event) => {
    if (event.key !== '?' || event.ctrlKey || event.metaKey || event.altKey)
      return;
    event.preventDefault();
    helpOpen = true;
  });
</script>

<p>Help is {helpOpen ? 'open' : 'closed'}.</p>
```

Each mounted caller owns its own listener. There is no global shortcut registry, priority ordering, collision detection, or promise that a shortcut fires only once if two owners register it. `event.defaultPrevented` is not an automatic filter; coordinate overlapping commands in their common owner or check it explicitly in the handler.

Keep shortcut state and authorization-sensitive actions in the route/controller. This helper's job is the browser subscription and typing/modal guard. When changing it, exercise mounting/unmounting, text fields, composition, key repeats, modal transitions, and multiple shortcut owners, then run the [UI gates](../../../README.md#run-and-validate).

For any additional hook, document when it may be called, which external resources it acquires, how reactive inputs are observed, and how teardown handles pending work. Keep registrations inside their owning lifecycle so adding a reusable integration never creates a process-global interaction singleton during SSR.
