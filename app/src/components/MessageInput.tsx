import { Ionicons } from '@expo/vector-icons';
import { VoiceRecorder } from '@src/components/VoiceRecorder';
import { SimpleMessage } from '@src/types/chat';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface MessageInputProps {
    theme: any;
    onSend: (content: string) => Promise<void>;
    onSendImage?: (uri: string, filename: string) => Promise<void>;
    onSendFile?: (uri: string, filename: string, mimeType: string) => Promise<void>;
    onSendAudio?: (uri: string, duration: number) => Promise<void>;
    onSendVideo?: (uri: string, filename: string) => Promise<void>;
    editingMessage?: SimpleMessage | null;
    onCancelEdit?: () => void;
    onEdit?: (eventId: string, newContent: string) => Promise<void>;
    roomId?: string;
    client?: any;
}

export const MessageInput: React.FC<MessageInputProps> = ({
    theme,
    onSend,
    onSendImage,
    onSendFile,
    onSendAudio,
    onSendVideo,
    editingMessage,
    onCancelEdit,
    onEdit,
    roomId,
    client
}) => {
    const [text, setText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const typingTimeoutRef = React.useRef<any>(null);

    // Preenche o texto quando estiver editando
    React.useEffect(() => {
        if (editingMessage) {
            setText(editingMessage.content);
        } else {
            setText('');
        }
    }, [editingMessage]);

    // Send typing notification
    const sendTypingNotification = (isTyping: boolean) => {
        if (!client || !roomId) return;
        try {
            client.sendTyping(roomId, isTyping, isTyping ? 5000 : 0);
        } catch (error) {
            console.error('Error sending typing notification:', error);
        }
    };

    // Handle text change with typing notification
    const handleTextChange = (newText: string) => {
        setText(newText);

        if (!client || !roomId) return;

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        if (newText.trim()) {
            // Send typing notification
            sendTypingNotification(true);

            // Stop typing after 5 seconds of inactivity
            typingTimeoutRef.current = setTimeout(() => {
                sendTypingNotification(false);
            }, 5000);
        } else {
            // Stop typing if text is empty
            sendTypingNotification(false);
        }
    };

    const handleSend = async () => {
        if (!text.trim()) return;
        setIsSending(true);
        try {
            if (editingMessage && onEdit) {
                await onEdit(editingMessage.eventId, text);
                if (onCancelEdit) onCancelEdit();
            } else {
                await onSend(text);
            }
            setText('');
        } catch (error) {
            console.error("Erro ao enviar/editar:", error);
            alert("Erro ao enviar mensagem");
        } finally {
            setIsSending(false);
        }
    };

    const pickImage = async () => {
        setShowAttachMenu(false);
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            if (onSendImage) {
                await onSendImage(asset.uri, asset.fileName || 'image.jpg');
            }
        }
    };

    const pickVideo = async () => {
        setShowAttachMenu(false);
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            if (onSendVideo) {
                await onSendVideo(asset.uri, asset.fileName || 'video.mp4');
            }
        }
    };

    const pickDocument = async () => {
        setShowAttachMenu(false);
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                if (onSendFile) {
                    await onSendFile(asset.uri, asset.name, asset.mimeType || 'application/octet-stream');
                }
            }
        } catch (err) {
            console.error("Erro ao selecionar documento:", err);
        }
    };

    return (
        <View>
            {showAttachMenu && (
                <View style={[styles.attachMenu, { backgroundColor: theme.surface, borderTopColor: theme.border, borderBottomColor: theme.border }]}>
                    <TouchableOpacity onPress={pickImage} style={styles.attachMenuItem}>
                        <Ionicons name="image" size={24} color={theme.primary} />
                        <Text style={[styles.attachMenuText, { color: theme.text }]}>Imagem</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={pickVideo} style={styles.attachMenuItem}>
                        <Ionicons name="videocam" size={24} color={theme.error} />
                        <Text style={[styles.attachMenuText, { color: theme.text }]}>Vídeo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={pickDocument} style={styles.attachMenuItem}>
                        <Ionicons name="document" size={24} color={theme.warning} />
                        <Text style={[styles.attachMenuText, { color: theme.text }]}>Arquivo</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderTopColor: theme.border, gap: 8, alignItems: 'center' }]}>
                <TouchableOpacity onPress={() => setShowAttachMenu(!showAttachMenu)} style={{ paddingLeft: 5 }}>
                    <Ionicons name={showAttachMenu ? "close-circle" : "add-circle"} size={30} color={theme.primary} />
                </TouchableOpacity>

                <View style={{ flex: 1, marginHorizontal: 5 }}>
                    {editingMessage && (
                        <View style={[styles.editingContainer, { backgroundColor: theme.surfaceVariant }]}>
                            <Text style={[styles.editingText, { color: theme.primary }]}>Editando mensagem</Text>
                            <TouchableOpacity onPress={onCancelEdit}>
                                <Ionicons name="close" size={20} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    )}
                    <TextInput
                        placeholderTextColor={theme.textTertiary}
                        style={[styles.input, { backgroundColor: theme.surfaceVariant, borderColor: theme.border, color: theme.text }]}
                        value={text}
                        onChangeText={handleTextChange}
                        placeholder={editingMessage ? "Edite sua mensagem..." : "Digite uma mensagem..."}
                        multiline
                    />
                </View>

                {text.trim() ? (
                    <TouchableOpacity onPress={handleSend} disabled={isSending} style={styles.sendButton}>
                        <Ionicons name={editingMessage ? "checkmark-circle" : "send"} size={24} color={theme.primary} />
                    </TouchableOpacity>
                ) : (
                    <VoiceRecorder onSendAudio={onSendAudio!} />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end', // Alinha itens na base para suportar crescimento vertical
        padding: 10,
        borderTopWidth: 1,
        paddingBottom: 30,
    },
    input: {
        // flex: 1 removido para evitar comportamento inesperado em coluna
        width: '100%', // Garante que o input ocupe a largura disponível
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 8,
        paddingTop: 8, // Garante padding superior explícito
        marginHorizontal: 10,
        maxHeight: 100,
        minHeight: 45,

    },
    editingContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        alignSelf: 'center',
        paddingHorizontal: 15,
        paddingVertical: 5,
        marginHorizontal: 10,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        minHeight: 55,
        width: '80%',
    },
    editingText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    sendButton: {
        margin: 15,
        //marginBottom: 4, // Alinha com o input
    },
    attachMenu: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 15,
        borderTopWidth: 1,
        borderBottomWidth: 1,
    },
    attachMenuItem: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    attachMenuText: {
        fontSize: 12,
        marginTop: 5,
    },
});
