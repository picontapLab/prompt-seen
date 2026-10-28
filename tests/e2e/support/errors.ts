import { PORT } from './artifact';

// Page errors no reader of the page meets, for tests that watch errors across navigations
// (design doc §17.3 step 6).

const ownHost = `127.0.0.1:${PORT}`;

/**
 * WebKit logs a request of this site that a navigation cancels as an error, and Playwright reports
 * it as a page error ("<address> due to access control checks.", sometimes only "Load failed") or
 * a console error ("Fetch API cannot load <address> due to access control checks."). It happens
 * as the next page starts loading, for route prefetches, list data and the search index alike; no
 * reader meets it on the page being left, and every request of the site handles its own failure
 * (the feature specs check the retries). Waiting for `networkidle` before leaving does not avoid
 * it in CI: Playwright resolves that at once when the page has been idle before.
 */
export const cancelledFetch = (message: string) =>
  message === 'Load failed' ||
  (message.includes(ownHost) && message.endsWith(' due to access control checks.')) ||
  abortedByFirefox(message);

/**
 * Firefox's counterparts, for this site's addresses: leaving a page aborts its downloads
 * (NS_BINDING_ABORTED, 0x804B0002 = 2152398850). A web font reports it as a console error
 * ("downloadable font: download failed (…): status=2152398850 source: <address>"), a worker still
 * loading its scripts (Turbopack's worker loader) as a page error ("NS_BINDING_ABORTED: " with
 * its file). A download that fails for any other reason reports another status.
 */
const abortedByFirefox = (message: string) =>
  message.includes(ownHost) &&
  ((message.includes('downloadable font: download failed') && message.includes('status=2152398850')) ||
    message.includes('NS_BINDING_ABORTED'));
