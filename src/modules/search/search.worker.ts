/// <reference lib="webworker" />
import type { WorkerRequest } from './types';
import { createSearchCore } from './worker-core';

// The search Worker (design doc §13.3): loads indexes and answers queries off the main thread,
// so typing stays responsive. Answers carry the request's sequence number (§11.6.4).

const handle = createSearchCore();

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  void handle(event.data).then((response) => self.postMessage(response));
});
