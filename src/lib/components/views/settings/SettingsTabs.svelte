<!--
@component
Links the Settings preset-editor routes and marks the current tab by route identity. Navigation lifecycle remains owned by SvelteKit.
-->
<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import AmortizationIcon from '#lib/icons/content/AmortizationIcon.svelte';
  import CashflowIcon from '#lib/icons/content/CashflowIcon.svelte';
  const tabs = [
    { href: '/settings', label: 'Amortization', icon: AmortizationIcon },
    { href: '/settings/cashflow', label: 'Cashflow', icon: CashflowIcon },
  ] as const;
</script>

<nav
  aria-label="Settings tabs"
  class="flex gap-6 border-b border-slate-200 dark:border-slate-800"
>
  {#each tabs as tab (tab.href)}
    {@const active = page.route.id === tab.href}
    <a
      href={resolve(tab.href)}
      aria-current={active ? 'page' : undefined}
      class={[
        'inline-flex min-w-0 items-center gap-2 border-b-2 px-1 py-3 text-sm focus-visible:outline-2 focus-visible:outline-sky-500',
        active
          ? 'border-slate-900 font-semibold text-slate-900 dark:border-slate-100 dark:text-slate-100'
          : 'border-transparent font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
      ]}><tab.icon class="size-4 shrink-0" />{tab.label}</a
    >
  {/each}
</nav>
