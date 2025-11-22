import { Ionicons } from '@expo/vector-icons';
import { AuthenticatedImage } from '@src/components/AuthenticatedImage';
import { AuthenticatedVideo } from '@src/components/AuthenticatedVideo';
import { useAuth } from '@src/contexts/AuthContext';
import { useTheme } from '@src/contexts/ThemeContext';
import { SimpleMessage } from '@src/types/chat';
import { ResizeMode } from 'expo-av';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MatrixEvent } from 'matrix-js-sdk';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Keyboard,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

// Memoized Header Component defined outside to maintain identity
const PostHeader = React.memo(({ body, msgtype, url, theme }: any) => (
    <View style={styles.postContainer}>
        {/* Media */}
        <View style={styles.mediaContainer}>
            {msgtype === 'm.image' && url && (
                <AuthenticatedImage
                    mxcUrl={url}
                    style={styles.media}
                    resizeMode="contain"
                />
            )}
            {msgtype === 'm.video' && url && (
                <AuthenticatedVideo
                    mxcUrl={url}
                    style={styles.media}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={true}
                    useNativeControls={true}
                />
            )}
        </View>

        {/* Caption */}
        {body && !/\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|mkv|mp3|m4a)$/i.test(body) && (
            <View style={styles.captionContainer}>
                <Text style={[styles.caption, { color: theme.text }]}>
                    {body}
                </Text>
            </View>
        )}

        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <Text style={[styles.commentsTitle, { color: theme.textSecondary }]}>Comentários</Text>
    </View>
));

