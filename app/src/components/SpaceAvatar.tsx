// src/components/SpaceAvatar.tsx

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { MatrixSpace } from '../types/spaces';
import { AuthenticatedImage } from './AuthenticatedImage';

interface SpaceAvatarProps {
    space: MatrixSpace;
    isSelected: boolean;
    onPress: () => void;
}

export const SpaceAvatar: React.FC<SpaceAvatarProps> = ({ space, isSelected, onPress }) => {
    const { theme } = useTheme();

    return (
        <TouchableOpacity
            style={[
                styles.container,
                isSelected && { borderLeftWidth: 4, borderLeftColor: theme.primary }
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.avatarContainer}>
                {space.avatarUrl ? (
                    <AuthenticatedImage
                        mxcUrl={space.avatarUrl}
                        style={[
                            styles.avatar,
                            isSelected && { borderWidth: 3, borderColor: theme.primary }
                        ]}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[
                        styles.avatar,
                        styles.avatarPlaceholder,
                        { backgroundColor: isSelected ? theme.primary : theme.placeholder },
                        isSelected && { borderWidth: 3, borderColor: theme.primary }
                    ]}>
                        <Text style={styles.avatarText}>
                            {space.name.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}
                {space.unreadCount > 0 && (
                    <View style={[styles.badge, { backgroundColor: theme.error }]}>
                        <Text style={styles.badgeText}>
                            {space.unreadCount > 99 ? '99+' : space.unreadCount}
                        </Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
