import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@src/contexts/ThemeContext';
import { SimpleMessage } from '@src/types/chat';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

interface MessageActionMenuProps {
    visible: boolean;
    onClose: () => void;
    onAction: (action: string, message: SimpleMessage) => void;
    message: SimpleMessage | null;
}

export const MessageActionMenu: React.FC<MessageActionMenuProps> = ({ visible, onClose, onAction, message }) => {
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

const styles = StyleSheet.create({
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
