// src/contexts/ChatContext.tsx (Versão Final para E2EE)

import { EventType, MatrixEvent, MsgType, Room } from 'matrix-js-sdk';
import { useCallback, useEffect, useState } from 'react';
import { ChatContextType, SimpleMessage } from '../types/chat';
import { useAuth } from './AuthContext';

// ----------------------------------------------------------------------
// LÓGICA DE TRANSFORMAÇÃO DE MENSAGENS (CORRIGIDO PARA E2EE)
// ----------------------------------------------------------------------

const mapMatrixEventToSimpleMessage = (event: MatrixEvent, room: Room): SimpleMessage | null => {

    const eventType = event.getType();

    // 1. ⭐️ CORREÇÃO DO FILTRO: Inclui m.room.message (não-criptografado) E m.room.encrypted (criptografado)
    if (eventType !== EventType.RoomMessage && eventType !== EventType.RoomEncryption) {
        // Se não for mensagem de chat (Estado, Redação, Reação, etc.), descarte.
        console.log(`DEBUG: Descartando evento de tipo: ${eventType} `);
        return null;
    }

    const senderId = event.getSender();
    const eventId = event.getId();

    if (!senderId || !eventId) {
        return null;
    }

    // 2. Extrai o Conteúdo Decifrado (Clear Content)
    // Se for m.room.encrypted, usamos getClearContent(). Caso contrário, getContent().
    const content = eventType === EventType.RoomEncryption
        ? (event as any).getClearContent() // ⭐️ Acesso forçado para conteúdo decifrado
        : event.getContent();

    // Se for criptografado e não decifrou (o conteúdo limpo não tem msgtype), descarte.
    if (eventType === EventType.RoomEncryption && !content?.msgtype) {
        console.log(`DEBUG: Descartando m.room.encrypted(Decifração Pendente / Falhou).`);
        return null;
    }

    // 3. Processa o Conteúdo
    let messageContent = "";
    let imageUrl: string | undefined;
    let audioUrl: string | undefined;
    let videoUrl: string | undefined;
    let thumbnailUrl: string | undefined;
    let audioDuration: number | undefined;
    const msgtype = content.msgtype;

    // Tenta extrair o corpo principal
    if (content.body && typeof content.body === 'string') {
        messageContent = content.body.trim();
    }

    // Fallback para diferentes tipos de mensagem de chat
    if (msgtype === 'm.image') {
        messageContent = messageContent || "[Imagem]";
        // Armazena MXC URL diretamente (AuthenticatedImage fará o fetch)
        if (content.url && typeof content.url === 'string' && content.url.startsWith('mxc://')) {
            imageUrl = content.url; // Armazena MXC URL
            console.log(`DEBUG: Imagem MXC: ${imageUrl} `);
        } else {
            console.warn("DEBUG: Mensagem m.image sem URL MXC válida:", content);
        }
    } else if (msgtype === 'm.emote') {
        messageContent = `* ${messageContent || content.body || "emote"} * `;
    } else if (msgtype === 'm.audio') {
        // Processa mensagem de áudio
        messageContent = messageContent || "[Áudio]";
        // Armazena MXC URL diretamente (AudioPlayer fará o fetch autenticado)
        if (content.url && typeof content.url === 'string' && content.url.startsWith('mxc://')) {
            audioUrl = content.url; // Armazena MXC URL

            // Extrai duração se disponível
            if (content.info && content.info.duration) {
                audioDuration = content.info.duration;
            }

            console.log(`DEBUG: Áudio MXC: ${audioUrl}, duração: ${audioDuration} ms`);
        }
    } else if (msgtype === 'm.video') {
        // Processa mensagem de vídeo
        messageContent = messageContent || "[Vídeo]";
        if (content.url && typeof content.url === 'string' && content.url.startsWith('mxc://')) {
            videoUrl = content.url; // Armazena MXC URL

            // Tenta extrair thumbnail
            if (content.info && content.info.thumbnail_url) {
                thumbnailUrl = content.info.thumbnail_url;
            }
            console.log(`DEBUG: Vídeo MXC: ${videoUrl}, Thumb: ${thumbnailUrl} `);
        }
    } else if (msgtype && !messageContent) {
        messageContent = `[Mídia / Tipo Desconhecido: ${msgtype.substring(2)}]`;
    }

    if (!messageContent) {
        console.log(`DEBUG: Descartando m.room.message vazia.msgtype: ${msgtype} `);
        return null;
    }

    // 4. Obtém o nome de exibição
    const sender = room.getMember(senderId);
    const senderName = sender?.name || senderId;

    return {
        eventId: eventId,
        senderId: senderId,
        senderName: senderName,
        content: messageContent,
        timestamp: event.getTs(),
        msgtype: msgtype,
        imageUrl: imageUrl,
        audioUrl: audioUrl,
        videoUrl: videoUrl,
        thumbnailUrl: thumbnailUrl,
        audioDuration: audioDuration,
    };
};

