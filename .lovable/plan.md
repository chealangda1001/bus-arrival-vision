## Problem

Clicking the **Drivers** tab crashes to a blank screen with:

```
Uncaught Error: cannot add `postgres_changes` callbacks for
realtime:departures_changes_769e4f81-...-38763299176c after `subscribe()`.
```

`useDepartures` builds its realtime channel with a name derived only from `branchId`:

```
departures_changes_<branchId>   (or departures_changes_all)
```

When the Drivers tab mounts, `DriverManagement` calls `useDepartures(branchId)` while `AdminPanel` already holds a `useDepartures(branchId)` instance with the identical channel name. Supabase returns the **existing, already-subscribed** channel, and attaching a second `postgres_changes` listener after `subscribe()` throws — an uncaught error that unmounts the whole tree, leaving a blank screen.

## Fix

Make each hook instance use a **unique channel name** so no two instances collide.

In `src/hooks/useDepartures.tsx`, inside the realtime `useEffect`:

- Generate a per-instance unique suffix (e.g. `crypto.randomUUID()` or `Math.random().toString(36)`) and append it to the channel name:

```text
departures_changes_<branchId>_<uniqueId>
```

- Keep the `postgres_changes` filter on `branch_id` unchanged so each instance still only receives its branch's rows.
- Keep the cleanup `supabase.removeChannel(channel)` so the unique channel is torn down on unmount / branch change.

This guarantees `.channel()` always returns a fresh channel, so `.on(...)` runs before `.subscribe()` and the error never occurs.

## Verification

- Open Operator Admin, click the **Drivers** tab — it should render without a blank screen and without the `postgres_changes ... after subscribe()` console error.
- Confirm departures still update in real time on the departures view.

## Technical details

Only one file changes: `src/hooks/useDepartures.tsx` (channel-name construction inside the subscription `useEffect`). No database, RLS, or edge-function changes required.