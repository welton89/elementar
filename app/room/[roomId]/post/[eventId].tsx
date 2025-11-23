import { CommentInput } from '@src/components/CommentInput';
import { CommentItem } from '@src/components/CommentItem';
import { PostHeader } from '@src/components/PostHeader';
import { useAuth } from '@src/contexts/AuthContext';
import { useTheme } from '@src/contexts/ThemeContext';
import { usePostDetailsLogic } from '@src/hooks/usePostDetailsLogic';
import { SimpleMessage } from '@src/types/chat';
import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

export default function PostDetailsScreen() {
    const { roomId, eventId } = useLocalSearchParams<{ roomId: string; eventId: string }>();
    const { theme } = useTheme();
    const { client } = useAuth();

    const {
        postEvent,
        comments,
        isLoading,
        inputText,
        setInputText,
        isSending,
        handleSendComment,
        keyboardHeight,
        inputBottomAnim,
        flatListRef
    } = usePostDetailsLogic({ client, roomId, eventId });

    // Hooks called unconditionally
    const renderHeader = React.useCallback(() => {
        if (!postEvent) return null;
        const content = postEvent.getContent();
        return (
            <PostHeader
                body={content.body}
                msgtype={content.msgtype || ''}
                url={content.url}
                theme={theme}
            />
        );
    }, [postEvent, theme]);

    const renderComment = React.useCallback(({ item }: { item: SimpleMessage }) => (
        <CommentItem item={item} theme={theme} />
    ), [theme]);

    if (isLoading || !postEvent) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen
                options={{
                    title: 'Postagem',
                    headerBackTitle: 'Voltar',
                    headerStyle: { backgroundColor: theme.surface },
                    headerTintColor: theme.text,
                    headerTitleStyle: { color: theme.text, fontWeight: 'bold' },
                    headerShadowVisible: false,
                }}
            />

            <FlatList
                ref={flatListRef}
                data={comments}
                renderItem={renderComment}
                keyExtractor={item => item.eventId}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={{ paddingBottom: keyboardHeight + 80 }}
            />

            <CommentInput
                theme={theme}
                inputText={inputText}
                setInputText={setInputText}
                handleSendComment={handleSendComment}
                isSending={isSending}
                inputBottomAnim={inputBottomAnim}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
