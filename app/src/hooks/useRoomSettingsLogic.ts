import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { RoomMember } from '../types/chat';

interface UseRoomSettingsLogicProps {
    roomId: string;
}

export const useRoomSettingsLogic = ({ roomId }: UseRoomSettingsLogicProps) => {
    const { client } = useAuth();
    const router = useRouter();

    const [room, setRoom] = useState<any>(null);
    const [roomName, setRoomName] = useState('');
    const [roomAvatarUrl, setRoomAvatarUrl] = useState<string | null>(null);
    const [members, setMembers] = useState<RoomMember[]>([]);
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState('');
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
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
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    // Topic/Description
    const [roomTopic, setRoomTopic] = useState('');
    const [isEditingTopic, setIsEditingTopic] = useState(false);
    const [newTopic, setNewTopic] = useState('');
    const [canChangeTopic, setCanChangeTopic] = useState(false);

    // Room Visibility
    const [isPublic, setIsPublic] = useState(false);
    const [canChangeVisibility, setCanChangeVisibility] = useState(false);

    // History Visibility
    const [historyVisibleToNewMembers, setHistoryVisibleToNewMembers] = useState(true);
    const [canChangeHistoryVisibility, setCanChangeHistoryVisibility] = useState(false);

    // Member List Collapse
    const [isMemberListExpanded, setIsMemberListExpanded] = useState(false);

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
        const topicLevel = powerLevelContent.events?.['m.room.topic'] ?? stateDefault;
        const joinRulesLevel = powerLevelContent.events?.['m.room.join_rules'] ?? stateDefault;
        const historyVisibilityLevel = powerLevelContent.events?.['m.room.history_visibility'] ?? stateDefault;

        setCanChangeAvatar(userPowerLevel >= avatarLevel);
        setCanChangeName(userPowerLevel >= nameLevel);
        setCanInvite(userPowerLevel >= inviteLevel);
        setCanChangeTopic(userPowerLevel >= topicLevel);
        setCanChangeVisibility(userPowerLevel >= joinRulesLevel);
        setCanChangeHistoryVisibility(userPowerLevel >= historyVisibilityLevel);

        // Get room topic
        const topicEvent = matrixRoom.currentState.getStateEvents('m.room.topic', '');
        setRoomTopic(topicEvent?.getContent()?.topic || '');

        // Get room visibility (join_rules)
        const joinRulesEvent = matrixRoom.currentState.getStateEvents('m.room.join_rules', '');
        const joinRule = joinRulesEvent?.getContent()?.join_rule || 'invite';
        setIsPublic(joinRule === 'public');

        // Get history visibility
        const historyVisibilityEvent = matrixRoom.currentState.getStateEvents('m.room.history_visibility', '');
        const historyVisibility = historyVisibilityEvent?.getContent()?.history_visibility || 'shared';
        setHistoryVisibleToNewMembers(historyVisibility === 'shared' || historyVisibility === 'world_readable');

        // Get members
        loadMembers(matrixRoom);

        // Load recent users from DMs
        loadRecentUsers();
    }, [client, roomId]);

    // Event listeners for real-time updates
    useEffect(() => {
        if (!room) return;

        const handleStateEvents = (event: any) => {
            const eventType = event.getType();

            if (eventType === 'm.room.avatar') {
                const newAvatarUrl = event.getContent().url || null;
                setRoomAvatarUrl(newAvatarUrl);
                console.log('Room avatar updated:', newAvatarUrl);
            } else if (eventType === 'm.room.name') {
                const newName = event.getContent().name || 'Sala sem nome';
                setRoomName(newName);
                console.log('Room name updated:', newName);
            } else if (eventType === 'm.room.topic') {
                const newTopic = event.getContent().topic || '';
                setRoomTopic(newTopic);
                console.log('Room topic updated:', newTopic);
            } else if (eventType === 'm.room.join_rules') {
                const joinRule = event.getContent().join_rule || 'invite';
                setIsPublic(joinRule === 'public');
                console.log('Room visibility updated:', joinRule);
            } else if (eventType === 'm.room.history_visibility') {
                const historyVisibility = event.getContent().history_visibility || 'shared';
                setHistoryVisibleToNewMembers(historyVisibility === 'shared' || historyVisibility === 'world_readable');
                console.log('History visibility updated:', historyVisibility);
            }
        };

        const handleMembershipChange = () => {
            console.log('Member list changed, reloading...');
            loadMembers(room);
        };

        room.on('RoomState.events' as any, handleStateEvents);
        room.on('RoomMember.membership' as any, handleMembershipChange);

        return () => {
            room.removeListener('RoomState.events' as any, handleStateEvents);
            room.removeListener('RoomMember.membership' as any, handleMembershipChange);
        };
    }, [room]);

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
    useEffect(() => {
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

    const handleUpdateTopic = async () => {
        try {
            await client!.sendStateEvent(roomId, 'm.room.topic' as any, { topic: newTopic }, '');
            setRoomTopic(newTopic);
            setIsEditingTopic(false);
            Alert.alert('Sucesso', 'Descrição da sala atualizada!');
        } catch (error) {
            console.error('Erro ao atualizar descrição:', error);
            Alert.alert('Erro', 'Falha ao atualizar descrição da sala.');
        }
    };

    const handleToggleRoomVisibility = async () => {
        try {
            const newJoinRule = isPublic ? 'invite' : 'public';
            await client!.sendStateEvent(roomId, 'm.room.join_rules' as any, { join_rule: newJoinRule }, '');
            setIsPublic(!isPublic);
            Alert.alert('Sucesso', `Sala agora é ${!isPublic ? 'pública' : 'privada'}!`);
        } catch (error) {
            console.error('Erro ao alterar visibilidade:', error);
            Alert.alert('Erro', 'Falha ao alterar visibilidade da sala.');
        }
    };

    const handleToggleHistoryVisibility = async () => {
        try {
            const newVisibility = historyVisibleToNewMembers ? 'invited' : 'shared';
            await client!.sendStateEvent(roomId, 'm.room.history_visibility' as any, { history_visibility: newVisibility }, '');
            setHistoryVisibleToNewMembers(!historyVisibleToNewMembers);
            Alert.alert('Sucesso', `Histórico ${!historyVisibleToNewMembers ? 'visível' : 'oculto'} para novos membros!`);
        } catch (error) {
            console.error('Erro ao alterar visibilidade do histórico:', error);
            Alert.alert('Erro', 'Falha ao alterar visibilidade do histórico.');
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

    const handleDeleteRoom = () => {
        Alert.alert(
            'Apagar Sala',
            `Tem certeza que deseja apagar "${roomName}"? Esta ação não pode ser desfeita. Todos os membros serão removidos.`,
            [
                {
                    text: 'Cancelar',
                    style: 'cancel'
                },
                {
                    text: 'Apagar',
                    style: 'destructive',
                    onPress: async () => {
                        if (!client || !roomId) return;

                        setIsDeleting(true);
                        try {
                            // 1. Kick all members except yourself (if you're admin)
                            const membersToKick = members.filter(m => m.userId !== currentUserId);

                            for (const member of membersToKick) {
                                try {
                                    await client.kick(roomId, member.userId, 'Sala apagada pelo administrador');
                                    console.log(`Kicked ${member.userId}`);
                                } catch (error) {
                                    console.error(`Failed to kick ${member.userId}:`, error);
                                    // Continue even if kicking fails
                                }
                            }

                            // 2. Leave the room
                            await client.leave(roomId);

                            // 3. Forget the room (removes from your list)
                            await client.forget(roomId);

                            Alert.alert('Sucesso', 'Sala apagada com sucesso! Todos os membros foram removidos.');
                            router.replace('/');
                        } catch (error: any) {
                            console.error('Error deleting room:', error);
                            Alert.alert('Erro', `Falha ao apagar a sala: ${error.message || 'Erro desconhecido'}`);
                        } finally {
                            setIsDeleting(false);
                        }
                    }
                }
            ]
        );
    };

    const handleLeaveRoom = () => {
        Alert.alert(
            'Sair da Sala',
            `Tem certeza que deseja sair de "${roomName}"?`,
            [
                {
                    text: 'Cancelar',
                    style: 'cancel'
                },
                {
                    text: 'Sair',
                    style: 'destructive',
                    onPress: async () => {
                        if (!client || !roomId) return;

                        setIsLeaving(true);
                        try {
                            await client.leave(roomId);
                            await client.forget(roomId);

                            Alert.alert('Sucesso', 'Você saiu da sala.');
                            router.replace('/');
                        } catch (error: any) {
                            console.error('Error leaving room:', error);
                            Alert.alert('Erro', `Falha ao sair da sala: ${error.message || 'Erro desconhecido'}`);
                        } finally {
                            setIsLeaving(false);
                        }
                    }
                }
            ]
        );
    };

    return {
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
        isSearching,
        isDeleting,
        isLeaving,
        pickImage,
        handleUpdateName,
        handleInvite,
        handleKickMember,
        handleDeleteRoom,
        handleLeaveRoom,
        setSearchResults,
        // Topic
        roomTopic,
        isEditingTopic,
        setIsEditingTopic,
        newTopic,
        setNewTopic,
        canChangeTopic,
        handleUpdateTopic,
        // Visibility
        isPublic,
        canChangeVisibility,
        handleToggleRoomVisibility,
        // History Visibility
        historyVisibleToNewMembers,
        canChangeHistoryVisibility,
        handleToggleHistoryVisibility,
        // Member List
        isMemberListExpanded,
        setIsMemberListExpanded,
    };
};
