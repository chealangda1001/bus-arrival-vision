import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user: requestingUser }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: requestingProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, operator_id')
      .eq('id', requestingUser.id)
      .single()

    if (profileError || !requestingProfile) {
      return new Response(
        JSON.stringify({ error: 'Could not verify user role' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isSuperAdmin = requestingProfile.role === 'super_admin'
    const isOperatorAdmin = requestingProfile.role === 'operator_admin'

    if (!isSuperAdmin && !isOperatorAdmin) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const action = body.action || 'create'

    // ==================== LIST BRANCH USERS ====================
    if (action === 'list-branch-users') {
      const { operator_id } = body
      if (!operator_id) {
        return new Response(
          JSON.stringify({ error: 'operator_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (isOperatorAdmin && operator_id !== requestingProfile.operator_id) {
        return new Response(
          JSON.stringify({ error: 'Cannot list users for a different operator' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get profiles with branch_id set (branch-scoped admins)
      const { data: profiles, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('id, username, role, branch_id, created_at, branches:branch_id (name, slug, location)')
        .eq('operator_id', operator_id)
        .eq('role', 'operator_admin')
        .not('branch_id', 'is', null)

      if (fetchError) {
        return new Response(
          JSON.stringify({ error: fetchError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Fetch emails from auth.users for these profile IDs
      const userIds = (profiles || []).map(p => p.id)
      const usersWithEmail = []

      for (const profile of (profiles || [])) {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id)
        usersWithEmail.push({
          ...profile,
          email: authUser?.user?.email || 'N/A',
        })
      }

      return new Response(
        JSON.stringify({ users: usersWithEmail }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ==================== DELETE USER ====================
    if (action === 'delete') {
      const { user_id } = body
      if (!user_id) {
        return new Response(
          JSON.stringify({ error: 'user_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify target user belongs to same operator
      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('operator_id, role')
        .eq('id', user_id)
        .single()

      if (!targetProfile) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (isOperatorAdmin && targetProfile.operator_id !== requestingProfile.operator_id) {
        return new Response(
          JSON.stringify({ error: 'Cannot delete users from a different operator' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id)
      if (deleteError) {
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`User ${user_id} deleted by ${requestingUser.id}`)
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ==================== RESET PASSWORD ====================
    if (action === 'reset-password') {
      const { user_id, new_password } = body
      if (!user_id || !new_password) {
        return new Response(
          JSON.stringify({ error: 'user_id and new_password are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify target user belongs to same operator
      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('operator_id')
        .eq('id', user_id)
        .single()

      if (!targetProfile) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (isOperatorAdmin && targetProfile.operator_id !== requestingProfile.operator_id) {
        return new Response(
          JSON.stringify({ error: 'Cannot reset password for users from a different operator' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUser(user_id, {
        password: new_password,
      })

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`Password reset for user ${user_id} by ${requestingUser.id}`)
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ==================== CREATE USER (default) ====================
    const { email, password, username, role, operator_id, branch_id } = body

    if (!email || !password || !username || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, username, role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (role === 'operator_admin' && !operator_id) {
      return new Response(
        JSON.stringify({ error: 'operator_id is required for operator_admin role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!['super_admin', 'operator_admin', 'driver'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (isOperatorAdmin && role === 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Operator admins cannot create super admin accounts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (isOperatorAdmin && role !== 'driver' && role !== 'operator_admin') {
      return new Response(
        JSON.stringify({ error: 'Operator admins can only create driver or branch admin accounts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (isOperatorAdmin && operator_id !== requestingProfile.operator_id) {
      return new Response(
        JSON.stringify({ error: 'Cannot create users for a different operator' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (role === 'driver' && (!operator_id || !branch_id)) {
      return new Response(
        JSON.stringify({ error: 'operator_id and branch_id are required for driver role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate branch belongs to operator
    if (branch_id) {
      const { data: branchData, error: branchError } = await supabaseAdmin
        .from('branches')
        .select('id')
        .eq('id', branch_id)
        .eq('operator_id', operator_id)
        .single()

      if (branchError || !branchData) {
        return new Response(
          JSON.stringify({ error: 'Branch does not belong to this operator' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    console.log(`Creating admin user: ${email} with role: ${role}`)

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username }
    })

    if (createError) {
      console.error('Error creating user:', createError)
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!newUser.user) {
      return new Response(
        JSON.stringify({ error: 'User creation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`User created with ID: ${newUser.user.id}`)

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        username: username,
        role: role,
        operator_id: role === 'super_admin' ? null : operator_id,
        branch_id: role === 'super_admin' ? null : (branch_id || null)
      })
      .eq('id', newUser.user.id)

    if (updateError) {
      console.error('Error updating profile:', updateError)
      try {
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      } catch (cleanupError) {
        console.error('Failed to cleanup orphaned auth user:', cleanupError)
      }
      return new Response(
        JSON.stringify({ error: `Profile update failed: ${updateError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Profile updated successfully for user: ${newUser.user.id}`)

    return new Response(
      JSON.stringify({ success: true, user_id: newUser.user.id, email, role }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
