function extractSpotifyArtistIds() {
  const explicitIds = [
    import.meta.env.VITE_SPOTIFY_ARTIST_ID,
    import.meta.env.VITE_SPOTIFY_ARTIST_ID_2,
    import.meta.env.VITE_SPOTIFY_ARTIST_ID_3,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  if (explicitIds.length) {
    return Array.from(new Set(explicitIds));
  }

  const rawIds = String(import.meta.env.VITE_SPOTIFY_IDS || '').trim();
  if (rawIds) {
    return Array.from(
      new Set(
        rawIds
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    );
  }

  const artistUrl = String(import.meta.env.VITE_SPOTIFY_ARTIST_URL || import.meta.env.VITE_SPOTIFY_URL || '').trim();
  const match = artistUrl.match(/open\.spotify\.com\/artist\/([A-Za-z0-9]+)/i);
  if (match?.[1]) {
    return [match[1]];
  }

  return [];
}

export const ARTIST_INFO = {
  name: import.meta.env.VITE_ARTIST_NAME || "Wesley Rob",
  email: import.meta.env.VITE_ARTIST_EMAIL || "wesleyrob27@gmail.com",
  bio: import.meta.env.VITE_ARTIST_BIO || "Wesley Rob is a multi-genre artist and producer pushing the boundaries of electronic and contemporary sounds. With a focus on high-energy live performances and meticulous studio production, Wesley has built a dedicated following through consistent releases and engaging content.",
  spotify_url: import.meta.env.VITE_SPOTIFY_ARTIST_URL || import.meta.env.VITE_SPOTIFY_URL || "",
  apple_music_url: import.meta.env.VITE_APPLE_MUSIC_ARTIST_URL || import.meta.env.VITE_APPLE_MUSIC_URL || "",
  soundcloud_url: import.meta.env.VITE_SOUNDCLOUD_ARTIST_URL || import.meta.env.VITE_SOUNDCLOUD_URL || "https://soundcloud.com/wesmusic1",
  youtube_url: import.meta.env.VITE_YOUTUBE_ARTIST_URL || import.meta.env.VITE_YOUTUBE_URL || "",
  tiktok_url: import.meta.env.VITE_TIKTOK_ARTIST_URL || import.meta.env.VITE_TIKTOK_URL || "",
  spotify_ids: extractSpotifyArtistIds(),
  instagram_handle: import.meta.env.VITE_INSTAGRAM_HANDLE || "@wesleyrob",
  instagram_url: import.meta.env.VITE_INSTAGRAM_ACCOUNT || "",
  press_kit_url: import.meta.env.VITE_PRESS_KIT_URL || import.meta.env.VITE_DROPBOX_URL || "https://www.dropbox.com/sh/example-artist-folder",
  dropbox_url: import.meta.env.VITE_DROPBOX_URL || "https://www.dropbox.com/sh/example-artist-folder", // User's artist dropbox
  dropbox_folders: [
    { name: "Logo Kit", path: "/Branding/Logos", icon: "Palette" },
    { name: "Press Photos", path: "/Press Photos", icon: "Image" },
    { name: "EPK & Bio", path: "/EPK", icon: "FileText" },
    { name: "Signed Contracts", path: "/Legal/Signed", icon: "Shield" },
    { name: "Content Assets", path: "/Content/Assets", icon: "Layers" },
    { name: "Finished Content", path: "/Content/Finished", icon: "Video" },
    { name: "Live Sets & Media", path: "/Live", icon: "Camera" }
  ]
};
