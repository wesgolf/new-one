import { chromium } from 'playwright';
import type { BrowserContext, Page } from 'playwright';
import path from 'path';
import fs from 'fs';

const USER_DATA_DIR = process.env.NODE_ENV === 'production'
  ? path.join('/tmp', '.browser-sessions')
  : path.join(process.cwd(), '.browser-sessions');

if (!fs.existsSync(USER_DATA_DIR)) {
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });
}

export interface BrowserOptions {
  headless?: boolean;
  slowMo?: number;
}

export class BrowserLauncher {
  private context: BrowserContext | null = null;

  async launch(options: BrowserOptions = { headless: true }): Promise<BrowserContext> {
    if (this.context) return this.context;

    this.context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      headless: options.headless,
      slowMo: options.slowMo,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
      viewport: { width: 1280, height: 720 },
    });

    return this.context;
  }

  async close() {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
  }

  async newPage(): Promise<Page> {
    const context = await this.launch();
    return await context.newPage();
  }
}

export const browserLauncher = new BrowserLauncher();
