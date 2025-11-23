import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
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
import { MemberItem } from '../src/components/MemberItem';
import { useTheme } from '../src/contexts/ThemeContext';
import { useRoomSettingsLogic } from '../src/hooks/useRoomSettingsLogic';
import { RoomMember } from '../src/types/chat';

export default function RoomSettingsScreen() {
    const { roomId } = useLocalSearchParams<{ roomId: string }>();
    const { theme } = useTheme();

    const {
        room,
        roomName,
        roomAvatarUrl,
        members,
        isEditingName,
        setIsEditingName,
        newName,
        setNewName,
        isUploadingAvatar,
        isInviting,
        currentUserId,
        currentUserPowerLevel,
        canChangeAvatar,
        canChangeName,
        canInvite,
        showInviteSheet,
        setShowInviteSheet,
        searchQuery,
        setSearchQuery,
        recentUsers,
        searchResults,
        setSearchResults,
        isSearching,
        isDeleting,
        isLeaving,
        pickImage,
        handleUpdateName,
        handleInvite,
        handleKickMember,
        handleDeleteRoom,
        handleLeaveRoom,
    } = useRoomSettingsLogic({ roomId });

    const renderMember = ({ item }: { item: RoomMember }) => (
        <MemberItem
            item={item}
            currentUserId={currentUserId}
            currentUserPowerLevel={currentUserPowerLevel}
            onKick={handleKickMember}
            theme={theme}
        />
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

                {/* Danger Zone - Only for Admins */}
                {currentUserPowerLevel >= 100 && (
                    <View style={[styles.section, styles.dangerSection]}>
                        <Text style={[styles.sectionTitle, { color: '#ff3b30' }]}>Zona de Perigo</Text>

                        <TouchableOpacity
                            style={[styles.deleteButton, { opacity: isDeleting ? 0.5 : 1 }]}
                            onPress={handleDeleteRoom}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="trash-outline" size={20} color="#fff" />
                                    <Text style={styles.deleteButtonText}>Apagar Sala</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <Text style={[styles.warningText, { color: theme.textSecondary }]}>
                            Esta ação não pode ser desfeita. Você sairá da sala e ela será removida da sua lista.
                        </Text>
                    </View>
                )}

                {/* Leave Room - For Non-Admins */}
                {currentUserPowerLevel < 100 && (
                    <View style={[styles.section, styles.leaveSection]}>
                        <Text style={[styles.sectionTitle, { color: '#ff9500' }]}>Sair da Sala</Text>

                        <TouchableOpacity
                            style={[styles.leaveButton, { opacity: isLeaving ? 0.5 : 1 }]}
                            onPress={handleLeaveRoom}
                            disabled={isLeaving}
                        >
                            {isLeaving ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="exit-outline" size={20} color="#fff" />
                                    <Text style={styles.leaveButtonText}>Sair da Sala</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <Text style={[styles.warningText, { color: theme.textSecondary }]}>
                            Você sairá da sala e ela será removida da sua lista.
                        </Text>
                    </View>
                )}
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
    actionButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    editNameActions: {
        flexDirection: 'row',
        gap: 8,
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
    inviteInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
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
    dangerSection: {
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 59, 48, 0.3)',
    },
    deleteButton: {
        backgroundColor: '#ff3b30',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 8,
        gap: 8,
        marginBottom: 12,
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    warningText: {
        fontSize: 12,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    leaveSection: {
        backgroundColor: 'rgba(255, 149, 0, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 149, 0, 0.3)',
    },
    leaveButton: {
        backgroundColor: '#ff9500',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 8,
        gap: 8,
        marginBottom: 12,
    },
    leaveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
