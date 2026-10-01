# Fix Vite PWA Build Error (Workbox Precache File Size Limit)

Fix the `vite-plugin-pwa` build error caused by Workbox's default 2 MiB precache file size limit when bundling large libraries like `pdfjs-dist`.

## 1. Overview & Diagnosis

During `npm run build` or `vite build`, `vite-plugin-pwa` utilizes Workbox to generate the service worker precache manifest. By default, Workbox enforces a strict 2 MiB (2,097,152 bytes) limit on any single asset in the precache manifest. Since the main bundle (`index-B5A0WQts.js`) is 2.32 MB, Workbox throws a build error.

### Fix Strategy

1. **Increase Workbox Precache Limit**: Set `workbox.maximumFileSizeToCacheInBytes: 5 * 1024 * 1024` (5 MiB) in `vite.config.ts` so Workbox easily handles large single bundles.
2. **Optimize Code Splitting**: Add `build.rollupOptions.output.manualChunks` in `vite.config.ts` to separate large vendor packages (e.g. `pdfjs-dist`, `mammoth`, `@phosphor-icons/react`) into standalone chunks.

---

## 2. Proposed Changes & File Modifications

### `vite.config.ts`

- Add `maximumFileSizeToCacheInBytes: 5 * 1024 * 1024` (5 MiB) to the `workbox` configuration block in `VitePWA(...)`.
- Add `build` configuration with `rollupOptions.output.manualChunks` to split heavy third-party libraries:
  - `pdfjs`: `pdfjs-dist`
  - `docx`: `mammoth`
  - `icons`: `@phosphor-icons/react`
  - `ui`: `@cloudflare/kumo`

---

## 3. Verification Plan

1. **Build Test**: Run `npm run build` (`vite build`) via `run_command` or build tools to confirm `vite-plugin-pwa:build` passes cleanly without Workbox errors.
2. **Lint & Compilation Test**: Run `lint_applet` and `compile_applet` to confirm zero syntax, type, or linter regressions.
