import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  // Ensure event has a type
  const typedEvent = event as { body: string };
  try {
    const body = JSON.parse(typedEvent.body);

    const SONGSTATS_API_KEY = process.env.SONGSTATS_API_KEY;
    const SONGSTATS_ARTIST_ID = process.env.SONGSTATS_ARTIST_ID;

    if (!SONGSTATS_API_KEY || !SONGSTATS_ARTIST_ID) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Missing required environment variables: SONGSTATS_API_KEY or SONGSTATS_ARTIST_ID.',
        }),
      };
    }

    const path = event.path.replace('/api/songstats', '');
    const url = `https://api.songstats.com/enterprise/v1${path}`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${SONGSTATS_API_KEY}`,
        },
      });

      if (!response.ok) {
        return {
          statusCode: response.status,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            error: 'Failed to fetch data from Songstats.',
            details: await response.text(),
          }),
        };
      }

      const data = await response.json();
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      };
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error:', error.message);
        return {
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            error: 'Internal server error.',
            details: error.message,
          }),
        };
      } else {
        console.error('Unknown error:', error);
        return {
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            error: 'Internal server error.',
            details: 'Unknown error occurred.',
          }),
        };
      }
    }
  } catch (error) {
    console.error('Songstats handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Failed to parse request.',
        details: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};