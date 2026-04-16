/**
 * AssistantContext
 *
 * Global state for the assistant drawer:
 *  - open / setOpen   — controls drawer visibility from any page
 *  - pageContext      — current module label; pages set this on mount so the
 *                       assistant can prioritise relevant commands
 *
 * Usage:
 *   const { open, setOpen, pageContext, setPageContext } = useAssistantContext();
 *
 * Page context is set via the useAssistantPageContext() hook (see hooks/).
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface AssistantContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggleOpen: () => void;
  pageContext: string;
  setPageContext: (ctx: string) => void;
}

const AssistantContext = createContext<AssistantContextValue>({
  open: false,
  setOpen: () => undefined,
  toggleOpen: () => undefined,
  pageContext: 'dashboard',
  setPageContext: () => undefined,
});

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pageContext, setPageContext] = useState('dashboard');

  const toggleOpen = useCallback(() => setOpen((v) => !v), []);

  const value = useMemo(
    () => ({ open, setOpen, toggleOpen, pageContext, setPageContext }),
    [open, toggleOpen, pageContext]
  );

  return (
    <AssistantContext.Provider value={value}>
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistantContext() {
  return useContext(AssistantContext);
}
