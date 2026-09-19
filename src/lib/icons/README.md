# SVG icon library

The `icons` module owns reusable SVG assets and their common presentation contract. Its Svelte 5 leaf components serve the shell, controls, markdown renderer, charts, and subsequent application views. The library sits outside `components/` because these assets are used across presentation layers rather than owned by one design-system view.

Assets are grouped by visual role, with direct imports from their category directory. The current catalog below is the starting set, not a fixed list of what future applications may depict. Add cohesive assets to these categories and extend the catalog when a new visual responsibility warrants its own group.

## Current catalog

Each category groups self-contained components by visual responsibility, without wrapper components or barrel exports. The source directories show the available assets; this table documents the stable grouping.

| Group                      | Visual responsibility                                                   |
| -------------------------- | ----------------------------------------------------------------------- |
| [actions/](actions/)       | Commands, confirmation, configuration, transfer, and execution controls |
| [navigation/](navigation/) | Destinations and directional movement                                   |
| [layout/](layout/)         | Containers, grouping, hierarchy, and spatial arrangement                |
| [identity/](identity/)     | People, keys, and locking states                                        |
| [appearance/](appearance/) | Visibility and light/dark presentation                                  |
| [status/](status/)         | Notices, emphasis, and persistent visual markers                        |
| [content/](content/)       | Documents, quantitative displays, calendar dates, and time              |
| [keyboard/](keyboard/)     | Physical-key symbols used in prompts                                    |

Choose a home from the depicted role, not the route currently importing the icon. An account screen may use action and navigation icons without moving them into `identity/`. A shape can support several meanings at call sites; keep one authoritative asset and let its owner supply the accessible wording. Distinct existing geometry, such as `CloseIcon` and `XIcon`, remains independently available rather than being silently merged during organization.

Import the specific categorized path, for example `#lib/icons/actions/PlusIcon.svelte`. There are no compatibility files at the former flat paths. When moving an asset, update every consumer and documented import in the same change.

## One public contract

| Prop          | Meaning                                                      |
| ------------- | ------------------------------------------------------------ |
| `class`       | Caller-supplied layout, color, and responsive sizing classes |
| `size`        | Width and height attributes in pixels; defaults to 16        |
| `strokeWidth` | Stroke width for stroked geometry; defaults to 1.75          |

Color follows `currentColor`, so the owning control sets foreground color and dark-mode behavior. A Tailwind sizing class can override the SVG width/height attributes. Use a consistent method within a control family, and remember that the visual icon size is not the button's hit-target size.

Source geometry retains its fill or stroke construction. Applying a stroke-oriented prop cannot turn a filled silhouette into a stroked outline. `FlagIcon` and `PinIcon` additionally accept `filled`; `LockIcon` accepts `locked`. Those state props express a real visual variant and are documented locally rather than forced into every icon's common shape.

```svelte
<script lang="ts">
  import PlusIcon from '#lib/icons/actions/PlusIcon.svelte';
</script>

<button type="button" aria-label="Add item">
  <PlusIcon class="size-4" />
</button>
```

## Accessibility belongs to the owner

Icons are decorative and hidden from assistive technology. A button supplies its own accessible name, or visible text beside the icon supplies it. Do not name an action only through a shape or tooltip that cannot be reached with the keyboard. State represented by a filled pin, flag, or lock also needs the appropriate control state or text.

Keyboard-symbol icons follow the same rule. A keycap component can draw Shift or Enter while retaining those words once in its accessible text. Exposing both drawn geometry and a second text label would duplicate the name; hiding everything would erase it.

## Adding or adapting an icon

Keep the asset a leaf: no route imports, theme-store dependency, event registrations, or business state. Use `currentColor` and the common props rather than embedding an application's accent color. Preserve the source's view box, meaningful fill rule, line caps, and joins so standardizing the wrapper does not distort the shape.

Each component has an `@component` description and a documented named props type. Record its source when known and document every additional variant prop. There is no checked-in icon-generation command to regenerate this directory; changes must leave the actual Svelte file self-contained and reviewable.

Use the [UI gate](../../../README.md#run-and-validate) for code changes and inspect the rendered shape in both themes, at small sizes, and in each state variant. Type checking catches a missing prop declaration, but not a filled path that disappears against the selected surface.
