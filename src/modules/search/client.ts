import type { IndexSource, WorkerRequest, WorkerResponse } from './types';

// The page's side of search (design doc §13.3, §11.6.4). One Worker per page, started on first
// use, never with the page itself. Every request gets a sequence number; callers keep only the
// answer to their latest request. Where Workers are unavailable the same code runs here.

type Pending = (response: WorkerResponse) => void;
type Request = WorkerRequest extends infer R ? (R extends WorkerRequest ? Omit<R, 'seq'> : never) : never;

export type SearchClient = {
  /** Sends a request; resolves with its answer. */
  request: (req: Request) => Promise<WorkerResponse>;
};

let client: SearchClient | null = null;

function createClient(): SearchClient {
  let seq = 0;
  const pending = new Map<number, Pending>();
  let send: ((req: WorkerRequest) => void) | null = null;

  const receive = (response: WorkerResponse) => {
    pending.get(response.seq)?.(response);
    pending.delete(response.seq);
  };

  const local = () => {
    // Fallback: the same request handler on this thread, loaded on demand.
    const core = import('./worker-core').then((m) => m.createSearchCore());
    return (req: WorkerRequest) => void core.then((handle) => handle(req)).then(receive);
  };

  function start() {
    try {
      const worker = new Worker(new URL('./search.worker.ts', import.meta.url), { type: 'module', name: 'search' });
      worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => receive(event.data));
      worker.addEventListener('error', () => {
        // The Worker failed to start (blocked, or a script error): answer here from now on.
        send = local();
        for (const s of pending.keys()) receive({ type: 'error', seq: s, error: 'unknown' });
      });
      return (req: WorkerRequest) => worker.postMessage(req);
    } catch {
      return local();
    }
  }

  return {
    request(req) {
      send ??= start();
      const message = { ...req, seq: ++seq } as WorkerRequest;
      return new Promise((resolve) => {
        pending.set(message.seq, resolve);
        send!(message);
      });
    },
  };
}

export function searchClient(): SearchClient {
  return (client ??= createClient());
}

/** Starts loading a locale's index, e.g. when the pointer rests on the search button (§11.8.6). */
export function preloadIndex(buildId: string, source: IndexSource): void {
  void searchClient().request({ type: 'load', buildId, source });
}
