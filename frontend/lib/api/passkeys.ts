import { api, apiErrorMessage, isRecord } from './apiClient';

export interface Passkey {
    id: string;
    name: string | null;
    deviceType: 'singleDevice' | 'multiDevice' | null;
    backedUp: boolean;
    createdAt: string;
    lastUsedAt: string | null;
}

/** Turns a failed passkey call (server error or the browser's own) into a readable message. */
export function passkeyErrorMessage(e: unknown, fallback: string): string {
    const err = isRecord(e) ? e : {};
    const cause = isRecord(err.cause) ? err.cause : {};
    // The person closed the prompt or it timed out: not worth an alarming message.
    if (err.name === 'NotAllowedError' || cause.name === 'NotAllowedError') return 'Cancelled, or the device did not respond.';
    if (err.name === 'InvalidStateError' || err.code === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED') return 'This device already has a passkey for your account.';
    return apiErrorMessage(e, fallback);
}

/** True when this browser can use passkeys at all (https or localhost, and a WebAuthn-capable browser). */
export async function passkeysSupported(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    const { browserSupportsWebAuthn } = await import('@simplewebauthn/browser');
    return browserSupportsWebAuthn();
}

export const listPasskeys = async (): Promise<Passkey[]> => (await api.get('/auth/passkeys')).data.data;

/** Asks this device to create a passkey for the signed-in account (it prompts for fingerprint, face or screen lock). */
export const addPasskey = async (name: string): Promise<Passkey[]> => {
    const { startRegistration } = await import('@simplewebauthn/browser');
    const options = (await api.post('/auth/passkeys/register/options')).data.data;
    const response = await startRegistration({ optionsJSON: options });
    return (await api.post('/auth/passkeys/register/verify', { response, name })).data.data;
};

export const renamePasskey = async (id: string, name: string): Promise<Passkey[]> =>
    (await api.patch(`/auth/passkeys/${encodeURIComponent(id)}`, { name })).data.data;

export const removePasskey = async (id: string): Promise<Passkey[]> =>
    (await api.delete(`/auth/passkeys/${encodeURIComponent(id)}`)).data.data;
