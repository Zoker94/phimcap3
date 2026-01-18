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
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Use anon key to verify user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: isAdmin } = await supabaseAuth.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const storageZone = typeof body?.storageZone === 'string' ? body.storageZone.trim() : '';
    const apiKey = typeof body?.apiKey === 'string' ? body.apiKey.trim() : '';

    if (!storageZone || !apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing storageZone or apiKey' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // IMPORTANT: Never persist secrets in DB. This endpoint only validates credentials.
    const hosts = ['storage.bunnycdn.com', 'sg.storage.bunnycdn.com'];

    const testHost = async (host: string): Promise<HostTestResult> => {
      const testUrl = `https://${host}/${storageZone}/`;
      try {
        const res = await fetch(testUrl, {
          method: 'GET',
          headers: {
            AccessKey: apiKey,
            Accept: 'application/json',
          },
        });

        if (res.ok) {
          return { host, success: true, status: res.status, message: 'Connection successful!' };
        }

        const text = await res.text();
        let message = `Error ${res.status}`;
        if (res.status === 401) message = 'Invalid API Key (Password)';
        if (res.status === 404) message = 'Storage zone not found';
        console.error(`save-bunny-credentials: host ${host} failed`, res.status, text);

        return { host, success: false, status: res.status, message };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Network error';
        return { host, success: false, message: msg };
      }
    };

    const hostTests = await Promise.all(hosts.map(testHost));
    const recommendedHost = hostTests.find((h) => h.success)?.host ?? null;

    return new Response(
      JSON.stringify({
        storageZoneName: storageZone,
        apiKeyLength: apiKey.length,
        apiKeyPreview: `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`,
        hostTests,
        recommendedHost,
        note: 'API key is not stored. If tests pass, update backend secrets to use the same values.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: unknown) {
    console.error('Save Bunny credentials error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
