/**
 * Google Drive OAuth + API utilities.
 * One-time admin authorization stores a refresh token in SystemSetting.
 * All subsequent requests use that refresh token to get short-lived access tokens.
 */

import { prisma } from "@/lib/db";

const SCOPES = "https://www.googleapis.com/auth/drive.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";

function getCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth credentials not configured");
  return { clientId, clientSecret };
}

/** Build the URL users visit to authorize the app */
export function buildAuthUrl(redirectUri: string, state?: string): string {
  const { clientId } = getCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent", // force consent to always get refresh_token
  });
  if (state) params.set("state", state);
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/** Exchange authorization code for tokens */
export async function exchangeCode(code: string, redirectUri: string): Promise<{ access_token: string; refresh_token?: string }> {
  const { clientId, clientSecret } = getCredentials();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }
  return res.json();
}

/** Store refresh token in DB */
export async function storeRefreshToken(token: string): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: "gdrive_refresh_token" },
    update: { value: token },
    create: { key: "gdrive_refresh_token", value: token },
  });
}

/** Get stored refresh token */
export async function getRefreshToken(): Promise<string | null> {
  const row = await prisma.systemSetting.findUnique({ where: { key: "gdrive_refresh_token" } });
  return row?.value ?? null;
}

/** Check if Google Drive is connected */
export async function isConnected(): Promise<boolean> {
  const token = await getRefreshToken();
  return !!token;
}

/** Use refresh token to get a fresh access token */
export async function getAccessToken(): Promise<string> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) throw new Error("Google Drive not connected. Please authorize first.");
  const { clientId, clientSecret } = getCredentials();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to refresh access token: ${err}`);
  }
  const data = await res.json();
  return data.access_token;
}

/** Extract folder ID from a Google Drive URL */
export function extractFolderId(urlOrId: string): string | null {
  // Direct ID (no slashes)
  if (/^[a-zA-Z0-9_-]{10,}$/.test(urlOrId.trim())) return urlOrId.trim();
  // https://drive.google.com/drive/folders/FOLDER_ID?...
  const folderMatch = urlOrId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  // https://drive.google.com/drive/u/0/folders/FOLDER_ID
  const uMatch = urlOrId.match(/\/u\/\d+\/folders\/([a-zA-Z0-9_-]+)/);
  if (uMatch) return uMatch[1];
  return null;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  thumbnailLink?: string;
}

/** List image files in a Google Drive folder */
export async function listFolderImages(folderId: string): Promise<DriveFile[]> {
  const accessToken = await getAccessToken();
  const allFiles: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed=false and (mimeType contains 'image/')`,
      fields: "nextPageToken,files(id,name,mimeType,size,thumbnailLink)",
      pageSize: "100",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(`${DRIVE_FILES_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Drive API error: ${err}`);
    }
    const data = await res.json();
    allFiles.push(...(data.files ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return allFiles;
}

/** List subfolders inside a folder */
export async function listSubfolders(folderId: string): Promise<DriveFile[]> {
  const accessToken = await getAccessToken();
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed=false and mimeType='application/vnd.google-apps.folder'`,
    fields: "files(id,name,mimeType)",
    pageSize: "100",
  });
  const res = await fetch(`${DRIVE_FILES_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Drive API error listing subfolders: ${err}`);
  }
  const data = await res.json();
  return data.files ?? [];
}

/** Recursively list all images in a folder and its subfolders */
export async function listAllImages(folderId: string): Promise<(DriveFile & { folderName?: string })[]> {
  // Get images in root folder
  const rootImages = await listFolderImages(folderId);
  const result: (DriveFile & { folderName?: string })[] = rootImages;

  // Get subfolders and their images
  const subfolders = await listSubfolders(folderId);
  for (const sub of subfolders) {
    const subImages = await listFolderImages(sub.id);
    result.push(...subImages.map(img => ({ ...img, folderName: sub.name })));
  }

  return result;
}

/** Download a file from Google Drive as a Buffer */
export async function downloadFile(fileId: string): Promise<{ buffer: Buffer; contentType: string }> {
  const accessToken = await getAccessToken();
  const res = await fetch(`${DRIVE_FILES_URL}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to download file ${fileId}: ${res.status} ${res.statusText}`);
  }
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const arrayBuf = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuf), contentType };
}

/** Get folder metadata (name) */
export async function getFolderName(folderId: string): Promise<string> {
  const accessToken = await getAccessToken();
  const res = await fetch(`${DRIVE_FILES_URL}/${folderId}?fields=name`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return "Google Drive Folder";
  const data = await res.json();
  return data.name || "Google Drive Folder";
}
