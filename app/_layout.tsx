
// app/_layout.tsx (CÓDIGO CORRIGIDO E FINAL)

import { AuthProvider, useAuth } from '@src/contexts/AuthContext';
import { ThemeProvider } from '@src/contexts/ThemeContext';
import { Stack, useRouter, useSegments } from 'expo-router'; // Importe useSegments e useRouter
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

// Polyfill para Promise.withResolvers (ES2024 - não disponível no Hermes)
if (typeof Promise.withResolvers === 'undefined') {
    Promise.withResolvers = function <T>() {
        let resolve!: (value: T | PromiseLike<T>) => void;
        let reject!: (reason?: any) => void;
        const promise = new Promise<T>((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return { promise, resolve, reject };
    };
}

// Polyfills básicos para Matrix SDK
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-polyfill-globals/src/crypto';
import 'react-native-polyfill-globals/src/encoding';
import 'react-native-polyfill-globals/src/readable-stream';

// ----------------------------------------------------------------------
// FUNÇÃO CENTRAL DE REDIRECIONAMENTO
// ----------------------------------------------------------------------

const RootNavigator = () => {
    const { isLoggedIn, isLoading } = useAuth();
    const segments = useSegments(); // Obtém os segmentos da URL atual
    const router = useRouter();     // Hook para navegação programática

    // Este useEffect gerencia o redirecionamento
    useEffect(() => {
        if (isLoading) return; // Não faz nada enquanto carrega

        const inAuthGroup = segments[0] === '(auth)';

        // Se estiver logado E estiver no grupo de autenticação, redireciona para (tabs)
        if (isLoggedIn && inAuthGroup) {
            router.replace('/(tabs)');
        }

        // Se NÃO estiver logado E NÃO estiver no grupo de autenticação, redireciona para (auth)
        else if (!isLoggedIn && !inAuthGroup) {
            router.replace('/(auth)');
        }
    }, [isLoggedIn, isLoading, segments, router]); // Dependências do useEffect

    // Mostra tela de carregamento enquanto verifica a sessão
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007bff" />
                <Text style={{ marginTop: 10 }}>Carregando sessão...</Text>
            </View>
        );
    }

    // ----------------------------------------------------------------------
    // 2. DECLARAÇÃO EXPLÍCITA DE AMBOS OS GRUPOS (Para o Expo Router)
    // ----------------------------------------------------------------------
    return (
        <Stack>
            {/* O headerShown: false é para que o _layout.tsx do grupo (tabs) ou (auth)
                possa controlar o cabeçalho, se existir. */}
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack>
    );
};

// ... (Resto do RootLayout e styles permanecem inalterados) ...


// ... imports

console.log('🚀 [DEBUG] App initialization started - _layout.tsx loaded');

const RootLayout: React.FC = () => {
    console.log('🚀 [DEBUG] RootLayout component rendering');

    useEffect(() => {
        console.log('🚀 [DEBUG] RootLayout mounted');
    }, []);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
                <ThemeProvider>
                    {/* <AuthProviderNative> */}
                    {/* MatrixRustProvider disabled - requires full migration from matrix-js-sdk */}
                    {/* See /e2ee-test route for standalone E2EE test */}
                    {/* <MatrixRustProvider> */}
                    <RootNavigator />
                    {/* </MatrixRustProvider> */}
                    {/* </AuthProviderNative> */}
                </ThemeProvider>
            </AuthProvider>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default RootLayout;