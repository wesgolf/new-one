export const ARTIST_INFO = {
  name: import.meta.env.VITE_ARTIST_NAME || "Wesley Rob",
  email: import.meta.env.VITE_ARTIST_EMAIL || "wesleyrob27@gmail.com",
  bio: import.meta.env.VITE_ARTIST_BIO || "Wesley Rob is a multi-genre artist and producer pushing the boundaries of electronic and contemporary sounds. With a focus on high-energy live performances and meticulous studio production, Wesley has built a dedicated following through consistent releases and engaging content.",
  soundcloud_url: import.meta.env.VITE_SOUNDCLOUD_URL || "https://soundcloud.com/wesmusic1",
  spotify_ids: (import.meta.env.VITE_SPOTIFY_IDS || "7v4v7v4v7v4v7v4v7v4v7v").split(','), // Multiple Spotify Artist IDs separated by commas
  instagram_handle: import.meta.env.VITE_INSTAGRAM_HANDLE || "@wesleyrob",
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
