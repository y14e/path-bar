/**
 * Path Bar
 * Breadcrumb-style path bar implementation in TypeScript.
 * Supports keyboard navigation, integrated menus, and seamless menu traversal.
 *
 * @version 1.0.0
 * @author Yusuke Kamiyamane
 * @license MIT
 * @copyright Copyright (c) Yusuke Kamiyamane
 * @see {@link https://github.com/y14e/path-bar}
 */

// -----------------------------------------------------------------------------
// Imports
// -----------------------------------------------------------------------------

import type { Middleware, Placement } from '@floating-ui/dom';
import Menu, { flip, offset, shift } from '@y14e/menu';
import { createRovingTabIndex } from '@y14e/roving-tabindex';
import { getNextFocusable } from 'power-focusable';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface PathBarOptions {
  readonly animation?: {
    readonly duration?: number;
  };
  readonly popover?: PathBarPopoverOptions;
  readonly selector?: {
    readonly item?: string;
    readonly list?: string;
    readonly menu?: {
      readonly item?: string;
      readonly list?: string;
      readonly trigger?: string;
    };
  };
}

export interface PathBarPopoverOptions {
  readonly arrow?: boolean;
  readonly middleware?: Middleware[];
  readonly placement?: Placement | string;
}

type Binding = {
  link: HTMLElement;
  menu: Menu | null;
};

type DeepRequired<T> = T extends (...args: unknown[]) => unknown
  ? T
  : T extends readonly unknown[]
    ? T
    : T extends object
      ? { [K in keyof T]-?: DeepRequired<NonNullable<T[K]>> }
      : NonNullable<T>;

// -----------------------------------------------------------------------------
// APIs
// -----------------------------------------------------------------------------

export default class PathBar {
  static defaults: PathBarOptions = {};

