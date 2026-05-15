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
    const returnPath = localStorage.getItem('soundcloud_return_path') || '/settings';

    if (code && state) {
      exchangeToken(code, state)
        .then(() => {
          localStorage.removeItem('soundcloud_return_path');
          navigate(returnPath, { replace: true });
        })
        .catch(err => {
          console.error('SoundCloud auth failed:', err);
          navigate(returnPath, { replace: true });
        });
    } else {
      navigate(returnPath, { replace: true });
    }
  }, [searchParams, exchangeToken, navigate]);

  return <div>Authenticating with SoundCloud...</div>;
}
