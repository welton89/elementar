import { SimpleMessage } from '@src/types/chat';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, Platform } from 'react-native';

interface UseChatRoomLogicProps {
    client: any;
    roomId: string;
    deleteMessage?: (eventId: string) => Promise<void>;
}

export const useChatRoomLogic = ({ client, roomId, deleteMessage }: UseChatRoomLogicProps) => {
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const inputBottomAnim = useRef(new Animated.Value(0)).current;
    const [menuVisible, setMenuVisible] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<SimpleMessage | null>(null);
    const [editingMessage, setEditingMessage] = useState<SimpleMessage | null>(null);

    // Listen for typing events
    useEffect(() => {
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
    useEffect(() => {
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
                // console.log("Responder:", message.eventId);
                // Implementar lógica de resposta
                break;
            default:
                // console.log("Ação não implementada:", action);
                break;
        }
        setSelectedMessage(null);
    };

    return {
        typingUsers,
        keyboardHeight,
        inputBottomAnim,
        menuVisible,
        setMenuVisible,
        selectedMessage,
        setSelectedMessage,
        editingMessage,
        setEditingMessage,
        handleLongPressMessage,
        handleMenuAction
    };
};
