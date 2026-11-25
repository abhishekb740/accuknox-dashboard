# CNAPP Dashboard

A configurable security dashboard. The page is rendered entirely from a JSON config of categories and widgets, and the user can add, remove, hide, show and search widgets. Changes are kept in a Zustand store and saved to `localStorage`.

**Live demo:** https://cnapp-dashboard.pages.dev

![Dashboard on desktop](docs/desktop-1-default.png)

## Features mapped to the requirements

| # | Requirement | How it is met |
| --- | --- | --- |
| 1 | JSON drives the dashboard: categories, each with widgets | `src/data/dashboard.json` holds the three categories (CSPM Executive Dashboard, CWPP Dashboard, Registry Scan) and their widgets `{ id, name, text, type?, data? }`. It is loaded into the Zustand store and every section and card is rendered from store state. |
| 2 | Add and remove widgets per category dynamically | Two store actions cover it: `removeWidget` for a card's cross button, and `applyWidgetChanges` for everything confirmed in the drawer (visibility toggles and new widgets, each tied to its category). The UI re-renders immediately and the layout persists across reloads. |
| 3 | Widget content can be random text | New widgets are `text` widgets that show the text the user entered. The seeded widgets show sample charts (donut, stacked bar) or a "No Graph data available!" placeholder, as in the mockup. |
| 4 | "+ Add Widget" asks for name and text and adds to that category | Every category ends with a dashed "+ Add Widget" card that opens the drawer on that category's tab. The drawer has a name and text form per tab; "Add to list" stages the widget and Confirm adds it to the category. A widget typed but not added to the list is still created on Confirm, in the tab where it was typed. |
| 5 | Remove with a cross icon, or uncheck in the category panel | Each card has a labelled cross button. The drawer lists every widget of the selected category (tabs: CSPM, CWPP, Image) as checkboxes; unchecking hides it, checking shows it again. Drawer changes apply only on Confirm, Cancel discards them. |
| 6 | Search across all widgets | The top bar search filters widgets in every category by name or text, case-insensitively, shows the match count, and shows a "No widgets match" state with a Clear search button. |

### Extras

- **Persistence:** the user's changes are saved to `localStorage` through a wrapper that never throws (private mode or blocked storage just means no persistence), and merged with the JSON config on every load. "Reset to default" in the kebab menu restores the JSON config. See [Persistence and validation](#persistence-and-validation).
- **Accessibility:** every icon button has an accessible label; the drawer is a modal dialog with a focus trap, Escape to close, focus returned to the opener, and the page behind made `inert`; category tabs and the kebab menu support arrow keys, Home and End; charts carry a text summary for screen readers; search results are announced through a live region.
- **Responsive:** one column on phones, two on tablets, three on desktop. The drawer becomes full width on small screens.
- **Header controls** from the mockup: breadcrumb, refresh (visual feedback only, since the data is static), kebab menu and a "Last 2 days" range select.

## Tech choices

| Choice | Why |
| --- | --- |
| **React 18 + TypeScript** | Typed widget and category models catch config mistakes at build time. |
| **Vite** | Fast dev server and a plain static build that deploys anywhere. |
| **Zustand** | The state is one small slice (categories plus a search query). Zustand gives a typed store with plain functions as actions, no providers or boilerplate, and a `persist` middleware for `localStorage`. Redux Toolkit would work too but adds ceremony that this size of app does not need. |
| **Tailwind CSS v4** | Fast to match the mockup's spacing and colours without a separate stylesheet per component. |
| **Hand-rolled SVG charts** | Two simple chart shapes (donut and stacked bar) are a few lines of SVG and CSS each, which keeps the bundle small (about 57 kB gzipped JS) instead of pulling in a chart library. |
| **Vitest + React Testing Library** | Shares Vite's config and runs the store and component tests in a jsdom environment with a real `localStorage`. |
| **Playwright** | Drives the built app in a real Chromium for the end-to-end flows. |

### State design

- Removing a widget sets `hidden: true` rather than deleting it, so it stays in its category and can be re-checked in the drawer.
- Search is derived, not stored as a filtered copy: `filterCategories(categories, query)` is a pure function used by the page and covered by tests.
- The drawer stages its edits in local component state and commits them in one `applyWidgetChanges` call, so Cancel really cancels.
- Only the user's changes are persisted; the search box starts empty on every visit.

