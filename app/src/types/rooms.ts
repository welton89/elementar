// src/types/rooms.ts

// Tipo simplificado de uma sala para a interface do usuário
export interface SimpleRoom {
    roomId: string;
    name: string;
    alias?: string;
    memberCount: number;
    unreadNotifications: number;
    highlightNotifications: boolean;
    avatarUrl?: string | null; // URL do avatar da sala (MXC)
    isDirect?: boolean; // Se é uma conversa direta (DM)
    userPresence?: 'online' | 'offline' | 'unavailable'; // Status de presença do usuário (apenas para DMs)
    typingUsers?: string[]; // IDs dos usuários que estão digitando
    isMural?: boolean; // Se a sala é um Mural
    // Adicione mais campos conforme necessário (tópico, etc.)
}

export const MURAL_STATE_EVENT_TYPE = 'br.com.elementar.mural';

// Tipo para o Contexto da Lista de Salas
export interface RoomListContextType {
    // ⭐️ Lista de salas que o usuário está ATIVO
    joinedRooms: SimpleRoom[];
    // ⭐️ Lista de salas para as quais o usuário foi CONVIDADO
    invitedRooms: SimpleRoom[];
    isRoomsLoading: boolean;
    loadRooms: () => void;
}