// Page errors no reader of the page meets, for tests that watch errors across navigations
// (design doc §17.3 step 6).

/**
 * WebKit reports route-data prefetches (`…txt?_rsc=`) that a navigation cancels as page errors
 * ("… due to access control checks"), at the moment the next page starts loading; no reader meets
 * them on the page being left. Waiting for `networkidle` before leaving does not avoid these in
 * CI: Playwright resolves it at once when the page has been idle before, and prefetches start
 * later. It does cover the page's own requests (search index, images), which WebKit reports the
 * same way when cancelled, sometimes only as "Load failed".
 */
export const cancelledPrefetch = (message: string) => /\.txt\?_rsc=\S* due to access control checks/.test(message);
