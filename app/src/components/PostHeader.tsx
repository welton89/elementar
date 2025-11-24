import { Ionicons } from '@expo/vector-icons';
import { AuthenticatedImage } from '@src/components/AuthenticatedImage';
import { AuthenticatedVideo } => {
    import { ResizeMode } from 'expo-av';
    import React, { useRef, useState } from 'react';
    import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
    import { PinchGestureHandler, State } from 'react-native-gesture-handler';

    interface PostHeaderProps {
        body: string;
        msgtype: string;
        url?: string;
        theme: any;
        isLiked?: boolean;
        likeCount?: number;
        onLike?: () => void;
        onUnlike?: () => void;
    }

    export const PostHeader = React.memo(({ body, msgtype, url, theme, isLiked = false, likeCount = 0, onLike, onUnlike }: PostHeaderProps) => {
        const scaleAnim = useRef(new Animated.Value(1)).current;

        // Zoom com pinça
        const scale = useRef(new Animated.Value(1)).current;
        const baseScale = useRef(1);
        const pinchScale = useRef(new Animated.Value(1)).current;
        const [isZooming, setIsZooming] = useState(false);

        const onPinchEvent = Animated.event(
            [{ nativeEvent: { scale: pinchScale } }],
            { useNativeDriver: true }
        );

        const onPinchStateChange = (event: any) => {
            if (event.nativeEvent.oldState === State.ACTIVE) {
                // Quando termina o gesto
                baseScale.current *= event.nativeEvent.scale;
                pinchScale.setValue(1);

                // Retorna ao tamanho normal
                Animated.spring(scale, {
                    toValue: 1,
                    useNativeDriver: true,
                }).start();
                baseScale.current = 1;
                setIsZooming(false);
            } else if (event.nativeEvent.state === State.ACTIVE) {
                setIsZooming(true);
            }
        };

        const handleLikePress = () => {
            // Animação de "pop"
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 1.3,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 100,
                    useNativeDriver: true,
                }),
            ]).start();

            if (isLiked) {
                onUnlike?.();
                name = { isLiked? 'heart': 'heart-outline' }
                size = { 28}
                color = { isLiked? '#ff3b30': theme.text }
                    />
                        </Animated.View >
                    </TouchableOpacity >
        { likeCount > 0 && (
            <Text style={[styles.likeCount, { color: theme.text }]}>
                {likeCount} {likeCount === 1 ? 'curtida' : 'curtidas'}
            </Text>
        )
}
                </View >

    {/* Caption */ }
{
    body && !/\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|mkv|mp3|m4a)$/i.test(body) && (
        <View style={styles.captionContainer}>
            <Text style={[styles.caption, { color: theme.text }]}>
                {body}
            </Text>
        </View>
    )
}

                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                <Text style={[styles.commentsTitle, { color: theme.textSecondary }]}>Comentários</Text>
            </View >
        );
    });

const styles = StyleSheet.create({
    postContainer: {
        marginBottom: 10,
    },
    mediaContainer: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'visible', // Permite que o zoom ultrapasse o container
    },
    zoomableMedia: {
        width: '100%',
        height: '100%',
    },
    zoomedMedia: {
        zIndex: 9999, // Sobrepõe todos os outros componentes
        elevation: 9999, // Para Android
    },
    media: {
        width: '100%',
        height: '100%',
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        gap: 8,
    },
    likeCount: {
        fontSize: 14,
        fontWeight: '600',
    },
    captionContainer: {
        padding: 16,
        paddingTop: 8,
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
});
