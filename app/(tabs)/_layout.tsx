// app/(tabs)/_layout.tsx

import { Ionicons } from '@expo/vector-icons';
import { CategoriesProvider } from '@src/contexts/CategoriesContext';
import { RoomListProvider } from '@src/contexts/RoomListContext';
import { SpacesProvider } from '@src/contexts/SpacesContext';
import { useTheme } from '@src/contexts/ThemeContext';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabsLayout() {
    const { theme } = useTheme();

    return (
        // ⭐️ Envolvemos o grupo (tabs) no RoomListProvider, SpacesProvider e CategoriesProvider
        <RoomListProvider>
            <SpacesProvider>
                <CategoriesProvider>
                    <Tabs
                        screenOptions={{
                            tabBarStyle: {
                                backgroundColor: theme.surface,
                                borderTopColor: theme.border,
                            },
                            tabBarActiveTintColor: theme.primary,
                            tabBarInactiveTintColor: theme.textSecondary,
                            headerStyle: {
                                backgroundColor: theme.surface,
                            },
                            headerTintColor: theme.text,
                            headerShadowVisible: false,
                        }}
                    >
                        {/* index.tsx será sua tela de lista de salas */}
                        <Tabs.Screen
                            name="index"
                            options={{
                                title: 'Conversas',
                                tabBarIcon: ({ color, size }) => (
                                    <Ionicons name="chatbubbles" size={size} color={color} />
                                ),
                            }}
                        />

                        {/* Aba de Espaços */}
                        <Tabs.Screen
                            name="spaces"
                            options={{
                                title: 'Espaços',
                                tabBarIcon: ({ color, size }) => (
                                    <Ionicons name="planet" size={size} color={color} />
                                ),
                            }}
                        />

                        {/* Aba de Mural */}
                        <Tabs.Screen
                            name="mural"
                            options={{
                                title: 'Mural',
                                tabBarIcon: ({ color, size }) => (
                                    <Ionicons name="easel" size={size} color={color} />
                                ),
                            }}
                        />

                        {/* Aba de Explorar/Buscar */}
                        <Tabs.Screen
                            name="explore"
                            options={{
                                title: 'Explorar',
                                tabBarIcon: ({ color, size }) => (
                                    <Ionicons name="compass" size={size} color={color} />
                                ),
                            }}
                        />

                        {/* Adicione outras abas aqui, como Configurações, Pessoas, etc. */}
                        <Tabs.Screen
                            name="settings"
                            options={{
                                title: 'Configurações',
                                tabBarIcon: ({ color, size }) => (
                                    <Ionicons name="settings" size={size} color={color} />
                                ),
                            }}
                        />
                    </Tabs>
                </CategoriesProvider>
            </SpacesProvider>
        </RoomListProvider>
    );
}