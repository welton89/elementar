import { Ionicons } from '@expo/vector-icons';
import { AuthenticatedImage } from '@src/components/AuthenticatedImage';
import { PostMural } from '@src/components/PostMural';
import { useTheme } from '@src/contexts/ThemeContext';
import { SimpleMessage } from '@src/types/chat';
import { MURAL_STATE_EVENT_TYPE } from '@src/types/rooms';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { MatrixClient, Room } from 'matrix-js-sdk';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Image,
    Modal,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    UIManager,
    View,
    useWindowDimensions
} from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface MuralViewProps {
    roomId: string;
    room: Room;
    client: MatrixClient;
    messages: SimpleMessage[];
    onSendImage: (uri: string, filename: string) => Promise<void>;
    onSendVideo: (uri: string, filename: string) => Promise<void>;
    loadOlderMessages?: () => Promise<boolean>;
    isLoadingOlder?: boolean;
    onRefresh?: () => Promise<void>;
}

export const MuralView: React.FC<MuralViewProps> = ({
    roomId,
    room,
    client,
    messages,
    onSendImage,
    onSendVideo,
    loadOlderMessages,
    isLoadingOlder = false,
    onRefresh,
}) => {
    const { theme } = useTheme();
    const [creatorId, setCreatorId] = useState<string | null>(null);
    const [creatorName, setCreatorName] = useState<string | null>(null);
    const [creatorAvatarUrl, setCreatorAvatarUrl] = useState<string | null>(null);
    const [isOwner, setIsOwner] = useState(false);

    // Posting State
    const [showPostModal, setShowPostModal] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [caption, setCaption] = useState('');
    const { width } = useWindowDimensions();
    const [isPosting, setIsPosting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const screenWidth = Dimensions.get('window').width;
    const columnWidth = screenWidth / 3;

    useEffect(() => {
        const fetchMuralDetails = async () => {
            // 1. Get Creator ID from Mural Event
            const muralEvent = room.currentState.getStateEvents(MURAL_STATE_EVENT_TYPE, '');
            const cId = muralEvent?.getContent()?.created_by;

            if (cId) {
                setCreatorId(cId);
                setIsOwner(cId === client.getUserId());

                // 2. Get Creator Profile
                const user = client.getUser(cId);
                if (user) {
                    setCreatorName(user.displayName || cId);
                    setCreatorAvatarUrl(user.avatarUrl || null);
                } else {
                    // Fallback to room member
                    const member = room.getMember(cId);
                    setCreatorName(member?.name || cId);
                    setCreatorAvatarUrl(member?.getMxcAvatarUrl() || null);
                }
            }
        };

        fetchMuralDetails();
    }, [room, client]);

    const handlePickMedia = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setSelectedMedia(result.assets[0]);
            setShowPostModal(true);
        }
    };

    const handlePost = async () => {
        if (!selectedMedia) return;

        setIsPosting(true);
        try {
            const uri = selectedMedia.uri;
            // Use caption as body if available, otherwise use filename or empty string?
            // Matrix usually expects a body. If we want the caption to be the main text shown, we should use it as body.
            // If no caption, we might want an empty string or just the filename as fallback, 
            // but user requested "if no caption, show nothing".
            // However, 'body' is mandatory in Matrix events. 
            // We can send the filename as body (standard behavior) but in the UI we display body.
            // So if we want to display caption, we should send caption as body.
            // If caption is empty, we send filename as body (so it's valid) but we need to handle display in UI to show nothing if it matches filename?
            // OR we just send the caption as body. If empty, we send "Media" or filename.

            // Better approach: Pass caption to the send function.
            // We need to update onSendImage/onSendVideo signatures or how they use the second arg.
            // Currently: onSendImage(uri, filename)
            // Let's assume the second arg is used as the body/name.

            const bodyContent = caption.trim() ? caption.trim() : (uri.split('/').pop() || 'Media');

            if (selectedMedia.type === 'video') {
                await onSendVideo(uri, bodyContent);
            } else {
                await onSendImage(uri, bodyContent);
            }

            setShowPostModal(false);
            setSelectedMedia(null);
            setCaption('');
        } catch (error) {
            console.error("Erro ao postar:", error);
            alert("Falha ao enviar post.");
        } finally {
            setIsPosting(false);
        }
    };

    // Filter only images and videos for the grid, reversed to show newest first
    // Also filter out messages with temporary IDs (not yet confirmed by server)
    const mediaMessages = messages
        .filter(m => {
            const isMedia = m.msgtype === 'm.image' || m.msgtype === 'm.video';
            const isConfirmed = !m.eventId.startsWith('~') && !m.eventId.startsWith('temp_');
            return isMedia && isConfirmed;
        })
        .reverse();

    // Format followers count (e.g. 1000 -> 1 Mil)
    const formatFollowers = (count: number) => {
        if (count >= 1000000) {
            return (count / 1000000).toFixed(1).replace('.0', '') + ' Mi';
        }
        if (count >= 1000) {
            return (count / 1000).toFixed(1).replace('.0', '') + ' Mil';
        }
        return count.toString();
    };

    const [expandedDesc, setExpandedDesc] = useState(false);
    const [showExpandButton, setShowExpandButton] = useState(false);
    const [collapsedHeight, setCollapsedHeight] = useState(0);
    const [expandedHeight, setExpandedHeight] = useState(0);
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const heightAnim = useRef(new Animated.Value(0)).current;
    const memberCount = room.getJoinedMemberCount();
    const [topic, setTopic] = useState(room.currentState.getStateEvents('m.room.topic', '')?.getContent()?.topic || '');
    const router = useRouter();

    // Reset expand button state when topic changes
    useEffect(() => {
        setShowExpandButton(false);
        setExpandedDesc(false);
        setCollapsedHeight(0);
        setExpandedHeight(0);
        rotateAnim.setValue(0);
        heightAnim.setValue(0);
    }, [topic]);

    // Animate rotation and height when expanding/collapsing
    useEffect(() => {
        if (collapsedHeight > 0 && expandedHeight > 0) {
            Animated.parallel([
                Animated.timing(rotateAnim, {
                    toValue: expandedDesc ? 1 : 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(heightAnim, {
                    toValue: expandedDesc ? expandedHeight : collapsedHeight,
                    duration: 300,
                    useNativeDriver: false,
                }),
            ]).start();
        }
    }, [expandedDesc, collapsedHeight, expandedHeight]);

    const rotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    // Event listener for real-time topic updates
    useEffect(() => {
        const handleStateEvents = (event: any) => {
            const eventType = event.getType();

            if (eventType === 'm.room.topic') {
                const newTopic = event.getContent().topic || '';
                setTopic(newTopic);
                console.log('Mural topic updated:', newTopic);
            }
        };

        room.on('RoomState.events' as any, handleStateEvents);

        return () => {
            room.removeListener('RoomState.events' as any, handleStateEvents);
        };
    }, [room]);

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            {/* Cover Image (Mural Avatar) */}
            <View style={styles.coverContainer}>
                {/* Usando o avatar da sala como capa. Se não tiver, usa um placeholder ou cor */}
                {room.getMxcAvatarUrl() ? (
                    <AuthenticatedImage
                        mxcUrl={room.getMxcAvatarUrl() || ''}
                        style={styles.coverImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.coverImage, { backgroundColor: theme.primary }]} />
                )}
                <View style={styles.coverOverlay} />
            </View>

            {/* Profile Info */}
            <View style={styles.profileInfoContainer}>
                <View style={styles.avatarWrapper}>
                    {creatorAvatarUrl ? (
                        <AuthenticatedImage
                            mxcUrl={creatorAvatarUrl}
                            style={styles.creatorAvatar}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[styles.creatorAvatar, { backgroundColor: theme.surfaceVariant, justifyContent: 'center', alignItems: 'center' }]}>
                            <Text style={{ fontSize: 24, color: theme.text }}>{creatorName?.charAt(0).toUpperCase()}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.textInfo}>
                    <View style={styles.nameRow}>
                        <View style={[{ flexDirection: 'column' }]}>
                            <Text style={[styles.muralName, { color: theme.text }]}>{room.name}</Text>
                            <Text style={[styles.followersLabel, { color: theme.textSecondary }]}>
                                by {creatorName}</Text>
                        </View>


                        <View style={styles.followersContainer}>
                            <Text style={[styles.followersCount, { color: theme.text }]}>
                                {formatFollowers(memberCount)}
                            </Text>
                            <Text style={[styles.followersLabel, { color: theme.textSecondary }]}>
                                seguidores
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Description */}
            {topic ? (
                <View style={styles.descriptionContainer}>
                    {/* Hidden text to measure full line count */}
                    <View style={{ position: 'absolute', opacity: 0 }}>
                        <Text
                            style={[styles.description, { color: theme.text }]}
                            onTextLayout={(e) => {
                                const { lines } = e.nativeEvent;
                                console.log('Full topic lines detected:', lines.length);
                                if (lines.length > 3 && !showExpandButton) {
                                    console.log('Setting showExpandButton to true');
                                    setShowExpandButton(true);
                                }
                            }}
                        >
                            {topic}
                        </Text>
                    </View>

                    {/* Measure collapsed height (3 lines) */}
                    <View
                        style={{ position: 'absolute', opacity: 0 }}
                        onLayout={(e) => {
                            const height = e.nativeEvent.layout.height;
                            if (height > 0 && collapsedHeight === 0) {
                                setCollapsedHeight(height);
                                heightAnim.setValue(height);
                            }
                        }}
                    >
                        <Text
                            style={[styles.description, { color: theme.text }]}
                            numberOfLines={3}
                        >
                            {topic}
                        </Text>
                    </View>

                    {/* Measure expanded height (full text) */}
                    <View
                        style={{ position: 'absolute', opacity: 0 }}
                        onLayout={(e) => {
                            const height = e.nativeEvent.layout.height;
                            if (height > 0 && expandedHeight === 0) {
                                setExpandedHeight(height);
                            }
                        }}
                    >
                        <Text style={[styles.description, { color: theme.text }]}>
                            {topic}
                        </Text>
                    </View>

                    {/* Visible animated text */}
                    <Animated.View style={{ height: heightAnim, overflow: 'hidden' }}>
                        <Text
                            style={[styles.description, { color: theme.text }]}
                            numberOfLines={expandedDesc ? undefined : 3}
                        >
                            {topic}
                        </Text>
                    </Animated.View>

                    {showExpandButton && (
                        <TouchableOpacity
                            onPress={() => setExpandedDesc(!expandedDesc)}
                            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}
                        >
                            <Text style={[styles.expandText, { color: theme.primary }]}>
                                {expandedDesc ? 'Ver menos' : 'Ver mais'}
                            </Text>
                            <Animated.View style={{ transform: [{ rotate }], marginLeft: 4 }}>
                                <Ionicons name="chevron-down" size={16} color={theme.primary} />
                            </Animated.View>
                        </TouchableOpacity>
                    )}
                </View>
            ) : null}
        </View>
    );

    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <View style={[styles.container, { backgroundColor: theme.background, filter: isModalOpen ? 'blur(4px)' : 'none' }]}>
            <Stack.Screen
                options={{
                    headerTitle: () => (
                        <TouchableOpacity
                            onPress={() => router.push(`/room-settings/${roomId}`)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                        >
                            {room.getMxcAvatarUrl() ? (
                                <AuthenticatedImage
                                    mxcUrl={room.getMxcAvatarUrl() || ''}
                                    style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.placeholder }}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center' }}>
                                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
                                        {room.name ? room.name.charAt(0).toUpperCase() : '?'}
                                    </Text>
                                </View>
                            )}
                            <View>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>{room.name || 'Mural'}</Text>
                                <Text style={[styles.followersLabel, { color: theme.textSecondary }]}>
                                    by {creatorName}</Text>
                            </View>
                        </TouchableOpacity>
                    ),
                    headerTitleAlign: 'left',
                    headerStyle: {
                        backgroundColor: theme.surface,
                    },
                    headerShadowVisible: false,
                    headerTintColor: theme.text,
                }}
            />

            <FlatList
                data={mediaMessages}
                keyExtractor={item => item.eventId}
                numColumns={3}
                scrollEnabled={!isModalOpen}
                renderItem={({ item }) => (
                    <PostMural
                        message={item}
                        width={width / 3}
                        onPress={(msg) => {
                            // Don't navigate if event ID is temporary (starts with ~)
                            if (msg.eventId.startsWith('~') || msg.eventId.startsWith('temp_')) {
                                console.log('Cannot open post with temporary event ID:', msg.eventId);
                                return;
                            }
                            router.push(`/room/${roomId}/post/${msg.eventId}`);
                        }}
                        onPeekChange={setIsModalOpen}
                    />
                )}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={{ paddingBottom: 80 }}
                refreshControl={
                    onRefresh ? (
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={async () => {
                                setRefreshing(true);
                                await onRefresh();
                                setRefreshing(false);
                            }}
                            tintColor={theme.primary}
                            colors={[theme.primary]}
                        />
                    ) : undefined
                }
                onEndReached={async () => {
                    if (loadOlderMessages && !isLoadingOlder && !refreshing) {
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
            />

            {/* FAB for Owner */}
            {isOwner && (
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: theme.primary }]}
                    onPress={handlePickMedia}
                >
                    <Ionicons name="add" size={30} color="#fff" />
                </TouchableOpacity>
            )}

            {/* Post Modal */}
            <Modal visible={showPostModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Novo Post</Text>

                        {selectedMedia && (
                            <Image
                                source={{ uri: selectedMedia.uri }}
                                style={styles.previewImage}
                            />
                        )}

                        <TextInput
                            style={[styles.captionInput, { color: theme.text, backgroundColor: theme.surfaceVariant }]}
                            placeholder="Escreva uma legenda..."
                            placeholderTextColor={theme.textTertiary}
                            value={caption}
                            onChangeText={setCaption}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setShowPostModal(false)} style={styles.modalButton}>
                                <Text style={{ color: theme.error }}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handlePost} style={styles.modalButton} disabled={isPosting}>
                                {isPosting ? <ActivityIndicator /> : <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Postar</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        //filter: 'blur(2px)',
    },
    headerContainer: {
        marginBottom: 20,
    },
    coverContainer: {
        height: 150,
        width: '100%',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    coverOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    profileInfoContainer: {
        paddingHorizontal: 16,
        marginTop: -40, // Pull up avatar
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    avatarWrapper: {
        padding: 4,
        backgroundColor: '#000', // Should match theme background ideally, but hardcoded for now to match reference roughly
        borderRadius: 50,
    },
    creatorAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    textInfo: {
        flex: 1,
        marginLeft: 12,
        marginBottom: 5,
        justifyContent: 'center',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingRight: 16,
    },
    muralName: {
        fontSize: 20,
        fontWeight: 'bold',
        flex: 1, // Permite que o nome ocupe o espaço necessário
        marginRight: 10,
    },
    followersContainer: {
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
    },
    followersCount: {
        fontSize: 18,
        // fontWeight: 'bold',
    },
    followersLabel: {
        fontSize: 12,
    },
    descriptionContainer: {
        paddingHorizontal: 16,
        marginBottom: 15,
        marginTop: 10,
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
    },
    expandText: {
        fontSize: 14,
        marginTop: 4,
        fontWeight: '600',
    },
    fab: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        borderRadius: 20,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    previewImage: {
        width: '100%',
        height: 200,
        borderRadius: 10,
        marginBottom: 15,
        resizeMode: 'cover',

    },
    captionInput: {
        padding: 10,
        borderRadius: 10,
        marginBottom: 15,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 20,
    },
    modalButton: {
        padding: 10,
    }
});
