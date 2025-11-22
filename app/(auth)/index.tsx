// app/(auth)/index.tsx

import { useAuth } from '@src/contexts/AuthContext';
import { useTheme } from '@src/contexts/ThemeContext';
import { Stack, useRouter } from 'expo-router'; // Importe o router do Expo
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Button, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
// Certifique-se de que o caminho para useAuth está correto!

export default function LoginScreen() {
    const { login } = useAuth();
    const { theme } = useTheme();
    const router = useRouter(); // Inicializa o router

    const [homeserver, setHomeserver] = useState('https://matrix.org');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!homeserver || !username || !password) {
            Alert.alert('Erro', 'Preencha todos os campos.');
            return;
        }

        setLoading(true);
        try {
            await login(homeserver, username, password);

            // ⭐️ AÇÃO CHAVE: Redirecionar para o grupo de tabs após o login
            // O replace garante que a tela de login não fique na pilha de navegação.
            router.replace('/(tabs)');

        } catch (error: any) {
            console.error('Falha no Login:', error);
            const errorMsg = error.data?.errcode || 'Erro de conexão ou credenciais inválidas.';
            Alert.alert('Falha no Login', errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView
                contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={[styles.title, { color: theme.text }]}>Bem-vindo ao Elementar</Text>

                <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                    placeholder="URL do Home Server"
                    placeholderTextColor={theme.textTertiary}
                    value={homeserver}
                    onChangeText={setHomeserver}
                    autoCapitalize="none"
                />

                <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                    placeholder="Nome de Usuário"
                    placeholderTextColor={theme.textTertiary}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                />

                <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                    placeholder="Senha"
                    placeholderTextColor={theme.textTertiary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                {loading ? (
                    <ActivityIndicator size="large" color={theme.primary} />
                ) : (
                    <Button title="Entrar" onPress={handleLogin} color={theme.primary} />
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, justifyContent: 'center', padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 30, textAlign: 'center' },
    input: { height: 50, borderWidth: 1, marginBottom: 15, paddingHorizontal: 10, borderRadius: 5 },
});