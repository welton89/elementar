import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { SimpleRoom } from '../types/rooms';
import { AuthenticatedImage } from './AuthenticatedImage';

interface RoomItemProps {
    room: SimpleRoom;
    onPress: (roomId: string) => void;
    onLongPress?: () => void;
}

export const RoomItem: React.FC<RoomItemProps> = ({ room, onPress, onLongPress }) => {
    const { theme } = useTheme();

    // Debug log para verificar presença
    if (room.memberCount === 2) {
        console.log(`RoomItem ${room.name}:`, {
            isDirect: room.isDirect,
            userPresence: room.userPresence,
            shouldShowIndicator: room.isDirect && room.userPresence === 'online'
        });
    }

    return (
        <TouchableOpacity
            style={[
                styles.roomItem,
                {
                    backgroundColor: room.highlightNotifications ? theme.surfaceVariant : theme.surface,
                    borderBottomColor: room.highlightNotifications ? theme.error : theme.divider
                }
            ]}
            activeOpacity={0.7}
            onPress={() => onPress(room.roomId)}
            onLongPress={onLongPress}
        >
            <View style={styles.roomInfoContainer}>
                <View style={styles.avatarContainer}>
                    {room.avatarUrl ? (
                        <AuthenticatedImage
                            mxcUrl={room.avatarUrl}
                            style={styles.roomAvatar}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[styles.roomAvatar, styles.roomAvatarPlaceholder, { backgroundColor: theme.primary }]}>
                            <Text style={styles.roomAvatarText}>{room.name.charAt(0).toUpperCase()}</Text>
                        </View>
                    )}
                    {/* Online status indicator for DMs */}
                    {room.isDirect && (
                        <View style={[
                            styles.onlineIndicator,
                            {
                                backgroundColor: room.userPresence === 'online' ? '#4CAF50' : '#9E9E9E',
                                borderColor: theme.surface
                            }
                        ]} />
                    )}
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.roomName, { color: theme.text }]} numberOfLines={1}>{room.name}</Text>
                    {/* Typing indicator */}
                    {room.typingUsers && room.typingUsers.length > 0 && (
                        <Text style={[styles.typingText, { color: theme.textSecondary }]} numberOfLines={1}>
                            digitando...
                        </Text>
                    )}
                </View>
            </View>
            {room.unreadNotifications > 0 && (
                <Text style={[styles.unreadBadge, { backgroundColor: theme.primary }]}>{room.unreadNotifications}</Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    roomItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
    },
    roomInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 15,
    },
    roomAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
    },
    roomAvatarPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    roomAvatarText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold'
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center'
    },
    roomName: {
        fontSize: 16,
        fontWeight: '600',
    },
    typingText: {
        fontSize: 12,
        fontStyle: 'italic',
        marginTop: 2,
    },
    unreadBadge: {
        color: 'white',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        fontWeight: 'bold',
        minWidth: 24,
        textAlign: 'center',
        fontSize: 12,
        overflow: 'hidden'
    },
});
