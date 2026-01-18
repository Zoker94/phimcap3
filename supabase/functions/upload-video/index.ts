import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is banned
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_banned')
      .eq('user_id', user.id)
      .single();

    if (profile?.is_banned) {
      return new Response(
        JSON.stringify({ error: 'Your account has been banned' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get form data
    const formData = await req.formData();
    const videoFile = formData.get('video') as File;
    const thumbnailFile = formData.get('thumbnail') as File | null;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string | null;
    const categoryId = formData.get('category_id') as string | null;

    if (!videoFile || !title) {
      return new Response(
        JSON.stringify({ error: 'Video file and title are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file type
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowedVideoTypes.includes(videoFile.type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid video format. Allowed: MP4, WebM, MOV' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check file size (max 500MB)
    const maxSize = 500 * 1024 * 1024;
    if (videoFile.size > maxSize) {
      return new Response(
        JSON.stringify({ error: 'Video file too large. Maximum size is 500MB' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Bunny.net credentials
    const bunnyApiKey = Deno.env.get('BUNNY_API_KEY');
    const bunnyStorageZone = Deno.env.get('BUNNY_STORAGE_ZONE');

    if (!bunnyApiKey || !bunnyStorageZone) {
      console.error('Missing Bunny.net credentials');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    const videoExtension = videoFile.name.split('.').pop() || 'mp4';
    const videoFileName = `${timestamp}_${sanitizedTitle}.${videoExtension}`;

    // Upload video to Bunny.net
    console.log(`Uploading video: ${videoFileName}`);
    const videoBuffer = await videoFile.arrayBuffer();
    
    const bunnyUploadUrl = `https://storage.bunnycdn.com/${bunnyStorageZone}/videos/${videoFileName}`;
    const bunnyResponse = await fetch(bunnyUploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': bunnyApiKey,
        'Content-Type': 'application/octet-stream',
      },
      body: videoBuffer,
    });

    if (!bunnyResponse.ok) {
      const errorText = await bunnyResponse.text();
      console.error('Bunny upload error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to upload video to storage' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Video URL on Bunny CDN
    const videoUrl = `https://${bunnyStorageZone}.b-cdn.net/videos/${videoFileName}`;
    let thumbnailUrl = null;

    // Upload thumbnail if provided
    if (thumbnailFile) {
      const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (allowedImageTypes.includes(thumbnailFile.type)) {
        const thumbnailExtension = thumbnailFile.name.split('.').pop() || 'jpg';
        const thumbnailFileName = `${timestamp}_${sanitizedTitle}_thumb.${thumbnailExtension}`;
        const thumbnailBuffer = await thumbnailFile.arrayBuffer();

        const thumbUploadUrl = `https://storage.bunnycdn.com/${bunnyStorageZone}/thumbnails/${thumbnailFileName}`;
        const thumbResponse = await fetch(thumbUploadUrl, {
          method: 'PUT',
          headers: {
            'AccessKey': bunnyApiKey,
            'Content-Type': 'application/octet-stream',
          },
          body: thumbnailBuffer,
        });

        if (thumbResponse.ok) {
          thumbnailUrl = `https://${bunnyStorageZone}.b-cdn.net/thumbnails/${thumbnailFileName}`;
        }
      }
    }

    // Save to database with pending status
    const { data: video, error: dbError } = await supabase
      .from('videos')
      .insert({
        title,
        description,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        category_id: categoryId || null,
        uploaded_by: user.id,
        status: 'pending',
        video_type: 'bunny',
        is_vip: false,
        is_vietsub: false,
        is_uncensored: false,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to save video information' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Video uploaded successfully: ${video.id}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Video uploaded successfully. Waiting for admin approval.',
        video 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Upload error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
