import { SimpleMessage } from '@src/types/chat';
import { MatrixEvent } from 'matrix-js-sdk';
import { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Keyboard, Platform } from 'react-native';

interface UsePostDetailsLogicProps {
    client: any;
    roomId: string;
    eventId: string;
}

export const usePostDetailsLogic = ({ client, roomId, eventId }: UsePostDetailsLogicProps) => {
    const [postEvent, setPostEvent] = useState<MatrixEvent | null>(null);
    const [comments, setComments] = useState<SimpleMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);

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

                // If not in timeline, try to fetch it
                if (!event) {
                    console.warn("Event not found in local store, might need fetch");
                }
                setPostEvent(event || null);

                // Load thread (comments)
                const thread = room.getThread(eventId);
                // console.log("DEBUG: Thread object:", thread ? "Found" : "Not Found", eventId);

                if (thread) {
                    // Initial load
                    // console.log("DEBUG: Fetching initial events...");
                    await (thread as any).fetchInitialEvents();
                    // console.log("DEBUG: Initial events fetched. Timeline length:", thread.timeline.length);
                    updateComments(thread.timeline);

                    // Listen for updates
                    thread.on("Thread.update" as any, () => {
                        // console.log("DEBUG: Thread updated. New length:", thread.timeline.length);
                        updateComments(thread.timeline);
                    });
                } else {
                    // console.log("DEBUG: No thread found for event", eventId, "trying manual relations fetch");
                    try {
                        const response = await client.relations(roomId, eventId, 'm.thread', null, { limit: 50 });
                        // console.log("DEBUG: Relations fetched manually:", response);
                        if (response && response.events) {
                            updateComments(response.events);
                        }
                    } catch (err: any) {
                        // Handle 404 errors gracefully - event might not be synced yet
                        if (err?.errcode === 'M_NOT_FOUND' || err?.httpStatus === 404) {
                            console.log("DEBUG: Event not found yet (404), it might be newly created. Will retry in 2 seconds...");
                            // Retry after a delay for newly created posts
                            setTimeout(async () => {
                                try {
                                    const response = await client.relations(roomId, eventId, 'm.thread', null, { limit: 50 });
                                    if (response && response.events) {
                                        updateComments(response.events);
                                    }
                                } catch (retryErr) {
                                    console.log("DEBUG: Retry failed, no comments available yet:", retryErr);
                                    // Silently fail - post exists but has no comments yet
                                }
                            }, 2000);
                        } else {
                            console.error("DEBUG: Error fetching relations:", err);
                        }
                    }
                }

                // Load initial like status
                updateLikeStatus();

            } catch (error) {
                console.error("Error loading post details:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadPostAndComments();

        // Listener para novos comentários em tempo real
        const room = client.getRoom(roomId);
        if (room) {
            const handleNewComment = (event: MatrixEvent, roomContext: any) => {
                if (roomContext.roomId !== roomId) return;

                // Verifica se é um comentário (thread reply) para este post
                const relatesTo = event.getContent()['m.relates_to'];
                if (relatesTo && relatesTo.event_id === eventId && relatesTo.rel_type === 'm.thread') {
                    console.log('New comment detected in real-time:', event.getId());

                    const senderId = event.getSender()!;
                    const member = room.getMember(senderId);

                    const newComment: SimpleMessage = {
                        eventId: event.getId()!,
                        senderId: senderId,
                        senderName: member?.name || senderId,
                        content: event.getContent().body || '',
                        timestamp: event.getTs(),
                        msgtype: event.getContent().msgtype || 'm.text',
                        status: 'sent',
                        isMe: senderId === client?.getUserId(),
                        avatarUrl: member?.getMxcAvatarUrl() || undefined
                    };

                    // Adiciona o novo comentário se não existir
                    setComments(prev => {
                        const exists = prev.some(c => c.eventId === newComment.eventId);
                        if (!exists) {
                            return [...prev, newComment];
                        }
                        return prev;
                    });
                }

                // Verifica se é uma reação ao post
                if (relatesTo && relatesTo.event_id === eventId && relatesTo.rel_type === 'm.annotation') {
                    // Ignora se for reação do próprio usuário (já atualizamos localmente)
                    const userId = client.getUserId();
                    if (event.getSender() !== userId) {
                        updateLikeStatus();
                    }
                }
            };

            client.on('Room.timeline' as any, handleNewComment);

            return () => {
                client.removeListener('Room.timeline' as any, handleNewComment);
            };
        }

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

        // console.log("DEBUG: Updating comments with events:", timelineEvents.length);
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
        // Reverse to show newest comments first
        setComments(mappedComments.reverse());
    };

    // Atualiza o status de curtida do post
    const updateLikeStatus = async () => {
        if (!client || !roomId || !eventId) return;

        try {
            const room = client.getRoom(roomId);
            if (!room) return;

            const postEvent = room.findEventById(eventId);
            if (!postEvent) return;

            const userId = client.getUserId();
            let totalLikes = 0;
            let userLiked = false;

            // Tenta buscar reações agregadas do servidor
            const relations = postEvent.getServerAggregatedRelation('m.annotation');

            if (relations) {
                const likeKey = '❤️';
                if (relations[likeKey]) {
                    totalLikes = relations[likeKey].count || 0;
                    const senders = relations[likeKey].senders || [];
                    userLiked = senders.includes(userId);
                }
            } else {
                // Fallback: busca reações manualmente na timeline
                const timeline = room.getLiveTimeline();
                const events = timeline.getEvents();

                const likeEvents = events.filter((evt: MatrixEvent) => {
                    const content = evt.getContent();
                    const relatesTo = content['m.relates_to'];
                    return (
                        evt.getType() === 'm.reaction' &&
                        relatesTo?.event_id === eventId &&
                        relatesTo?.key === '❤️'
                    );
                });

                totalLikes = likeEvents.length;
                userLiked = likeEvents.some((evt: MatrixEvent) => evt.getSender() === userId);
            }

            console.log('Like status:', { totalLikes, userLiked, userId });
            setLikeCount(totalLikes);
            setIsLiked(userLiked);
        } catch (error) {
            console.error('Error updating like status:', error);
        }
    };

    const handleLike = async () => {
        if (!client || !roomId || !eventId) return;

        try {
            await client.sendEvent(roomId, 'm.reaction', {
                'm.relates_to': {
                    rel_type: 'm.annotation',
                    event_id: eventId,
                    key: '❤️'
                }
            });

            // Atualiza estado local imediatamente
            setIsLiked(true);
            setLikeCount(prev => prev + 1);
        } catch (error) {
            console.error('Error liking post:', error);
        }
    };

    const handleUnlike = async () => {
        if (!client || !roomId || !eventId) return;

        try {
            // Busca reações via API
            const response = await client.relations(roomId, eventId, 'm.annotation', null, { limit: 100 });

            if (response && response.events) {
                const userId = client.getUserId();

                // Encontra a reação de curtida do usuário
                const userLikeReaction = response.events.find((evt: any) => {
                    const content = evt.getContent();
                    return (
                        evt.getSender() === userId &&
                        content['m.relates_to']?.key === '❤️'
                    );
                });

                if (userLikeReaction) {
                    // Remove a reação
                    await client.redactEvent(roomId, userLikeReaction.getId());

                    // Atualiza estado local imediatamente
                    setIsLiked(false);
                    setLikeCount(prev => Math.max(0, prev - 1));
                } else {
                    console.warn('User reaction not found');
                }
            }
        } catch (error) {
            console.error('Error unliking post:', error);
        }
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

    return {
        postEvent,
        comments,
        isLoading,
        inputText,
        setInputText,
        isSending,
        handleSendComment,
        keyboardHeight,
        inputBottomAnim,
        flatListRef,
        isLiked,
        likeCount,
        handleLike,
        handleUnlike,
    };
};
