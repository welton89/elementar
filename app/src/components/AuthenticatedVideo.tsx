import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

interface AuthenticatedVideoProps {
    mxcUrl: string;
    style?: any;
    resizeMode?: ResizeMode;
    shouldPlay?: boolean;
    useNativeControls?: boolean;
    isMuted?: boolean;
}

export const AuthenticatedVideo: React.FC<AuthenticatedVideoProps> = ({
    mxcUrl,
    style,
    resizeMode = ResizeMode.CONTAIN,
    shouldPlay = false,
    useNativeControls = true,
    isMuted = false
}) => {
    const { client } = useAuth();
    const [videoSource, setVideoSource] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);
    const [status, setStatus] = useState<any>({});
    const video = useRef<Video>(null);

    useEffect(() => {
        const prepareVideoSource = async () => {
            if (!client || !mxcUrl) return;

            try {
                setIsLoading(true);
                setError(false);

                // Extrai server e mediaId do MXC URL
                // mxc://matrix.org/LDOGrtpsTDzyprJGfWrEdXhi
                const match = mxcUrl.match(/^mxc:\/\/([^\/]+)\/(.+)$/);
                if (!match) {
                    throw new Error('Invalid MXC URL');
                }

                const [, serverName, mediaId] = match;
                const baseUrl = (client as any).baseUrl;

                // CORRETO: Usa o endpoint Matrix 1.11 authenticated media
                // /_matrix/client/v1/media/download/{serverName}/{mediaId}
                const authenticatedUrl = `${baseUrl}/_matrix/client/v1/media/download/${serverName}/${mediaId}`;
                const accessToken = (client as any).getAccessToken();

                console.log('Preparando vídeo autenticado:', authenticatedUrl);

                // Configura o source com headers de autenticação
                setVideoSource({
                    uri: authenticatedUrl,
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                });

            } catch (err) {
                console.error('Error preparing authenticated video:', err);
                setError(true);
            } finally {
                setIsLoading(false);
            }
        };

        prepareVideoSource();
    }, [mxcUrl, client]);

    if (error) {
        return (
            <View style={[styles.container, styles.errorContainer, style]}>
                <Ionicons name="alert-circle" size={32} color="#ff4444" />
                <Text style={styles.errorText}>Erro ao carregar vídeo</Text>
            </View>
        );
    }

    if (!videoSource) {
        return (
            <View style={[styles.container, styles.loadingContainer, style]}>
                <ActivityIndicator size="large" color="#007bff" />
            </View>
        );
    }

    return (
        <View style={[styles.container, style]}>
            <Video
                ref={video}
                style={styles.video}
                source={videoSource}
                useNativeControls={useNativeControls}
                resizeMode={resizeMode}
                isLooping={false}
                shouldPlay={shouldPlay}
                isMuted={isMuted}
                onPlaybackStatusUpdate={status => setStatus(() => status)}
                onLoadStart={() => setIsLoading(true)}
                onLoad={() => setIsLoading(false)}
                onError={(err) => {
                    console.error("Video load error:", err);
                    setError(true);
                    setIsLoading(false);
                }}
            />
            {isLoading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#007bff" />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#000',
        borderRadius: 8,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    loadingContainer: {
        backgroundColor: '#f0f0f0',
    },
    errorContainer: {
        backgroundColor: '#ffebee',
    },
    errorText: {
        color: '#ff4444',
        fontSize: 12,
        marginTop: 4,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
});
