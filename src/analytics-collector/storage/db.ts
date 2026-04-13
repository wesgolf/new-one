import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { NormalizedDataPackage, PlatformType } from '../core/types.ts';

const DB_PATH = process.env.NODE_ENV === 'production' 
  ? path.join('/tmp', 'analytics.db') 
  : path.join(process.cwd(), 'analytics.db');

export class AnalyticsStorage {
  private db: Database.Database;

  constructor() {
    this.db = new Database(DB_PATH);
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS platforms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS artist_profiles (
        id TEXT PRIMARY KEY,
        platform_id TEXT NOT NULL,
        external_id TEXT,
        name TEXT NOT NULL,
        url TEXT,
        followers INTEGER DEFAULT 0,
        following INTEGER DEFAULT 0,
        track_count INTEGER DEFAULT 0,
        total_plays INTEGER DEFAULT 0,
        last_scraped_at TEXT,
        FOREIGN KEY(platform_id) REFERENCES platforms(id)
      );

      CREATE TABLE IF NOT EXISTS tracks (
        id TEXT PRIMARY KEY,
        artist_id TEXT NOT NULL,
        external_id TEXT,
        title TEXT NOT NULL,
        url TEXT,
        release_date TEXT,
        metadata TEXT,
        FOREIGN KEY(artist_id) REFERENCES artist_profiles(id)
      );

      CREATE TABLE IF NOT EXISTS daily_platform_metrics (
        id TEXT PRIMARY KEY,
        artist_id TEXT NOT NULL,
        date TEXT NOT NULL,
        followers INTEGER DEFAULT 0,
        following INTEGER DEFAULT 0,
        total_plays INTEGER DEFAULT 0,
        total_likes INTEGER DEFAULT 0,
        total_reposts INTEGER DEFAULT 0,
        total_comments INTEGER DEFAULT 0,
        total_downloads INTEGER DEFAULT 0,
        FOREIGN KEY(artist_id) REFERENCES artist_profiles(id)
      );

      CREATE TABLE IF NOT EXISTS daily_track_metrics (
        id TEXT PRIMARY KEY,
        track_id TEXT NOT NULL,
        date TEXT NOT NULL,
        plays INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        reposts INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        downloads INTEGER DEFAULT 0,
        FOREIGN KEY(track_id) REFERENCES tracks(id)
      );

      CREATE TABLE IF NOT EXISTS audience_locations (
        id TEXT PRIMARY KEY,
        artist_id TEXT NOT NULL,
        date TEXT NOT NULL,
        country TEXT NOT NULL,
        city TEXT,
        plays INTEGER DEFAULT 0,
        FOREIGN KEY(artist_id) REFERENCES artist_profiles(id)
      );

      CREATE TABLE IF NOT EXISTS traffic_sources (
        id TEXT PRIMARY KEY,
        artist_id TEXT NOT NULL,
        date TEXT NOT NULL,
        source TEXT NOT NULL,
        plays INTEGER DEFAULT 0,
        FOREIGN KEY(artist_id) REFERENCES artist_profiles(id)
      );

      CREATE TABLE IF NOT EXISTS scrape_runs (
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        status TEXT NOT NULL,
        error TEXT,
        raw_output_path TEXT
      );
    `);

    // Insert default platforms if they don't exist
    const insertPlatform = this.db.prepare('INSERT OR IGNORE INTO platforms (id, name, type) VALUES (?, ?, ?)');
    insertPlatform.run('soundcloud', 'SoundCloud', 'soundcloud');
    insertPlatform.run('spotify', 'Spotify', 'spotify');
    insertPlatform.run('applemusic', 'Apple Music', 'applemusic');
  }

  async saveNormalizedData(platform: PlatformType, data: NormalizedDataPackage) {
    const artistId = `${platform}_artist`; // Simplified for now

    // 1. Update Artist Profile
    const updateProfile = this.db.prepare(`
      INSERT INTO artist_profiles (id, platform_id, name, url, followers, following, track_count, total_plays, last_scraped_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name,
        url=excluded.url,
        followers=excluded.followers,
        following=excluded.following,
        track_count=excluded.track_count,
        total_plays=excluded.total_plays,
        last_scraped_at=excluded.last_scraped_at
    `);
    updateProfile.run(
      artistId,
      platform,
      data.profile.name || 'Unknown',
      data.profile.url || '',
      data.profile.followers || 0,
      data.profile.following || 0,
      data.profile.track_count || 0,
      data.profile.total_plays || 0,
      new Date().toISOString()
    );

    // 2. Save Daily Platform Metrics
    const insertPlatformMetrics = this.db.prepare(`
      INSERT INTO daily_platform_metrics (id, artist_id, date, followers, following, total_plays, total_likes, total_reposts, total_comments, total_downloads)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        followers=excluded.followers,
        following=excluded.following,
        total_plays=excluded.total_plays,
        total_likes=excluded.total_likes,
        total_reposts=excluded.total_reposts,
        total_comments=excluded.total_comments,
        total_downloads=excluded.total_downloads
    `);
    const metricsId = `${artistId}_${data.platformMetrics.date}`;
    insertPlatformMetrics.run(
      metricsId,
      artistId,
      data.platformMetrics.date,
      data.platformMetrics.followers || 0,
      data.platformMetrics.following || 0,
      data.platformMetrics.total_plays || 0,
      data.platformMetrics.total_likes || 0,
      data.platformMetrics.total_reposts || 0,
      data.platformMetrics.total_comments || 0,
      data.platformMetrics.total_downloads || 0
    );

    // 3. Save Tracks and Track Metrics
    for (const track of data.tracks) {
      const trackId = `${artistId}_${track.external_id}`;
      const insertTrack = this.db.prepare(`
        INSERT INTO tracks (id, artist_id, external_id, title, url)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title=excluded.title,
          url=excluded.url
      `);
      insertTrack.run(trackId, artistId, track.external_id, track.title, track.url);

      const trackMetric = data.trackMetrics.find(tm => tm.track_id === track.external_id);
      if (trackMetric) {
        const trackMetricId = `${trackId}_${trackMetric.date}`;
        const insertTrackMetric = this.db.prepare(`
          INSERT INTO daily_track_metrics (id, track_id, date, plays, likes, reposts, comments, downloads)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            plays=excluded.plays,
            likes=excluded.likes,
            reposts=excluded.reposts,
            comments=excluded.comments,
            downloads=excluded.downloads
        `);
        insertTrackMetric.run(
          trackMetricId,
          trackId,
          trackMetric.date,
          trackMetric.plays || 0,
          trackMetric.likes || 0,
          trackMetric.reposts || 0,
          trackMetric.comments || 0,
          trackMetric.downloads || 0
        );
      }
    }
  }

  saveRawData(platform: PlatformType, rawData: any) {
    const date = new Date().toISOString().split('T')[0];
    const baseDir = process.env.NODE_ENV === 'production' ? '/tmp' : process.cwd();
    const rawDir = path.join(baseDir, 'raw_analytics', platform);
    if (!fs.existsSync(rawDir)) {
      fs.mkdirSync(rawDir, { recursive: true });
    }
    const filePath = path.join(rawDir, `${date}.json`);
    fs.writeFileSync(filePath, JSON.stringify(rawData, null, 2));
    return filePath;
  }

  startScrapeRun(platform: PlatformType): string {
    const id = Math.random().toString(36).substring(7);
    const insertRun = this.db.prepare('INSERT INTO scrape_runs (id, platform, started_at, status) VALUES (?, ?, ?, ?)');
    insertRun.run(id, platform, new Date().toISOString(), 'pending');
    return id;
  }

  finishScrapeRun(id: string, status: 'success' | 'failed', error?: string, rawPath?: string) {
    const updateRun = this.db.prepare('UPDATE scrape_runs SET finished_at = ?, status = ?, error = ?, raw_output_path = ? WHERE id = ?');
    updateRun.run(new Date().toISOString(), status, error || null, rawPath || null, id);
  }

  getLatestMetrics() {
    return this.db.prepare(`
      SELECT p.name as platform, am.* 
      FROM daily_platform_metrics am
      JOIN artist_profiles ap ON am.artist_id = ap.id
      JOIN platforms p ON ap.platform_id = p.id
      WHERE am.date = (SELECT MAX(date) FROM daily_platform_metrics WHERE artist_id = am.artist_id)
    `).all();
  }
}

export const analyticsStorage = new AnalyticsStorage();
