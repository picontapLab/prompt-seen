'use client';

import type { ReactNode } from 'react';
import { UNSAFE_PortalProvider } from 'react-aria';

/**
 * Renders the overlays of the primitives inside (Tooltip, Select and Combobox popovers, nested
 * dialogs) into `getContainer()` instead of document.body. Needed inside a native modal
 * <dialog> (the detail popup, §11.3.1): it sits in the browser's top layer, so an overlay
 * portalled to the body would appear behind it and be inert.
 */
export function PortalScope({
  getContainer,
  children,
}: {
  getContainer: () => HTMLElement | null;
  children: ReactNode;
}) {
  return <UNSAFE_PortalProvider getContainer={getContainer}>{children}</UNSAFE_PortalProvider>;
}