// Memoized Comment Item Component defined outside
const CommentItem = React.memo(({ item, theme }: { item: SimpleMessage, theme: any }) => (
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

export default function PostDetailsScreen() {
    const { roomId, eventId } = useLocalSearchParams<{ roomId: string; eventId: string }>();
    const { theme } = useTheme();
    const { client } = useAuth();
    const router = useRouter();

    const [postEvent, setPostEvent] = useState<MatrixEvent | null>(null);
    const [comments, setComments] = useState<SimpleMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    const flatListRef = useRef<FlatList>(null);
    const inputBottomAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!client || !roomId || !eventId) return;

        const loadPostAndComments = async () => {
            try {
                const room = client.getRoom(roomId);
                if (!room) {
                    console.error("Room not found");
                    return;
                }

                // Get the main post event
                let event = room.findEventById(eventId);

                // If not in timeline, try to fetch it (though usually it should be there if we came from MuralView)
                // For now assume it's there or we might need client.fetchRoomEvent(roomId, eventId)
                if (!event) {
                    // Fallback: fetch from server (not implemented in this snippet for brevity, assuming it's in store)
                    console.warn("Event not found in local store, might need fetch");
                }
                setPostEvent(event || null);

                // Load thread (comments)
                const thread = room.getThread(eventId);
                console.log("DEBUG: Thread object:", thread ? "Found" : "Not Found", eventId);

                if (thread) {
                    // Initial load
                    console.log("DEBUG: Fetching initial events...");
                    await (thread as any).fetchInitialEvents();
                    console.log("DEBUG: Initial events fetched. Timeline length:", thread.timeline.length);
                    updateComments(thread.timeline);

                    // Listen for updates
                    thread.on("Thread.update" as any, () => {
                        console.log("DEBUG: Thread updated. New length:", thread.timeline.length);
                        updateComments(thread.timeline);
                    });
                } else {
                    console.log("DEBUG: No thread found for event", eventId, "trying manual relations fetch");
                    try {
                        const response = await client.relations(roomId, eventId, 'm.thread', null, { limit: 50 });
                        console.log("DEBUG: Relations fetched manually:", response);
                        if (response && response.events) {
                            updateComments(response.events);
                        }
                    } catch (err) {
                        console.error("DEBUG: Error fetching relations:", err);
                    }
                }

            } catch (error) {
                console.error("Error loading post details:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadPostAndComments();

        return () => {
            // Cleanup listeners if needed
        };
    }, [client, roomId, eventId]);

    // Keyboard handling
    useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                setKeyboardHeight(e.endCoordinates.height);
                Animated.timing(inputBottomAnim, {
                    toValue: e.endCoordinates.height,
                    duration: Platform.OS === 'ios' ? e.duration : 250,
                    useNativeDriver: false,
                }).start();
            }
        );

        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            (e) => {
                setKeyboardHeight(0);
                Animated.timing(inputBottomAnim, {
                    toValue: 0,
                    duration: Platform.OS === 'ios' ? e.duration : 250,
                    useNativeDriver: false,
                }).start();
            }
        );

        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
        };
    }, []);

    const updateComments = (timelineEvents: MatrixEvent[]) => {
        if (!client || !roomId) return;
        const room = client.getRoom(roomId);

        console.log("DEBUG: Updating comments with events:", timelineEvents.length);
        const mappedComments: SimpleMessage[] = timelineEvents.map(evt => {
            const senderId = evt.getSender()!;
            const member = room?.getMember(senderId);

            return {
                eventId: evt.getId()!,
                senderId: senderId,
                senderName: member?.name || evt.sender?.name || senderId,
                content: evt.getContent().body || '',
                timestamp: evt.getTs(),
                msgtype: evt.getContent().msgtype || 'm.text',
                status: 'sent',
                isMe: senderId === client?.getUserId(),
                avatarUrl: member?.getMxcAvatarUrl() || undefined
            };
        });
        setComments(mappedComments);
    };

    const handleSendComment = async () => {
        if (!inputText.trim() || !client || !roomId || !eventId) return;

        setIsSending(true);
        try {
            const response = await client.sendEvent(roomId, 'm.room.message' as any, {
                msgtype: 'm.text',
                body: inputText,
                'm.relates_to': {
                    'event_id': eventId,
                    'rel_type': 'm.thread',
                    'is_falling_back': true
                }
            });

            // Instant Update (Optimistic-ish)
            const newComment: SimpleMessage = {
                eventId: response.event_id,
                senderId: client.getUserId()!,
                senderName: client.getUser(client.getUserId()!)?.displayName || client.getUserId()!,
                content: inputText,
                timestamp: Date.now(),
                msgtype: 'm.text',
                status: 'sent',
                isMe: true,
                avatarUrl: client.getUser(client.getUserId()!)?.avatarUrl || undefined
            };

            setComments(prev => [...prev, newComment]);
            setInputText('');

            // Scroll to bottom
            setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
        } catch (error) {
            console.error("Error sending comment:", error);
            alert("Failed to send comment");
        } finally {
            setIsSending(false);
        }
    };

    // Hooks called unconditionally
    const renderHeader = React.useCallback(() => {
        if (!postEvent) return null;
        const content = postEvent.getContent();
        return (
            <PostHeader
                body={content.body}
                msgtype={content.msgtype}
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

            <Animated.View style={[
                styles.inputContainer,
                {
                    backgroundColor: theme.surface,
                    borderTopColor: theme.border,
                    bottom: inputBottomAnim
                }
            ]}>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.surfaceVariant, color: theme.text }]}
                    placeholder="Adicione um comentário..."
                    placeholderTextColor={theme.textTertiary}
                    value={inputText}
                    onChangeText={setInputText}
                />
                <TouchableOpacity
                    onPress={handleSendComment}
                    disabled={!inputText.trim() || isSending}
                    style={[styles.sendButton, { opacity: !inputText.trim() && !isSending ? 0.5 : 1 }]}
                >
                    {isSending ? (
                        <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                        <Ionicons name="send" size={24} color={theme.primary} />
                    )}
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    postContainer: {
        marginBottom: 10,
    },
    mediaContainer: {
        width: '100%',
        aspectRatio: 1, // Square or adjust based on content? User said "occupy all horizontal space"
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    media: {
        width: '100%',
        height: '100%',
    },
    captionContainer: {
        padding: 16,
    },
    senderName: {
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 4,
    },
    caption: {
        fontSize: 16,
        lineHeight: 22,
    },
    divider: {
        height: 1,
        width: '100%',
        marginVertical: 10,
    },
    commentsTitle: {
        paddingHorizontal: 16,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 10,
    },
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
    inputContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderTopWidth: 1,
    },
    input: {
        flex: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 10,
        maxHeight: 100,
        minHeight: 50,
        marginBottom: 15,
    },
    sendButton: {
        padding: 5,
        marginBottom: 15,
    },
});
