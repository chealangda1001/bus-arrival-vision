
### What I found (root cause)

The account **was created in Auth**, but its profile was **not updated to role `driver`** at creation time.

Evidence from your project:

1. **Edge Function logs** for `create-admin-user` at `06:00:29Z`:
   - `Creating admin user: sokha@kimseng.com with role: driver`
   - `Error updating profile: invalid input value for enum user_role: "driver"`

2. **Database state** for `sokha@kimseng.com` now:
   - `profiles.role = operator_admin`
   - `profiles.operator_id = null`
   - `profiles.branch_id = null`

3. Your Driver list query in `DriverManagement.tsx` filters by:
   - `operator_id = current operator`
   - `role = 'driver'`

So this user is excluded from the list because it is not stored as a driver profile.

---

### Why this happened

The account was created during a short timing window:
- Driver creation was already calling `role: 'driver'`
- But the enum migration adding `'driver'` to `public.user_role` was applied **afterward**

So Auth user creation succeeded, but profile update failed and left a partially configured account.

---

### Plan to fix this permanently

#### 1) Repair the broken existing account data
Create one migration to update the specific profile for `sokha@kimseng.com` to:
- `role = 'driver'`
- `operator_id = Kimseng operator`
- `branch_id = Main Terminal`

This will make the user appear in the list immediately.

#### 2) Prevent silent partial-success in `create-admin-user`
Update edge function behavior:
- If profile update fails, return a clear **error** response (not success)
- Include actionable details in payload
- Optionally cleanup the newly created auth user to avoid orphaned accounts (safe-guarded)

#### 3) Improve frontend error handling in `DriverManagement`
Right now it treats the call as success unless `error` or `data.error`.
Add handling for partial responses (e.g. `warning`/`profile_error`) so UI does not show a misleading success toast.

#### 4) Validate end-to-end
After fix:
1. Create a driver
2. Confirm driver appears instantly in Drivers tab
3. Confirm profile row has role/operator/branch set correctly
4. Login as that driver and verify redirect/dashboard access

---

### Technical notes

- No RLS policy change is required for this specific issue.
- This is a **data consistency + error-handling** fix.
- The account `sokha@kimseng.com` is recoverable; no need to delete/recreate if we patch profile row correctly.
