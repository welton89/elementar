import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Button, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AuthenticatedImage } from './src/components/AuthenticatedImage';
import { useAuth } from './src/contexts/AuthContext';
import { useTheme } from './src/contexts/ThemeContext';
import { ACCENT_COLORS, AccentColor } from './src/types/theme.types';

export default function SettingsScreen() {
    const { client, logout, userAvatarUrl, updateUserAvatar, updateDisplayName } = useAuth();
    const { theme, mode, accentColor, toggleTheme, setAccentColor } = useTheme();
    const [isUploading, setIsUploading] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState('');
    const userId = client?.getUserId();

    // Tenta obter o display name (pode não estar disponível imediatamente se não buscamos o perfil completo)
    // Mas como buscamos o perfil no AuthContext, podemos tentar pegar do usuário atual
    const user = client?.getUser(userId || '');
    const displayName = user?.displayName || userId;

    const handleUpdateName = async () => {
        if (!newName.trim()) {
            Alert.alert('Erro', 'O nome não pode estar vazio.');
            return;
        }

        try {
            await updateDisplayName(newName);
            setIsEditingName(false);
            Alert.alert('Sucesso', 'Nome atualizado!');
        } catch (error) {
            Alert.alert('Erro', 'Falha ao atualizar o nome.');
        }
    };

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0].uri) {
                setIsUploading(true);
                try {
                    await updateUserAvatar(result.assets[0].uri);
                    Alert.alert("Sucesso", "Foto de perfil atualizada!");
                } catch (error) {
                    Alert.alert("Erro", "Falha ao atualizar foto de perfil.");
                } finally {
                    setIsUploading(false);
                }
            }
        } catch (error) {
            console.error("Erro ao selecionar imagem:", error);
            Alert.alert("Erro", "Não foi possível abrir a galeria.");
        }
    };

    const accentColorNames: Record<AccentColor, string> = {
        blue: 'Azul',
        purple: 'Roxo',
        green: 'Verde',
        orange: 'Laranja',
        red: 'Vermelho',
        pink: 'Rosa',
        teal: 'Teal',
        indigo: 'Índigo',
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen
                options={{
                    title: 'Configurações',
                    headerStyle: {
                        backgroundColor: theme.surface,
                    },
                    headerTintColor: theme.text,
                    headerShadowVisible: false,
                }}
            />

            <View style={styles.profileSection}>
                <View style={styles.avatarContainer}>
                    {userAvatarUrl ? (
                        <AuthenticatedImage
                            mxcUrl={userAvatarUrl}
                            style={styles.avatar}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                            <Text style={styles.avatarText}>
                                {displayName?.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.editButton, { backgroundColor: theme.primary, borderColor: theme.background }]}
                        onPress={pickImage}
                        disabled={isUploading}
                    >
                        {isUploading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Ionicons name="camera" size={20} color="#fff" />
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.displayNameContainer}>
                    {isEditingName ? (
                        <View style={styles.editNameContainer}>
                            <TextInput
                                style={[styles.nameInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
                                value={newName}
                                onChangeText={setNewName}
                                autoFocus
                            />
                            <View style={styles.editNameActions}>
                                <TouchableOpacity onPress={handleUpdateName} style={[styles.actionButton, { backgroundColor: theme.primary }]}>
                                    <Ionicons name="checkmark" size={20} color="#fff" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setIsEditingName(false)} style={[styles.actionButton, { backgroundColor: theme.error }]}>
                                    <Ionicons name="close" size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <>
                            <Text style={[styles.displayName, { color: theme.text }]}>{displayName}</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setNewName(displayName || '');
                                    setIsEditingName(true);
                                }}
                                style={[styles.editNameButton, { backgroundColor: theme.surfaceVariant }]}
                            >
                                <Ionicons name="pencil" size={14} color={theme.primary} />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
                <Text style={[styles.userId, { color: theme.textSecondary }]}>{userId}</Text>
            </View>

            {/* Theme Controls Section */}
            <View style={[styles.section, { backgroundColor: theme.surface }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Aparência</Text>

                {/* Dark Mode Toggle */}
                <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                        <Ionicons name={mode === 'dark' ? 'moon' : 'sunny'} size={24} color={theme.primary} />
                        <Text style={[styles.settingLabel, { color: theme.text }]}>Modo Escuro</Text>
                    </View>
                    <Switch
                        value={mode === 'dark'}
                        onValueChange={toggleTheme}
                        trackColor={{ false: theme.border, true: theme.primaryLight }}
                        thumbColor={mode === 'dark' ? theme.primary : theme.surface}
                    />
                </View>

                {/* Accent Color Picker */}
                <View style={styles.colorSection}>
                    <Text style={[styles.settingLabel, { color: theme.text, marginBottom: 10 }]}>Cor de Destaque</Text>
                    <View style={styles.colorGrid}>
                        {(Object.keys(ACCENT_COLORS) as AccentColor[]).map((color) => (
                            <TouchableOpacity
                                key={color}
                                style={[
                                    styles.colorOption,
                                    { backgroundColor: ACCENT_COLORS[color].main },
                                    accentColor === color && styles.colorOptionSelected,
                                    accentColor === color && { borderColor: theme.text }
                                ]}
                                onPress={() => setAccentColor(color)}
                            >
                                {accentColor === color && (
                                    <Ionicons name="checkmark" size={24} color="#fff" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={[styles.colorName, { color: theme.textSecondary }]}>
                        {accentColorNames[accentColor]}
                    </Text>
                </View>
            </View>

            <View style={[styles.warningSection, { backgroundColor: mode === 'dark' ? '#3d2f00' : '#fff3cd', borderLeftColor: theme.warning }]}>
                <View style={styles.warningHeader}>
                    <Ionicons name="shield-checkmark" size={24} color={theme.warning} />
                    <Text style={[styles.warningTitle, { color: mode === 'dark' ? '#ffc107' : '#856404' }]}>E2EE Ativo (Modo Efêmero)</Text>
                </View>
                <Text style={[styles.warningText, { color: mode === 'dark' ? '#ffc107' : '#856404' }]}>
                    Suas mensagens são criptografadas ponta-a-ponta, mas o histórico de
                    criptografia será perdido ao reiniciar o app. Um novo dispositivo será
                    criado a cada reinício.
                </Text>
            </View>

            <View style={[styles.section, { backgroundColor: theme.surface }]}>
                <Button title="Sair (Logout)" onPress={logout} color={theme.error} />
            </View>

            <View style={styles.footer}>
                <Text style={[styles.version, { color: theme.textTertiary }]}>Versão 1.0.0</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 40,
        marginTop: 20,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 15,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    avatarPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 40,
        fontWeight: 'bold',
    },
    editButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
    },
    displayNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 5,
    },
    displayName: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    editNameButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    editNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    nameInput: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        fontSize: 18,
        minWidth: 150,
    },
    editNameActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userId: {
        fontSize: 16,
    },
    section: {
        borderRadius: 10,
        padding: 15,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
    colorSection: {
        marginTop: 10,
    },
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 10,
    },
    colorOption: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'transparent',
    },
    colorOptionSelected: {
        borderWidth: 3,
    },
    colorName: {
        fontSize: 14,
        textAlign: 'center',
    },
    footer: {
        marginTop: 20,
        marginBottom: 40,
        alignItems: 'center',
    },
    version: {
        fontSize: 12,
    },
    warningSection: {
        borderRadius: 10,
        padding: 15,
        marginBottom: 20,
        borderLeftWidth: 4,
    },
    warningHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    warningTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    warningText: {
        fontSize: 14,
        lineHeight: 20,
    },
});
