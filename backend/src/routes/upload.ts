import { Hono } from 'hono';
import { Env } from '../types';
import { getSupabaseClient } from '../db/supabase';
import { authMiddleware, AuthContext } from '../middleware/auth';

const uploadRoute = new Hono<{ Bindings: Env; Variables: AuthContext }>();

uploadRoute.use('*', authMiddleware);

uploadRoute.post('/', async (c) => {
  try {
    const contentType = c.req.header('content-type') || '';
    const supabase = getSupabaseClient(c.env);

    let originalName = 'document';
    let fileBuffer: ArrayBuffer | Uint8Array;
    let mimeType = 'application/octet-stream';

    if (contentType.includes('multipart/form-data')) {
      const body = await c.req.parseBody();
      const file = body['file'];

      if (!file || typeof file === 'string') {
        return c.json({ success: false, error: 'No file uploaded under key "file".' }, 400);
      }

      // 'file' is a standard File/Blob in Cloudflare Workers environment
      const fileObj = file as File;
      originalName = fileObj.name || 'document';
      mimeType = fileObj.type || 'application/octet-stream';
      fileBuffer = await fileObj.arrayBuffer();
    } else if (contentType.includes('application/json')) {
      const json = await c.req.json();
      originalName = json.fileName || 'document';
      const base64Data = json.fileData || '';

      if (!base64Data) {
        return c.json({ success: false, error: 'No file data provided in JSON payload.' }, 400);
      }

      // Handle data:mime;base64,... header if present
      const match = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let rawBase64 = base64Data;
      if (match) {
        mimeType = match[1];
        rawBase64 = match[2];
      }

      const binaryStr = atob(rawBase64);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      fileBuffer = bytes;
    } else {
      return c.json({ success: false, error: 'Content-Type must be multipart/form-data or application/json' }, 400);
    }

    // Sanitize file name
    const sanitizedBase = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${Date.now()}-${sanitizedBase}`;

    // Upload to Supabase Storage
    let { data: uploadData, error: uploadError } = await supabase.storage
      .from('lease-documents')
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: true
      });

    // Auto-create bucket if missing and retry
    if (uploadError && uploadError.message.toLowerCase().includes('not found')) {
      await supabase.storage.createBucket('lease-documents', { public: true });
      const retry = await supabase.storage
        .from('lease-documents')
        .upload(storagePath, fileBuffer, {
          contentType: mimeType,
          upsert: true
        });
      uploadData = retry.data;
      uploadError = retry.error;
    }

    if (uploadError) {
      return c.json({ success: false, error: `Storage upload failed: ${uploadError.message}` }, 500);
    }

    const { data: pubData } = supabase.storage.from('lease-documents').getPublicUrl(storagePath);

    return c.json({
      success: true,
      data: {
        fileName: originalName,
        storagePath,
        url: pubData.publicUrl
      }
    });
  } catch (err: any) {
    console.error('File upload error:', err);
    return c.json({ success: false, error: err.message || 'File upload error' }, 500);
  }
});

export default uploadRoute;
