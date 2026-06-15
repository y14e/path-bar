# Path Bar

Breadcrumb-style path bar implementation in TypeScript. Supports keyboard navigation, integrated menus, and seamless menu traversal.

## Install

```bash
npm i @y14e/path
```

```ts
// npm
import Path from '@y14e/path@1.0.3';
// with middleware
import Path, { flip, offset, shift } from '@y14e/path@1.0.3';

// CDNs
import Path from 'https://esm.sh/@y14e/path@1.0.3';
// or
import Path from 'https://cdn.jsdelivr.net/npm/@y14e/path@1.0.3/+esm';
// or
import Path from 'https://esm.unpkg.com/@y14e/path@1.0.3';
```

## Usage

```ts
new Path(root, options);
// => Path
//
// root: HTMLElement
// options (optional): PathOptions

```

## 🪄 Options

```ts
interface PathOptions {
  // Work in progress
}

interface PathPopoverOptions {
  arrow?: boolean;           // default: true
  middleware?: Middleware[]; // default: [flip(), offset(), shift()]
  placement?: Placement;     // default: 'bottom-start'
}
```

> [!NOTE]
> `Middleware` and `Placement` are provided by [Floating UI](https://floating-ui.com/). See the Floating UI docs for details.

### ⚙️ Customize defaults

Override the global default settings applied to all path instances.

```ts
import Path from '@y14e/path';

Path.defaults = {
  delay: 500,
  selector: {
    list: 'ul',
  },
};

new Path(root);
```

## 📦 APIs

### `destroy`

Destroys the instance and cleans up all event listeners and menus.

```ts
Path.destroy(force);
// => Promise<void>
//
// force (optional): If true, skips waiting for animations to finish.
```

## Demo

https://y14e.github.io/path/

## Credits

* [Floating UI](https://floating-ui.com/)
