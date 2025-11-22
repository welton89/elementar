import { Ionicons } from '@expo/vector-icons';
import { AuthenticatedImage } from '@src/components/AuthenticatedImage';
import { useTheme } from '@src/contexts/ThemeContext';
import { SimpleMessage } from '@src/types/chat';
import { ResizeMode, Video } from 'expo-av';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

interface PostMuralProps {
    message: SimpleMessage;
    width: number;
    onPress: (message: SimpleMessage) => void;
}

export const PostMural: React.FC<PostMuralProps> = ({ message, width, onPress }) => {
    const { theme } = useTheme();

    const isImage = message.msgtype === 'm.image';
    const isVideo = message.msgtype === 'm.video';

    if (!isImage && !isVideo) return null;

    return (
        <TouchableOpacity
            onPress={() => onPress(message)}
            style={[styles.container, { width, height: width, borderColor: theme.background }]}
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
                        // Fallback se não tiver thumbnail: tenta mostrar o vídeo pausado (primeiro frame)
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

                    {/* Indicador de vídeo (ícone de play) */}
                    <View style={styles.videoIndicator}>
                        <Ionicons name="play" size={24} color="rgba(255,255,255,0.8)" />
                    </View>
                </View>
            )}
        </TouchableOpacity>
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
    }
});
