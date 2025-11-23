import { Ionicons } from '@expo/vector-icons';
import { AuthenticatedImage } from '@src/components/AuthenticatedImage';
import { RoomMember } from '@src/types/chat';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface MemberItemProps {
    item: RoomMember;
    currentUserId: string;
    currentUserPowerLevel: number;
    onKick: (member: RoomMember) => void;
    theme: any;
}

export const MemberItem = React.memo(({ item, currentUserId, currentUserPowerLevel, onKick, theme }: MemberItemProps) => (
    <View style={[styles.memberItem, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.memberInfo}>
            {item.avatarUrl ? (
                <AuthenticatedImage
                    mxcUrl={item.avatarUrl}
                    style={styles.memberAvatar}
                    resizeMode="cover"
                />
            ) : (
                <View style={[styles.memberAvatar, styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                    <Text style={styles.avatarText}>{item.displayName.charAt(0).toUpperCase()}</Text>
                </View>
            )}
            <View style={styles.memberDetails}>
                <Text style={[styles.memberName, { color: theme.text }]}>{item.displayName}</Text>
                <Text style={[styles.memberId, { color: theme.textSecondary }]}>{item.userId}</Text>
            </View>
        </View>
        {item.userId !== currentUserId && currentUserPowerLevel >= 50 && (
            <TouchableOpacity
                onPress={() => onKick(item)}
                style={[styles.kickButton, { backgroundColor: theme.error }]}
            >
                <Ionicons name="person-remove" size={18} color="#fff" />
            </TouchableOpacity>
        )}
    </View>
));

const styles = StyleSheet.create({
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    memberInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    avatarPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    memberDetails: {
        flex: 1,
    },
    memberName: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 2,
    },
    memberId: {
        fontSize: 12,
    },
    kickButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
});
