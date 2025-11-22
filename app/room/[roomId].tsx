// app/room/[roomId].tsx

import { Ionicons } from '@expo/vector-icons';
import { MuralView } from '@src/components/MuralView';
import { MURAL_STATE_EVENT_TYPE } from '@src/types/rooms';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Keyboard,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { AudioPlayer } from '../src/components/AudioPlayer';
import { AuthenticatedImage } from '../src/components/AuthenticatedImage';
import { AuthenticatedVideo } from '../src/components/AuthenticatedVideo';
import { VoiceRecorder } from '../src/components/VoiceRecorder';
import { useAuth } from '../src/contexts/AuthContext';
import { useChat } from '../src/contexts/ChatContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { SimpleMessage } from '../src/types/chat';

// ----------------------------------------------------------------------
// 1. COMPONENTE DE ITEM DE MENSAGEM
// ----------------------------------------------------------------------

// ----------------------------------------------------------------------
// 1. COMPONENTE DE ITEM DE MENSAGEM
// ----------------------------------------------------------------------

const MessageItem: React.FC<{ message: SimpleMessage; isMe: boolean; onLongPress: (message: SimpleMessage) => void }> = ({ message, isMe, onLongPress }) => {
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

// ----------------------------------------------------------------------
// 2. COMPONENTE DE ENTRADA DE MENSAGEM
// ----------------------------------------------------------------------

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

const MessageInput: React.FC<MessageInputProps> = ({
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
                        onChangeText={setText}
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

// ----------------------------------------------------------------------
// 2.5. COMPONENTE DE MENU DE AÇÃO DE MENSAGEM
// ----------------------------------------------------------------------

interface MessageActionMenuProps {
    visible: boolean;
    onClose: () => void;
    onAction: (action: string, message: SimpleMessage) => void;
    message: SimpleMessage | null;
}

const MessageActionMenu: React.FC<MessageActionMenuProps> = ({ visible, onClose, onAction, message }) => {
    const { theme } = useTheme();
    if (!message) return null;

    const reactions = ['👍', '👎', '😄', '🎉', '😕', '❤️', '🚀', '👀'];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
                    <View style={[styles.menuContainer, { backgroundColor: theme.surface }]}>
                        {/* Cabeçalho com informações da mensagem (opcional) */}
                        <View style={styles.menuHeader}>
                            <Text style={[styles.menuSender, { color: theme.text }]}>{message.senderName}</Text>
                            <Text style={[styles.menuDate, { color: theme.textSecondary }]}>{new Date(message.timestamp).toLocaleString()}</Text>
                        </View>

                        {/* Preview da mensagem (simplificado) */}
                        <View style={[styles.menuPreview, { backgroundColor: theme.surfaceVariant }]}>
                            {message.msgtype === 'm.image' ? (
                                <Text style={[styles.menuPreviewText, { color: theme.text }]}>[Imagem]</Text>
                            ) : (
                                <Text style={[styles.menuPreviewText, { color: theme.text }]} numberOfLines={2}>{message.content}</Text>
                            )}
                        </View>

                        {/* Linha de Reações */}
                        <View style={styles.reactionsContainer}>
                            {reactions.map(emoji => (
                                <TouchableOpacity key={emoji} style={styles.reactionButton} onPress={() => onAction('react', message)}>
                                    <Text style={styles.reactionText}>{emoji}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Lista de Ações */}
                        <View style={styles.actionList}>
                            <TouchableOpacity style={styles.actionItem} onPress={() => onAction('reply', message)}>
                                <Ionicons name="arrow-undo-outline" size={24} color={theme.textSecondary} />
                                <Text style={[styles.actionText, { color: theme.text }]}>Responder</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionItem} onPress={() => onAction('thread', message)}>
                                <Ionicons name="chatbubble-ellipses-outline" size={24} color={theme.textSecondary} />
                                <Text style={[styles.actionText, { color: theme.text }]}>Responder em thread</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionItem} onPress={() => onAction('react_add', message)}>
                                <Ionicons name="add-circle-outline" size={24} color={theme.textSecondary} />
                                <Text style={[styles.actionText, { color: theme.text }]}>Adicionar Reação</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionItem} onPress={() => onAction('save', message)}>
                                <Ionicons name="arrow-down-outline" size={24} color={theme.textSecondary} />
                                <Text style={[styles.actionText, { color: theme.text }]}>Salvar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionItem} onPress={() => onAction('share', message)}>
                                <Ionicons name="share-social-outline" size={24} color={theme.textSecondary} />
                                <Text style={[styles.actionText, { color: theme.text }]}>Compartilhar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionItem} onPress={() => onAction('remove', message)}>
                                <Ionicons name="close-outline" size={24} color={theme.error} />
                                <Text style={[styles.actionText, { color: theme.error }]}>Remover...</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionItem} onPress={() => onAction('edit', message)}>
                                <Ionicons name="create-outline" size={24} color={theme.textSecondary} />
                                <Text style={[styles.actionText, { color: theme.text }]}>Editar texto</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

