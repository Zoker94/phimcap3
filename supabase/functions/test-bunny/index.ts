import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HostTestResult {
  host: string;
  success: boolean;
  status?: number;
  message: string;
}

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
      apiKeyPreview: bunnyApiKey ? `${bunnyApiKey.substring(0, 4)}...${bunnyApiKey.substring(bunnyApiKey.length - 4)}` : null,
      hostTests: [] as HostTestResult[],
      recommendedHost: null as string | null,
    };

    if (!bunnyApiKey || !bunnyStorageZone) {
      results.hostTests = [{
        host: 'N/A',
        success: false,
        message: 'Missing credentials: ' + 
          (!bunnyApiKey ? 'BUNNY_API_KEY ' : '') + 
          (!bunnyStorageZone ? 'BUNNY_STORAGE_ZONE' : ''),
      }];
      return new Response(
        JSON.stringify(results),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test both hosts
    const hosts = [
      'storage.bunnycdn.com',
      'sg.storage.bunnycdn.com',
    ];

    console.log(`Testing Bunny connection to zone: ${bunnyStorageZone}`);

    const testHost = async (host: string): Promise<HostTestResult> => {
      const testUrl = `https://${host}/${bunnyStorageZone}/`;
      console.log(`Testing host: ${host}`);
      
      try {
        const testResponse = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'AccessKey': bunnyApiKey,
            'Accept': 'application/json',
          },
        });

        if (testResponse.ok) {
          return {
            host,
            success: true,
            status: testResponse.status,
            message: 'Connection successful!',
          };
        } else {
          const errorText = await testResponse.text();
          console.error(`Host ${host} error:`, testResponse.status, errorText);
          
          let message = 'Connection failed';
          if (testResponse.status === 401) {
            message = 'Invalid API Key (Password)';
          } else if (testResponse.status === 404) {
            message = 'Storage zone not found';
          } else {
            message = `Error ${testResponse.status}`;
          }
          
          return {
            host,
            success: false,
            status: testResponse.status,
            message,
          };
        }
      } catch (err: unknown) {
        const errMessage = err instanceof Error ? err.message : 'Network error';
        console.error(`Host ${host} exception:`, errMessage);
        return {
          host,
          success: false,
          message: errMessage,
        };
      }
    };

    // Test all hosts in parallel
    const hostResults = await Promise.all(hosts.map(testHost));
    results.hostTests = hostResults;

    // Find recommended host (first successful one)
    const successfulHost = hostResults.find(r => r.success);
    if (successfulHost) {
      results.recommendedHost = successfulHost.host;
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
