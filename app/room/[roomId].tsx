// app/room/[roomId].tsx

import { MessageActionMenu } from '@src/components/MessageActionMenu';
import { MessageInput } from '@src/components/MessageInput';
import { MessageItem } from '@src/components/MessageItem';
import { MuralView } from '@src/components/MuralView';
import { UnreadMessagesSeparator } from '@src/components/UnreadMessagesSeparator';
import { useChatRoomLogic } from '@src/hooks/useChatRoomLogic';
import { MURAL_STATE_EVENT_TYPE } from '@src/types/rooms';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useRef } from 'react';
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
        roomAvatarUrl,
        loadOlderMessages,
        isLoadingOlder,
        lastReadEventId,
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

    // Encontra o índice da última mensagem lida no array invertido
    const reversedMessages = [...messages].reverse();
    const lastReadIndex = lastReadEventId
        ? reversedMessages.findIndex(msg => msg.eventId === lastReadEventId)
        : -1;

    // Calcula initialScrollIndex apenas uma vez (quando lastReadEventId é carregado pela primeira vez)
    // Isso evita que o scroll fique pulando toda vez que lastReadEventId muda
    const initialScrollIndex = useMemo(() => {
        if (lastReadIndex > 0 && messages.length > 0) {
            return lastReadIndex;
        }
        return 0;
    }, []); // Array vazio = calcula apenas uma vez

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
                    data={reversedMessages}
                    keyExtractor={(item) => item.eventId}
                    renderItem={({ item, index }) => (
                        <>
                            <MessageItem
                                message={item}
                                isMe={item.senderId === userId}
                                onLongPress={handleLongPressMessage}
                            />
                            {/* Renderiza separador após a última mensagem lida, 
                                mas apenas se houver mensagens não lidas (lastReadIndex não é o primeiro item) */}
                            {lastReadIndex !== -1 && lastReadIndex > 0 && index === lastReadIndex && (
                                <UnreadMessagesSeparator />
                            )}
                        </>
                    )}
                    inverted
                    contentContainerStyle={[styles.listContent, { paddingTop: keyboardHeight + 80 }]}
                    initialScrollIndex={initialScrollIndex}
                    getItemLayout={(data, index) => ({
                        length: 100,
                        offset: 100 * index,
                        index,
                    })}
                    onEndReached={async () => {
                        if (!isLoadingOlder && !isLoading) {
                            await loadOlderMessages();
                        }
                    }}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        isLoadingOlder ? (
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <ActivityIndicator size="small" color={theme.primary} />
                            </View>
                        ) : null
                    }
                    maintainVisibleContentPosition={{
                        minIndexForVisible: 0,
                        autoscrollToTopThreshold: 10,
                    }}
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
