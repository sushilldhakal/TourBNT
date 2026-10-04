import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * False during server rendering and hydration, true after. Reading browser-only state (storage, navigator,
 * location) behind this keeps the first client render identical to the server's, without a mount effect.
 */
export function useIsClient(): boolean {
    return useSyncExternalStore(subscribe, () => true, () => false);
}
