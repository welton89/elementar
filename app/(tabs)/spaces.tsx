// app/(tabs)/spaces.tsx

import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SpaceAvatar } from '../src/components/SpaceAvatar';
import { SpaceRoomList } from '../src/components/SpaceRoomList';
import { useAuth } from '../src/contexts/AuthContext';
import { useSpaces } from '../src/contexts/SpacesContext';
import { useTheme } from '../src/contexts/ThemeContext';

export default function SpacesScreen() {
    const { theme } = useTheme();
    const { client } = useAuth();
    const { spaces, selectedSpace, categories, isLoading, selectSpace, toggleCategory, refreshSpaces } = useSpaces();
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newSpaceName, setNewSpaceName] = useState('');
    const [newSpaceTopic, setNewSpaceTopic] = useState('');
    const [isSpacePublic, setIsSpacePublic] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomTopic, setNewRoomTopic] = useState('');
    const [isRoomPublic, setIsRoomPublic] = useState(false);
    const [isCreatingRoom, setIsCreatingRoom] = useState(false);

    const handleCreateSpace = async () => {
        if (!newSpaceName.trim()) {
            Alert.alert('Erro', 'Por favor, insira um nome para o espaço');
            return;
        }

        if (!client) {
            Alert.alert('Erro', 'Cliente Matrix não disponível');
            return;
        }

        setIsCreating(true);
        try {
            await client.createRoom({
                name: newSpaceName.trim(),
                topic: newSpaceTopic.trim() || undefined,
                preset: isSpacePublic ? 'public_chat' : 'private_chat' as any,
                visibility: isSpacePublic ? 'public' : 'private' as any,
                creation_content: {
                    type: 'm.space',
                },
            });

            // Limpar formulário
            setNewSpaceName('');
            setNewSpaceTopic('');
            setIsSpacePublic(false);
            setShowCreateModal(false);

            // Atualizar lista de espaços
            await refreshSpaces();

            Alert.alert('Sucesso', 'Espaço criado com sucesso!');
        } catch (error) {
            console.error('Erro ao criar espaço:', error);
            Alert.alert('Erro', 'Não foi possível criar o espaço');
        } finally {
            setIsCreating(false);
        }
    };

    const handleCreateRoom = async () => {
        if (!newRoomName.trim()) {
            Alert.alert('Erro', 'Por favor, insira um nome para a sala');
            return;
        }

        if (!client || !selectedSpace) {
            Alert.alert('Erro', 'Cliente Matrix ou espaço não disponível');
            return;
        }

        setIsCreatingRoom(true);
        try {
            // Criar a sala
            const roomResult = await client.createRoom({
                name: newRoomName.trim(),
                topic: newRoomTopic.trim() || undefined,
                preset: isRoomPublic ? 'public_chat' : 'private_chat' as any,
                visibility: isRoomPublic ? 'public' : 'private' as any,
            });

            // Adicionar a sala ao espaço
            await client.sendStateEvent(
                selectedSpace.spaceId,
                'm.space.child' as any,
                {
                    via: [client.getDomain() || 'matrix.org'],
                },
                roomResult.room_id
            );

            // Limpar formulário
            setNewRoomName('');
            setNewRoomTopic('');
            setIsRoomPublic(false);
            setShowCreateRoomModal(false);

            // Atualizar lista de salas do espaço
            await refreshSpaces();
            if (selectedSpace) {
                await selectSpace(selectedSpace.spaceId);
            }

            Alert.alert('Sucesso', 'Sala criada com sucesso!');
        } catch (error) {
            console.error('Erro ao criar sala:', error);
            Alert.alert('Erro', 'Não foi possível criar a sala');
        } finally {
            setIsCreatingRoom(false);
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.text }]}>
                    Carregando espaços...
                </Text>
            </View>
        );
    }

    if (spaces.length === 0) {
        return (
            <View style={[styles.emptyContainer, { backgroundColor: theme.background }]}>
                <Stack.Screen options={{ title: 'Espaços' }} />
                <Ionicons name="planet-outline" size={64} color={theme.textSecondary} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                    Nenhum espaço encontrado
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                    Você ainda não faz parte de nenhum espaço
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen
                options={{
                    title: 'Espaços',
                    headerStyle: {
                        backgroundColor: theme.surface,
                    },
                    headerTintColor: theme.text,
                    headerShadowVisible: false,
                }}
            />

            <View style={styles.mainContent}>
                {/* Sidebar com avatares dos espaços */}
                <View style={[styles.sidebar, { backgroundColor: theme.surface, borderRightColor: theme.border }]}>
                    <FlatList
                        data={spaces}
                        keyExtractor={(item) => item.spaceId}
                        renderItem={({ item }) => (
                            <SpaceAvatar
                                space={item}
                                isSelected={selectedSpace?.spaceId === item.spaceId}
                                onPress={() => selectSpace(item.spaceId)}
                            />
                        )}
                        showsVerticalScrollIndicator={false}
                    />
                    {/* Botão para criar novo espaço */}
                    <TouchableOpacity
                        style={[styles.createButton, { backgroundColor: theme.primary }]}
                        onPress={() => setShowCreateModal(true)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="add" size={28} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Área principal com lista de salas */}
                <View style={styles.roomsArea}>
                    {/* Header com nome do espaço e busca */}
                    <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
                        <View style={styles.spaceNameContainer}>
                            <Text style={[styles.spaceName, { color: theme.text }]} numberOfLines={1}>
                                {selectedSpace?.name || 'Selecione um espaço'}
                            </Text>
                            {selectedSpace && (
                                <TouchableOpacity
                                    style={[styles.addRoomButton, { backgroundColor: theme.primary }]}
                                    onPress={() => setShowCreateRoomModal(true)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="add" size={20} color="#fff" />
                                </TouchableOpacity>
                            )}
                        </View>
                        <View style={[styles.searchContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
                            <Ionicons name="search" size={18} color={theme.textSecondary} />
                            <TextInput
                                style={[styles.searchInput, { color: theme.text }]}
                                placeholder="Buscar"
                                placeholderTextColor={theme.textTertiary}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>
                    </View>

                    {/* Lista de salas */}
                    {selectedSpace ? (
                        <SpaceRoomList
                            categories={categories}
                            onToggleCategory={toggleCategory}
                        />
                    ) : (
                        <View style={styles.noSelectionContainer}>
                            <Text style={[styles.noSelectionText, { color: theme.textSecondary }]}>
                                Selecione um espaço para ver suas salas
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Modal para criar novo espaço */}
            <Modal
                visible={showCreateModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowCreateModal(false)}
            >
                <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
                    <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Criar Novo Espaço</Text>

                        <TextInput
                            style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                            placeholder="Nome do espaço"
                            placeholderTextColor={theme.textTertiary}
                            value={newSpaceName}
                            onChangeText={setNewSpaceName}
                            autoFocus
                        />

                        <TextInput
                            style={[styles.input, styles.textArea, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                            placeholder="Descrição (opcional)"
                            placeholderTextColor={theme.textTertiary}
                            value={newSpaceTopic}
                            onChangeText={setNewSpaceTopic}
                            multiline
                            numberOfLines={3}
                        />

                        <View style={styles.visibilityContainer}>
                            <View style={styles.visibilityInfo}>
                                <Text style={[styles.visibilityLabel, { color: theme.text }]}>
                                    {isSpacePublic ? 'Espaço Público' : 'Espaço Privado'}
                                </Text>
                                <Text style={[styles.visibilityDescription, { color: theme.textSecondary }]}>
                                    {isSpacePublic
                                        ? 'Qualquer pessoa pode encontrar e entrar'
                                        : 'Apenas pessoas convidadas podem entrar'}
                                </Text>
                            </View>
                            <Switch
                                value={isSpacePublic}
                                onValueChange={setIsSpacePublic}
                                trackColor={{ false: theme.border, true: theme.primary }}
                                thumbColor="#fff"
                            />
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: theme.surfaceVariant }]}
                                onPress={() => {
                                    setShowCreateModal(false);
                                    setNewSpaceName('');
                                    setNewSpaceTopic('');
                                }}
                                disabled={isCreating}
                            >
                                <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: theme.primary }]}
                                onPress={handleCreateSpace}
                                disabled={isCreating || !newSpaceName.trim()} // Disable if creating or name is empty
                            >
                                {isCreating ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.modalButtonTextPrimary}>Criar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal para criar nova sala no espaço */}
            <Modal
                visible={showCreateRoomModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowCreateRoomModal(false)}
            >
                <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
                    <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Criar Nova Sala</Text>
                        <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                            em {selectedSpace?.name}
                        </Text>

                        <TextInput
                            style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                            placeholder="Nome da sala"
                            placeholderTextColor={theme.textTertiary}
                            value={newRoomName}
                            onChangeText={setNewRoomName}
                            autoFocus
                        />

                        <TextInput
                            style={[styles.input, styles.textArea, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                            placeholder="Descrição (opcional)"
                            placeholderTextColor={theme.textTertiary}
                            value={newRoomTopic}
                            onChangeText={setNewRoomTopic}
                            multiline
                            numberOfLines={3}
                        />

                        <View style={styles.visibilityContainer}>
                            <View style={styles.visibilityInfo}>
                                <Text style={[styles.visibilityLabel, { color: theme.text }]}>
                                    {isRoomPublic ? 'Sala Pública' : 'Sala Privada'}
                                </Text>
                                <Text style={[styles.visibilityDescription, { color: theme.textSecondary }]}>
                                    {isRoomPublic
                                        ? 'Qualquer pessoa pode encontrar e entrar'
                                        : 'Apenas pessoas convidadas podem entrar'}
                                </Text>
                            </View>
                            <Switch
                                value={isRoomPublic}
                                onValueChange={setIsRoomPublic}
                                trackColor={{ false: theme.border, true: theme.primary }}
                                thumbColor="#fff"
                            />
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: theme.surfaceVariant }]}
                                onPress={() => {
                                    setShowCreateRoomModal(false);
                                    setNewRoomName('');
                                    setNewRoomTopic('');
                                }}
                                disabled={isCreatingRoom}
                            >
                                <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: theme.primary }]}
                                onPress={handleCreateRoom}
                                disabled={isCreatingRoom || !newRoomName.trim()}
                            >
                                {isCreatingRoom ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.modalButtonTextPrimary}>Criar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    },
    mainContent: {
        flex: 1,
        flexDirection: 'row',
    },
    sidebar: {
        width: 72,
        borderRightWidth: 1,
        paddingBottom: 80, // Espaço para o botão de criar
    },
    roomsArea: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    spaceName: {
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
    },
    spaceNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    addRoomButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
    },
    noSelectionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noSelectionText: {
        fontSize: 14,
    },
    createButton: {
        position: 'absolute',
        bottom: 16,
        left: 12,
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 12,
        padding: 24,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 14,
        marginBottom: 20,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 16,
        fontSize: 16,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalButtonPrimary: {
        // backgroundColor definido dinamicamente
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    modalButtonTextPrimary: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    visibilityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginBottom: 16,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    visibilityInfo: {
        flex: 1,
        marginRight: 12,
    },
    visibilityLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    visibilityDescription: {
        fontSize: 13,
    },
});
