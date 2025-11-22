// src/components/RoomTagManager.tsx

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useCategories } from '../contexts/CategoriesContext';
import { useRoomList } from '../contexts/RoomListContext';
import { useTheme } from '../contexts/ThemeContext';

interface RoomTagManagerProps {
    visible: boolean;
    roomId: string | null;
    roomName: string;
    onClose: () => void;
}

export const RoomTagManager: React.FC<RoomTagManagerProps> = ({ visible, roomId, roomName, onClose }) => {
    const { theme } = useTheme();
    const { client } = useAuth();
    const router = useRouter();
    const { loadRooms } = useRoomList();
    const { categories, getRoomCategories, addRoomToCategory, removeRoomFromCategory } = useCategories();
    const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        if (roomId && visible) {
            const roomCats = getRoomCategories(roomId);
            setSelectedCategories(new Set(roomCats));
        }
    }, [roomId, visible]);

    const toggleCategory = (categoryId: string) => {
        const newSelected = new Set(selectedCategories);
        if (newSelected.has(categoryId)) {
            newSelected.delete(categoryId);
        } else {
            newSelected.add(categoryId);
        }
        setSelectedCategories(newSelected);
    };

    const handleSave = async () => {
        if (!roomId) return;

        setIsSaving(true);
        try {
            const currentCategories = new Set(getRoomCategories(roomId));

            // Adicionar novas categorias
            for (const catId of selectedCategories) {
                if (!currentCategories.has(catId)) {
                    await addRoomToCategory(roomId, catId);
                }
            }

            // Remover categorias desmarcadas
            for (const catId of currentCategories) {
                if (!selectedCategories.has(catId)) {
                    await removeRoomFromCategory(roomId, catId);
                }
            }

            Alert.alert('Sucesso', 'Categorias atualizadas!');
            onClose();
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível atualizar as categorias');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLeaveRoom = () => {
        Alert.alert(
            'Sair da Sala',
            `Tem certeza que deseja sair de "${roomName}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sair',
                    style: 'destructive',
                    onPress: async () => {
                        if (!client || !roomId) return;

                        setIsLeaving(true);
                        try {
                            await client.leave(roomId);

                            // Tentar esquecer a sala (remove do histórico)
                            try {
                                await client.forget(roomId);
                            } catch (error) {
                                console.log('Não foi possível esquecer a sala:', error);
                            }

                            Alert.alert('Sucesso', 'Você saiu da sala');

                            // Recarregar lista de salas para remover a sala imediatamente
                            loadRooms();

                            onClose();

                            // Voltar para a lista de conversas
                            router.push('/(tabs)');
                        } catch (error) {
                            console.error('Erro ao sair da sala:', error);
                            Alert.alert('Erro', 'Não foi possível sair da sala');
                        } finally {
                            setIsLeaving(false);
                        }
                    },
                },
            ]
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
                <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.title, { color: theme.text }]}>Categorias</Text>
                            <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                                {roomName}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={28} color={theme.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollView}>
                        {categories.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="folder-outline" size={48} color={theme.textTertiary} />
                                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                    Nenhuma categoria criada
                                </Text>
                                <Text style={[styles.emptyHint, { color: theme.textTertiary }]}>
                                    Crie categorias para organizar suas salas
                                </Text>
                            </View>
                        ) : (
                            categories.map(category => {
                                const isSelected = selectedCategories.has(category.id);
                                return (
                                    <TouchableOpacity
                                        key={category.id}
                                        style={[
                                            styles.categoryItem,
                                            { backgroundColor: theme.background, borderColor: theme.border },
                                            isSelected && { borderColor: category.color, borderWidth: 2 },
                                        ]}
                                        onPress={() => toggleCategory(category.id)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.categoryColor, { backgroundColor: category.color }]} />
                                        <Text style={[styles.categoryName, { color: theme.text }]}>{category.name}</Text>
                                        <View style={[
                                            styles.checkbox,
                                            { borderColor: isSelected ? category.color : theme.border },
                                            isSelected && { backgroundColor: category.color },
                                        ]}>
                                            {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </ScrollView>

                    {categories.length > 0 && (
                        <View style={[styles.footer, { borderTopColor: theme.border }]}>
                            <TouchableOpacity
                                style={[styles.saveButton, { backgroundColor: theme.primary }]}
                                onPress={handleSave}
                                disabled={isSaving}
                            >
                                <Text style={styles.saveButtonText}>
                                    {isSaving ? 'Salvando...' : 'Salvar'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.leaveButton, { borderColor: theme.error }]}
                                onPress={handleLeaveRoom}
                                disabled={isLeaving}
                            >
                                <Ionicons name="exit-outline" size={18} color={theme.error} />
                                <Text style={[styles.leaveButtonText, { color: theme.error }]}>
                                    {isLeaving ? 'Saindo...' : 'Sair da Sala'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 14,
        marginTop: 4,
    },
    scrollView: {
        padding: 16,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 8,
        gap: 12,
    },
    categoryColor: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    categoryName: {
        flex: 1,
        fontSize: 16,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 4,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 12,
    },
    emptyHint: {
        fontSize: 14,
        marginTop: 4,
        textAlign: 'center',
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
    },
    saveButton: {
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 8,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    leaveButton: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        gap: 8,
    },
    leaveButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
