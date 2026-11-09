# dsh-todolist

A floating glass to-do card for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web UI.
Drag it anywhere, fold it into a small launcher, and switch between a minimal list and an
Eisenhower four-quadrant matrix.

## Features

- **Floating glass card** — semi-transparent, blurred, rounded, follows the host light/dark theme.
- **Drag** — press and hold the header briefly, then move the card anywhere. The position is remembered.
- **Hide** — the `–` button folds the card into a 40px launcher; click the launcher to bring it back.
- **Resize** — drag any edge or corner of the card to change its width and height.
- **Minimal mode** — four status views (To-do / Pending / Completed / Cancelled), grouped by category,
  with a searchable category dropdown that can create categories in place.
- **Quadrant mode** — a 2×2 matrix labelled `DO / PLAN / DELEGATE / DROP`. Tasks can be dragged between
  cells, completed in place (they dim and strike through), or cancelled with `×`. The two modes keep
  separate task sets.

## Install

Once the package is published to npm:

```sh
dsh plugin --profile <profile> add dsh-todolist
```

You can also add the folder through the Harness plugin manager.

## Data and privacy

Everything is kept in the browser's `localStorage` on this machine. The plugin makes no network
requests, sends no telemetry, and never reads session content or credentials. Removing the plugin
or clearing the site data removes the stored lists.

## License

MIT — see [LICENSE](./LICENSE).