// ----------------------------------------------------------------------
// RESTANTE DO CUSTOM HOOK useChat (SEM ALTERAÇÕES)
// ----------------------------------------------------------------------

export const useChat = (roomId: string | undefined): ChatContextType => {
    const { client } = useAuth();
    const [messages, setMessages] = useState<SimpleMessage[]>([]);
    const [roomName, setRoomName] = useState<string | null>(null);
    const [roomAvatarUrl, setRoomAvatarUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [room, setRoom] = useState<Room | null>(null);

    // 1. EFEITO DE INICIALIZAÇÃO E CARREGAMENTO (Scrollback)
    useEffect(() => {
        console.log("DEBUG: useChat - Tentando carregar sala com ID:", roomId);

        if (!client || !roomId) {
            setError(roomId ? null : "ID da Sala não encontrado na URL.");
            setIsLoading(false);
            return;
        }

        const currentRoom = client.getRoom(roomId);
        console.log("DEBUG: useChat - currentRoom encontrado:", !!currentRoom);

        if (!currentRoom) {
            setError(`Sala com ID ${roomId} não encontrada.`);
            setIsLoading(false);
            return;
        }

        setRoom(currentRoom);
        setRoomName(currentRoom.name);

        // Obtém URL do avatar da sala
        const mxcAvatarUrl = currentRoom.getAvatarUrl(client.baseUrl, 100, 100, 'crop');
        // O método getAvatarUrl já retorna HTTP URL em algumas versões, mas vamos garantir que pegamos o MXC se possível
        // Ou usar o mxcUrl direto do evento de estado 'm.room.avatar' se preferir.
        // O SDK geralmente retorna a URL HTTP pronta. Mas para nosso AuthenticatedImage, precisamos do MXC.
        // Vamos tentar pegar o evento de estado diretamente.
        const avatarEvent = currentRoom.currentState.getStateEvents('m.room.avatar', '');
        const avatarMxcUrl = avatarEvent?.getContent()?.url;
        setRoomAvatarUrl(avatarMxcUrl || null);

        setIsLoading(true);
        setError(null);

        const loadInitialTimeline = async () => {
            try {
                console.log("DEBUG: Iniciando scrollback para buscar histórico...");
                // Acesso forçado via as any (para client.scrollback)
                const loaded = await (client as any).scrollback(currentRoom, 20);

                if (!loaded) {
                    console.warn("Não foi possível carregar histórico (scrollback falhou).");
                }

                const rawEvents = currentRoom.getLiveTimeline().getEvents();

                console.log(`DEBUG: Eventos brutos na LiveTimeline após scrollback: ${rawEvents.length} `);

                // Processa eventos mantendo um mapa para lidar com edições
                const messageMap = new Map<string, SimpleMessage>();

                rawEvents.forEach(event => {
                    // Verifica se é uma edição
                    const relation = event.getRelation();
                    if (relation && relation.rel_type === 'm.replace' && relation.event_id) {
                        const targetId = relation.event_id;
                        if (messageMap.has(targetId)) {
                            const original = messageMap.get(targetId)!;
                            const newContent = event.getContent()['m.new_content'];
                            if (newContent && newContent.body) {
                                messageMap.set(targetId, {
                                    ...original,
                                    content: newContent.body,
                                    isEdited: true
                                });
                            }
                        }
                        return; // Não adiciona o evento de edição como mensagem separada
                    }

                    const simpleMsg = mapMatrixEventToSimpleMessage(event, currentRoom);
                    if (simpleMsg) {
                        messageMap.set(simpleMsg.eventId, { ...simpleMsg, status: 'sent' as const });
                    }
                });

                const simpleMessages = Array.from(messageMap.values());

                console.log(`DEBUG: Mensagens válidas para renderização: ${simpleMessages.length} `);

                setMessages(simpleMessages);

            } catch (e) {
                console.error("Erro ao carregar timeline inicial (scrollback falhou):", e);
                setError(e instanceof Error ? e.message : "Falha ao carregar mensagens históricas.");
            } finally {
                setIsLoading(false);
            }
        };

        loadInitialTimeline();

    }, [client, roomId]);

    // 2. EFEITO DE LISTENER PARA NOVAS MENSAGENS (Em tempo real)
    useEffect(() => {
        if (!client || !room) return;

        const timelineUpdateListener = (event: MatrixEvent, roomContext: Room) => {
            if (roomContext.roomId === roomId) {
                const newMessage = mapMatrixEventToSimpleMessage(event, roomContext);
                if (newMessage) {
                    // Evita duplicação: verifica se já existe uma mensagem com este eventId
                    setMessages(prev => {
                        const exists = prev.some(msg => msg.eventId === newMessage.eventId);
                        if (exists) {
                            // Atualiza mensagem existente (caso seja uma confirmação de envio)
                            return prev.map(msg =>
                                msg.eventId === newMessage.eventId
                                    ? { ...newMessage, status: 'sent' as const }
                                    : msg
                            );
                        }
                        // Adiciona nova mensagem
                        return [...prev, { ...newMessage, status: 'sent' as const }];
                    });
                }
            }
        };

        client.on("Room.timeline" as any, timelineUpdateListener);

        return () => {
            client.removeListener("Room.timeline" as any, timelineUpdateListener);
        };
    }, [client, room, roomId]);


    // 3. FUNÇÃO DE ENVIO
    const sendMessage = useCallback(async (content: string) => {
        if (!client || !roomId || !content.trim()) return;

        // Cria mensagem otimista (aparece instantaneamente)
        const tempId = `temp_${Date.now()}_${Math.random()} `;
        const optimisticMessage: SimpleMessage = {
            eventId: tempId,
            senderId: client.getUserId() || '',
            senderName: 'Você',
            content: content.trim(),
            timestamp: Date.now(),
            msgtype: 'm.text',
            status: 'sending',
        };

        // Adiciona mensagem otimista à lista
        setMessages(prev => [...prev, optimisticMessage]);

        try {
            const response = await client.sendMessage(roomId, {
                msgtype: MsgType.Text,
                body: content.trim(),
            });

            // Remove mensagem otimista e deixa o listener adicionar a mensagem real do servidor
            setMessages(prev => prev.filter(msg => msg.eventId !== tempId));

            console.log("Mensagem enviada com sucesso:", response.event_id);
        } catch (e) {
            console.error("Erro ao enviar mensagem:", e);

            // Marca como falha
            setMessages(prev => prev.map(msg =>
                msg.eventId === tempId
                    ? { ...msg, status: 'failed' as const }
                    : msg
            ));

            setError("Falha ao enviar mensagem.");
        }
    }, [client, roomId]);

    // 4. FUNÇÃO DE RECIBO DE LEITURA
    const sendReadReceipt = useCallback(async (event: MatrixEvent) => {
        if (!client || !roomId || !event) return;

        const eventId = event.getId();
        // Validação: Só envia recibo para eventos com ID válido (começam com $)
        // Ignora eventos locais/otimistas (que geralmente não têm $ ou são temporários)
        if (!eventId || !eventId.startsWith('$')) {
            console.log(`DEBUG: Ignorando recibo de leitura para evento local/inválido: ${eventId}`);
            return;
        }

        try {
            // Verifica se já enviamos recibo para este evento ou um posterior
            // O SDK geralmente lida com isso, mas podemos evitar chamadas desnecessárias
            const receiptType = 'm.read';

            // Envia o recibo de leitura para o servidor
            // Isso atualiza o contador de não lidas no servidor e notifica outros clientes
            await client.sendReadReceipt(event, receiptType as any);
            console.log(`DEBUG: Recibo de leitura enviado para evento ${eventId} `);
        } catch (error) {
            console.error("Erro ao enviar recibo de leitura:", error);
        }
    }, [client, roomId]);

    // 5. EFEITO PARA MARCAR MENSAGENS COMO LIDAS AO ENTRAR OU RECEBER
    useEffect(() => {
        if (!room || messages.length === 0) return;

        // Pega o último evento da timeline da sala (que corresponde à última mensagem)
        // Nota: 'messages' é nossa lista simplificada. Precisamos do MatrixEvent real.
        // O objeto 'room' tem a timeline.
        const liveTimeline = room.getLiveTimeline();
        const events = liveTimeline.getEvents();

        if (events.length > 0) {
            const lastEvent = events[events.length - 1];

            // Se o último evento não for nosso (opcional, mas geralmente marcamos tudo como lido)
            // e se for uma mensagem que conta para unread (não é apenas um state event qualquer)
            if (lastEvent.getType() === 'm.room.message' || lastEvent.getType() === 'm.room.encrypted') {
                sendReadReceipt(lastEvent);
            }
        }
    }, [room, messages, sendReadReceipt]); // Executa quando mensagens mudam (novas mensagens)

    // 6. LISTENERS DE EVENTOS (TIMELINE)
    useEffect(() => {
        if (!client || !room) return;

        const timelineUpdateListener = (event: MatrixEvent, roomContext: Room) => {
            if (roomContext.roomId === roomId) {
                // Verifica se é uma edição (m.replace)
                const relation = event.getRelation();
                if (relation && relation.rel_type === 'm.replace' && relation.event_id) {
                    const targetEventId = relation.event_id;
                    const newContent = event.getContent()['m.new_content'];

                    if (newContent && newContent.body) {
                        console.log(`DEBUG: Recebida edição para mensagem ${targetEventId}`);
                        setMessages(prev => prev.map(msg =>
                            msg.eventId === targetEventId
                                ? { ...msg, content: newContent.body, isEdited: true }
                                : msg
                        ));
                        return; // Não adiciona o evento de edição como nova mensagem
                    }
                }

                const newMessage = mapMatrixEventToSimpleMessage(event, roomContext);
                if (newMessage) {
                    // Evita duplicação: verifica se já existe uma mensagem com este eventId
                    setMessages(prev => {
                        const exists = prev.some(msg => msg.eventId === newMessage.eventId);
                        if (exists) {
                            // Atualiza mensagem existente (caso seja uma confirmação de envio)
                            return prev.map(msg =>
                                msg.eventId === newMessage.eventId
                                    ? { ...newMessage, status: 'sent' as const }
                                    : msg
                            );
                        }
                        // Adiciona nova mensagem
                        return [...prev, { ...newMessage, status: 'sent' as const }];
                    });
                }
            }
        };

        client.on("Room.timeline" as any, timelineUpdateListener);

        return () => {
            client.removeListener("Room.timeline" as any, timelineUpdateListener);
        };
    }, [client, room, roomId]);


    // 7. FUNÇÃO DE ENVIO DE IMAGEM
    const sendImage = useCallback(async (uri: string, filename: string) => {
        if (!client || !roomId) return;

        try {
            console.log("Enviando imagem:", filename);

            // Faz upload da imagem
            const response = await fetch(uri);
            const blob = await response.blob();

            // Upload para o servidor Matrix
            const uploadResponse = await (client as any).uploadContent(blob, {
                name: filename,
                type: blob.type || 'image/jpeg',
            });

            // Envia mensagem com a imagem
            await client.sendMessage(roomId, {
                msgtype: MsgType.Image,
                body: filename,
                url: uploadResponse.content_uri,
                info: {
                    mimetype: blob.type || 'image/jpeg',
                    size: blob.size,
                },
            });

            console.log("Imagem enviada com sucesso!");
        } catch (e) {
            console.error("Erro ao enviar imagem:", e);
            setError("Falha ao enviar imagem.");
        }
    }, [client, roomId]);

    // 5. FUNÇÃO DE ENVIO DE ARQUIVO
    const sendFile = useCallback(async (uri: string, filename: string, mimeType: string) => {
        if (!client || !roomId) return;

        try {
            console.log("Enviando arquivo:", filename);

            // Faz upload do arquivo
            const response = await fetch(uri);
            const blob = await response.blob();

            // Upload para o servidor Matrix
            const uploadResponse = await (client as any).uploadContent(blob, {
                name: filename,
                type: mimeType,
            });

            // Envia mensagem com o arquivo
            await client.sendMessage(roomId, {
                msgtype: MsgType.File,
                body: filename,
                url: uploadResponse.content_uri,
                info: {
                    mimetype: mimeType,
                    size: blob.size,
                },
            });

            console.log("Arquivo enviado com sucesso!");
        } catch (e) {
            console.error("Erro ao enviar arquivo:", e);
            setError("Falha ao enviar arquivo.");
        }
    }, [client, roomId]);

    // 6. FUNÇÃO DE ENVIO DE ÁUDIO
    const sendAudio = useCallback(async (uri: string, duration: number) => {
        if (!client || !roomId) return;

        try {
            console.log("Enviando áudio:", uri);

            // Faz upload do áudio
            const response = await fetch(uri);
            const blob = await response.blob();

            // Upload para o servidor Matrix
            const uploadResponse = await (client as any).uploadContent(blob, {
                name: `audio_${Date.now()}.m4a`,
                type: 'audio/m4a',
            });

            // Envia mensagem com o áudio
            await client.sendMessage(roomId, {
                msgtype: MsgType.Audio,
                body: `Áudio(${Math.floor(duration / 1000)}s)`,
                url: uploadResponse.content_uri,
                info: {
                    mimetype: 'audio/m4a',
                    size: blob.size,
                    duration: duration,
                },
            });

            console.log("Áudio enviado com sucesso!");
        } catch (e) {
            console.error("Erro ao enviar áudio:", e);
            setError("Falha ao enviar áudio.");
        }
    }, [client, roomId]);

    // 7. FUNÇÃO DE ENVIO DE VÍDEO
    const sendVideo = useCallback(async (uri: string, filename: string) => {
        if (!client || !roomId) return;

        try {
            console.log("Enviando vídeo:", filename);

            // Faz upload do vídeo
            const response = await fetch(uri);
            const blob = await response.blob();

            // Upload para o servidor Matrix
            const uploadResponse = await (client as any).uploadContent(blob, {
                name: filename,
                type: blob.type || 'video/mp4',
            });

            // Envia mensagem com o vídeo
            await client.sendMessage(roomId, {
                msgtype: MsgType.Video,
                body: filename,
                url: uploadResponse.content_uri,
                info: {
                    mimetype: blob.type || 'video/mp4',
                    size: blob.size,
                },
            });

            console.log("Vídeo enviado com sucesso!");
        } catch (e) {
            console.error("Erro ao enviar vídeo:", e);
            setError("Falha ao enviar vídeo.");
        }
    }, [client, roomId]);

    // 8. FUNÇÃO DE DELETAR MENSAGEM (REDACT)
    const deleteMessage = useCallback(async (eventId: string) => {
        if (!client || !roomId) return;

        try {
            console.log("Deletando mensagem:", eventId);
            // Redact event
            await client.redactEvent(roomId, eventId);
            console.log("Mensagem deletada com sucesso!");

            // Opcional: Atualizar estado local imediatamente se o listener demorar
            setMessages(prev => prev.filter(msg => msg.eventId !== eventId));

        } catch (e) {
            console.error("Erro ao deletar mensagem:", e);
            setError("Falha ao deletar mensagem.");
        }
    }, [client, roomId]);

    // 9. FUNÇÃO DE EDITAR MENSAGEM
    const editMessage = useCallback(async (eventId: string, newContent: string) => {
        if (!client || !roomId) return;

        try {
            console.log("Editando mensagem:", eventId);

            await client.sendMessage(roomId, {
                msgtype: MsgType.Text,
                body: ` * ${newContent}`, // Convenção para fallback
                "m.new_content": {
                    msgtype: MsgType.Text,
                    body: newContent,
                },
                "m.relates_to": {
                    "rel_type": "m.replace" as any, // Cast to any to avoid type error
                    "event_id": eventId,
                },
            });

            console.log("Mensagem editada com sucesso!");

            // Opcional: Atualizar estado local imediatamente
            setMessages(prev => prev.map(msg =>
                msg.eventId === eventId
                    ? { ...msg, content: newContent }
                    : msg
            ));

        } catch (e) {
            console.error("Erro ao editar mensagem:", e);
            setError("Falha ao editar mensagem.");
        }
    }, [client, roomId]);

    return {
        messages,
        roomName,
        roomAvatarUrl,
        isLoading,
        error,
        sendMessage,
        sendImage,
        sendFile,
        sendAudio,
        sendVideo,
        deleteMessage,
        editMessage,
    };
};