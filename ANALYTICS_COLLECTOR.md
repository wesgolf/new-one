# Analytics Collector Documentation

## Architecture Overview
The system is built with a modular architecture to support multiple music platforms (SoundCloud, Spotify, Apple Music).

- **Core**: Contains the main engine, scheduler, and shared types.
- **Browser**: Manages persistent Playwright browser sessions.
- **Platforms**: Platform-specific logic (scrapers, mappers, selectors).
- **Storage**: SQLite database for normalized data and JSON files for raw data.
- **Scheduler**: Daily cron job for automated collection.

## Data Schema
We use a normalized schema to unify metrics across all platforms.

### Example Raw Output (SoundCloud)
Saved as `raw_analytics/soundcloud/2026-04-01.json`:
```json
{
  "profile": {
    "name": "Wes. music",
    "url": "https://soundcloud.com/wesmusic1",
    "followers": 1250,
    "following": 450,
    "trackCount": 12,
    "totalPlays": 154200
  },
  "tracks": [
    {
      "id": "summer-vibes",
      "title": "Summer Vibes",
      "url": "https://soundcloud.com/wesmusic1/summer-vibes",
      "plays": 15400,
      "likes": 450,
      "reposts": 120,
      "comments": 45,
      "downloads": 10
    }
  ],
  "insights": {
    "totalPlays": 154200,
    "totalLikes": 4500,
    "totalReposts": 1200,
    "totalComments": 450,
    "totalDownloads": 100,
    "locations": [
      { "country": "United States", "city": "New York", "plays": 5400 }
    ],
    "sources": [
      { "source": "SoundCloud Search", "plays": 12000 }
    ]
  },
  "scrapedAt": "2026-04-01T03:00:00.000Z"
}
```

### Example Normalized Output (SQLite)
Stored in `analytics.db`:

**Table: artist_profiles**
| id | platform_id | name | followers | total_plays |
|----|-------------|------|-----------|-------------|
| soundcloud_artist | soundcloud | Wes. music | 1250 | 154200 |

**Table: daily_platform_metrics**
| id | artist_id | date | followers | total_plays |
|----|-----------|------|-----------|-------------|
| soundcloud_artist_2026-04-01 | soundcloud_artist | 2026-04-01 | 1250 | 154200 |

## Setup Instructions

### 1. First-Time Manual Login
Since we use persistent browser sessions, you only need to log in once per platform.
1. Run the application locally: `npm run dev`.
2. Open the app in your browser.
3. Go to the **Analytics** page.
4. Click **Manual Login** for the platform you want to set up.
5. A browser window will open (if running locally with `headless: false`). Log in to your artist dashboard.
6. Close the browser window once logged in. Playwright will save your session in the `.browser-sessions` directory.

### 2. Automated Daily Runs
The system is configured to run automatically every day at 3 AM.
- Ensure the server is running.
- The `AnalyticsEngine` will use the saved session to scrape data without requiring your password.
- If a session expires, the scrape run will be marked as "failed" with an "Authentication required" error, and you'll need to perform the manual login again.

### 3. Manual Sync
You can trigger a sync at any time by clicking the **Sync Now** button on the Analytics dashboard.
