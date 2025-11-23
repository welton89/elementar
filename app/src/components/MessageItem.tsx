import { AudioPlayer } from '@src/components/AudioPlayer';
import { AuthenticatedImage } from '@src/components/AuthenticatedImage';
import { AuthenticatedVideo } from '@src/components/AuthenticatedVideo';
import { useTheme } from '@src/contexts/ThemeContext';
import { SimpleMessage } from '@src/types/chat';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface MessageItemProps {
    message: SimpleMessage;
    isMe: boolean;
    onLongPress: (message: SimpleMessage) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, isMe, onLongPress }) => {
    const { theme } = useTheme();

    // Ícone de status baseado no status da mensagem
    const getStatusIcon = () => {
        switch (message.status) {
            case 'sending':
                return '🕐'; // Relógio (enviando)
            case 'sent':
                return '✓'; // Check (enviado)
            case 'failed':
                return '❌'; // X (falha)
            default:
                return '✓'; // Padrão: enviado (para mensagens antigas)
        }
    };

    // Formatação de data: HH:mm (hoje) ou dd/MM HH:mm (outros dias)
    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear();

        if (isToday) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        } else {
            return `${date.toLocaleDateString([], { day: '2-digit', month: '2-digit' })} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`;
        }
    };

    const isMediaMessage = message.msgtype === 'm.image' || message.msgtype === 'm.video' || message.msgtype === 'm.audio';
    const hasTextContent = message.content && !isMediaMessage;

    return (
        <View style={[
            isMe ? styles.messageContainerMe : styles.messageContainerOther
        ]}>
            {/* Sender name for non-me messages */}
            {!isMe && !isMediaMessage && (
                <Text style={[styles.messageSender, { color: theme.primary }]}>{message.senderName}</Text>
            )}

            <TouchableOpacity
                onLongPress={() => onLongPress(message)}
                delayLongPress={500}
                activeOpacity={0.9}
                style={[
                    isMediaMessage ? styles.mediaContainer : styles.messageBubble,
                    !isMediaMessage && (isMe ? { ...styles.messageBubbleMe, backgroundColor: theme.messageBubbleMe } : { ...styles.messageBubbleOther, backgroundColor: theme.messageBubbleOther })
                ]}
            >
                {/* Exibe imagem se for m.image */}
                {message.msgtype === 'm.image' && message.imageUrl && (
                    <AuthenticatedImage
                        mxcUrl={message.imageUrl}
                        style={styles.messageImage}
                        resizeMode="cover"
                    />
                )}

                {/* Exibe player de áudio se for m.audio */}
                {message.msgtype === 'm.audio' && message.audioUrl && (
                    <AudioPlayer
                        audioUrl={message.audioUrl}
                        duration={message.audioDuration}
                    />
                )}

                {/* Exibe player de vídeo se for m.video */}
                {message.msgtype === 'm.video' && message.videoUrl && (
                    <AuthenticatedVideo
                        mxcUrl={message.videoUrl}
                        style={styles.messageVideo}
                    />
                )}

                {/* Only show text content for non-media messages */}
                {hasTextContent && (
                    <Text style={[
                        styles.messageContent,
                        isMe ? { color: theme.messageTextMe } : { color: theme.messageTextOther }
                    ]}>{message.content}</Text>
                )}

                {/* Timestamp */}
                <View style={[styles.timestampContainer, isMediaMessage && styles.timestampContainerMedia]}>
                    <Text style={[
                        styles.messageTimestamp,
                        { color: isMediaMessage ? theme.text : theme.textTertiary }
                    ]}>
                        {formatTimestamp(message.timestamp)}
                    </Text>
                    {message.isEdited && (
                        <Text style={{ fontSize: 10, color: isMediaMessage ? theme.text : theme.textTertiary, marginLeft: 4, fontStyle: 'italic' }}>
                            (editado)
                        </Text>
                    )}
                    {isMe && (
                        <Text style={[
                            styles.statusIcon,
                            message.status === 'failed' && styles.statusIconFailed
                        ]}>
                            {getStatusIcon()}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    messageContainerMe: {
        alignSelf: 'flex-end',
        maxWidth: '90%',
        marginBottom: 10,
    },
    messageContainerOther: {
        alignSelf: 'flex-start',
        maxWidth: '90%',
        marginBottom: 10,
    },
    messageBubble: {
        padding: 10,
        borderRadius: 10,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    messageBubbleMe: {
        borderTopRightRadius: 0,
    },
    messageBubbleOther: {
        borderTopLeftRadius: 0,
    },
    mediaContainer: {
        // No background, no padding for media
    },
    messageSender: {
        fontSize: 12,
        marginBottom: 4,
        fontWeight: 'bold',
        paddingLeft: 4,
    },
    messageContent: {
        fontSize: 16,
    },
    messageImage: {
        minWidth: '100%',
        height: 280,
        borderRadius: 12,
    },
    messageVideo: {
        minWidth: '100%',
        height: 280,
        borderRadius: 12,
    },
    timestampContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 4,
    },
    timestampContainerMedia: {
        marginTop: 6,
        paddingHorizontal: 4,
    },
    messageTimestamp: {
        fontSize: 10,
    },
    statusIcon: {
        fontSize: 10,
        marginLeft: 4,
        color: '#999',
    },
    statusIconFailed: {
        color: 'red',
    },
});