// ----------------------------------------------------------------------
// 3. TELA PRINCIPAL DA SALA
// ----------------------------------------------------------------------

export default function RoomScreen() {
    const { theme } = useTheme();
    const { roomId } = useLocalSearchParams<{ roomId: string }>();

    // Passa roomId para o hook useChat
    const {
        messages,
        sendMessage,
        sendImage,     // Corrigido: nome da função no hook é sendImage
        sendFile,      // Corrigido: nome da função no hook é sendFile
        sendAudio,     // Corrigido: nome da função no hook é sendAudio
        sendVideo,     // Adicionado
        deleteMessage, // Adicionado
        editMessage,   // Adicionado
        isLoading,
        // loadMessages removido pois o hook já carrega automaticamente
        roomName,
        roomAvatarUrl
    } = useChat(roomId);

    const { client } = useAuth();
    const router = useRouter();
    const userId = client?.getUserId();

    const flatListRef = useRef<FlatList>(null);
    const [selectedMessage, setSelectedMessage] = useState<SimpleMessage | null>(null);
    const [menuVisible, setMenuVisible] = useState(false);
    const [editingMessage, setEditingMessage] = useState<SimpleMessage | null>(null);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const inputBottomAnim = useRef(new Animated.Value(0)).current;

    // Listen for typing events
    React.useEffect(() => {
        if (!client || !roomId) return;

        const room = client.getRoom(roomId);
        if (!room) return;

        const updateTypingUsers = () => {
            const allMembers = room.currentState.getMembers();
            const typing = allMembers
                .filter((member: any) => member.typing && member.userId !== client.getUserId())
                .map((member: any) => member.userId);
            setTypingUsers(typing);
        };

        const typingListener = () => {
            updateTypingUsers();
        };

        client.on("RoomMember.typing" as any, typingListener);
        updateTypingUsers(); // Initial update

        return () => {
            client.removeListener("RoomMember.typing" as any, typingListener);
        };
    }, [client, roomId]);

    // Keyboard handling
    React.useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                setKeyboardHeight(e.endCoordinates.height);
                Animated.timing(inputBottomAnim, {
                    toValue: e.endCoordinates.height,
                    duration: Platform.OS === 'ios' ? e.duration : 250,
                    useNativeDriver: false,
                }).start();
            }
        );

        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            (e) => {
                setKeyboardHeight(0);
                Animated.timing(inputBottomAnim, {
                    toValue: 0,
                    duration: Platform.OS === 'ios' ? e.duration : 250,
                    useNativeDriver: false,
                }).start();
            }
        );

        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
        };
    }, []);

    const handleLongPressMessage = (message: SimpleMessage) => {
        setSelectedMessage(message);
        setMenuVisible(true);
    };

    const handleSaveMedia = async (message: SimpleMessage) => {
        let mxcUrl: string | null | undefined = message.imageUrl || message.videoUrl || message.audioUrl || message.fileUrl;

        if (!mxcUrl) {
            alert("Não há mídia para salvar nesta mensagem.");
            return;
        }

        if (!mxcUrl.startsWith('mxc://')) {
            alert("URL de mídia inválida.");
            return;
        }

        try {
            // Extrai server e mediaId do MXC URL
            const match = mxcUrl.match(/^mxc:\/\/([^\/]+)\/(.+)$/);
            if (!match) {
                alert("URL MXC inválida.");
                return;
            }

            const [, serverName, mediaId] = match;
            const baseUrl = (client as any).baseUrl;
            const accessToken = client?.getAccessToken();

            // Usa o endpoint autenticado do Matrix
            const authenticatedUrl = `${baseUrl}/_matrix/client/v1/media/download/${serverName}/${mediaId}`;

            // Faz fetch com autenticação
            const response = await fetch(authenticatedUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            // Converte para blob
            const blob = await response.blob();

            // Determina extensão e nome do arquivo
            let extension = "";
            let filename = message.fileName || "download";

            if (message.msgtype === 'm.image') {
                extension = ".jpg";
            } else if (message.msgtype === 'm.video') {
                extension = ".mp4";
            } else if (message.msgtype === 'm.audio') {
                extension = ".mp3";
            } else if (message.msgtype === 'm.file' && message.fileName) {
                const parts = message.fileName.split('.');
                if (parts.length > 1) {
                    extension = '.' + parts[parts.length - 1];
                }
            }

            // Cria FileReader para converter blob em base64
            const reader = new FileReader();

            reader.onloadend = async () => {
                const base64data = reader.result as string;

                // Remove o prefixo data:image/...;base64,
                const base64 = base64data.split(',')[1];

                // Salva no FileSystem
                const fileUri = (FileSystem.cacheDirectory || FileSystem.documentDirectory) + filename + extension;

                await FileSystem.writeAsStringAsync(fileUri, base64, {
                    encoding: FileSystem.EncodingType.Base64,
                });

                if (message.msgtype === 'm.image' || message.msgtype === 'm.video') {
                    // Salva na galeria
                    const { status } = await MediaLibrary.requestPermissionsAsync();
                    if (status !== 'granted') {
                        alert("Permissão para acessar a galeria é necessária.");
                        return;
                    }
                    await MediaLibrary.saveToLibraryAsync(fileUri);
                    alert("Salvo na galeria com sucesso!");
                } else {
                    // Compartilha outros arquivos
                    if (await Sharing.isAvailableAsync()) {
                        await Sharing.shareAsync(fileUri);
                    } else {
                        alert("Compartilhamento não disponível.");
                    }
                }
            };

            reader.onerror = () => {
                alert("Erro ao processar arquivo.");
            };

            reader.readAsDataURL(blob);

        } catch (error) {
            console.error("Erro ao salvar mídia:", error);
            alert("Erro ao salvar mídia.");
        }
    };

    const handleMenuAction = async (action: string, message: SimpleMessage) => {
        setMenuVisible(false);
        switch (action) {
            case 'remove':
                if (deleteMessage) {
                    await deleteMessage(message.eventId);
                }
                break;
            case 'edit':
                if (message.msgtype === 'm.text') {
                    setEditingMessage(message);
                } else {
                    alert("Apenas mensagens de texto podem ser editadas.");
                }
                break;
            case 'save':
                await handleSaveMedia(message);
                break;
            case 'reply':
                console.log("Responder:", message.eventId);
                // Implementar lógica de resposta
                break;
            default:
                console.log("Ação não implementada:", action);
        }
        setSelectedMessage(null);
    };

    // Scroll logic refactored to avoid jumps
    // Removed useEffect with timeout which was causing conflicts

    if (!roomId) return <Text>Room ID missing</Text>;

    const room = client?.getRoom(roomId);
    const isMural = room?.currentState.getStateEvents(MURAL_STATE_EVENT_TYPE, '');

    if (isMural && room && client) {
        return (
            <MuralView
                roomId={roomId}
                room={room}
                client={client}
                messages={messages}
                onSendImage={sendImage}
                onSendVideo={sendVideo}
            />
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen
                options={{
                    headerTitle: () => (
                        <TouchableOpacity
                            onPress={() => router.push(`/room-settings/${roomId}`)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                        >
                            {roomAvatarUrl ? (
                                <AuthenticatedImage
                                    mxcUrl={roomAvatarUrl}
                                    style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.placeholder }}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center' }}>
                                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
                                        {roomName ? roomName.charAt(0).toUpperCase() : '?'}
                                    </Text>
                                </View>
                            )}
                            <View>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>{roomName || 'Chat'}</Text>
                                {typingUsers.length > 0 && (
                                    <Text style={{ fontSize: 12, color: theme.textSecondary, fontStyle: 'italic' }}>
                                        digitando...
                                    </Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    ),
                    headerTitleAlign: 'left',
                    headerStyle: {
                        backgroundColor: theme.surface,
                    },
                    headerShadowVisible: false,
                }}
            />

            {isLoading && messages.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.eventId} // Use eventId which is stable
                    renderItem={({ item }) => (
                        <MessageItem
                            message={item}
                            isMe={item.senderId === userId}
                            onLongPress={handleLongPressMessage}
                        />
                    )}
                    contentContainerStyle={[styles.listContent, { paddingBottom: keyboardHeight + 80 }]}
                    // Scroll to end only when content size changes (new message)
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    // Initial scroll
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
                />
            )}

            <Animated.View style={{ bottom: inputBottomAnim }}>
                <MessageInput
                    theme={theme}
                    onSend={(content) => sendMessage(content)}
                    onSendImage={(uri, filename) => sendImage(uri, filename)}
                    onSendFile={(uri, filename, mimeType) => sendFile(uri, filename, mimeType)}
                    onSendAudio={(uri, duration) => sendAudio(uri, duration)}
                    onSendVideo={(uri, filename) => sendVideo(uri, filename)}
                    editingMessage={editingMessage}
                    onCancelEdit={() => setEditingMessage(null)}
                    onEdit={editMessage}
                    roomId={roomId}
                    client={client}
                />
            </Animated.View>

            <MessageActionMenu
                visible={menuVisible}
                onClose={() => setMenuVisible(false)}
                onAction={handleMenuAction}
                message={selectedMessage}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 10,
        paddingBottom: 20,
    },
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
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    menuContainer: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 40,
    },
    menuHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    menuSender: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    menuDate: {
        fontSize: 12,
    },
    menuPreview: {
        padding: 10,
        borderRadius: 8,
        marginBottom: 20,
    },
    menuPreviewText: {
    },
    reactionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    reactionButton: {
        padding: 5,
    },
    reactionText: {
        fontSize: 24,
    },
    actionList: {
        gap: 15,
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        paddingVertical: 5,
    },
    actionText: {
        fontSize: 16,
    },
});
