import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Use anon key to verify user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: isAdmin } = await supabaseAuth.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { storageZone, apiKey } = await req.json();
    
    if (!storageZone || !apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing storageZone or apiKey' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role to update secrets via Vault
    // Note: Secrets are managed externally via Lovable's secret management
    // This function stores them in site_settings as encrypted reference (not the actual values)
    // The actual secret update happens via Lovable's secret system
    
    // For now, we'll store a reference that the credentials have been updated
    // The actual secrets are stored via Lovable's UI
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Update site_settings to track when credentials were last updated
    const now = new Date().toISOString();
    
    await supabaseAdmin
      .from('site_settings')
      .upsert([
        { key: 'bunny_storage_zone_configured', value: storageZone, updated_at: now },
        { key: 'bunny_api_key_configured_at', value: now, updated_at: now },
      ], { onConflict: 'key' });

    // Note: The actual BUNNY_API_KEY and BUNNY_STORAGE_ZONE env vars
    // need to be updated via Lovable's secret management system
    // This function is a placeholder that tracks configuration status

    console.log(`Bunny credentials update requested by admin ${user.id}`);
    console.log(`Storage Zone: ${storageZone}`);
    console.log(`API Key length: ${apiKey.length} characters`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Credentials reference saved. Note: Actual secrets should be updated via Lovable secret management.',
        storageZone,
        apiKeyLength: apiKey.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Save Bunny credentials error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
