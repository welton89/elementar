// src/types/spaces.ts

export interface MatrixSpace {
    spaceId: string;
    name: string;
    avatarUrl?: string;
    topic?: string;
    unreadCount: number;
}

export interface SpaceRoom {
    roomId: string;
    name: string;
    avatarUrl?: string;
    topic?: string;
    unreadCount: number;
    isVoice: boolean; // Para diferenciar canais de voz
    category?: string; // Categoria do canal (ex: "Canais de Texto", "Canais de Voz")
}

export interface SpaceCategory {
    name: string;
    rooms: SpaceRoom[];
    isCollapsed: boolean;
}

export interface SpacesContextType {
    spaces: MatrixSpace[];
    selectedSpace: MatrixSpace | null;
    spaceRooms: SpaceRoom[];
    categories: SpaceCategory[];
    isLoading: boolean;
    selectSpace: (spaceId: string) => void;
    toggleCategory: (categoryName: string) => void;
    refreshSpaces: () => Promise<void>;
}
