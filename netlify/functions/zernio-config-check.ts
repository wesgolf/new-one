import { Handler } from '@netlify/functions';

const handler: Handler = async () => {
  const ZERNIO_API_KEY =
    process.env.ZERNIO_API_KEY ??
    process.env.VITE_ZERNIO_API_KEY ??
    process.env.VITE_ZERNIO_KEY;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      hasKey: !!ZERNIO_API_KEY,
      configured: !!ZERNIO_API_KEY,
      service: 'zernio',
    }),
  };
};

export { handler };
