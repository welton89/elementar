// app/src/components/AudioPlayer.tsx

import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface AudioPlayerProps {
    audioUrl: string; // MXC URL
    duration?: number;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, duration }) => {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPosition, setCurrentPosition] = useState(0);
    const [totalDuration, setTotalDuration] = useState(duration || 0);
    const [authenticatedAudioUrl, setAuthenticatedAudioUrl] = useState<string | null>(null);
    const { client } = useAuth();
    const { theme } = useTheme();

    useEffect(() => {
        return () => {
            // Cleanup: unload sound when component unmounts
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [sound]);

    // Fetch authenticated audio URL
    useEffect(() => {
        const fetchAuthenticatedAudio = async () => {
            if (!client || !audioUrl) return;

            try {
                // Extrai server e mediaId do MXC URL
                const match = audioUrl.match(/^mxc:\/\/([^\/]+)\/(.+)$/);
                if (!match) {
                    console.error('Invalid MXC URL:', audioUrl);
                    return;
                }

                const [, serverName, mediaId] = match;
                const baseUrl = (client as any).baseUrl;

                // Usa endpoint Matrix 1.11 authenticated media
                const authenticatedUrl = `${baseUrl}/_matrix/client/v1/media/download/${serverName}/${mediaId}`;

                console.log('Fetching authenticated audio:', authenticatedUrl);

                // Faz fetch com Authorization header
                const accessToken = (client as any).getAccessToken();
                const response = await fetch(authenticatedUrl, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                });

                if (response.ok) {
                    // Converte para blob e depois para data URL
                    const blob = await response.blob();
                    const reader = new FileReader();

                    reader.onloadend = () => {
                        const dataUrl = reader.result as string;
                        setAuthenticatedAudioUrl(dataUrl);
                    };

                    reader.readAsDataURL(blob);
                } else {
                    console.error('Failed to fetch audio:', response.status);
                }
            } catch (error) {
                console.error('Error fetching authenticated audio:', error);
            }
        };

        fetchAuthenticatedAudio();
    }, [audioUrl, client]);

    const formatTime = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const playPauseAudio = async () => {
        try {
            if (!sound) {
                if (!authenticatedAudioUrl) {
                    console.log('Áudio ainda não carregado');
                    return;
                }

                // Load and play
                setIsLoading(true);
                console.log('Reproduzindo áudio autenticado');

                const { sound: newSound } = await Audio.Sound.createAsync(
                    { uri: authenticatedAudioUrl },
                    { shouldPlay: true },
                    onPlaybackStatusUpdate
                );

                setSound(newSound);
                setIsPlaying(true);
                setIsLoading(false);
            } else {
                // Toggle play/pause
                const status = await sound.getStatusAsync();
                if (status.isLoaded) {
                    if (isPlaying) {
                        await sound.pauseAsync();
                        setIsPlaying(false);
                    } else {
                        // Se o áudio terminou, reinicia
                        if (status.positionMillis === status.durationMillis) {
                            await sound.replayAsync();
                        } else {
                            await sound.playAsync();
                        }
                        setIsPlaying(true);
                    }
                }
            }
        } catch (error) {
            console.error('Erro ao reproduzir áudio:', error);
            setIsLoading(false);
            setIsPlaying(false);
        }
    };

    const onPlaybackStatusUpdate = (status: any) => {
        if (status.isLoaded) {
            setCurrentPosition(status.positionMillis);
            setTotalDuration(status.durationMillis || totalDuration);

            if (status.didJustFinish) {
                setIsPlaying(false);
                setCurrentPosition(0);
            }
        }
    };

    // Generate waveform bars with varied heights
    const waveformBars = React.useMemo(() => {
        const bars = [];
        const barCount = 40;
        for (let i = 0; i < barCount; i++) {
            // Create a more natural waveform pattern
            const baseHeight = Math.sin(i * 0.5) * 8 + 12;
            const randomVariation = Math.random() * 6;
            bars.push(baseHeight + randomVariation);
        }
        return bars;
    }, []);

    const progress = totalDuration > 0 ? currentPosition / totalDuration : 0;

    return (
        <View style={[styles.container, { backgroundColor: theme.surfaceVariant }]}>
            <TouchableOpacity
                style={[styles.playButton, { backgroundColor: theme.primary }]}
                onPress={playPauseAudio}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Ionicons
                        name={isPlaying ? 'pause' : 'play'}
                        size={24}
                        color="#fff"
                        style={!isPlaying && { marginLeft: 2 }} // Adjust play icon position
                    />
                )}
            </TouchableOpacity>

            <View style={styles.contentContainer}>
                <View style={styles.waveformContainer}>
                    {waveformBars.map((height, i) => {
                        const isActive = i < progress * waveformBars.length;
                        return (
                            <View
                                key={i}
                                style={[
                                    styles.waveBar,
                                    {
                                        height: height,
                                        backgroundColor: isActive ? theme.primary : theme.textTertiary,
                                        opacity: isActive ? 1 : 0.3,
                                    }
                                ]}
                            />
                        );
                    })}
                </View>

                <View style={styles.timeContainer}>
                    <Text style={[styles.timeText, { color: theme.text }]}>
                        {formatTime(isPlaying ? currentPosition : totalDuration)}
                    </Text>
                    {isPlaying && (
                        <View style={styles.playingIndicator}>
                            <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        padding: 12,
        gap: 12,
        minWidth: 250,
    },
    playButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    contentContainer: {
        flex: 1,
        gap: 6,
    },
    waveformContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        height: 32,
    },
    waveBar: {
        flex: 1,
        borderRadius: 2,
        minWidth: 2,
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    timeText: {
        fontSize: 13,
        fontWeight: '600',
    },
    playingIndicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
});
