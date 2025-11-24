import { useTheme } from '@src/contexts/ThemeContext';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

export const PostSkeleton: React.FC = () => {
    const { theme } = useTheme();
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    return (
        <Animated.View style={[styles.container, { opacity }]}>
            {/* Skeleton da mídia (imagem/vídeo) */}
            <View style={[styles.mediaSkeleton, { backgroundColor: theme.surface }]} />
        </Animated.View>
    );
};

export const CommentSkeleton: React.FC = () => {
    const { theme } = useTheme();
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    return (
        <Animated.View style={[styles.commentContainer, { opacity }]}>
            <View style={styles.commentRow}>
                {/* Avatar skeleton */}
                <View style={[styles.avatarSkeleton, { backgroundColor: theme.surface }]} />

                <View style={styles.commentContent}>
                    {/* Nome skeleton */}
                    <View style={[styles.nameSkeleton, { backgroundColor: theme.surface }]} />

                    {/* Texto skeleton */}
                    <View style={[styles.textSkeleton, { backgroundColor: theme.surface }]} />
                    <View style={[styles.textSkeleton, { backgroundColor: theme.surface, width: '70%' }]} />
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    mediaSkeleton: {
        width: '100%',
        height: 400,
        borderRadius: 12,
    },
    commentContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    commentRow: {
        flexDirection: 'row',
        gap: 12,
    },
    avatarSkeleton: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    commentContent: {
        flex: 1,
        gap: 8,
    },
    nameSkeleton: {
        width: 120,
        height: 14,
        borderRadius: 4,
    },
    textSkeleton: {
        width: '100%',
        height: 12,
        borderRadius: 4,
    },
});