  #rootElement!: HTMLElement;
  #defaults = {
    animation: { duration: 300 },
    popover: {
      arrow: true,
      middleware: [flip(), offset(), shift()],
      placement: 'bottom-start',
    },
    selector: {
      item: 'li',
      list: 'ol',
      menu: {
        item: '[role^="menuitem"]',
        list: '[role="menu"]',
        trigger: '[data-menu-trigger]',
      },
    },
  };
  #settings!: DeepRequired<PathBarOptions>;
  #listElement!: HTMLElement | null;
  #itemElements!: HTMLElement[];
  #linkElements!: HTMLElement[];
  #bindings = new WeakMap<HTMLElement, Binding>();
  #controller: AbortController | null = null;
  #cleanupRovingTabIndex: (() => void) | null = null;
  #autoOpen = false;
  #menus: Menu[] = [];
  #isDestroyed = false;

  constructor(root: HTMLElement, options: PathBarOptions = {}) {
    if (!(root instanceof HTMLElement)) {
      throw new TypeError('Invalid root element');
    }

    if (root.hasAttribute('data-path-bar-initialized')) {
      console.warn('Already initialized');
      return;
    }

    this.#rootElement = root;
    this.#defaults = this.#mergeOptions(this.#defaults, PathBar.defaults);
    this.#settings = this.#mergeOptions(this.#defaults, options);
    matchMedia('(prefers-reduced-motion: reduce)').matches &&
      Object.assign(this.#settings.animation, { duration: 0 });
    const { selector } = this.#settings;
    this.#listElement = this.#rootElement.querySelector<HTMLElement>(
      selector.list,
    );

    if (!this.#listElement) {
      console.warn('Missing list element');
      return;
    }

    this.#itemElements = [
      ...this.#listElement.querySelectorAll<HTMLElement>(
        `${selector.item}:not(:scope ${selector.list} *)`,
      ),
    ];

    if (!this.#itemElements.length) {
      console.warn('Missing item elements');
      return;
    }

    this.#linkElements = [
      ...this.#listElement.querySelectorAll<HTMLElement>(
        `${selector.list} > * > a`,
      ),
    ];

    if (!this.#linkElements.length) {
      console.warn('Missing <a> elements');
      return;
    }

    this.#initialize();
  }

  async destroy(force = false) {
    if (this.#isDestroyed) {
      return;
    }

    this.#isDestroyed = true;
    this.#controller?.abort();
    this.#controller = null;
    this.#cleanupRovingTabIndex?.();
    this.#cleanupRovingTabIndex = null;
    await Promise.all(this.#menus.map((menu) => menu.destroy(force)));
    this.#menus.length = 0;
    const elements = this.#itemElements;

    if (this.#listElement) {
      elements.push(this.#listElement);
    }

    this.#listElement = null;
    this.#itemElements.length = 0;
    this.#rootElement.removeAttribute('data-path-bar-initialized');
  }

  #initialize() {
    this.#controller = new AbortController();
    const { signal } = this.#controller;

    if (!this.#listElement) {
      return;
    }

    this.#listElement.addEventListener('focusin', this.#onFocusIn, { signal });
    this.#listElement.addEventListener('focusout', this.#onFocusOut, {
      signal,
    });

    this.#linkElements.forEach((link) => {
      link.addEventListener('keydown', this.#onKeyDown, { signal });
      const menuRoot = link.nextElementSibling;

      if (!(menuRoot instanceof HTMLElement)) {
        return;
      }

      const { animation, popover, selector } = this.#settings;
      const menuInstance = new Menu(
        menuRoot,
        { animation, popover: { menu: popover }, selector: selector.menu },
        { externalTrigger: link, isMenubar: true },
      );
      this.#bindings.set(link, createBinding(link, menuInstance));
      this.#menus.push(menuInstance);
    });

    this.#cleanupRovingTabIndex = createRovingTabIndex(this.#listElement, {
      direction: 'horizontal',
      noMemory: true,
      selector: `${this.#settings.selector.list} > * > a`,
      wrap: true,
    });

    this.#rootElement.setAttribute('data-path-bar-initialized', '');
  }

  #onFocusIn = (event: FocusEvent): void => {
    if (!this.#autoOpen && !this.#hasOpenMenu()) {
      return;
    }

    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const link =
      this.#linkElements.indexOf(target) >= 0
        ? target
        : target.closest(this.#settings.selector.item)?.querySelector('a');

    if (!link) {
      return;
    }

    const menu = this.#bindings.get(link)?.menu;

    if (menu) {
      this.#autoOpen = true;
      menu.open();
      return;
    }

    this.#closeAllMenus();
  };

  #onFocusOut = (event: FocusEvent): void => {
    const target = event.relatedTarget;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (!this.#rootElement.contains(target) && !this.#hasOpenMenu()) {
      this.#autoOpen = false;
    }
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    const { key, altKey, ctrlKey, metaKey, shiftKey } = event;

    if (altKey || ctrlKey || metaKey || shiftKey) {
      return;
    }

    if (!['Tab', 'Escape'].includes(key)) {
      return;
    }

    switch (key) {
      case 'Tab': {
        event.preventDefault();
        this.#closeAllMenus();
        const next = getNextFocusable();
        next instanceof HTMLElement && next.focus();
        break;
      }
      case 'Escape':
        this.#autoOpen = false;
        break;
    }
  };

  #closeAllMenus(): void {
    this.#menus
      .filter((menu) => menu.isOpen())
      .forEach((menu) => {
        menu.close();
      });
  }

  #hasOpenMenu(): boolean {
    return this.#menus.some((menu) => menu.isOpen());
  }

  #mergeOptions(
    target: DeepRequired<PathBarOptions>,
    source: PathBarOptions,
  ): DeepRequired<PathBarOptions> {
    return {
      ...target,
      ...source,
      animation: { ...target.animation, ...(source.animation ?? {}) },
      popover: {
        ...target.popover,
        ...(source.popover ?? {}),
        middleware: Object.assign(
          [...(target.popover?.middleware ?? [])],
          [...(source.popover?.middleware ?? [])],
        ),
      },
      selector: {
        ...target.selector,
        ...(source.selector ?? {}),
        menu: { ...target.selector?.menu, ...(source.selector?.menu ?? {}) },
      },
    };
  }
}

// -----------------------------------------------------------------------------
// Utils
// -----------------------------------------------------------------------------

function createBinding(link: HTMLElement, menu: Menu): Binding {
  return { link, menu };
}

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

export { flip, offset, shift } from '@y14e/menu';
