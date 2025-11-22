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
    console.log('🚀 [DEBUG] AuthProvider rendering');
    const [client, setClient] = useState<MatrixClient | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
    const isLoggedIn = !!client;

    useEffect(() => {
        console.log('🚀 [DEBUG] AuthProvider mounted');
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

            const sessionData: SessionData = {
                homeserverUrl: homeserver,
                userId: response.user_id,
                accessToken: response.access_token,
                deviceId: response.device_id || 'UNKNOWN',
            };

            // Limpar a instância temporária antes de criar a autenticada
            await clearClientInstance();

            const newClient = getClientInstance(
                sessionData.homeserverUrl,
                sessionData.accessToken,
                sessionData.userId,
                sessionData.deviceId
            );

            await saveSession(sessionData);

            // ⭐️ E2EE TEMPORARIAMENTE DESABILITADO
            // Motivo: initRustCrypto requer IndexedDB, que não existe no React Native
            // Aguardando suporte oficial: https://github.com/matrix-org/matrix-js-sdk/issues/3995
            // TODO: Reativar quando suporte RN estiver disponível
            /*
            if ((newClient as any).initRustCrypto) {
                console.log("DEBUG: Inicializando E2EE/Criptografia (Rust)...");
                try {
                    await (newClient as any).initRustCrypto();
                    console.log("DEBUG: Criptografia inicializada com sucesso!");
                } catch (cryptoError) {
                    console.error("ALERTA E2EE: Falha ao inicializar criptografia (Rust):", cryptoError);
                }
            } else if ((newClient as any).initCrypto) {
                 console.log("DEBUG: Inicializando E2EE/Criptografia (Legacy)...");
                 try {
                    await (newClient as any).initCrypto();
                 } catch (cryptoError) {
                    console.error("ALERTA E2EE: Falha ao inicializar criptografia (Legacy):", cryptoError);
                 }
            } else {
                console.warn("ALERTA E2EE: Nenhum método de inicialização de criptografia encontrado.");
            }
            */
            // ⭐️ E2EE DESABILITADO - Requer WebAssembly (não disponível no React Native)
            // Aguardando migração para react-native-matrix-sdk
            /*
            try {
                await newClient.initRustCrypto({
                    useIndexedDB: false
                });
                console.log("✅ E2EE habilitado");
            } catch (cryptoError) {
                console.error("❌ Falha ao inicializar E2EE:", cryptoError);
            }
            */

            // Inicia o cliente com tracking de presença habilitado
            await newClient.startClient({
                initialSyncLimit: 10,
                // Habilita tracking de presença para ver status online/offline
                lazyLoadMembers: false,
            });

            // Define nossa própria presença como online
            try {
                await newClient.setPresence({ presence: 'online' as any });
                console.log('✅ Presença definida como online');
            } catch (e) {
                console.warn('⚠️ Erro ao definir presença:', e);
            }

            // Busca perfil do usuário
            try {
                const profile = await newClient.getProfileInfo(sessionData.userId);
                setUserAvatarUrl(profile.avatar_url || null);
            } catch (e) {
                console.warn("Erro ao buscar perfil:", e);
            }

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
                // Tenta fazer logout no servidor antes de destruir a sessão local
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

                    const restoredClient = getClientInstance(
                        sessionData.homeserverUrl,
                        sessionData.accessToken,
                        sessionData.userId,
                        sessionData.deviceId
                    );

                    const syncListener = (state: string) => {
                        console.log("Sync State:", state);
                        if (state === 'STOPPED' || state === 'ERROR') {
                            console.error("Sync falhou ou parou. Forçando logout local.");
                            destroySession();
                        }
                    };

                    restoredClient.on("sync" as any, syncListener);

                    // ⭐️ E2EE TEMPORARIAMENTE DESABILITADO
                    // Motivo: initRustCrypto requer IndexedDB, que não existe no React Native
                    // TODO: Reativar quando suporte RN estiver disponível
                    /*
                    if ((restoredClient as any).initRustCrypto) {
                        console.log("DEBUG: Inicializando E2EE/Criptografia (Rust) na Restauração...");
                        try {
                            await (restoredClient as any).initRustCrypto();
                            console.log("DEBUG: Criptografia restaurada com sucesso!");
                        } catch (cryptoError) {
                            console.error("ALERTA E2EE: Falha ao inicializar criptografia (Rust) na restauração:", cryptoError);
                        }
                    } else if ((restoredClient as any).initCrypto) {
                        console.log("DEBUG: Inicializando E2EE/Criptografia (Legacy) na Restauração...");
                        try {
                            await (restoredClient as any).initCrypto();
                        } catch (cryptoError) {
                            console.error("ALERTA E2EE: Falha ao inicializar criptografia (Legacy) na restauração:", cryptoError);
                        }
                    }
                    */
                    // ⭐️ E2EE DESABILITADO - Requer WebAssembly
                    /*
                    try {
                        await restoredClient.initRustCrypto({
                            useIndexedDB: false
                        });
                        console.log("✅ E2EE restaurado");
                        console.error("❌ Falha ao restaurar E2EE:", cryptoError);
                    }
                    */

                    // Inicia o cliente restaurado com tracking de presença
                    restoredClient.startClient({
                        syncIntervalMs: 2000,
                        lazyLoadMembers: false,
                    } as any);

                    // Define presença como online
                    try {
                        await restoredClient.setPresence({ presence: 'online' as any });
                        console.log('✅ Presença definida como online (sessão restaurada)');
                    } catch (e) {
                        console.warn('⚠️ Erro ao definir presença:', e);
                    }

                    // Busca perfil do usuário ao restaurar sessão
                    try {
                        const profile = await restoredClient.getProfileInfo(sessionData.userId);
                        setUserAvatarUrl(profile.avatar_url || null);
                    } catch (e) {
                        console.warn("Erro ao buscar perfil na restauração:", e);
                    }

                    setClient(restoredClient);

                    // Cleanup
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
    }, [destroySession]);

    const updateUserAvatar = useCallback(async (uri: string) => {
        if (!client) return;

        try {
            // 1. Ler o arquivo e fazer upload
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

            // 2. Atualizar o perfil no servidor
            await client.setAvatarUrl(mxcUrl);

            // 3. Atualizar estado local
            setUserAvatarUrl(mxcUrl);
            console.log(`Avatar atualizado com sucesso: ${mxcUrl}`);

        } catch (error) {
            console.error("Erro ao atualizar avatar:", error);
            throw error;
        }
    }, [client]);

    const updateDisplayName = useCallback(async (name: string) => {
        if (!client) return;

        try {
            await client.setDisplayName(name);
            console.log(`Display name atualizado com sucesso: ${name}`);
        } catch (error) {
            console.error("Erro ao atualizar display name:", error);
            throw error;
        }
    }, [client]);

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