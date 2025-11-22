// app/src/components/AuthenticatedImage.tsx

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ImageProps, StyleSheet, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { mediaCacheService } from '../services/MediaCacheService';

interface AuthenticatedImageProps extends Omit<ImageProps, 'source'> {
    mxcUrl: string;
}

export const AuthenticatedImage: React.FC<AuthenticatedImageProps> = ({ mxcUrl, style, ...props }) => {
    const [imageData, setImageData] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);
    const { client } = useAuth();

    useEffect(() => {
        const fetchImage = async () => {
            if (!client || !mxcUrl) {
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                setError(false);

                // 1. Tenta pegar do cache primeiro
                const cachedPath = await mediaCacheService.getCachedPath(mxcUrl);
                if (cachedPath) {
                    // console.log('🖼️ Using cached image:', cachedPath);
                    setImageData(cachedPath);
                    setIsLoading(false);
                    return;
                }

                // 2. Se não tiver, faz download e cache
                // Extrai server e mediaId do MXC URL
                const match = mxcUrl.match(/^mxc:\/\/([^\/]+)\/(.+)$/);
                if (!match) {
                    throw new Error('Invalid MXC URL');
                }

                const [, serverName, mediaId] = match;
                const baseUrl = (client as any).baseUrl;

                // Endpoint autenticado Matrix 1.11
                const authenticatedUrl = `${baseUrl}/_matrix/client/v1/media/download/${serverName}/${mediaId}`;

                // Faz fetch com Authorization header
                const accessToken = (client as any).getAccessToken();

                // console.log('🖼️ Downloading image:', authenticatedUrl);

                // Usa o serviço de cache para baixar e salvar
                const localUri = await mediaCacheService.downloadAndCache(
                    authenticatedUrl,
                    `Bearer ${accessToken}`
                );

                setImageData(localUri);

            } catch (err) {
                console.error('Error fetching authenticated image:', err);
                setError(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchImage();
    }, [mxcUrl, client]);

    if (isLoading) {
        return (
            <View style={[styles.container, style]}>
                <ActivityIndicator size="small" color="#007bff" />
            </View>
        );
    }

    if (error || !imageData) {
        return (
            <View style={[styles.container, styles.errorContainer, style]}>
                {/* Placeholder para erro */}
            </View>
        );
    }

    return (
        <Image
            source={{ uri: imageData }}
            style={style}
            {...props}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
    },
    errorContainer: {
        backgroundColor: '#e0e0e0',
    },
});
