

## Create Branch User Accounts for Operator Admins

### Overview
Allow operator admins to create branch-scoped admin accounts (`operator_admin` role with a specific `branch_id`). These branch users can only manage departures for their assigned branch, and any departure they create is automatically assigned to that branch.

### Changes

#### 1. Update `create-admin-user` Edge Function
- Add support for creating `operator_admin` accounts with a `branch_id` (currently only supports `driver` and `super_admin` roles with branch assignment)
- Allow operator admins to create `operator_admin` accounts scoped to branches within their operator (currently they can only create `driver` accounts)

#### 2. New Component: `BranchUserManagement.tsx`
- UI for operator admins to create branch-scoped admin accounts
- Form fields: Display Name, Email, Password, Branch (dropdown)
- Lists existing branch users with their assigned branch
- Shows login credentials and URL after creation
- Only visible to operator admins with no branch restriction (i.e., HQ-level admins)

#### 3. Update `AdminPanel.tsx`
- Add a "Branch Users" tab (or integrate into existing "Drivers" tab as a section)
- For branch-scoped users (`profile.branch_id` is set): hide the branch dropdown in the departure form and auto-assign their branch
- The branch dropdown already exists for HQ admins -- just ensure branch-scoped admins don't see it

#### 4. Update `OperatorAdmin.tsx`
- When a branch-scoped user logs in, they already get `activeBranchId = profile.branch_id` which filters departures correctly
- Pass the user's branch restriction info to AdminPanel so it can hide/show appropriate UI

#### 5. Update `AuthPage.tsx` redirect
- Ensure branch-scoped `operator_admin` users redirect to their operator's admin page after login (already handled since they have `profile.operator.slug`)

### Technical Details

**Edge Function (`create-admin-user`):**
- Remove the restriction that operator admins can only create `driver` role
- Allow creating `operator_admin` with a `branch_id` within their own operator
- Keep the restriction that operator admins cannot create `super_admin` accounts

**`BranchUserManagement.tsx`:**
- Fetch all `operator_admin` profiles with non-null `branch_id` for the current operator
- Create form with branch dropdown populated from `useBranches`
- Call `create-admin-user` edge function with `role: 'operator_admin'`, `operator_id`, and `branch_id`

**`AdminPanel.tsx` departure form:**
- If `branchId` prop is set and matches a specific branch (user is branch-scoped), hide the branch dropdown and auto-assign
- If `branchId` is from the default branch (HQ admin), show the dropdown as-is
- Add a `userBranchId` prop to distinguish between "admin viewing a specific branch" vs "user restricted to a branch"

**RLS:** No changes needed -- existing policies already handle branch-scoped operator admins correctly via the `(p.branch_id IS NULL OR p.branch_id = departures.branch_id)` clause.

### Files to Create/Modify
1. **Create** `src/components/BranchUserManagement.tsx` -- Branch user CRUD UI
2. **Modify** `supabase/functions/create-admin-user/index.ts` -- Allow operator admins to create branch-scoped operator_admin accounts
3. **Modify** `src/components/AdminPanel.tsx` -- Add Branch Users tab, handle branch-scoped departure form
4. **Modify** `src/pages/OperatorAdmin.tsx` -- Pass `userBranchId` to AdminPanel to distinguish branch-scoped vs HQ admin

