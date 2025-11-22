import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { AuthenticatedImage } from '../src/components/AuthenticatedImage';
import { useAuth } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';

interface RoomMember {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    powerLevel: number;
}

export default function RoomSettingsScreen() {
    const { roomId } = useLocalSearchParams<{ roomId: string }>();
    const { client } = useAuth();
    const { theme } = useTheme();
    const router = useRouter();

    const [room, setRoom] = useState<any>(null);
    const [roomName, setRoomName] = useState('');
    const [roomAvatarUrl, setRoomAvatarUrl] = useState<string | null>(null);
    const [members, setMembers] = useState<RoomMember[]>([]);
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState('');
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [inviteUserId, setInviteUserId] = useState('');
    const [isInviting, setIsInviting] = useState(false);
    const [currentUserId, setCurrentUserId] = useState('');
    const [currentUserPowerLevel, setCurrentUserPowerLevel] = useState(0);
    const [canChangeAvatar, setCanChangeAvatar] = useState(false);
    const [canChangeName, setCanChangeName] = useState(false);
    const [canInvite, setCanInvite] = useState(false);
    const [showInviteSheet, setShowInviteSheet] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [recentUsers, setRecentUsers] = useState<string[]>([]);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (!client || !roomId) return;

        const matrixRoom = client.getRoom(roomId);
        if (!matrixRoom) return;

        setRoom(matrixRoom);
        setRoomName(matrixRoom.name || 'Sala sem nome');
        const userId = client.getUserId() || '';
        setCurrentUserId(userId);

        // Get room avatar
        const avatarEvent = matrixRoom.currentState.getStateEvents('m.room.avatar', '');
        if (avatarEvent) {
            setRoomAvatarUrl(avatarEvent.getContent().url || null);
        }

        // Get power levels
        const powerLevelEvent = matrixRoom.currentState.getStateEvents('m.room.power_levels', '');
        const powerLevelContent = powerLevelEvent?.getContent() || {};
        const users = powerLevelContent.users || {};
        const userPowerLevel = users[userId] || 0;
        setCurrentUserPowerLevel(userPowerLevel);

        // Check permissions
        const eventsDefault = powerLevelContent.events_default || 0;
        const stateDefault = powerLevelContent.state_default || 50;
        const inviteLevel = powerLevelContent.invite || 50;

        const avatarLevel = powerLevelContent.events?.['m.room.avatar'] ?? stateDefault;
        const nameLevel = powerLevelContent.events?.['m.room.name'] ?? stateDefault;

        setCanChangeAvatar(userPowerLevel >= avatarLevel);
        setCanChangeName(userPowerLevel >= nameLevel);
        setCanInvite(userPowerLevel >= inviteLevel);

        // Get members
        loadMembers(matrixRoom);

        // Load recent users from DMs
        loadRecentUsers();
    }, [client, roomId]);

    const loadMembers = (matrixRoom: any) => {
        const memberEvents = matrixRoom.currentState.getStateEvents('m.room.member');
        const membersList: RoomMember[] = [];

        memberEvents.forEach((event: any) => {
            const content = event.getContent();
            if (content.membership === 'join') {
                const userId = event.getStateKey();
                const member = matrixRoom.getMember(userId);
                const powerLevelEvent = matrixRoom.currentState.getStateEvents('m.room.power_levels', '');
                const powerLevels = powerLevelEvent?.getContent()?.users || {};
                const powerLevel = powerLevels[userId] || 0;

                // Get MXC URL from member content
                const avatarUrl = content.avatar_url || null;

                membersList.push({
                    userId,
                    displayName: member?.name || userId,
                    avatarUrl,
                    powerLevel
                });

                if (userId === currentUserId) {
                    setCurrentUserPowerLevel(powerLevel);
                }
            }
        });

        setMembers(membersList);
    };

    const loadRecentUsers = () => {
        if (!client) return;

        const rooms = client.getRooms();
        const dmUsers: string[] = [];

        rooms.forEach((room) => {
            // Check if it's a DM (2 members only)
            const joinedMembers = room.getJoinedMembers();
            if (joinedMembers.length === 2) {
                const otherMember = joinedMembers.find(m => m.userId !== currentUserId);
                if (otherMember && !dmUsers.includes(otherMember.userId)) {
                    dmUsers.push(otherMember.userId);
                }
            }
        });

        // Get last 5 recent users
        setRecentUsers(dmUsers.slice(0, 5));
    };

    const searchUsers = async (query: string) => {
        if (!client || query.trim().length < 3) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const response = await client.searchUserDirectory({
                term: query,
                limit: 10,
            });

            setSearchResults(response.results || []);
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    // Debounce search
    React.useEffect(() => {
        const timer = setTimeout(() => {
            searchUsers(searchQuery);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0].uri) {
                setIsUploadingAvatar(true);
                try {
                    const response = await fetch(result.assets[0].uri);
                    const blob = await response.blob();

                    const uploadResponse = await client!.uploadContent(blob, {
                        type: blob.type || 'image/jpeg',
                        name: 'room-avatar.jpg',
                    });

                    const mxcUrl = uploadResponse.content_uri;
                    await client!.sendStateEvent(roomId, 'm.room.avatar' as any, { url: mxcUrl }, '');

                    setRoomAvatarUrl(mxcUrl);
                    Alert.alert('Sucesso', 'Avatar da sala atualizado!');
                } catch (error) {
                    console.error('Erro ao atualizar avatar:', error);
                    Alert.alert('Erro', 'Falha ao atualizar avatar da sala.');
                } finally {
                    setIsUploadingAvatar(false);
                }
            }
        } catch (error) {
            console.error('Erro ao selecionar imagem:', error);
            Alert.alert('Erro', 'Não foi possível abrir a galeria.');
        }
    };

    const handleUpdateName = async () => {
        if (!newName.trim()) {
            Alert.alert('Erro', 'O nome não pode estar vazio.');
            return;
        }

        try {
            await client!.setRoomName(roomId, newName);
            setRoomName(newName);
            setIsEditingName(false);
            Alert.alert('Sucesso', 'Nome da sala atualizado!');
        } catch (error) {
            console.error('Erro ao atualizar nome:', error);
            Alert.alert('Erro', 'Falha ao atualizar nome da sala.');
        }
    };

    const handleInvite = async (userId: string, displayName?: string) => {
        if (!userId.trim()) {
            Alert.alert('Erro', 'Digite o ID do usuário.');
            return;
        }

        // Show confirmation dialog
        Alert.alert(
            'Convidar Membro',
            `Tem certeza que deseja convidar ${displayName || userId} para esta sala?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Convidar',
                    onPress: async () => {
                        setIsInviting(true);
                        try {
                            await client!.invite(roomId, userId);
                            setShowInviteSheet(false);
                            setSearchQuery('');
                            setSearchResults([]);
                            Alert.alert('Sucesso', `Convite enviado para ${displayName || userId}`);
                        } catch (error: any) {
                            console.error('Erro ao convidar:', error);
                            Alert.alert('Erro', error.message || 'Falha ao enviar convite.');
                        } finally {
                            setIsInviting(false);
                        }
                    },
                },
            ]
        );
    };

    const handleKickMember = (member: RoomMember) => {
        if (member.userId === currentUserId) {
            Alert.alert('Erro', 'Você não pode remover a si mesmo.');
            return;
        }

        Alert.alert(
            'Remover Membro',
            `Tem certeza que deseja remover ${member.displayName}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Remover',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await client!.kick(roomId, member.userId, 'Removido da sala');
                            loadMembers(room);
                            Alert.alert('Sucesso', 'Membro removido da sala.');
                        } catch (error: any) {
                            console.error('Erro ao remover membro:', error);
                            Alert.alert('Erro', error.message || 'Falha ao remover membro.');
                        }
                    },
                },
            ]
        );
    };

    const renderMember = ({ item }: { item: RoomMember }) => (
        <View style={[styles.memberItem, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <View style={styles.memberInfo}>
                {item.avatarUrl ? (
                    <AuthenticatedImage
                        mxcUrl={item.avatarUrl}
                        style={styles.memberAvatar}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.memberAvatar, styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                        <Text style={styles.avatarText}>{item.displayName.charAt(0).toUpperCase()}</Text>
                    </View>
                )}
                <View style={styles.memberDetails}>
                    <Text style={[styles.memberName, { color: theme.text }]}>{item.displayName}</Text>
                    <Text style={[styles.memberId, { color: theme.textSecondary }]}>{item.userId}</Text>
                </View>
            </View>
            {item.userId !== currentUserId && currentUserPowerLevel >= 50 && (
                <TouchableOpacity
                    onPress={() => handleKickMember(item)}
                    style={[styles.kickButton, { backgroundColor: theme.error }]}
                >
                    <Ionicons name="person-remove" size={18} color="#fff" />
                </TouchableOpacity>
            )}
        </View>
    );

    if (!room) {
        return (
            <View style={[styles.centered, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
            <Stack.Screen
                options={{
                    title: 'Configurações da Sala',
                    headerStyle: { backgroundColor: theme.surface },
                    headerTintColor: theme.text,
                    headerShadowVisible: false,
                }}
            />
            <ScrollView style={styles.container}>
                {/* Avatar Section */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatarContainer}>
                        {roomAvatarUrl ? (
                            <AuthenticatedImage
                                mxcUrl={roomAvatarUrl}
                                style={styles.roomAvatar}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={[styles.roomAvatar, styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                                <Text style={styles.roomAvatarText}>{roomName.charAt(0).toUpperCase()}</Text>
                            </View>
                        )}
                        {canChangeAvatar && (
                            <TouchableOpacity
                                style={[styles.editAvatarButton, { backgroundColor: theme.primary, borderColor: theme.background }]}
                                onPress={pickImage}
                                disabled={isUploadingAvatar}
                            >
                                {isUploadingAvatar ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Ionicons name="camera" size={24} color="#fff" />
                                )}
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Room Name */}
                    <View style={styles.nameContainer}>
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
                            <View style={styles.nameDisplay}>
                                <Text style={[styles.roomName, { color: theme.text }]}>{roomName}</Text>
                                {canChangeName && (
                                    <TouchableOpacity
                                        onPress={() => {
                                            setNewName(roomName);
                                            setIsEditingName(true);
                                        }}
                                        style={[styles.editNameButton, { backgroundColor: theme.surfaceVariant }]}
                                    >
                                        <Ionicons name="pencil" size={16} color={theme.primary} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                </View>

                {/* Invite Section */}
                {canInvite && (
                    <TouchableOpacity
                        style={[styles.inviteButton, { backgroundColor: theme.primary }]}
                        onPress={() => setShowInviteSheet(true)}
                    >
                        <Ionicons name="person-add" size={20} color="#fff" />
                        <Text style={styles.inviteButtonText}>Convidar Membro</Text>
                    </TouchableOpacity>
                )}

                {/* Members Section */}
                <View style={[styles.section, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                        Membros ({members.length})
                    </Text>
                    <FlatList
                        data={members}
                        renderItem={renderMember}
                        keyExtractor={(item) => item.userId}
                        scrollEnabled={false}
                    />
                </View>
            </ScrollView>

            {/* Invite Bottom Sheet */}
            <Modal
                visible={showInviteSheet}
                transparent
                animationType="slide"
                onRequestClose={() => setShowInviteSheet(false)}
            >
                <TouchableOpacity
                    style={styles.sheetOverlay}
                    activeOpacity={1}
                    onPress={() => setShowInviteSheet(false)}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                        style={[styles.sheetContainer, { backgroundColor: theme.surface }]}
                    >
                        <View style={[styles.sheetHeader, { borderBottomColor: theme.border }]}>
                            <Text style={[styles.sheetTitle, { color: theme.text }]}>Convidar Membro</Text>
                            <TouchableOpacity onPress={() => setShowInviteSheet(false)}>
                                <Ionicons name="close" size={24} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.sheetContent}>
                            {/* Search Input */}
                            <View style={[styles.searchContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
                                <Ionicons name="search" size={20} color={theme.textSecondary} />
                                <TextInput
                                    style={[styles.searchInput, { color: theme.text }]}
                                    placeholder="Buscar usuários..."
                                    placeholderTextColor={theme.textTertiary}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    autoCapitalize="none"
                                    autoFocus
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => {
                                        setSearchQuery('');
                                        setSearchResults([]);
                                    }}>
                                        <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Loading Indicator */}
                            {isSearching && (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="small" color={theme.primary} />
                                    <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Buscando...</Text>
                                </View>
                            )}

                            {/* Search Results */}
                            {!isSearching && searchQuery.trim().length >= 3 && searchResults.length > 0 && (
                                <>
                                    <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                                        Resultados ({searchResults.length})
                                    </Text>
                                    {searchResults.map((user) => (
                                        <TouchableOpacity
                                            key={user.user_id}
                                            style={[styles.userItem, { backgroundColor: theme.background }]}
                                            onPress={() => handleInvite(user.user_id, user.display_name)}
                                            disabled={isInviting}
                                        >
                                            {user.avatar_url ? (
                                                <AuthenticatedImage
                                                    mxcUrl={user.avatar_url}
                                                    style={styles.userAvatar}
                                                    resizeMode="cover"
                                                />
                                            ) : (
                                                <View style={[styles.userAvatar, { backgroundColor: theme.primary }]}>
                                                    <Text style={styles.userAvatarText}>
                                                        {(user.display_name || user.user_id).charAt(0).toUpperCase()}
                                                    </Text>
                                                </View>
                                            )}
                                            <View style={styles.userInfo}>
                                                <Text style={[styles.userName, { color: theme.text }]}>
                                                    {user.display_name || user.user_id}
                                                </Text>
                                                {user.display_name && (
                                                    <Text style={[styles.userIdText, { color: theme.textSecondary }]}>
                                                        {user.user_id}
                                                    </Text>
                                                )}
                                            </View>
                                            <Ionicons name="person-add" size={20} color={theme.primary} />
                                        </TouchableOpacity>
                                    ))}
                                </>
                            )}

                            {/* No Results */}
                            {!isSearching && searchQuery.trim().length >= 3 && searchResults.length === 0 && (
                                <View style={styles.emptyState}>
                                    <Ionicons name="search-outline" size={48} color={theme.textTertiary} />
                                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                        Nenhum usuário encontrado
                                    </Text>
                                </View>
                            )}

                            {/* Recent Users */}
                            {searchQuery.trim().length < 3 && recentUsers.length > 0 && (
                                <>
                                    <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Recentes</Text>
                                    {recentUsers.map((userId) => (
                                        <TouchableOpacity
                                            key={userId}
                                            style={[styles.userItem, { backgroundColor: theme.background }]}
                                            onPress={() => handleInvite(userId)}
                                            disabled={isInviting}
                                        >
                                            <View style={[styles.userAvatar, { backgroundColor: theme.primary }]}>
                                                <Text style={styles.userAvatarText}>{userId.charAt(1).toUpperCase()}</Text>
                                            </View>
                                            <View style={styles.userInfo}>
                                                <Text style={[styles.userName, { color: theme.text }]}>{userId}</Text>
                                            </View>
                                            <Ionicons name="person-add" size={20} color={theme.textSecondary} />
                                        </TouchableOpacity>
                                    ))}
                                </>
                            )}

                            {/* Empty State - No Search */}
                            {searchQuery.trim().length < 3 && recentUsers.length === 0 && (
                                <View style={styles.emptyState}>
                                    <Ionicons name="people-outline" size={48} color={theme.textTertiary} />
                                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                        Digite pelo menos 3 caracteres para buscar usuários
                                    </Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 20,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 20,
    },
    roomAvatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    avatarPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    roomAvatarText: {
        color: '#fff',
        fontSize: 48,
        fontWeight: 'bold',
    },
    editAvatarButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
    },
    nameContainer: {
        alignItems: 'center',
    },
    nameDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    roomName: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    editNameButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    editNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    nameInput: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        fontSize: 20,
        minWidth: 200,
    },
    editNameActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    section: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    inviteContainer: {
        flexDirection: 'row',
        gap: 10,
    },
    inviteInput: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    inviteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        marginBottom: 20,
    },
    inviteButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
    },
    memberInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    memberAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
    },
    avatarText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    memberDetails: {
        flex: 1,
    },
    memberName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    memberId: {
        fontSize: 14,
    },
    kickButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    sheetContainer: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    sheetContent: {
        padding: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 16,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
        marginTop: 8,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    userAvatarText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '500',
    },
    userAction: {
        fontSize: 14,
        marginTop: 2,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 14,
        marginTop: 12,
        textAlign: 'center',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        gap: 10,
    },
    loadingText: {
        fontSize: 14,
    },
    userIdText: {
        fontSize: 14,
        marginTop: 2,
    },
});
