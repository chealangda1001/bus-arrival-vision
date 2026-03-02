

## Add Driver Login Instructions to Driver Cards

### What
Add a section to each driver card in the Drivers tab that displays:
- The login URL for the driver dashboard (`/driver`)
- The driver's email (username) for login
- A note that the password was set at creation time
- Copy buttons for easy sharing

### Changes

**File: `src/components/DriverManagement.tsx`**

1. Add `Copy` icon import from lucide-react
2. In each driver card (below the "Assigned Departures" section), add a new "Driver Access Info" section containing:
   - Login URL: `{window.location.origin}/driver` with a copy button
   - Username: the driver's email (fetched from auth or stored) with a copy button
   - Password note: "Set at account creation" (since we can't display the actual password)
3. Since profiles don't store email, we need to display the driver's `username` as login identifier. However, drivers log in with email. We'll need to fetch the driver's email from the `create-admin-user` response or store it.

**Problem**: The `profiles` table doesn't store email -- it's in `auth.users` which is not accessible client-side. Two options:

- **Option A**: Show only the username and remind admins to note the email/password at creation time
- **Option B**: Store email in a visible field or show it from creation response

I'll go with a practical approach: display what we have (username) and the login URL, plus add a note reminding admins to save credentials at creation. I'll also update the creation success toast to include the email for easy reference.

### Technical Details

- Modify `DriverManagement.tsx`:
  - Add a clipboard copy helper function
  - Add an info box inside each driver card with the login URL and username
  - Add copy-to-clipboard buttons using the `Copy` (or `ClipboardCopy`) icon
  - After successful driver creation, show a more detailed success toast with the email and login URL
- No database changes needed

