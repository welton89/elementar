// src/api/client.ts

// ⭐️ PASSO 1: Garantir Polyfills para o ambiente React Native
// Isso corrige o erro 'FinalizationRegistry doesn't exist'
import 'react-native-get-random-values';


import AsyncStorage from "@react-native-async-storage/async-storage";
import * as MatrixSDK from "matrix-js-sdk";

// ⭐️ PASSO 2: Injeção de Criptografia
// Usar o require simples com o nome EXATO do seu pacote.
try {
    // Substitua pelo nome exato do seu pacote se for diferente de @matrix-org/matrix-js-sdk-crypto
    require("@matrix-org/matrix-sdk-crypto-js");
    console.log("E2EE: Módulo de criptografia carregado via require.");
} catch (e) {
    console.warn("ALERTA E2EE: Falha ao carregar o módulo de criptografia. Verifique a instalação.", e);
}

// Acessando classes e funções necessárias
const {
    createClient,
    MemoryStore
} = MatrixSDK;

// -----------------------------------------------------------------------------
// 0. SOLUÇÃO DE TIPAGEM: DECLARAÇÕES LOCAIS
// -----------------------------------------------------------------------------

/**
 * Interface declarada localmente para StorageProvider (Corrigido com 'clear').
 */
interface StorageProvider {
    init(): Promise<void>;
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
}

/**
 * Interface declarada localmente para IClientOptions.
 */
interface IClientOptions {
    baseUrl: string;
    accessToken?: string;
    userId?: string;
    localStorage?: any;
    store?: any;
    cryptoStore?: any;
    useIndexedDb?: boolean;
    syncData?: {
        initialSyncLimit: number;
        [key: string]: any;
    };
    [key: string]: any;
}

// -----------------------------------------------------------------------------
// 1. ADAPTAÇÃO: CUSTOM STORAGE PROVIDER
// -----------------------------------------------------------------------------

class ReactNativeStorageProvider implements StorageProvider {
    private prefix = "@matrix_rn:";

    async init(): Promise<void> {
        return;
    }

    async getItem(key: string): Promise<string | null> {
        return AsyncStorage.getItem(this.prefix + key);
    }

    async setItem(key: string, value: string): Promise<void> {
        return AsyncStorage.setItem(this.prefix + key, value);
    }

    async removeItem(key: string): Promise<void> {
        return AsyncStorage.removeItem(this.prefix + key);
    }

    async clear(): Promise<void> {
        const keys = await AsyncStorage.getAllKeys();
        const matrixKeys = keys.filter(k => k.startsWith(this.prefix));
        return AsyncStorage.multiRemove(matrixKeys);
    }
}

// -----------------------------------------------------------------------------
// 2. GERENCIAMENTO DO CLIENTE (SINGLETON)
// -----------------------------------------------------------------------------

let clientInstance: MatrixSDK.MatrixClient | undefined;
const rnStorageProvider = new ReactNativeStorageProvider();

/**
 * Configura e retorna a instância do MatrixClient.
 */
export const getClientInstance = (
    homeserverUrl?: string,
    accessToken?: string,
    userId?: string,
    deviceId?: string,
): MatrixSDK.MatrixClient => {
    if (clientInstance) {
        return clientInstance;
    }

    if (!homeserverUrl) {
        throw new Error("URL do Home Server é obrigatória para inicializar o cliente.");
    }

    if (accessToken && !userId) {
        throw new Error("userId é obrigatório se um accessToken for fornecido.");
    }

    const clientOptions: IClientOptions = {
        baseUrl: homeserverUrl,
        accessToken: accessToken,
        userId: userId,
        deviceId: deviceId,

        localStorage: rnStorageProvider as any,
        store: new MemoryStore({ localStorage: rnStorageProvider as any }),

        useIndexedDb: false,
        syncData: {
            initialSyncLimit: 20,
        },
    };

    clientInstance = createClient(clientOptions as any);

    console.log("MatrixClient inicializado e pronto!");

    return clientInstance;
};

/**
 * Função utilitária para limpar a instância do cliente (e.g., no logout).
 */
export const clearClientInstance = async (): Promise<void> => {
    if (clientInstance) {
        await clientInstance.stopClient();
    }
    await rnStorageProvider.clear();
    clientInstance = undefined;
};