## Persistence and validation

### What is saved

The store keeps the full list of categories in memory, but `localStorage` (key `cnapp-dashboard`) holds only what the user changed:

```json
{
  "version": 2,
  "state": {
    "hiddenWidgetIds": ["cloud-accounts"],
    "customWidgets": { "cwpp": [{ "id": "widget-...", "name": "Runtime Policies", "text": "..." }] }
  }
}
```

`src/store/persistence.ts` holds the pure functions behind this: `toPersistedLayout` (state to saved layout), `parseLayout` (checks a saved layout), `migrateLayout` (older versions to the current one) and `mergeLayout` (config plus saved layout to state). They are wired into Zustand's `persist` through `partialize`, `migrate` and `merge`.

### Merge rules on every load

1. Categories, their order, and the name, text, type and chart data of every config widget come from `dashboard.json`. Categories and widgets added to the JSON appear for returning visitors without any version bump.
2. A widget is hidden only if the user hid it. New config widgets start visible.
3. User-created widgets are kept and shown after the config widgets of their category.
4. If a category is removed from the JSON, its user-created widgets are dropped too. There is no section left to show them in, and moving them into another category would be a guess.
5. Saved ids that no longer match a widget are ignored and disappear on the next save. If a config widget ever shares an id with a user-created one, the config widget wins.

### Versions and migration

`version` changes only when the saved format changes, not when the JSON does. Version 1 saved a full copy of every category and widget, which meant a returning visitor never saw new JSON widgets and kept stale names. Version 2 saves only the changes above. `migrateLayout` converts a v1 snapshot by keeping its hidden flags and user-created widgets and discarding the copied config, and the store writes the result back as v2.

### Validation

- **Config:** `src/lib/parseConfig.ts` checks `dashboard.json` at startup with hand-written type guards (no schema library, to keep the bundle small) and returns a typed copy that holds only known fields. It checks required strings, widget types, chart data values and duplicate category or widget ids. A bad config throws a `ConfigError` listing every bad path, for example `categories[1].widgets[0].type must be one of donut, bar, empty, text`, so it fails loudly in development. A unit test parses the shipped file, so CI catches a bad config before it can be deployed.
- **Saved state:** whatever is read back from `localStorage` is checked before it is used. Text that is not JSON, a value of the wrong shape, a broken v1 snapshot or an unknown version all lead to the same outcome: a console warning, the dashboard starts from the JSON config, and the bad value is removed so it cannot fail again.

## Project structure

```
src/
  data/dashboard.json        Dashboard config: categories and widgets
  types.ts                   Category, Widget and chart types
  store/
    dashboardStore.ts        Zustand store: remove, apply drawer changes, search, reset
    persistence.ts           Saved layout format, validation, migration and merge with the config
    dashboardStore.test.ts   Vitest unit tests for the store and search
    persistence.test.ts      Tests for merge, migration, invalid saved state and rehydration
  test/setup.ts              Test setup: jest-dom matchers and cleanup
  lib/
    filterWidgets.ts         Pure search filter across all categories
    parseConfig.ts           Runtime validation of dashboard.json
    parseConfig.test.ts      Tests for valid and invalid configs
    safeStorage.ts           localStorage wrapper with try/catch
    id.ts                    Unique id helper
  hooks/
    useFocusTrap.ts          Focus trap and Escape handling for the drawer
  components/
    TopBar.tsx               Breadcrumb, search box, notifications, account
    DashboardHeader.tsx      Title, Add Widget, refresh, kebab menu, time range
    ActionsMenu.tsx          Keyboard-accessible kebab dropdown
    CategorySection.tsx      One category: heading and responsive widget grid
    WidgetCard.tsx           Card with title, remove button and body by widget type
    AddWidgetCard.tsx        Dashed "+ Add Widget" placeholder card
    AddWidgetDrawer.tsx      Right-side drawer: tabs, checkboxes, new widget form
    EmptySearchState.tsx     Shown when no widget matches the search
    charts/                  DonutChart, StackedBar, ChartLegend, EmptyChart
    icons.tsx                Inline SVG icons
    Dashboard.test.tsx       React Testing Library component tests
  App.tsx                    Page layout and drawer state
  main.tsx                   Entry point
e2e/dashboard.spec.ts        Playwright end-to-end tests
playwright.config.ts         Playwright config (Chromium, vite preview web server)
.github/workflows/ci.yml     CI: lint, unit tests, build, end-to-end tests
docs/                        Screenshots (desktop and mobile)
```

