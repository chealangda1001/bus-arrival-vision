

## Fix Branch User Display and Add Management Features

### Problems Identified

1. **Wrong branch assignment**: The "Siem Reap admin" user was assigned to "Chip Mong 6A" (the HQ branch) instead of "SR Psa Ler" (the actual Siem Reap branch). This is a data issue from branch selection during creation -- the fix below will make the branch dropdown clearer.

2. **"Unknown Branch" in Branch Users list**: The join query in `BranchUserManagement` may fail due to RLS on the `branches` table, causing the branch name to not resolve.

3. **Branch user sees other branches' departures**: Already handled by `activeBranchId = profile?.branch_id` in `OperatorAdmin.tsx`, but need to verify the departure filtering works correctly when `branchId` is passed to `useDepartures`.

4. **Branch Users tab lacks details and management actions**: Currently only shows username and branch badge -- no email, no delete, no password reset.

### Changes

#### 1. Update `src/components/BranchUserManagement.tsx` -- Enhanced UI with details and actions

- **Show more user details**: Display email address (fetched from auth metadata or stored), branch name, and creation date
- **Add Delete button**: Call the `create-admin-user` edge function or a new endpoint to delete the user (auth + profile cleanup)
- **Add Reset Password button**: Use `supabase.functions.invoke` to call a function that resets the user's password via `supabase.auth.admin.updateUser`
- **Better branch display**: Show branch name with location, and a colored badge for the role
- **Confirmation dialogs**: Add confirm before delete

The user list will show each branch user as a card with:
- Username and email
- Assigned branch name (with badge)
- Created date
- Actions: Reset Password (generates new password and shows it), Delete Account

#### 2. Update Edge Function `create-admin-user` -- Add delete and reset password actions

Add two new action modes to the existing edge function:
- `action: 'delete'` -- Deletes both the auth user and profile using `supabase.auth.admin.deleteUser()`
- `action: 'reset-password'` -- Updates the user's password using `supabase.auth.admin.updateUser()` and returns the new password

This avoids creating separate edge functions while keeping the security model (only super_admin or same-operator operator_admin can perform these actions).

#### 3. Fix branch user fetch query in `BranchUserManagement.tsx`

- Fetch the user's email from the `auth.users` table via the edge function (since client can't access `auth.users` directly), or store email in the profiles table
- Since we can't query `auth.users` from the client, we'll add an edge function call to fetch branch user details including email

#### 4. Minor fix in `OperatorAdmin.tsx`

- The `activeBranchId` logic is correct -- branch-scoped users already get filtered departures
- Ensure the branch name displayed in the header comes from the profile's joined branch data (already working per code)

### Technical Details

**Edge Function changes (`create-admin-user/index.ts`):**
```
Request body gets a new field: action ('create' | 'delete' | 'reset-password')
- Default action is 'create' (backward compatible)
- 'delete': requires user_id, validates permissions, calls admin.deleteUser()
- 'reset-password': requires user_id + new_password, calls admin.updateUser()
```

**`BranchUserManagement.tsx` new features:**
- Each user card shows: username, email (from edge function), branch name, creation date
- Delete button with confirmation dialog
- Reset Password button that generates a random password, calls the edge function, and displays the new credentials
- After delete, refetch the user list

**Data fix:** The "Siem Reap admin" user currently points to "Chip Mong 6A" branch. The UI improvement will make branch selection clearer to avoid this in the future, but the existing assignment needs manual correction (either via the UI delete + recreate, or a direct update).

### Files to Modify
1. `supabase/functions/create-admin-user/index.ts` -- Add delete and reset-password actions
2. `src/components/BranchUserManagement.tsx` -- Enhanced UI with email, delete, reset password
