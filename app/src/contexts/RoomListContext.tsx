// src/contexts/RoomListContext.tsx

import { Room } from 'matrix-js-sdk';
import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useState
} from 'react';
import { CachedRoom, cacheService } from '../services/CacheService';
import { MURAL_STATE_EVENT_TYPE, RoomListContextType, SimpleRoom } from '../types/rooms';
import { useAuth } from './AuthContext';

// -----------------------------------------------------------------------------
// 1. CONTEXTO
// -----------------------------------------------------------------------------

const RoomListContext = createContext<RoomListContextType | undefined>(undefined);

interface RoomListProviderProps {
    children: ReactNode;
}

/**
 * Mapeia o objeto Room complexo do SDK para o SimpleRoom do nosso App.
 */
const mapMatrixRoomToSimpleRoom = (room: Room, client: any): SimpleRoom => {
    const unread = room.getUnreadNotificationCount();

    // CORREÇÃO: Usa 'as any' para forçar a tipagem do string literal 'highlight'
    const highlight = room.getUnreadNotificationCount('highlight' as any) > 0;

    // Obtém URL do avatar da sala (MXC)
    const avatarEvent = room.currentState.getStateEvents('m.room.avatar', '');
    let avatarUrl = avatarEvent?.getContent()?.url;

    // Conta de membros
    const memberCount = room.getJoinedMemberCount();

    // Verifica se é uma conversa direta (DM) - simplesmente 2 membros
    const isDirect = memberCount === 2;

    // Se for DM e não tiver avatar de sala, usa o avatar do outro usuário
    if (isDirect && !avatarUrl) {
        const members = room.getJoinedMembers();
        const otherMember = members.find(m => m.userId !== client.getUserId());
        if (otherMember) {
            // Pega o avatar do outro membro
            avatarUrl = otherMember.getMxcAvatarUrl() || null;
        }
    }



    // Se for DM, pega o status de presença do outro usuário
    let userPresence: 'online' | 'offline' | 'unavailable' | undefined;
    if (isDirect) {
        const members = room.getJoinedMembers();
        const otherMember = members.find(m => m.userId !== client.getUserId());
        if (otherMember) {
            const user = client.getUser(otherMember.userId);
            const presence = user?.presence;



            if (presence === 'online') {
                userPresence = 'online';
            } else if (presence === 'unavailable') {
                userPresence = 'unavailable';
            } else {
                userPresence = 'offline';
            }
        }
    }

    // Pega usuários que estão digitando (excluindo o próprio usuário)
    const allMembers = room.currentState.getMembers();
    const typingUsers = allMembers
        .filter((member: any) => member.typing && member.userId !== client.getUserId())
        .map((member: any) => member.userId);

    // Verifica se é um Mural
    const muralEvent = room.currentState.getStateEvents(MURAL_STATE_EVENT_TYPE, '');
    const isMural = !!muralEvent;

    // Se for Mural, usa o avatar do criador (proprietário)
    if (isMural && muralEvent) {
        const creatorId = muralEvent.getContent().created_by;
        if (creatorId) {
            const creatorUser = client.getUser(creatorId);
            if (creatorUser) {
                avatarUrl = creatorUser.avatarUrl || avatarUrl;
            } else {
                // Tenta buscar o avatar do membro se o usuário não estiver cacheado
                const creatorMember = room.getMember(creatorId);
                if (creatorMember) {
                    avatarUrl = creatorMember.getMxcAvatarUrl() || avatarUrl;
                }
            }
        }
    }

    return {
        roomId: room.roomId,
        name: room.name,
        alias: room.getCanonicalAlias() || undefined,
        unreadNotifications: unread,
        highlightNotifications: highlight,
        avatarUrl: avatarUrl || null,
        memberCount,
        isDirect,
        userPresence,
        typingUsers,
        isMural,
    };
};

/**
 * Verifica se uma sala é um Space
 */
const isSpace = (room: Room): boolean => {
    const createEvent = room.currentState.getStateEvents('m.room.create', '');
    return createEvent?.getContent()?.type === 'm.space';
};

/**
 * Verifica se uma sala é filha de algum espaço
 */
const isSpaceChild = (room: Room, allRooms: Room[]): boolean => {
    // Verifica se algum espaço tem esta sala como filho
    for (const potentialSpace of allRooms) {
        if (!isSpace(potentialSpace)) continue;

        const childEvents = potentialSpace.currentState.getStateEvents('m.space.child');
        for (const event of childEvents) {
            if (event.getStateKey() === room.roomId) {
                return true;
            }
        }
    }
    return false;
};

// -----------------------------------------------------------------------------
// 3. PROVIDER
// -----------------------------------------------------------------------------

