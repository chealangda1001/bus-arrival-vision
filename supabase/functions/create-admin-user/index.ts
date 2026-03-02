import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify the requesting user is a super_admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Create regular client to verify the requesting user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    // Get the requesting user
    const { data: { user: requestingUser }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if the requesting user is a super_admin or operator_admin
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

    // operator_admin can only create driver accounts within their operator
    if (!isSuperAdmin && !isOperatorAdmin) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { email, password, username, role, operator_id, branch_id } = await req.json()

    // Validate required fields
    if (!email || !password || !username || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, username, role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For operator_admin role, operator_id is required
    if (role === 'operator_admin' && !operator_id) {
      return new Response(
        JSON.stringify({ error: 'operator_id is required for operator_admin role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate role
    if (!['super_admin', 'operator_admin', 'driver'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be super_admin, operator_admin, or driver' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // operator_admin can only create driver accounts
    if (isOperatorAdmin && role !== 'driver') {
      return new Response(
        JSON.stringify({ error: 'Operator admins can only create driver accounts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // operator_admin must create drivers within their own operator
    if (isOperatorAdmin && operator_id !== requestingProfile.operator_id) {
      return new Response(
        JSON.stringify({ error: 'Cannot create drivers for a different operator' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For driver role, require operator_id and branch_id
    if (role === 'driver' && (!operator_id || !branch_id)) {
      return new Response(
        JSON.stringify({ error: 'operator_id and branch_id are required for driver role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Creating admin user: ${email} with role: ${role}`)

    // Create user with admin API (auto-confirms email)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email so they can login immediately
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
        JSON.stringify({ error: 'User creation failed - no user data returned' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`User created with ID: ${newUser.user.id}`)

    // Update the profile that was auto-created by the trigger
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
      // Clean up the orphaned auth user since profile setup failed
      try {
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
        console.log(`Cleaned up orphaned auth user: ${newUser.user.id}`)
      } catch (cleanupError) {
        console.error('Failed to cleanup orphaned auth user:', cleanupError)
      }
      return new Response(
        JSON.stringify({ 
          error: `Profile update failed: ${updateError.message}. The auth account has been cleaned up. Please try again.`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Profile updated successfully for user: ${newUser.user.id}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: newUser.user.id,
        email: email,
        role: role
      }),
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
