import cron from 'node-cron';
import { browserLauncher } from '../browser/launcher.ts';
import { SoundCloudScraper } from '../platforms/soundcloud/scraper.ts';
import { SpotifyScraper } from '../platforms/spotify/scraper.ts';
import { AppleMusicScraper } from '../platforms/applemusic/scraper.ts';
import { analyticsStorage } from '../storage/db.ts';
import { IPlatformScraper } from './types.ts';

export class AnalyticsEngine {
  private scrapers: IPlatformScraper[] = [
    new SoundCloudScraper(),
    new SpotifyScraper(),
    new AppleMusicScraper(),
  ];

  async runAll() {
    const context = await browserLauncher.launch({ headless: true });

    for (const scraper of this.scrapers) {
      const runId = analyticsStorage.startScrapeRun(scraper.name);
      const page = await context.newPage();

      try {
        const isLoggedIn = await scraper.checkLoginState(page);
        if (!isLoggedIn) {
          console.error(`[${scraper.name}] User is not logged in. Please log in manually.`);
          analyticsStorage.finishScrapeRun(runId, 'failed', 'Authentication required');
          continue;
        }

        const rawData = await scraper.scrape(page);
        const rawPath = analyticsStorage.saveRawData(scraper.name, rawData);
        
        const normalizedData = await scraper.mapToNormalized(rawData);
        await analyticsStorage.saveNormalizedData(scraper.name, normalizedData);

        analyticsStorage.finishScrapeRun(runId, 'success', undefined, rawPath);
      } catch (error: any) {
        console.error(`[${scraper.name}] Scrape failed:`, error.message);
        analyticsStorage.finishScrapeRun(runId, 'failed', error.message);
      } finally {
        await page.close();
      }
    }

    await browserLauncher.close();
  }

  startScheduler() {
    // Run every day at 3 AM
    cron.schedule('0 3 * * *', () => {
      this.runAll();
    });
  }
}

export const analyticsEngine = new AnalyticsEngine();
