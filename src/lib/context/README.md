# Application context contracts

The `context` module defines typed collaboration contracts shared across the UI component tree. A provider owns the implementation and lifetime; descendants receive the capabilities they need through Svelte context. Keeping these contracts explicit makes ownership, initialization, and release obligations visible without coupling consumers to the provider's internal state.

Put an application-wide context contract here when independently organized parts of the UI need the same ancestor-provided capability. A context used only inside one feature or library belongs with that owner. Stateful implementations and browser persistence remain with their responsible modules; this directory supplies the shared agreement and typed accessors.

## Responsibilities and boundaries

| Collaboration                | Responsibility                                                                     | Provider and consumers                                    |
| ---------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Shell and route coordination | Register route-supplied contextual content and expose drawer/viewport capabilities | The root layout provides it; descendant routes consume it |

Shell coordination illustrates the provider/consumer and release obligations below; other shared contexts retain their own contracts within this module boundary.

## Shell provider and accessors

The root layout creates the shell state and calls `setShellContext` during component initialization; descendants call `getShellContext` within that component tree. The context contains a contract and accessors, not a module-global registry.

## Registration carries ownership

`ContextualRail` contains a label, a Svelte content snippet, and an optional readiness getter. The shell uses the label in its toggle wording and renders the snippet inside shell-owned geometry. An omitted readiness getter means the content needs no loading gate; a supplied getter lets the shell retain stable geometry while showing a spinner until data is ready.

`ShellContext.registerContextualRail(rail)` returns the registration's release function. The route must call it on unmount or when replacing that registration. The current root-layout implementation checks registration identity before clearing the active rail, so an older route's late cleanup cannot erase a newer route's content.

The route owns its rail content, data requests, and loading state. The shell owns the desktop rail container, phone drawer, responsive breakpoints, and toggle control. A route should register content instead of querying or moving the shell's DOM.

| Member                   | Responsibility                                         |
| ------------------------ | ------------------------------------------------------ |
| `registerContextualRail` | Install content and return owner-specific cleanup      |
| `closeContextDrawer`     | Request closing the small-viewport drawer              |
| `contextualDrawerOpen`   | Read the current transient drawer state                |
| `smallViewport`          | Read whether the shell is below its desktop breakpoint |

The getters expose the shell's current values rather than snapshots copied at registration time. They do not persist state or confer permission to access any data shown in the rail. API authorization remains independent.

## SSR and extraction

Svelte context scopes values to an ancestor and its descendants. A process-level singleton would have a different lifetime during server rendering and could mix route or user state across server requests. Retain the context boundary when extracting this shell; create each owning state object during layout/component initialization.

The [component guide](../components/README.md#shell-and-contextual-rails) explains presentation and teardown, and the [state guide](../state/README.md) explains browser preferences and SSR isolation. A standalone integration supplies its own implementation of `ShellContext` before rendering consumers. Check registration replacement, old cleanup after new registration, readiness transitions, and navigation away while the drawer is open; use the [UI gates](../../../README.md#run-and-validate) for implementation changes.

When adding a context, document its provider, initialization point, consumer scope, missing-provider behavior, and any returned cleanup functions. Keep independent capabilities in separate cohesive contracts rather than expanding `ShellContext` solely because it is already available.