## Running locally

Requires Node.js 20 or newer.

```bash
npm install       # install dependencies
npm run dev       # start the dev server at http://localhost:5173
npm run build     # type-check and build to dist/
npm run preview   # serve the production build locally
npm test          # run the unit and component tests once
npm run test:e2e  # run the Playwright end-to-end tests
npm run lint      # run ESLint
```

## Testing

### Unit and component tests (Vitest)

```bash
npm test             # run once
npm run test:watch   # watch mode
```

- `src/store/dashboardStore.test.ts` covers the store actions (remove, apply drawer changes, reset), what is written to `localStorage` and the search filter.
- `src/store/persistence.test.ts` covers the merge rules, the v1 to v2 migration, rejection of invalid saved state, and rehydrating the real store from `localStorage` (including clearing bad values).
- `src/lib/parseConfig.test.ts` parses the shipped `dashboard.json` and checks that invalid configs fail with clear messages.
- `src/components/Dashboard.test.tsx` uses React Testing Library to render the widget card and the full app, then removes a widget, adds one through the drawer (including a widget typed in one tab while another is open) and searches, the same way a user would.

### End-to-end tests (Playwright)

```bash
npx playwright install chromium   # first run only
npm run test:e2e
```

The suite in `e2e/` runs in Chromium against the production build: Playwright builds the app and starts `vite preview` on port 4173 by itself. It covers:

- the three categories and six widgets rendered from the JSON config
- removing a widget with its cross button
- adding a widget through the drawer (name, text, Add to list, Confirm) into the right category, plus form validation
- unchecking a widget in the drawer to hide it and checking it to show it again
- Cancel discarding staged changes
- search by name and by text, the empty state and Clear search
- the layout surviving a reload, and Reset to default
- a returning visitor with a v1 saved layout: new JSON categories appear, hidden and user-created widgets are kept, storage is rewritten as v2
- an unreadable saved layout falling back to the JSON config and being cleared
- Escape closing the drawer and returning focus to the button that opened it
- a phone-sized viewport: one column, no horizontal scroll, full-width drawer

To run the same suite against a deployed copy, set `BASE_URL`, for example `BASE_URL=https://example.com npm run test:e2e`. No local server is started in that case.

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request, on Ubuntu with Node.js 20:

1. `npm ci`
2. `npm run lint`
3. `npm test`
4. `npm run build`
5. `npx playwright install --with-deps chromium`, then `npm run test:e2e`

If the end-to-end step fails, the Playwright HTML report is uploaded as a build artifact.

## Deployment

`npm run build` outputs a static site in `dist/` with `base: '/'`.

- **Cloudflare Pages:** build command `npm run build`, output directory `dist`.
- **Vercel:** framework preset Vite, build command `npm run build`, output directory `dist`.

## Screenshots

| | Desktop | Mobile |
| --- | --- | --- |
| Default view | [desktop-1-default](docs/desktop-1-default.png) | [mobile-1-default](docs/mobile-1-default.png) |
| Add Widget drawer | [desktop-2-drawer](docs/desktop-2-drawer.png) | [mobile-2-drawer](docs/mobile-2-drawer.png) |
| After adding a widget | [desktop-3-after-add](docs/desktop-3-after-add.png) | [mobile-3-after-add](docs/mobile-3-after-add.png) |
| Search results | [desktop-4-search](docs/desktop-4-search.png) | [mobile-4-search](docs/mobile-4-search.png) |
| No search results | [desktop-5-search-empty](docs/desktop-5-search-empty.png) | [mobile-5-search-empty](docs/mobile-5-search-empty.png) |
| Kebab menu | [desktop-6-menu](docs/desktop-6-menu.png) | [mobile-6-menu](docs/mobile-6-menu.png) |
