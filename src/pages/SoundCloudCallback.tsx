import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSoundCloud } from '../hooks/useSoundCloud';

export function SoundCloudCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { exchangeToken } = useSoundCloud();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (code && state) {
      exchangeToken(code, state).then(() => {
        navigate('/');
      }).catch(err => {
        console.error('SoundCloud auth failed:', err);
        navigate('/');
      });
    } else {
      navigate('/');
    }
  }, [searchParams, exchangeToken, navigate]);

  return <div>Authenticating with SoundCloud...</div>;
}