export const RoomListProvider: React.FC<RoomListProviderProps> = ({ children }) => {
    const { client, isLoggedIn } = useAuth();

    // ⭐️ CORREÇÃO: Definição dos estados de salas e loading
    const [joinedRooms, setJoinedRooms] = useState<SimpleRoom[]>([]);
    const [invitedRooms, setInvitedRooms] = useState<SimpleRoom[]>([]);
    const [isRoomsLoading, setIsRoomsLoading] = useState(false);
    const [isLoadingFromCache, setIsLoadingFromCache] = useState(true);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);

    /**
     * Função principal para buscar e processar as salas do cliente.
     */
    const loadRooms = useCallback(() => {
        if (!client) {
            setJoinedRooms([]);
            setInvitedRooms([]);
            return;
        }

        setIsRoomsLoading(true);
        try {
            const matrixRooms: Room[] = client.getRooms();

            // Separação de salas ativas (JOIN)
            // Filtra: não é espaço E não é filho de espaço
            const joined = matrixRooms
                .filter(r => r.getMyMembership() === 'join')
                .filter(r => !isSpace(r)) // Não é um espaço
                .filter(r => !isSpaceChild(r, matrixRooms)) // Não é filho de espaço
                .map(r => mapMatrixRoomToSimpleRoom(r, client))
                .sort((a, b) => a.name.localeCompare(b.name));

            // Separação de salas convidadas (INVITE)
            const invites = matrixRooms
                .filter(r => r.getMyMembership() === 'invite')
                .map(r => mapMatrixRoomToSimpleRoom(r, client))
                .sort((a, b) => a.name.localeCompare(b.name));

            // Atualiza os estados
            setJoinedRooms(joined);
            setInvitedRooms(invites);

            // Salva no cache
            const cachedRooms: CachedRoom[] = joined.map(room => ({
                roomId: room.roomId,
                name: room.name,
                avatarUrl: room.avatarUrl || null,
                lastMessage: null, // SimpleRoom doesn't have this
                lastMessageTime: null, // SimpleRoom doesn't have this
                unreadCount: room.unreadNotifications,
                memberCount: room.memberCount,
                isMural: room.isMural || false,
            }));
            cacheService.saveRooms(cachedRooms).catch(err =>
                console.error('Error saving rooms to cache:', err)
            );

        } catch (error) {
            console.error('Erro ao carregar salas:', error);
            setJoinedRooms([]);
            setInvitedRooms([]);
        } finally {
            setIsRoomsLoading(false);
            setInitialLoadComplete(true);
        }
    }, [client]);


    // Load cached rooms on mount
    useEffect(() => {
        const loadCachedRooms = async () => {
            try {
                const cachedRooms = await cacheService.getRooms();
                if (cachedRooms && cachedRooms.length > 0) {

                    // Convert CachedRoom to SimpleRoom
                    const simpleRooms: SimpleRoom[] = cachedRooms.map(room => ({
                        roomId: room.roomId,
                        name: room.name,
                        avatarUrl: room.avatarUrl,
                        memberCount: room.memberCount,
                        unreadNotifications: room.unreadCount,
                        highlightNotifications: false,
                        isMural: room.isMural,
                    }));
                    setJoinedRooms(simpleRooms);
                }
            } catch (error) {
                console.error('Error loading cached rooms:', error);
            } finally {
                setIsLoadingFromCache(false);
            }
        };

        loadCachedRooms();
    }, []);

    // -----------------------------------------------------------------------------
    // 4. LISTENERS DE SINCRONIZAÇÃO
    // -----------------------------------------------------------------------------

    useEffect(() => {
        if (!client || !isLoggedIn) {
            // Se não estiver logado, não tenta carregar do servidor, mas mantém o que tiver no cache visualmente
            return;
        }

        const syncListener = (state: string, prevState: string) => {
            if (state === 'PREPARED' && prevState === null) {

                loadRooms();
            }
        };

        // Listener para atualizar a lista sempre que o conteúdo de UMA sala muda
        const roomUpdateListener = (room: Room) => {
            loadRooms();
        };

        // Listener para recibos de leitura (atualiza contadores de não lidas)
        const receiptListener = (event: any, room: Room) => {
            // Quando um recibo é recebido (seja nosso ou de outro), atualizamos a sala
            // Isso garante que se lermos em outro lugar, ou aqui mesmo, o contador atualize

            loadRooms();
        };

        // Listener para mudanças de presença (atualiza status online/offline)
        const presenceListener = (event: any, user: any) => {
            // Log para debug


            // Atualiza a lista quando a presença de um usuário muda
            loadRooms();
        };

        // Listener para mudanças de digitação
        const typingListener = (event: any, member: any) => {
            // Atualiza a lista quando alguém começa/para de digitar
            loadRooms();
        };

        // ⚠️ Tipagem forçada para os eventos 'sync' e 'Room'
        client.on("sync" as any, syncListener);
        client.on("Room" as any, roomUpdateListener);
        client.on("Room.receipt" as any, receiptListener); // Adiciona listener de recibo
        client.on("User.presence" as any, presenceListener); // Adiciona listener de presença
        client.on("RoomMember.typing" as any, typingListener); // Adiciona listener de digitação

        loadRooms();

        return () => {
            client.removeListener("sync" as any, syncListener);
            client.removeListener("Room" as any, roomUpdateListener);
            client.removeListener("Room.receipt" as any, receiptListener);
            client.removeListener("User.presence" as any, presenceListener);
            client.removeListener("RoomMember.typing" as any, typingListener);
        };
    }, [client, isLoggedIn, loadRooms]);

    const value: RoomListContextType = {
        // 'rooms' é mantido para compatibilidade, usando joinedRooms por padrão
        joinedRooms,
        invitedRooms,
        isRoomsLoading,
        isLoadingFromCache,
        initialLoadComplete,
        loadRooms,
    };

    return <RoomListContext.Provider value={value}>{children}</RoomListContext.Provider>;
};

// -----------------------------------------------------------------------------
// 5. CUSTOM HOOK
// -----------------------------------------------------------------------------

export const useRoomList = (): RoomListContextType => {
    const context = useContext(RoomListContext);
    if (context === undefined) {
        throw new Error('useRoomList must be used within a RoomListProvider');
    }
    return context;
};