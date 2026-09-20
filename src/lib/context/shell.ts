import { createContext, type Snippet } from 'svelte';

/** One route's contextual sidebar: its region name and the content. */
export type ContextualRail = {
  /**
   * Title-case name of the rail region. The shell uses it verbatim as the
   * accessible name of the sidebar landmark, and reads it back inside the
   * toggle's label and the loading message, so word it as the region's name
   * rather than as a description of it.
   */
  label: string;
  /** The rail's body, rendered inside the shell's sized container. */
  content: Snippet;
  /**
   * Whether `content` has the data it needs to render in full. A rail is
   * registered as soon as its route mounts, so that the sidebar's geometry is
   * settled before any request resolves; until this returns true the shell
   * fills it with a spinner rather than letting the route paint empty chrome
   * and then populate it. Omit it for a rail with nothing to wait for.
   */
  ready?: () => boolean;
};

/** The application shell's contextual-rail and viewport surface for a route. */
export type ShellContext = {
  /**
   * Register this route's contextual rail and return the function that
   * releases it. The route owns that teardown and must call it on unmount, or
   * the next route inherits a rail it did not register.
   */
  registerContextualRail: (rail: ContextualRail) => () => void;
  /** Close the small-viewport context drawer, if it is open. */
  closeContextDrawer: () => void;
  /** Whether the small-viewport context drawer is currently open. */
  contextualDrawerOpen: () => boolean;
  /** Whether the viewport is below the shell's desktop breakpoint. */
  smallViewport: () => boolean;
};

/** Typed accessors for the shell context the root layout provides. */
export const [getShellContext, setShellContext] = createContext<ShellContext>();
