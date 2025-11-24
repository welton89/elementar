import { Ionicons } from '@expo/vector-icons';
import { AuthenticatedImage } from '@src/components/AuthenticatedImage';
import { AuthenticatedVideo } from '@src/components/AuthenticatedVideo';
import { useTheme } from '@src/contexts/ThemeContext';
import { SimpleMessage } from '@src/types/chat';
import { ResizeMode, Video } from 'expo-av';
import React from 'react';
import { Animated, Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';

interface PostMuralProps {
    message: SimpleMessage;
    width: number;
    onPress: (message: SimpleMessage) => void;
    onPeekChange?: (isPeeking: boolean) => void;
}

export const PostMural: React.FC<PostMuralProps> = ({ message, width, onPress, onPeekChange }) => {
    const { theme } = useTheme();
    const [isPeeking, setIsPeeking] = React.useState(false);
    const opacity = React.useRef(new Animated.Value(0)).current;
    const peekTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const isImage = message.msgtype === 'm.image';
    const isVideo = message.msgtype === 'm.video';

    if (!isImage && !isVideo) return null;

    // Animate opacity when peeking changes
    React.useEffect(() => {
        if (isPeeking) {
            Animated.timing(opacity, {
                toValue: 1,
                duration: 150, // Fast fade in
                useNativeDriver: true,
            }).start();
        } else {
            opacity.setValue(0);
        }
    }, [isPeeking]);

    const handlePressIn = () => {
        peekTimerRef.current = setTimeout(() => {
            setIsPeeking(true);
            if (onPeekChange) onPeekChange(true);
        }, 500);
    };

    const handlePressOut = () => {
        if (peekTimerRef.current) {
            clearTimeout(peekTimerRef.current);
            peekTimerRef.current = null;
        }
        setIsPeeking(false);
        if (onPeekChange) onPeekChange(false);
    };

    return (
        <>
            <Pressable
                onPress={() => {
                    if (!isPeeking) {
                        onPress(message);
                    }
                }}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                // Allow dragging finger far outside the element without cancelling the press
                pressRetentionOffset={{ top: 500, left: 500, bottom: 500, right: 500 }}
                style={({ pressed }) => {
                    const isSyncing = message.eventId.startsWith('~') || message.eventId.startsWith('temp_');
                    return [
                        styles.container,
                        {
                            width,
                            height: width,
                            borderColor: theme.background,
                            opacity: isSyncing ? 0.5 : (pressed && !isPeeking ? 0.8 : 1)
                        }
                    ];
                }}
            >
                {isImage && message.imageUrl && (
                    <AuthenticatedImage
                        mxcUrl={message.imageUrl}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                    />
                )}

                {isVideo && (
                    <View style={{ width: '100%', height: '100%' }}>
                        {message.thumbnailUrl ? (
                            <AuthenticatedImage
                                mxcUrl={message.thumbnailUrl}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="cover"
                            />
                        ) : (
                            message.videoUrl && (
                                <Video
                                    source={{ uri: message.videoUrl }}
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode={ResizeMode.COVER}
                                    shouldPlay={false}
                                    isMuted={true}
                                    useNativeControls={false}
                                />
                            )
                        )}

                        <View style={styles.videoIndicator}>
                            <Ionicons name="play" size={24} color="rgba(255,255,255,0.8)" />
                        </View>
                    </View>
                )}
            </Pressable>

            {/* Peek Modal */}
            <Modal
                visible={isPeeking}
                transparent={true}
                animationType="fade"
                statusBarTranslucent
            >
                <Animated.View style={[styles.modalContainer, { opacity }]}>
                    {isImage && message.imageUrl && (
                        <AuthenticatedImage
                            mxcUrl={message.imageUrl}
                            style={[styles.fullScreenMedia, { borderRadius: 10 }]}
                            resizeMode="contain"
                        />
                    )}

                    {isVideo && message.videoUrl && (
                        <AuthenticatedVideo
                            mxcUrl={message.videoUrl}
                            style={{
                                width: Dimensions.get('window').width,
                                //height: Dimensions.get('window').height - 32,
                            }}
                            shouldPlay={true}
                            isMuted={false}
                            useNativeControls={true}
                        />
                    )}
                </Animated.View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        borderWidth: 1,

    },
    videoIndicator: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',

    },
    fullScreenMedia: {
        minWidth: Dimensions.get('window').width,
        minHeight: Dimensions.get('window').height,

    }
});
