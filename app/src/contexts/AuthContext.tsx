// src/contexts/AuthContext.tsx

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MatrixClient } from 'matrix-js-sdk';
import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useState
} from 'react';
import {
    clearClientInstance,
    getClientInstance
} from '../api/client';
import { notificationService } from '../services/NotificationService';
import {
    AuthContextType,
    SessionData
} from '../types/auth';

const SESSION_KEY = '@Elementar:SessionData';

// -----------------------------------------------------------------------------
// 1. CONTEXTO
// -----------------------------------------------------------------------------

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {

    const [client, setClient] = useState<MatrixClient | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
    const isLoggedIn = !!client;

    useEffect(() => {

    }, []);

    const saveSession = useCallback(async (data: SessionData) => {
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(data));
    }, []);

    const destroySession = useCallback(async () => {
        await AsyncStorage.removeItem(SESSION_KEY);
        await clearClientInstance();
        setClient(undefined);
    }, []);

    // -----------------------------------------------------------------------------
    // 2. Lógica de Login/Logout
    // -----------------------------------------------------------------------------

    const login = useCallback(async (
        homeserver: string,
        username: string,
        password: string
    ) => {
        setIsLoading(true);
        try {
            const tempClient = getClientInstance(homeserver, undefined, undefined);

            const response = await tempClient.login('m.login.password', {
                user: username,
                password: password,
            });

            // Limpar a instância temporária antes de criar a autenticada
            await clearClientInstance();

            const newClient = getClientInstance(
                homeserver,
                response.access_token,
                response.user_id,
                response.device_id || 'UNKNOWN'
            );

            // Busca perfil do usuário IMEDIATAMENTE após login
            let avatarUrl = null;
            let displayName = null;
            try {
                const profile = await newClient.getProfileInfo(response.user_id);
                avatarUrl = profile.avatar_url || null;
                displayName = profile.displayname || null;
                setUserAvatarUrl(avatarUrl);
            } catch (e) {
                console.warn("Erro ao buscar perfil no login:", e);
            }

            const sessionData: SessionData = {
                homeserverUrl: homeserver,
                userId: response.user_id,
                accessToken: response.access_token,
                deviceId: response.device_id || 'UNKNOWN',
                avatarUrl,
                displayName
            };

            await saveSession(sessionData);

            // Inicia o cliente com tracking de presença habilitado
            await newClient.startClient({
                initialSyncLimit: 10,
                lazyLoadMembers: false,
            });

            // Define nossa própria presença como online
            try {
                await newClient.setPresence({ presence: 'online' as any });
            } catch (e) {
                console.warn('⚠️ Erro ao definir presença:', e);
            }

            // Configura serviço de notificação
            notificationService.setClient(newClient);
            await notificationService.requestPermissions();

            setClient(newClient);

        } catch (error) {
            console.error('Login failed:', error);
            await destroySession();
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [saveSession, destroySession]);

    const logout = useCallback(async () => {
        if (client) {
            try {
                await client.logout();
            } catch (error) {
                console.warn('Matrix logout failed, performing local clear:', error);
            }
        }
        await destroySession();
    }, [client, destroySession]);


    // -----------------------------------------------------------------------------
    // 3. Efeito de Inicialização e Sincronização
    // -----------------------------------------------------------------------------

    useEffect(() => {
        const checkSessionAndStartClient = async () => {
            try {
                const storedSession = await AsyncStorage.getItem(SESSION_KEY);

                if (storedSession) {
                    const sessionData: SessionData = JSON.parse(storedSession);

                    // ✅ Restaura avatar do cache imediatamente
                    if (sessionData.avatarUrl) {
                        setUserAvatarUrl(sessionData.avatarUrl);
                    }

                    const restoredClient = getClientInstance(
                        sessionData.homeserverUrl,
                        sessionData.accessToken,
                        sessionData.userId,
                        sessionData.deviceId
                    );

                    const syncListener = (state: string) => {

                        if (state === 'STOPPED' || state === 'ERROR') {
                            console.error("Sync falhou ou parou. Forçando logout local.");
                            destroySession();
                        }
                    };

                    restoredClient.on("sync" as any, syncListener);

                    restoredClient.startClient({
                        syncIntervalMs: 2000,
                        lazyLoadMembers: false,
                    } as any);

                    try {
                        await restoredClient.setPresence({ presence: 'online' as any });
                    } catch (e) {
                        console.warn('⚠️ Erro ao definir presença:', e);
                    }

                    // Atualiza perfil em background e salva no cache se mudou
                    try {
                        const profile = await restoredClient.getProfileInfo(sessionData.userId);
                        const newAvatar = profile.avatar_url || null;
                        const newName = profile.displayname || null;

                        if (newAvatar !== sessionData.avatarUrl || newName !== sessionData.displayName) {
                            setUserAvatarUrl(newAvatar);
                            await saveSession({
                                ...sessionData,
                                avatarUrl: newAvatar,
                                displayName: newName
                            });
                        }
                    } catch (e) {
                        console.warn("Erro ao atualizar perfil na restauração:", e);
                    }

                    // Configura serviço de notificação
                    notificationService.setClient(restoredClient);
                    await notificationService.requestPermissions();

                    setClient(restoredClient);

                    return () => {
                        restoredClient.stopClient();
                        restoredClient.removeListener("sync" as any, syncListener);
                    };
                }
            } catch (e) {
                console.error('Error loading session or starting client:', e);
                await destroySession();
            } finally {
                setIsLoading(false);
            }
        };

        checkSessionAndStartClient();
    }, [destroySession, saveSession]);

    const updateUserAvatar = useCallback(async (uri: string) => {
        if (!client) return;

        try {
            const response = await fetch(uri);
            const blob = await response.blob();

            const uploadResponse = await client.uploadContent(blob, {
                type: blob.type || 'image/jpeg',
                name: 'avatar.jpg',
            });

            const mxcUrl = uploadResponse.content_uri;

            if (!mxcUrl) {
                throw new Error("Falha ao obter MXC URL após upload.");
            }

            await client.setAvatarUrl(mxcUrl);
            setUserAvatarUrl(mxcUrl);

            // Atualiza cache
            const storedSession = await AsyncStorage.getItem(SESSION_KEY);
            if (storedSession) {
                const sessionData = JSON.parse(storedSession);
                await saveSession({
                    ...sessionData,
                    avatarUrl: mxcUrl
                });
            }



        } catch (error) {
            console.error("Erro ao atualizar avatar:", error);
            throw error;
        }
    }, [client, saveSession]);

    const updateDisplayName = useCallback(async (name: string) => {
        if (!client) return;

        try {
            await client.setDisplayName(name);

            // Atualiza cache
            const storedSession = await AsyncStorage.getItem(SESSION_KEY);
            if (storedSession) {
                const sessionData = JSON.parse(storedSession);
                await saveSession({
                    ...sessionData,
                    displayName: name
                });
            }


        } catch (error) {
            console.error("Erro ao atualizar display name:", error);
            throw error;
        }
    }, [client, saveSession]);

    const value: AuthContextType = {
        client,
        isLoading,
        isLoggedIn,
        login,
        logout,
        userAvatarUrl,
        updateUserAvatar,
        updateDisplayName
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// -----------------------------------------------------------------------------
// 4. CUSTOM HOOK
// -----------------------------------------------------------------------------

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};