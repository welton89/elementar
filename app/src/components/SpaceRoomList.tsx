// src/components/SpaceRoomList.tsx

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { SpaceCategory, SpaceRoom } from '../types/spaces';

interface SpaceRoomListProps {
    categories: SpaceCategory[];
    onToggleCategory: (categoryName: string) => void;
}

export const SpaceRoomList: React.FC<SpaceRoomListProps> = ({ categories, onToggleCategory }) => {
    const { theme } = useTheme();
    const router = useRouter();

    const navigateToRoom = (roomId: string) => {
        router.push(`/room/${roomId}`);
    };

    const renderRoom = (room: SpaceRoom) => (
        <TouchableOpacity
            key={room.roomId}
            style={[styles.roomItem, { backgroundColor: theme.surface }]}
            onPress={() => navigateToRoom(room.roomId)}
            activeOpacity={0.7}
        >
            <Ionicons
                name={room.isVoice ? 'volume-high' : 'chatbubble-outline'}
                size={20}
                color={theme.textSecondary}
                style={styles.roomIcon}
            />
            <Text style={[styles.roomName, { color: theme.text }]} numberOfLines={1}>
                {room.name}
            </Text>
            {room.unreadCount > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: theme.error }]}>
                    <Text style={styles.unreadText}>
                        {room.unreadCount > 99 ? '99+' : room.unreadCount}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );

    const renderCategory = (category: SpaceCategory) => (
        <View key={category.name} style={styles.categoryContainer}>
            <TouchableOpacity
                style={styles.categoryHeader}
                onPress={() => onToggleCategory(category.name)}
                activeOpacity={0.7}
            >
                <Ionicons
                    name={category.isCollapsed ? 'chevron-forward' : 'chevron-down'}
                    size={16}
                    color={theme.textSecondary}
                />
                <Text style={[styles.categoryName, { color: theme.textSecondary }]}>
                    {category.name.toUpperCase()}
                </Text>
            </TouchableOpacity>
            {!category.isCollapsed && (
                <View style={styles.roomsContainer}>
                    {category.rooms.map(renderRoom)}
                </View>
            )}
        </View>
    );

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
            {categories.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                        Nenhuma sala neste espaço
                    </Text>
                </View>
            ) : (
                categories.map(renderCategory)
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    categoryContainer: {
        marginBottom: 8,
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        gap: 8,
    },
    categoryName: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    roomsContainer: {
        paddingLeft: 8,
    },
    roomItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginHorizontal: 8,
        marginBottom: 2,
        borderRadius: 4,
    },
    roomIcon: {
        marginRight: 8,
    },
    roomName: {
        flex: 1,
        fontSize: 16,
    },
    unreadBadge: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    unreadText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 14,
    },
});
