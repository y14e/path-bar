# Path Bar

Breadcrumb-style path bar implementation in TypeScript. Supports keyboard navigation, integrated menus, and seamless menu traversal.

## Install

```bash
npm i @y14e/path-bar
```

```ts
// npm
import PathBar from '@y14e/path-bar@1.0.0';
// with middleware
import PathBar, { flip, offset, shift } from '@y14e/path-bar@1.0.0';

// CDNs
import PathBar from 'https://esm.sh/@y14e/path-bar@1.0.0';
// or
import PathBar from 'https://cdn.jsdelivr.net/npm/@y14e/path-bar@1.0.0/+esm';
// or
import PathBar from 'https://esm.unpkg.com/@y14e/path-bar@1.0.0';
```

## Usage

```ts
new PathBar(root, options);
// => PathBar
//
// root: HTMLElement
// options (optional): PathBarOptions

```

## 🪄 Options

```ts
interface PathBarOptions {
  // Work in progress
}

interface PathBarPopoverOptions {
  arrow?: boolean;           // default: true
  middleware?: Middleware[]; // default: [flip(), offset(), shift()]
  placement?: Placement;     // default: 'bottom-start'
}
```

> [!NOTE]
> `Middleware` and `Placement` are provided by [Floating UI](https://floating-ui.com/). See the Floating UI docs for details.

### ⚙️ Customize defaults

Override the global default settings applied to all path bar instances.

```ts
import PathBar from '@y14e/path-bar';

PathBar.defaults = {
  delay: 500,
  selector: {
    list: 'ul',
  },
};

new PathBar(root);
```

## 📦 APIs

### `destroy`

Destroys the instance and cleans up all event listeners and menus.

```ts
pathBar.destroy(force);
// => Promise<void>
//
// force (optional): If true, skips waiting for animations to finish.
```

## Demo

https://y14e.github.io/path-bar/

## Credits

* [Floating UI](https://floating-ui.com/)
