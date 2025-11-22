import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@src/contexts/ThemeContext';
import { MURAL_STATE_EVENT_TYPE } from '@src/types/rooms';
import * as ImagePicker from 'expo-image-picker';
import { MatrixClient } from 'matrix-js-sdk';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';

interface CreateMuralModalProps {
    visible: boolean;
    onClose: () => void;
    client: MatrixClient | null;
    onSuccess: () => void;
}

export const CreateMuralModal: React.FC<CreateMuralModalProps> = ({ visible, onClose, client, onSuccess }) => {
    const { theme } = useTheme();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [avatarUri, setAvatarUri] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setAvatarUri(result.assets[0].uri);
        }
    };

    const handleCreate = async () => {
        if (!client || !name.trim()) return;

        setIsLoading(true);
        try {
            // 1. Criar a sala
            const createOptions: any = {
                name: name.trim(),
                topic: description.trim(),
                visibility: isPublic ? 'public' : 'private',
                preset: isPublic ? 'public_chat' : 'private_chat',
                initial_state: [
                    {
                        type: MURAL_STATE_EVENT_TYPE,
                        state_key: '',
                        content: {
                            created_by: client.getUserId(),
                            type: 'mural'
                        }
                    },
                    {
                        type: 'm.room.history_visibility',
                        state_key: '',
                        content: {
                            history_visibility: 'shared' // Members can see history from when they joined
                        }
                    }
                ],
                power_level_content_override: {
                    events_default: 0,  // Allow text messages for everyone (for comments)
                    users_default: 0,   // Default level for members
                    users: {
                        [client.getUserId()!]: 100 // Creator is admin
                    },
                    events: {
                        // Restrict media uploads to admins only (power level 50+)
                        'm.image': 50,   // Only admins can send images
                        'm.video': 50,   // Only admins can send videos  
                        'm.audio': 50,   // Only admins can send audio
                        'm.file': 50,    // Only admins can send files
                    }
                }
            };

            const { room_id } = await client.createRoom(createOptions);
            console.log('Mural criado com ID:', room_id);

            // 2. Upload do avatar se houver
            if (avatarUri) {
                try {
                    const response = await fetch(avatarUri);
                    const blob = await response.blob();
                    const uploadResponse = await client.uploadContent(blob);

                    await client.sendStateEvent(room_id, 'm.room.avatar' as any, {
                        url: uploadResponse.content_uri
                    }, '');
                } catch (avatarError) {
                    console.error('Erro ao enviar avatar:', avatarError);
                    // Não falha a criação se o avatar falhar
                }
            }

            // 3. Sucesso
            onSuccess();
            onClose();
            // Limpar form
            setName('');
            setDescription('');
            setAvatarUri(null);
            setIsPublic(true);

        } catch (error) {
            console.error('Erro ao criar mural:', error);
            alert('Falha ao criar mural. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={[styles.container, { backgroundColor: theme.surface }]}>
                            <View style={styles.header}>
                                <Text style={[styles.title, { color: theme.text }]}>Novo Mural</Text>
                                <TouchableOpacity onPress={onClose}>
                                    <Ionicons name="close" size={24} color={theme.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {/* Avatar Picker */}
                            <View style={styles.avatarContainer}>
                                <TouchableOpacity onPress={pickImage} style={[styles.avatarButton, { backgroundColor: theme.surfaceVariant }]}>
                                    {avatarUri ? (
                                        <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                                    ) : (
                                        <Ionicons name="camera-outline" size={32} color={theme.primary} />
                                    )}
                                    <View style={[styles.editIconBadge, { backgroundColor: theme.primary }]}>
                                        <Ionicons name="pencil" size={12} color="#fff" />
                                    </View>
                                </TouchableOpacity>
                                <Text style={[styles.avatarLabel, { color: theme.textSecondary }]}>Foto de Capa</Text>
                            </View>

                            {/* Inputs */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: theme.text }]}>Nome do Mural</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: theme.surfaceVariant, color: theme.text, borderColor: theme.border }]}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Ex: Avisos da Comunidade"
                                    placeholderTextColor={theme.textTertiary}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: theme.text }]}>Descrição</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea, { backgroundColor: theme.surfaceVariant, color: theme.text, borderColor: theme.border }]}
                                    value={description}
                                    onChangeText={setDescription}
                                    placeholder="Sobre o que é este mural?"
                                    placeholderTextColor={theme.textTertiary}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>

                            {/* Visibility Toggle */}
                            <View style={styles.switchContainer}>
                                <View>
                                    <Text style={[styles.label, { color: theme.text, marginBottom: 0 }]}>Mural Público</Text>
                                    <Text style={{ fontSize: 12, color: theme.textSecondary }}>Qualquer um pode encontrar e entrar</Text>
                                </View>
                                <Switch
                                    value={isPublic}
                                    onValueChange={setIsPublic}
                                    trackColor={{ false: theme.border, true: theme.primary }}
                                    thumbColor="#fff"
                                />
                            </View>

                            {/* Action Button */}
                            <TouchableOpacity
                                style={[
                                    styles.createButton,
                                    { backgroundColor: theme.primary, opacity: !name.trim() || isLoading ? 0.6 : 1 }
                                ]}
                                onPress={handleCreate}
                                disabled={!name.trim() || isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.createButtonText}>Criar Mural</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 40,
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    avatarImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    editIconBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    avatarLabel: {
        fontSize: 12,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        fontSize: 16,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    createButton: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
