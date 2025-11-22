// src/types/auth.ts

import { MatrixClient } from "matrix-js-sdk"; // A classe MatrixClient é geralmente estável aqui

export interface SessionData {
    homeserverUrl: string;
    userId: string;
    accessToken: string;
    deviceId: string;
}

export interface AuthContextType {
    // A instância reativa do cliente Matrix
    client: MatrixClient | undefined;
    // Estado de carregamento inicial (verificando sessão no storage)
    isLoading: boolean;
    // Se isLoading for false, isLoggedIn determina se há um cliente ativo.
    isLoggedIn: boolean;
    // Função de login
    login: (homeserver: string, username: string, password: string) => Promise<void>;
    // Função de logout
    logout: () => Promise<void>;
    // URL do avatar do usuário logado
    userAvatarUrl: string | null;
    // Função para atualizar o avatar do usuário
    updateUserAvatar: (uri: string) => Promise<void>;
    // Função para atualizar o nome de exibição do usuário
    updateDisplayName: (name: string) => Promise<void>;
}