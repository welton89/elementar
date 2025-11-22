// src/types/categories.types.ts

export interface RoomCategory {
    id: string;
    name: string;
    color: string;
}

export interface CategoriesContextType {
    categories: RoomCategory[];
    selectedCategory: string | null; // null = "Todos"
    isLoading: boolean;
    createCategory: (name: string, color: string) => Promise<void>;
    updateCategory: (id: string, name: string, color: string) => Promise<void>;
    deleteCategory: (id: string) => Promise<void>;
    selectCategory: (id: string | null) => void;
    addRoomToCategory: (roomId: string, categoryId: string) => Promise<void>;
    removeRoomFromCategory: (roomId: string, categoryId: string) => Promise<void>;
    getRoomCategories: (roomId: string) => string[];
}

export const DEFAULT_CATEGORY_COLORS = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#FFA07A', // Orange
    '#98D8C8', // Mint
    '#F7DC6F', // Yellow
    '#BB8FCE', // Purple
    '#85C1E2', // Sky Blue
];
