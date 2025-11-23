// app/room/[roomId].tsx

import { MessageActionMenu } from '@src/components/MessageActionMenu';
import { MessageInput } from '@src/components/MessageInput';
import { MessageItem } from '@src/components/MessageItem';
import { MuralView } from '@src/components/MuralView';
import { useChatRoomLogic } from '@src/hooks/useChatRoomLogic';
import { MURAL_STATE_EVENT_TYPE } from '@src/types/rooms';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { AuthenticatedImage } from '../src/components/AuthenticatedImage';
import { useAuth } from '../src/contexts/AuthContext';
import { useChat } from '../src/contexts/ChatContext';
import { useTheme } from '../src/contexts/ThemeContext';

export default function RoomScreen() {
    const { theme } = useTheme();
    const { roomId } = useLocalSearchParams<{ roomId: string }>();

    // Passa roomId para o hook useChat
    const {
        messages,
        sendMessage,
        sendImage,
        sendFile,
        sendAudio,
        sendVideo,
        deleteMessage,
        editMessage,
        isLoading,
        roomName,
        roomAvatarUrl
    } = useChat(roomId);

    const { client } = useAuth();
    const router = useRouter();
    const userId = client?.getUserId();

    const flatListRef = useRef<FlatList>(null);

    // Use extracted logic hook
    const {
        typingUsers,
        keyboardHeight,
        inputBottomAnim,
        menuVisible,
        setMenuVisible,
        selectedMessage,
        editingMessage,
        setEditingMessage,
        handleLongPressMessage,
        handleMenuAction
    } = useChatRoomLogic({
        client,
        roomId,
        deleteMessage
    });

    if (!roomId) return <Text>Room ID missing</Text>;

    const room = client?.getRoom(roomId);
    const isMural = room?.currentState.getStateEvents(MURAL_STATE_EVENT_TYPE, '');

    if (isMural && room && client) {
        return (
            <MuralView
                roomId={roomId}
                room={room}
                client={client}
                messages={messages}
                onSendImage={sendImage}
                onSendVideo={sendVideo}
            />
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen
                options={{
                    headerTitle: () => (
                        <TouchableOpacity
                            onPress={() => router.push(`/room-settings/${roomId}`)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                        >
                            {roomAvatarUrl ? (
                                <AuthenticatedImage
                                    mxcUrl={roomAvatarUrl}
                                    style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.placeholder }}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center' }}>
                                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
                                        {roomName ? roomName.charAt(0).toUpperCase() : '?'}
                                    </Text>
                                </View>
                            )}
                            <View>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>{roomName || 'Chat'}</Text>
                                {typingUsers.length > 0 && (
                                    <Text style={{ fontSize: 12, color: theme.textSecondary, fontStyle: 'italic' }}>
                                        digitando...
                                    </Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    ),
                    headerTitleAlign: 'left',
                    headerStyle: {
                        backgroundColor: theme.surface,
                    },
                    headerShadowVisible: false,
                }}
            />

            {isLoading && messages.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.eventId} // Use eventId which is stable
                    renderItem={({ item }) => (
                        <MessageItem
                            message={item}
                            isMe={item.senderId === userId}
                            onLongPress={handleLongPressMessage}
                        />
                    )}
                    contentContainerStyle={[styles.listContent, { paddingBottom: keyboardHeight + 80 }]}
                    // Scroll to end only when content size changes (new message)
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    // Initial scroll
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
                />
            )}

            <Animated.View style={{ bottom: inputBottomAnim }}>
                <MessageInput
                    theme={theme}
                    onSend={(content) => sendMessage(content)}
                    onSendImage={(uri, filename) => sendImage(uri, filename)}
                    onSendFile={(uri, filename, mimeType) => sendFile(uri, filename, mimeType)}
                    onSendAudio={(uri, duration) => sendAudio(uri, duration)}
                    onSendVideo={(uri, filename) => sendVideo(uri, filename)}
                    editingMessage={editingMessage}
                    onCancelEdit={() => setEditingMessage(null)}
                    onEdit={editMessage}
                    roomId={roomId}
                    client={client}
                />
            </Animated.View>

            <MessageActionMenu
                visible={menuVisible}
                onClose={() => setMenuVisible(false)}
                onAction={handleMenuAction}
                message={selectedMessage}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 10,
        paddingBottom: 20,
    },
});
