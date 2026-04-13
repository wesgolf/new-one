import type { Page } from 'playwright';
import { IPlatformScraper } from '../../core/types.ts';
import type { NormalizedDataPackage } from '../../core/types.ts';
import type { SoundCloudRawData, SoundCloudRawTrack } from './types.ts';

export class SoundCloudScraper extends IPlatformScraper {
  name: 'soundcloud' = 'soundcloud';

  async checkLoginState(page: Page): Promise<boolean> {
    await page.goto('https://soundcloud.com/you/tracks');
    // If we're redirected to the login page, we're not logged in.
    const url = page.url();
    return !url.includes('/login');
  }

  async scrape(page: Page): Promise<SoundCloudRawData> {
    
    // 1. Profile Summary
    await page.goto('https://soundcloud.com/you/tracks');
    await page.waitForSelector('.userNav'); // Wait for some element that indicates we're logged in.

    const profileData = await page.evaluate(() => {
      // This is a simplified example. In a real scenario, we'd look for better selectors or hydration data.
      const name = document.querySelector('.userNav__username')?.textContent?.trim() || 'Unknown';
      const url = window.location.href;
      // We'd need to navigate to the actual profile page to get followers/following/trackCount
      return { name, url, followers: 0, following: 0, trackCount: 0, totalPlays: 0 };
    });

    // 2. Tracks List
    // We can scrape the tracks from the /you/tracks page or the insights page.
    // The insights page is better for metrics.
    await page.goto('https://soundcloud.com/you/insights/tracks');
    await page.waitForTimeout(2000); // Wait for data to load

    const tracks: SoundCloudRawTrack[] = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.insights-table__row'));
      return rows.map(row => {
        const title = row.querySelector('.insights-table__title')?.textContent?.trim() || 'Unknown';
        const plays = parseInt(row.querySelector('.insights-table__plays')?.textContent?.replace(/,/g, '') || '0');
        const likes = parseInt(row.querySelector('.insights-table__likes')?.textContent?.replace(/,/g, '') || '0');
        const reposts = parseInt(row.querySelector('.insights-table__reposts')?.textContent?.replace(/,/g, '') || '0');
        const comments = parseInt(row.querySelector('.insights-table__comments')?.textContent?.replace(/,/g, '') || '0');
        const downloads = parseInt(row.querySelector('.insights-table__downloads')?.textContent?.replace(/,/g, '') || '0');
        return { id: title, title, url: '', plays, likes, reposts, comments, downloads };
      });
    });

    // 3. Overview Metrics
    await page.goto('https://soundcloud.com/you/insights/overview');
    await page.waitForTimeout(2000);

    const insights = await page.evaluate(() => {
      // Scrape overview metrics from the dashboard
      return {
        totalPlays: 0,
        totalLikes: 0,
        totalReposts: 0,
        totalComments: 0,
        totalDownloads: 0,
        locations: [],
        sources: []
      };
    });

    return {
      profile: profileData,
      tracks,
      insights,
      scrapedAt: new Date().toISOString()
    };
  }

  async mapToNormalized(rawData: SoundCloudRawData): Promise<NormalizedDataPackage> {
    const date = new Date().toISOString().split('T')[0];
    
    return {
      profile: {
        name: rawData.profile.name,
        url: rawData.profile.url,
        followers: rawData.profile.followers,
        following: rawData.profile.following,
        track_count: rawData.profile.trackCount,
        total_plays: rawData.profile.totalPlays,
      },
      tracks: rawData.tracks.map(t => ({
        external_id: t.id,
        title: t.title,
        url: t.url,
      })),
      platformMetrics: {
        date,
        followers: rawData.profile.followers,
        following: rawData.profile.following,
        total_plays: rawData.insights?.totalPlays || 0,
        total_likes: rawData.insights?.totalLikes || 0,
        total_reposts: rawData.insights?.totalReposts || 0,
        total_comments: rawData.insights?.totalComments || 0,
        total_downloads: rawData.insights?.totalDownloads || 0,
      },
      trackMetrics: rawData.tracks.map(t => ({
        date,
        plays: t.plays,
        likes: t.likes,
        reposts: t.reposts,
        comments: t.comments,
        downloads: t.downloads,
      })),
      locations: rawData.insights?.locations.map(l => ({
        date,
        country: l.country,
        city: l.city,
        plays: l.plays,
      })) || [],
      sources: rawData.insights?.sources.map(s => ({
        date,
        source: s.source,
        plays: s.plays,
      })) || [],
    };
  }
}
