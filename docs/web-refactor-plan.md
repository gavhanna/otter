# Web App Refactor Plan

## Context

The current web client works, but the routing layout, data fetching logic, and recording UI are all tightly coupled. This makes it hard to evolve the app (e.g. add new screens, reuse layouts, or test the recorder). The review highlighted a few key pain points:

- `main.tsx` contains every route, layout, and guard, so TanStack Router cannot split bundles or enforce auth declaratively.
- Query logic (recording list/detail) is duplicated across components, and optimistic updates in `RecordingView` are currently broken because they assume a different cache shape.
- `RecordingScreen` mixes MediaRecorder orchestration, timers, API calls, and complex UI state in a single ~600 line component.

## Goals

1. Adopt TanStack Router's file-based routing to simplify layouts/guards and enable code‑splitting.
2. Centralize data fetching and cache helpers for recordings to prevent divergent logic between the sidebar and detail view.
3. Extract MediaRecorder concerns into reusable hooks, leaving `RecordingScreen` as a thin presentational component.
4. Fix the immediate optimistic update bug so favourites/location edits behave correctly while the larger refactor happens.

## Work Plan

### 1. Switch to File-Based Routing

1. Enable the router's file-based API (`createFileRoute` + `createRootRouteWithContext`) and move each route into `src/routes/**`.
2. Define a root layout that wraps children in `AuthProvider`, `QueryClientProvider`, and `AppShell`.
3. Move auth guards into `beforeLoad` hooks:
   - Redirect unauthenticated users from protected routes.
   - Redirect authenticated users away from `/login`.
4. Keep route components lean; let TanStack Router supply params/search to `AppShell` so we can drop manual `pathname` parsing.

**Acceptance:** Navigating between `/`, `/recording/$id`, `/recent`, `/favourites`, and `/login` works just as before, but the bundle now code-splits per route and guards no longer rely on `useEffect`.

### 2. Consolidate Recording Queries

1. Create `useRecordingsQuery` and `useRecordingQuery(recordingId)` hooks in `src/hooks/recordings.ts`.
2. Add helper utilities: `updateRecordingInCache`, `removeRecordingFromCache`, `optimisticallyPatchRecording`, etc.
3. Update `Sidebar` and `RecordingView` to consume these hooks instead of duplicating query configs.
4. Fix the optimistic update bug by treating the query data as the recording object (not `{ recording: ... }`) and aligning cache shapes.

**Acceptance:** Sidebar and detail view stay in sync without manual `setQueryData` copies, and optimistic toggles reflect immediately with reliable rollback.

### 3. Refactor RecordingScreen

1. Create a `useRecorder` hook that encapsulates MediaRecorder lifecycle (start/pause/resume/stop, timers, duration).
2. Create a `useAudioVisualizer` hook responsible for analyzer setup/teardown.
3. Use a React Query `useMutation` for uploads (`api.createRecording`) to handle saving/error states.
4. Split the UI into smaller components (`RecorderControls`, `Visualizer`, `PreviewPanel`) to make the screen easier to read/test.

**Acceptance:** Recording logic lives inside hooks with clear return values, `RecordingScreen` becomes mostly JSX + callbacks, and we can unit-test the hooks without DOM globals.

### 4. Incremental Bug Fix

Before (or in parallel with) the larger refactor, patch `RecordingView`'s optimistic updates to operate on the correct cache shape so toggling favourites/location feels responsive today.

**Acceptance:** Users see immediate favourite/location changes even before the broader restructuring lands.

## Risks & Mitigations

- **Routing migration complexity:** Introduce the file-based router in its own PR, retaining the current component tree until everything compiles, then iterate on layouts.
- **Recorder refactor regressions:** Add lightweight tests (or Storybook stories) for the new hooks and keep the existing UI snapshots until confidence is restored.
- **API contract drift:** Reuse the existing `api` client to ensure request/response shapes stay identical; add type tests if needed.

## Review Checklist

- [ ] File-based routes load and guard correctly.
- [ ] Sidebar/detail share the same query helpers and optimistic updates work.
- [ ] Recorder hooks cover MediaRecorder + visualizer lifecycles with cleanup on unmount.
- [ ] Manual QA: record, save, view, favourite/unfavourite, edit metadata, delete.

Once these steps are complete we can layer in additional features (e.g. settings pages) without touching `main.tsx` or duplicating state.
