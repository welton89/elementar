// app/src/components/AuthenticatedImage.tsx

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ImageProps, StyleSheet, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

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

                console.log('Tentando endpoint autenticado Matrix 1.11:', authenticatedUrl);

                // Faz fetch com Authorization header
                const accessToken = (client as any).getAccessToken();
                const response = await fetch(authenticatedUrl, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                });

                console.log('Resposta:', response.status);

                if (response.ok) {
                    // Converte para blob e depois para base64
                    const blob = await response.blob();
                    const reader = new FileReader();

                    reader.onloadend = () => {
                        const base64data = reader.result as string;
                        setImageData(base64data);
                        setIsLoading(false);
                    };

                    reader.onerror = () => {
                        setError(true);
                        setIsLoading(false);
                    };

                    reader.readAsDataURL(blob);
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }

            } catch (err) {
                console.error('Error fetching authenticated image:', err);
                setError(true);
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
            {...props}
            source={{ uri: imageData }}
            style={style}
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
        backgroundColor: '#ffebee',
    },
});
