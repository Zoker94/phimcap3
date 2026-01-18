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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Bunny credentials
    const bunnyApiKey = Deno.env.get('BUNNY_API_KEY')?.trim();
    const bunnyStorageZone = Deno.env.get('BUNNY_STORAGE_ZONE')?.trim();

    const results = {
      hasApiKey: Boolean(bunnyApiKey),
      hasStorageZone: Boolean(bunnyStorageZone),
      storageZoneName: bunnyStorageZone || null,
      apiKeyLength: bunnyApiKey?.length || 0,
      connectionTest: null as { success: boolean; status?: number; message: string } | null,
    };

    if (!bunnyApiKey || !bunnyStorageZone) {
      results.connectionTest = {
        success: false,
        message: 'Missing credentials: ' + 
          (!bunnyApiKey ? 'BUNNY_API_KEY ' : '') + 
          (!bunnyStorageZone ? 'BUNNY_STORAGE_ZONE' : ''),
      };
      return new Response(
        JSON.stringify(results),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test connection by listing files in the storage zone
    console.log(`Testing Bunny connection to zone: ${bunnyStorageZone}`);
    const testUrl = `https://storage.bunnycdn.com/${bunnyStorageZone}/`;
    
    const testResponse = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'AccessKey': bunnyApiKey,
        'Accept': 'application/json',
      },
    });

    if (testResponse.ok) {
      results.connectionTest = {
        success: true,
        status: testResponse.status,
        message: 'Connection successful! Bunny.net credentials are valid.',
      };
    } else {
      const errorText = await testResponse.text();
      console.error('Bunny test error:', testResponse.status, errorText);
      
      let message = 'Connection failed';
      if (testResponse.status === 401) {
        message = 'Invalid API Key (Password). Please check BUNNY_API_KEY.';
      } else if (testResponse.status === 404) {
        message = 'Storage zone not found. Please check BUNNY_STORAGE_ZONE.';
      } else {
        message = `Error ${testResponse.status}: ${errorText}`;
      }
      
      results.connectionTest = {
        success: false,
        status: testResponse.status,
        message,
      };
    }

    return new Response(
      JSON.stringify(results),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Test Bunny error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
