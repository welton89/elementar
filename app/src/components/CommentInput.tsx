import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Animated, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

interface CommentInputProps {
    theme: any;
    inputText: string;
    setInputText: (text: string) => void;
    handleSendComment: () => void;
    isSending: boolean;
    inputBottomAnim: Animated.Value;
}

export const CommentInput: React.FC<CommentInputProps> = ({
    theme,
    inputText,
    setInputText,
    handleSendComment,
    isSending,
    inputBottomAnim
}) => {
    return (
        <Animated.View style={[
            styles.inputContainer,
            {
                backgroundColor: theme.surface,
                borderTopColor: theme.border,
                bottom: inputBottomAnim
            }
        ]}>
            <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceVariant, color: theme.text }]}
                placeholder="Adicione um comentário..."
                placeholderTextColor={theme.textTertiary}
                value={inputText}
                onChangeText={setInputText}
            />
            <TouchableOpacity
                onPress={handleSendComment}
                disabled={!inputText.trim() || isSending}
                style={[styles.sendButton, { opacity: !inputText.trim() && !isSending ? 0.5 : 1 }]}
            >
                {isSending ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                    <Ionicons name="send" size={24} color={theme.primary} />
                )}
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    inputContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderTopWidth: 1,
    },
    input: {
        flex: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 10,
        maxHeight: 100,
        minHeight: 50,
        marginBottom: 15,
    },
    sendButton: {
        padding: 5,
        marginBottom: 15,
    },
});
