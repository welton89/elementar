// app/src/components/SkeletonLoader.tsx

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface SkeletonLoaderProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: any;
}

/**
 * SkeletonLoader - Componente de loading animado
 * Cria um efeito de "shimmer" para indicar carregamento
 */
export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
    width = '100%',
    height = 20,
    borderRadius = 4,
    style,
}) => {
    const { theme } = useTheme();
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );

        animation.start();

        return () => animation.stop();
    }, [animatedValue]);

    const opacity = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: theme.placeholder,
                    opacity,
                },
                style,
            ]}
        />
    );
};

/**
 * RoomItemSkeleton - Skeleton específico para item de sala
 */
export const RoomItemSkeleton: React.FC = () => {
    const { theme } = useTheme();

    return (
        <View style={[styles.roomItemContainer, { backgroundColor: theme.surface }]}>
            {/* Avatar skeleton */}
            <SkeletonLoader width={50} height={50} borderRadius={25} />

            {/* Content skeleton */}
            <View style={styles.contentContainer}>
                {/* Room name */}
                <SkeletonLoader width="60%" height={16} style={{ marginBottom: 8 }} />

                {/* Last message */}
                <SkeletonLoader width="80%" height={14} />
            </View>

            {/* Timestamp skeleton */}
            <View style={styles.rightContainer}>
                <SkeletonLoader width={50} height={12} style={{ marginBottom: 8 }} />

                {/* Unread badge skeleton */}
                <SkeletonLoader width={24} height={24} borderRadius={12} style={{ alignSelf: 'flex-end' }} />
            </View>
        </View>
    );
};

/**
 * RoomListSkeleton - Múltiplos skeletons de salas
 */
interface RoomListSkeletonProps {
    count?: number;
}

export const RoomListSkeleton: React.FC<RoomListSkeletonProps> = ({ count = 5 }) => {
    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <RoomItemSkeleton key={`skeleton-${index}`} />
            ))}
        </>
    );
};

const styles = StyleSheet.create({
    roomItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    },
    contentContainer: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    rightContainer: {
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginLeft: 8,
    },
});
