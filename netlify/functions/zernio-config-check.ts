import { Handler } from '@netlify/functions';

const handler: Handler = async () => {
  const ZERNIO_API_KEY = process.env.ZERNIO_API_KEY;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      configured: !!ZERNIO_API_KEY,
      service: 'zernio',
    }),
  };
};

export { handler };