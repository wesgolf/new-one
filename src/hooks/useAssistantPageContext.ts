/**
 * useAssistantPageContext
 *
 * Call at the top of any page component to register that page's module label
 * with the global assistant, so it can prioritise relevant commands.
 *
 * Usage:
 *   useAssistantPageContext('calendar');
 *
 * Resets to 'dashboard' on unmount.
 */
import { useEffect } from 'react';
import { useAssistantContext } from '../context/AssistantContext';

export function useAssistantPageContext(ctx: string) {
  const { setPageContext } = useAssistantContext();

  useEffect(() => {
    setPageContext(ctx);
    return () => setPageContext('dashboard');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx]);
}
