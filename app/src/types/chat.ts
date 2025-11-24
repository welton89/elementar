// src/types/chat.ts


// Tipo simplificado de uma mensagem (evento)
export interface SimpleMessage {
    eventId: string;
    senderId: string;
    senderName: string;
    content: string; // Conteúdo formatado
    timestamp: number;
    msgtype?: string; // Tipo de mensagem (m.text, m.image, etc)
    imageUrl?: string; // URL da imagem (se msgtype === 'm.image')
    audioUrl?: string; // URL do áudio (se msgtype === 'm.audio')
    videoUrl?: string; // URL do vídeo (se msgtype === 'm.video')
    thumbnailUrl?: string; // URL da thumbnail (para vídeo ou imagem)
    fileUrl?: string; // URL do arquivo (se msgtype === 'm.file')
    fileName?: string; // Nome do arquivo
    audioDuration?: number; // Duração do áudio em ms
    status?: 'sending' | 'sent' | 'failed'; // Status de envio
    isEdited?: boolean; // Se a mensagem foi editada
    avatarUrl?: string; // URL do avatar do remetente
    isMe?: boolean; // Se a mensagem é do usuário atualtar URL, etc.
}

export interface RoomMember {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    powerLevel: number;
}

// Tipo para a Store de Chat
export interface ChatContextType {
    messages: SimpleMessage[];
    roomName: string | null;
    roomAvatarUrl: string | null; // URL do avatar da sala
    isLoading: boolean;
    error: string | null;
    sendMessage: (content: string) => Promise<void>;
    sendImage: (uri: string, filename: string) => Promise<void>;
    sendFile: (uri: string, filename: string, mimeType: string) => Promise<void>;
    sendAudio: (uri: string, duration: number) => Promise<void>;
    sendVideo: (uri: string, filename: string) => Promise<void>;
    deleteMessage: (eventId: string) => Promise<void>; // Adicionado
    editMessage: (eventId: string, newContent: string) => Promise<void>; // Adicionado
    loadOlderMessages: () => Promise<boolean>; // Scroll infinito
    isLoadingOlder: boolean; // Estado de carregamento de mensagens antigas
    lastReadEventId: string | null; // ID da última mensagem lida
}