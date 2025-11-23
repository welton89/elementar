import { AuthenticatedImage } from '@src/components/AuthenticatedImage';
import { SimpleMessage } from '@src/types/chat';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface CommentItemProps {
    item: SimpleMessage;
    theme: any;
}

export const CommentItem = React.memo(({ item, theme }: CommentItemProps) => (
    <View style={styles.commentItem}>
        <View style={styles.avatarContainer}>
            {item.avatarUrl ? (
                <AuthenticatedImage
                    mxcUrl={item.avatarUrl}
                    style={styles.commentAvatar}
                    resizeMode="cover"
                />
            ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: theme.surfaceVariant }]}>
                    <Text style={{ color: theme.text }}>{item.senderName.charAt(0).toUpperCase()}</Text>
                </View>
            )}
        </View>
        <View style={styles.commentContent}>
            <Text style={[styles.commentSender, { color: theme.text }]}>{item.senderName}</Text>
            <Text style={[styles.commentText, { color: theme.textSecondary }]}>{item.content}</Text>
        </View>
    </View>
));

const styles = StyleSheet.create({
    commentItem: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    avatarContainer: {
        marginRight: 10,
    },
    avatarPlaceholder: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    commentAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    commentContent: {
        flex: 1,
    },
    commentSender: {
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 2,
    },
    commentText: {
        fontSize: 14,
    },
});
