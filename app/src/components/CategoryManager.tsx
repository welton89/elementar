// src/components/CategoryManager.tsx

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useCategories } from '../contexts/CategoriesContext';
import { useTheme } from '../contexts/ThemeContext';
import { DEFAULT_CATEGORY_COLORS } from '../types/categories.types';

interface CategoryManagerProps {
    visible: boolean;
    onClose: () => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ visible, onClose }) => {
    const { theme } = useTheme();
    const { categories, createCategory, deleteCategory } = useCategories();
    const [newCategoryName, setNewCategoryName] = useState('');
    const [selectedColor, setSelectedColor] = useState(DEFAULT_CATEGORY_COLORS[0]);
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async () => {
        if (!newCategoryName.trim()) {
            Alert.alert('Erro', 'Digite um nome para a categoria');
            return;
        }

        setIsCreating(true);
        try {
            await createCategory(newCategoryName.trim(), selectedColor);
            setNewCategoryName('');
            setSelectedColor(DEFAULT_CATEGORY_COLORS[0]);
            Alert.alert('Sucesso', 'Categoria criada!');
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível criar a categoria');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = (id: string, name: string) => {
        Alert.alert(
            'Deletar Categoria',
            `Tem certeza que deseja deletar "${name}"? Todas as salas perderão esta tag.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Deletar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteCategory(id);
                        } catch (error) {
                            Alert.alert('Erro', 'Não foi possível deletar a categoria');
                        }
                    },
                },
            ]
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
                <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme.text }]}>Gerenciar Categorias</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={28} color={theme.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollView}>
                        {/* Criar nova categoria */}
                        <View style={styles.createSection}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Nova Categoria</Text>

                            <TextInput
                                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                                placeholder="Nome da categoria"
                                placeholderTextColor={theme.textTertiary}
                                value={newCategoryName}
                                onChangeText={setNewCategoryName}
                            />

                            <Text style={[styles.label, { color: theme.textSecondary }]}>Cor:</Text>
                            <View style={styles.colorPicker}>
                                {DEFAULT_CATEGORY_COLORS.map(color => (
                                    <TouchableOpacity
                                        key={color}
                                        style={[
                                            styles.colorOption,
                                            { backgroundColor: color },
                                            selectedColor === color && styles.colorOptionSelected,
                                        ]}
                                        onPress={() => setSelectedColor(color)}
                                    >
                                        {selectedColor === color && (
                                            <Ionicons name="checkmark" size={20} color="#fff" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={[styles.createButton, { backgroundColor: theme.primary }]}
                                onPress={handleCreate}
                                disabled={isCreating}
                            >
                                <Text style={styles.createButtonText}>
                                    {isCreating ? 'Criando...' : 'Criar Categoria'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Lista de categorias */}
                        <View style={styles.listSection}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Categorias Existentes</Text>

                            {categories.length === 0 ? (
                                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                    Nenhuma categoria criada
                                </Text>
                            ) : (
                                categories.map(category => (
                                    <View
                                        key={category.id}
                                        style={[styles.categoryItem, { backgroundColor: theme.background, borderColor: theme.border }]}
                                    >
                                        <View style={[styles.categoryColor, { backgroundColor: category.color }]} />
                                        <Text style={[styles.categoryName, { color: theme.text }]}>{category.name}</Text>
                                        <TouchableOpacity onPress={() => handleDelete(category.id, category.name)}>
                                            <Ionicons name="trash-outline" size={20} color={theme.error} />
                                        </TouchableOpacity>
                                    </View>
                                ))
                            )}
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    scrollView: {
        padding: 20,
    },
    createSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 16,
        fontSize: 16,
    },
    label: {
        fontSize: 14,
        marginBottom: 8,
    },
    colorPicker: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
    },
    colorOption: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    colorOptionSelected: {
        borderWidth: 3,
        borderColor: '#fff',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    createButton: {
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    listSection: {
        marginTop: 8,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 8,
        gap: 12,
    },
    categoryColor: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    categoryName: {
        flex: 1,
        fontSize: 16,
    },
    emptyText: {
        textAlign: 'center',
        padding: 20,
        fontSize: 14,
    },
});
