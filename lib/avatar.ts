import { File } from 'expo-file-system';

import { getSupabase } from '@/lib/supabase';

/**
 * Avatar upload: local image -> Supabase Storage -> profiles.avatar_url.
 *
 * The bucket is public, so the stored URL is a plain durable link rather than a signed
 * one that would expire and leave a dead image behind.
 */

const BUCKET = 'avatars';
/** Matches the bucket's server-side limit, so we fail fast with a clear message. */
const MAX_BYTES = 2 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/jpeg', // iOS hands back HEIC; ImagePicker already transcodes the data
  heif: 'image/jpeg',
};

function describeImage(localUri: string): { extension: string; contentType: string } {
  const withoutQuery = localUri.split('?')[0] ?? localUri;
  const rawExtension = withoutQuery.split('.').pop()?.toLowerCase() ?? '';
  const contentType = MIME_BY_EXTENSION[rawExtension];

  // Anything unrecognised is uploaded as JPEG under a .jpg name. The bucket only
  // allows jpeg/png/webp, so guessing a random extension would just get rejected.
  if (!contentType) return { extension: 'jpg', contentType: 'image/jpeg' };
  return { extension: contentType === 'image/jpeg' ? 'jpg' : rawExtension, contentType };
}

/**
 * Upload the image and return the public URL to store in `profiles.avatar_url`.
 *
 * Bytes are read with expo-file-system's File API rather than a base64 round-trip:
 * base64 inflates the payload by about a third and holds the whole image in a JS
 * string, which is wasteful on the low-end Android phones this app targets.
 */
export async function uploadAvatar(localUri: string, userId: string): Promise<string> {
  const { extension, contentType } = describeImage(localUri);

  const bytes = await new File(localUri).bytes();
  if (bytes.byteLength > MAX_BYTES) {
    throw new Error('That image is too large. Please choose one under 2 MB.');
  }

  // One stable path per user, overwritten on each change, so old avatars do not pile
  // up in storage and each account can only ever occupy a single file.
  const path = `${userId}/avatar.${extension}`;
  const supabase = getSupabase();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType, upsert: true });
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  // Cache-buster: the path never changes, so without this the CDN and the phone's
  // image cache would keep serving the PREVIOUS avatar after an update.
  const versionedUrl = `${publicUrl}?v=${Date.now()}`;

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ avatar_url: versionedUrl })
    .eq('user_id', userId);
  if (profileError) throw profileError;

  return versionedUrl;
}

/** Read the stored avatar URL for a user, if there is one. */
export async function fetchAvatarUrl(userId: string): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('avatar_url')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.avatar_url ?? null;
}
