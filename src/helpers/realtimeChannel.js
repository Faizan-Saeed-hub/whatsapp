import { supabase } from '../supabaseClient';

let globalChannel = null;
let broadcastChannel = null;
const listeners = new Set();

/**
 * Initializes the universal cross-device Realtime channel via Supabase WebSocket broadcast
 * Works between Mobile phones, Desktops, Laptops, and different browsers anywhere in the world!
 */
export const initRealtimeChannel = (onEventCallback) => {
    if (onEventCallback) {
        listeners.add(onEventCallback);
    }

    if (!globalChannel) {
        try {
            globalChannel = supabase.channel('whatsapp-global-sync-v1', {
                config: {
                    broadcast: { self: false }
                }
            });

            globalChannel
                .on('broadcast', { event: 'NEW_MESSAGE' }, ({ payload }) => notifyAll('NEW_MESSAGE', payload))
                .on('broadcast', { event: 'MESSAGES_SEEN' }, ({ payload }) => notifyAll('MESSAGES_SEEN', payload))
                .on('broadcast', { event: 'REACTION_UPDATED' }, ({ payload }) => notifyAll('REACTION_UPDATED', payload))
                .on('broadcast', { event: 'MESSAGE_DELETED' }, ({ payload }) => notifyAll('MESSAGE_DELETED', payload))
                .on('broadcast', { event: 'USER_TYPING' }, ({ payload }) => notifyAll('USER_TYPING', payload))
                .on('broadcast', { event: 'PROFILE_UPDATED' }, ({ payload }) => notifyAll('PROFILE_UPDATED', payload))
                .on('broadcast', { event: 'NEW_GROUP' }, ({ payload }) => notifyAll('NEW_GROUP', payload))
                .on('broadcast', { event: 'GROUP_UPDATED' }, ({ payload }) => notifyAll('GROUP_UPDATED', payload))
                .on('broadcast', { event: 'DELETE_GROUP' }, ({ payload }) => notifyAll('DELETE_GROUP', payload))
                .subscribe((status) => {
                    console.log("Supabase Global Realtime sync status:", status);
                });
        } catch (err) {
            console.warn("Supabase Realtime Channel init note:", err);
        }
    }

    if (typeof BroadcastChannel !== 'undefined' && !broadcastChannel) {
        try {
            broadcastChannel = new BroadcastChannel('whatsapp_local_sync_v1');
            broadcastChannel.onmessage = (e) => {
                if (e.data?.type && e.data?.payload) {
                    notifyAll(e.data.type, e.data.payload);
                }
            };
        } catch (err) {}
    }

    return () => {
        if (onEventCallback) {
            listeners.delete(onEventCallback);
        }
    };
};

const notifyAll = (type, payload) => {
    listeners.forEach((callback) => {
        try {
            callback({ type, payload });
        } catch (e) {
            console.error("Error in realtime listener callback:", e);
        }
    });
};

/**
 * Broadcasts an event to all connected devices (Mobile, PC, Tablets) across the internet
 */
export const broadcastGlobalEvent = (type, payload) => {
    // 1. Send via Supabase WebSockets (Cross-device, Mobile <-> PC)
    if (globalChannel) {
        try {
            globalChannel.send({
                type: 'broadcast',
                event: type,
                payload
            });
        } catch (err) {
            console.warn("Realtime WebSocket broadcast error:", err);
        }
    }

    // 2. Send via local BroadcastChannel (Multi-tab on same device)
    if (broadcastChannel) {
        try {
            broadcastChannel.postMessage({ type, payload });
        } catch (err) {}
    }
};
