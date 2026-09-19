# Navigation and destination policy

The `navigation` module owns shared decisions about destinations and how navigation is presented. It is the home for rules that multiple UI surfaces must apply consistently when interpreting or exposing a destination. Framework route resolution, API endpoint construction, and route-owned interaction state retain their own boundaries.

## Responsibilities and boundaries

| Policy                | Responsibility                                                                                                            | Presentation boundary                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Authored destinations | Accept supported destination schemes, classify outbound forms, choose target/rel attributes, and share prose-link styling | Prose-link controls apply the policy; the caller supplies accessible text |

The authored-destination policy below is a pure value boundary with no browser state, event listeners, or network requests. Other navigation policies must state their own input, interpretation, and ownership rules.

The [Link component](../components/elements/Link.svelte) combines this destination policy with presentation. Its caller still supplies meaningful accessible text; classifying a destination does not authorize the resource behind it.

## Validation and presentation are separate steps

`safeLinkHref(href)` resolves the supplied string against a fixed HTTPS base only to inspect its normalized protocol. It accepts HTTP, HTTPS, mail, telephone, and relative destinations, and returns the original string for accepted input. Invalid URLs or other protocols become `#`, an inert in-page destination. It does not turn a relative path into a canonical absolute URL.

URL parsing matters because a browser can normalize control characters before interpreting a scheme. A naive string-prefix test could overlook an executable destination. The protocol check belongs before rendering the link, regardless of whether the label itself is escaped text.

`isExternalUrl(href)` classifies destination syntax: absolute schemes and protocol-relative `//...` forms are outbound; empty strings, fragments, and relative/root-relative paths are in-app. This is not a same-origin URL comparison. An absolute URL pointing to the application's own host is still classified as outbound, and the classifier alone is not a safety validator.

`linkTargetAttributes(href)` returns `_blank` plus `noopener noreferrer` for an outbound form, and undefined attributes otherwise. The former prevents the opened page from controlling the originating window and omits its referrer. Mail and telephone schemes follow this same syntax classification; the browser decides how their handlers act.

```ts
import { safeLinkHref, linkTargetAttributes } from '#lib/navigation/links.js';

const href = safeLinkHref('https://example.com/reference');
const attributes = linkTargetAttributes(href);
// { target: '_blank', rel: 'noopener noreferrer' }

safeLinkHref('javascript:alert(1)'); // '#'
linkTargetAttributes('#details'); // undefined target and rel
```

`LINK_CLASS` carries the shared visible underline/color treatment. It does not supply an accessible label; the owning component provides meaningful text and any additional interaction semantics.

## Other path boundaries remain distinct

Application route links use SvelteKit's typed `resolve()` contract. Images and embedded markup have their own allowed-source boundaries. This authored-link helper does not validate restored login destinations, authorize a route, constrain image sources, or sanitize arbitrary HTML.

The [markup safety tests](../tests/markdown/safety.test.ts) cover allowed and rejected authored links alongside the HTML-table sanitizer. When adding a scheme, review both its navigation behavior and its security implications, then run the [app gates](../../../README.md#run-and-validate). Network/CSP restrictions and external protocol handlers still depend on the target browser and deployment.

Add a navigation policy here when callers need one common decision about destinations or navigation behavior. Give each policy its own input/trust contract; do not make the authored-link helpers also stand in for redirect validation, route authorization, or typed route construction. Stateful navigation interactions remain with their component or route owner.
