// src/contexts/SpacesContext.tsx

import { Room } from 'matrix-js-sdk';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { MatrixSpace, SpaceCategory, SpaceRoom, SpacesContextType } from '../types/spaces';
import { useAuth } from './AuthContext';

const SpacesContext = createContext<SpacesContextType | undefined>(undefined);

export const SpacesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { client } = useAuth();
    const [spaces, setSpaces] = useState<MatrixSpace[]>([]);
    const [selectedSpace, setSelectedSpace] = useState<MatrixSpace | null>(null);
    const [spaceRooms, setSpaceRooms] = useState<SpaceRoom[]>([]);
    const [categories, setCategories] = useState<SpaceCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Função para verificar se uma sala é um Space
    const isSpace = (room: Room): boolean => {
        const createEvent = room.currentState.getStateEvents('m.room.create', '');
        return createEvent?.getContent()?.type === 'm.space';
    };

    // Função para obter salas de um Space
    const getRoomsInSpace = async (spaceId: string): Promise<SpaceRoom[]> => {
        if (!client) return [];

        const space = client.getRoom(spaceId);
        if (!space) return [];

        const rooms: SpaceRoom[] = [];
        const childEvents = space.currentState.getStateEvents('m.space.child');

        for (const event of childEvents) {
            const childRoomId = event.getStateKey();
            if (!childRoomId) continue;

            const childRoom = client.getRoom(childRoomId);
            if (!childRoom) continue;

            // Não incluir outros spaces como salas
            if (isSpace(childRoom)) continue;

            const powerLevels = childRoom.currentState.getStateEvents('m.room.power_levels', '');
            const isVoice = powerLevels?.getContent()?.events?.['m.room.message'] === undefined;

            // Obter URL do avatar (MXC) diretamente do state
            const avatarEvent = childRoom.currentState.getStateEvents('m.room.avatar', '');
            const avatarMxcUrl = avatarEvent?.getContent()?.url;

            rooms.push({
                roomId: childRoom.roomId,
                name: childRoom.name || 'Sala sem nome',
                avatarUrl: avatarMxcUrl || undefined,
                topic: childRoom.currentState.getStateEvents('m.room.topic', '')?.getContent()?.topic,
                unreadCount: childRoom.getUnreadNotificationCount() || 0,
                isVoice: isVoice,
            });
        }

        return rooms;
    };

    // Organizar salas em categorias
    const organizeIntoCategories = (rooms: SpaceRoom[]): SpaceCategory[] => {
        const textChannels = rooms.filter(r => !r.isVoice);
        const voiceChannels = rooms.filter(r => r.isVoice);

        const cats: SpaceCategory[] = [];

        if (textChannels.length > 0) {
            cats.push({
                name: 'Canais de Texto',
                rooms: textChannels,
                isCollapsed: false,
            });
        }

        if (voiceChannels.length > 0) {
            cats.push({
                name: 'Canais de Voz',
                rooms: voiceChannels,
                isCollapsed: false,
            });
        }

        return cats;
    };

    // Carregar todos os Spaces
    const loadSpaces = async () => {
        if (!client) return;

        setIsLoading(true);
        try {
            const allRooms = client.getRooms();
            const spacesList: MatrixSpace[] = [];

            for (const room of allRooms) {
                if (isSpace(room)) {
                    // Obter URL do avatar (MXC) diretamente do state
                    const avatarEvent = room.currentState.getStateEvents('m.room.avatar', '');
                    const avatarMxcUrl = avatarEvent?.getContent()?.url;

                    spacesList.push({
                        spaceId: room.roomId,
                        name: room.name || 'Espaço sem nome',
                        avatarUrl: avatarMxcUrl || undefined,
                        topic: room.currentState.getStateEvents('m.room.topic', '')?.getContent()?.topic,
                        unreadCount: room.getUnreadNotificationCount() || 0,
                    });
                }
            }

            setSpaces(spacesList);

            // Selecionar primeiro space por padrão
            if (spacesList.length > 0 && !selectedSpace) {
                selectSpace(spacesList[0].spaceId);
            }
        } catch (error) {
            console.error('Erro ao carregar spaces:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Selecionar um Space
    const selectSpace = async (spaceId: string) => {
        const space = spaces.find(s => s.spaceId === spaceId);
        if (!space) return;

        setSelectedSpace(space);

        // Carregar salas do space
        const rooms = await getRoomsInSpace(spaceId);
        setSpaceRooms(rooms);

        // Organizar em categorias
        const cats = organizeIntoCategories(rooms);
        setCategories(cats);
    };

    // Toggle categoria
    const toggleCategory = (categoryName: string) => {
        setCategories(prev =>
            prev.map(cat =>
                cat.name === categoryName
                    ? { ...cat, isCollapsed: !cat.isCollapsed }
                    : cat
            )
        );
    };

    // Refresh spaces
    const refreshSpaces = async () => {
        await loadSpaces();
    };

    // Carregar spaces quando o client estiver disponível
    useEffect(() => {
        if (client) {
            loadSpaces();

            // Listener para atualizações
            const onRoomStateEvents = () => {
                loadSpaces();
            };

            client.on('Room.timeline' as any, onRoomStateEvents);

            return () => {
                client.removeListener('Room.timeline' as any, onRoomStateEvents);
            };
        }
    }, [client]);

    const value: SpacesContextType = {
        spaces,
        selectedSpace,
        spaceRooms,
        categories,
        isLoading,
        selectSpace,
        toggleCategory,
        refreshSpaces,
    };

    return <SpacesContext.Provider value={value}>{children}</SpacesContext.Provider>;
};

export const useSpaces = (): SpacesContextType => {
    const context = useContext(SpacesContext);
    if (!context) {
        throw new Error('useSpaces must be used within a SpacesProvider');
    }
    return context;
};
