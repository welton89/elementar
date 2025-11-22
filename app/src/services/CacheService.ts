// app/src/services/CacheService.ts

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * CacheService - Gerencia cache local usando AsyncStorage
 * 
 * Armazena:
 * - Lista de salas
 * - Últimas mensagens por sala
 * - Dados de usuários (avatares, displayNames)
 * - Metadados (timestamps, versões)
 */

// Cache keys
const CACHE_KEYS = {
    ROOMS: 'cache_rooms',
    MESSAGES_PREFIX: 'cache_messages_',
    USERS: 'cache_users',
    METADATA: 'cache_metadata',
} as const;

// Cache TTL (Time To Live) - 24 horas
const CACHE_TTL = 24 * 60 * 60 * 1000;

interface CacheMetadata {
    lastUpdate: number;
    version: string;
}

interface CachedRoom {
    roomId: string;
    name: string;
    avatarUrl: string | null;
    lastMessage: string | null;
    lastMessageTime: number | null;
    unreadCount: number;
    memberCount: number;
    isMural: boolean;
}

interface CachedMessage {
    eventId: string;
    senderId: string;
    senderName: string;
    senderAvatar: string | null;
    content: string;
    timestamp: number;
    type: string;
    status?: 'sending' | 'sent' | 'failed';
}

interface CachedUser {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
}

class CacheService {
    /**
     * Verifica se o cache é válido (não expirado)
     */
    private async isCacheValid(): Promise<boolean> {
        try {
            const metadataStr = await AsyncStorage.getItem(CACHE_KEYS.METADATA);
            if (!metadataStr) return false;

            const metadata: CacheMetadata = JSON.parse(metadataStr);
            const now = Date.now();
            const age = now - metadata.lastUpdate;

            return age < CACHE_TTL;
        } catch (error) {
            console.error('Error checking cache validity:', error);
            return false;
        }
    }

    /**
     * Atualiza metadados do cache
     */
    private async updateMetadata(): Promise<void> {
        const metadata: CacheMetadata = {
            lastUpdate: Date.now(),
            version: '1.0.0',
        };
        await AsyncStorage.setItem(CACHE_KEYS.METADATA, JSON.stringify(metadata));
    }

    // ==================== ROOMS ====================

    /**
     * Salva lista de salas no cache
     */
    async saveRooms(rooms: CachedRoom[]): Promise<void> {
        try {
            await AsyncStorage.setItem(CACHE_KEYS.ROOMS, JSON.stringify(rooms));
            await this.updateMetadata();

        } catch (error) {
            console.error('Error saving rooms to cache:', error);
        }
    }

    /**
     * Recupera lista de salas do cache
     */
    async getRooms(): Promise<CachedRoom[] | null> {
        try {
            const isValid = await this.isCacheValid();
            if (!isValid) {

                return null;
            }

            const roomsStr = await AsyncStorage.getItem(CACHE_KEYS.ROOMS);
            if (!roomsStr) return null;

            const rooms: CachedRoom[] = JSON.parse(roomsStr);

            return rooms;
        } catch (error) {
            console.error('Error loading rooms from cache:', error);
            return null;
        }
    }

    // ==================== MESSAGES ====================

    /**
     * Salva mensagens de uma sala no cache (últimas 50)
     */
    async saveMessages(roomId: string, messages: CachedMessage[]): Promise<void> {
        try {
            // Limita a 50 mensagens mais recentes
            const messagesToCache = messages.slice(-50);
            const key = `${CACHE_KEYS.MESSAGES_PREFIX}${roomId}`;
            await AsyncStorage.setItem(key, JSON.stringify(messagesToCache));

        } catch (error) {
            console.error('Error saving messages to cache:', error);
        }
    }

    /**
     * Recupera mensagens de uma sala do cache
     */
    async getMessages(roomId: string): Promise<CachedMessage[] | null> {
        try {
            const isValid = await this.isCacheValid();
            if (!isValid) return null;

            const key = `${CACHE_KEYS.MESSAGES_PREFIX}${roomId}`;
            const messagesStr = await AsyncStorage.getItem(key);
            if (!messagesStr) return null;

            const messages: CachedMessage[] = JSON.parse(messagesStr);

            return messages;
        } catch (error) {
            console.error('Error loading messages from cache:', error);
            return null;
        }
    }

    // ==================== USERS ====================

    /**
     * Salva dados de usuários no cache
     */
    async saveUsers(users: CachedUser[]): Promise<void> {
        try {
            await AsyncStorage.setItem(CACHE_KEYS.USERS, JSON.stringify(users));

        } catch (error) {
            console.error('Error saving users to cache:', error);
        }
    }

    /**
     * Recupera dados de usuários do cache
     */
    async getUsers(): Promise<CachedUser[] | null> {
        try {
            const isValid = await this.isCacheValid();
            if (!isValid) return null;

            const usersStr = await AsyncStorage.getItem(CACHE_KEYS.USERS);
            if (!usersStr) return null;

            const users: CachedUser[] = JSON.parse(usersStr);

            return users;
        } catch (error) {
            console.error('Error loading users from cache:', error);
            return null;
        }
    }

    // ==================== UTILITY ====================

    /**
     * Limpa todo o cache
     */
    async clearAll(): Promise<void> {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const cacheKeys = keys.filter(key => key.startsWith('cache_'));
            await AsyncStorage.multiRemove(cacheKeys);

        } catch (error) {
            console.error('Error clearing cache:', error);
        }
    }

    /**
     * Limpa cache de uma sala específica
     */
    async clearRoomCache(roomId: string): Promise<void> {
        try {
            const key = `${CACHE_KEYS.MESSAGES_PREFIX}${roomId}`;
            await AsyncStorage.removeItem(key);

        } catch (error) {
            console.error('Error clearing room cache:', error);
        }
    }

    /**
     * Retorna tamanho aproximado do cache em bytes
     */
    async getCacheSize(): Promise<number> {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const cacheKeys = keys.filter(key => key.startsWith('cache_'));

            let totalSize = 0;
            for (const key of cacheKeys) {
                const value = await AsyncStorage.getItem(key);
                if (value) {
                    totalSize += new Blob([value]).size;
                }
            }

            return totalSize;
        } catch (error) {
            console.error('Error calculating cache size:', error);
            return 0;
        }
    }
}

// Export singleton instance
export const cacheService = new CacheService();

// Export types
export type { CachedMessage, CachedRoom, CachedUser };

