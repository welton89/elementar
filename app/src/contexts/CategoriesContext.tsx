// src/contexts/CategoriesContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { CategoriesContextType, RoomCategory } from '../types/categories.types';
import { useAuth } from './AuthContext';

const ACCOUNT_DATA_TYPE = 'u.elementar.categories';

const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined);

export const CategoriesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { client } = useAuth();
    const [categories, setCategories] = useState<RoomCategory[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Carregar categorias do account data
    useEffect(() => {
        if (!client) return;

        const loadCategories = () => {
            try {
                const accountData = client.getAccountData(ACCOUNT_DATA_TYPE as any);
                if (accountData) {
                    const content = accountData.getContent();
                    setCategories(content.categories || []);
                }
            } catch (error) {
                console.error('Erro ao carregar categorias:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadCategories();

        // Listener para mudanças no account data
        const onAccountData = (event: any) => {
            if (event.getType() === ACCOUNT_DATA_TYPE) {
                const content = event.getContent();
                setCategories(content.categories || []);
            }
        };

        client.on('accountData' as any, onAccountData);

        return () => {
            client.removeListener('accountData' as any, onAccountData);
        };
    }, [client]);

    // Salvar categorias no account data
    const saveCategories = async (newCategories: RoomCategory[]) => {
        if (!client) return;

        try {
            await client.setAccountData(ACCOUNT_DATA_TYPE as any, {
                categories: newCategories,
            });
            setCategories(newCategories);
        } catch (error) {
            console.error('Erro ao salvar categorias:', error);
            throw error;
        }
    };

    // Criar categoria
    const createCategory = async (name: string, color: string) => {
        const id = name.toLowerCase().replace(/\s+/g, '-');
        const newCategory: RoomCategory = { id, name, color };
        await saveCategories([...categories, newCategory]);
    };

    // Atualizar categoria
    const updateCategory = async (id: string, name: string, color: string) => {
        const updated = categories.map(cat =>
            cat.id === id ? { ...cat, name, color } : cat
        );
        await saveCategories(updated);
    };

    // Deletar categoria
    const deleteCategory = async (id: string) => {
        if (!client) return;

        // Remover tags de todas as salas
        const rooms = client.getRooms();
        const tagName = `u.dir.${id}`;

        for (const room of rooms) {
            if (room.tags && tagName in room.tags) {
                try {
                    await client.deleteRoomTag(room.roomId, tagName);
                } catch (error) {
                    console.error(`Erro ao remover tag da sala ${room.roomId}:`, error);
                }
            }
        }

        // Remover categoria da lista
        const filtered = categories.filter(cat => cat.id !== id);
        await saveCategories(filtered);

        // Se a categoria deletada estava selecionada, voltar para "Todos"
        if (selectedCategory === id) {
            setSelectedCategory(null);
        }
    };

    // Selecionar categoria
    const selectCategory = (id: string | null) => {
        setSelectedCategory(id);
    };

    // Adicionar sala à categoria
    const addRoomToCategory = async (roomId: string, categoryId: string) => {
        if (!client) return;

        const tagName = `u.dir.${categoryId}`;
        try {
            await client.setRoomTag(roomId, tagName, { order: 0.5 });
        } catch (error) {
            console.error('Erro ao adicionar tag:', error);
            throw error;
        }
    };

    // Remover sala da categoria
    const removeRoomFromCategory = async (roomId: string, categoryId: string) => {
        if (!client) return;

        const tagName = `u.dir.${categoryId}`;
        try {
            await client.deleteRoomTag(roomId, tagName);
        } catch (error) {
            console.error('Erro ao remover tag:', error);
            throw error;
        }
    };

    // Obter categorias de uma sala
    const getRoomCategories = (roomId: string): string[] => {
        if (!client) return [];

        const room = client.getRoom(roomId);
        if (!room || !room.tags) return [];

        const categoryIds: string[] = [];
        for (const tagName in room.tags) {
            if (tagName.startsWith('u.dir.')) {
                const categoryId = tagName.replace('u.dir.', '');
                categoryIds.push(categoryId);
            }
        }

        return categoryIds;
    };

    const value: CategoriesContextType = {
        categories,
        selectedCategory,
        isLoading,
        createCategory,
        updateCategory,
        deleteCategory,
        selectCategory,
        addRoomToCategory,
        removeRoomFromCategory,
        getRoomCategories,
    };

    return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
};

export const useCategories = (): CategoriesContextType => {
    const context = useContext(CategoriesContext);
    if (!context) {
        throw new Error('useCategories must be used within a CategoriesProvider');
    }
    return context;
};
