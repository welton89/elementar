import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface VoiceRecorderProps {
    onSendAudio: (uri: string, duration: number) => Promise<void>;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSendAudio }) => {
    const { theme } = useTheme();
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    const startRecording = async () => {
        try {
            console.log('Solicitando permissões...');
            const permission = await Audio.requestPermissionsAsync();

            if (permission.status !== 'granted') {
                console.log('Permissão negada');
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            console.log('Iniciando gravação...');
            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            setRecording(recording);
            setIsRecording(true);
            setRecordingDuration(0);

            // Anima o botão
            Animated.spring(scaleAnim, {
                toValue: 1.2,
                useNativeDriver: true,
            }).start();

            // Inicia contador de duração
            durationInterval.current = setInterval(() => {
                setRecordingDuration(prev => prev + 100);
            }, 100);

            console.log('Gravação iniciada');
        } catch (err) {
            console.error('Falha ao iniciar gravação:', err);
        }
    };

    const stopRecording = async () => {
        if (!recording) return;

        try {
            console.log('Parando gravação...');
            setIsRecording(false);

            // Para contador
            if (durationInterval.current) {
                clearInterval(durationInterval.current);
                durationInterval.current = null;
            }

            // Anima botão de volta
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
            }).start();

            await recording.stopAndUnloadAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
            });

            const uri = recording.getURI();
            console.log('Gravação armazenada em:', uri);

            if (uri) {
                // Envia o áudio
                await onSendAudio(uri, recordingDuration);
            }

            setRecording(null);
            setRecordingDuration(0);
        } catch (err) {
            console.error('Falha ao parar gravação:', err);
        }
    };

    const cancelRecording = async () => {
        if (!recording) return;

        try {
            console.log('Cancelando gravação...');
            setIsRecording(false);

            if (durationInterval.current) {
                clearInterval(durationInterval.current);
                durationInterval.current = null;
            }

            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
            }).start();

            await recording.stopAndUnloadAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
            });

            setRecording(null);
            setRecordingDuration(0);
        } catch (err) {
            console.error('Falha ao cancelar gravação:', err);
        }
    };

    const formatDuration = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    return (
        <View style={styles.container}>
            {isRecording && (
                <View style={[styles.recordingInfo, { backgroundColor: theme.surfaceVariant }]}>
                    <View style={[styles.recordingDot, { backgroundColor: theme.error }]} />
                    <Text style={[styles.durationText, { color: theme.text }]}>{formatDuration(recordingDuration)}</Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, marginLeft: 5 }}>Solte para enviar</Text>
                </View>
            )}

            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <TouchableOpacity
                    style={[
                        styles.micButton,
                        { backgroundColor: isRecording ? theme.error : 'transparent' } // Transparente quando inativo para ficar limpo
                    ]}
                    onPressIn={startRecording}
                    onPressOut={stopRecording}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={isRecording ? "mic" : "mic-outline"}
                        size={24}
                        color={isRecording ? '#fff' : theme.textSecondary}
                    />
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    micButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 8,
        marginRight: 5,
    },
    recordingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    durationText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
