// app/(tabs)/index.tsx (COMPLETO E CORRIGIDO)

import { Ionicons } from '@expo/vector-icons';
import { AuthenticatedImage } from '@src/components/AuthenticatedImage';
import { CategoryManager } from '@src/components/CategoryManager';
import { RoomItem } from '@src/components/RoomItem';
import { RoomTagManager } from '@src/components/RoomTagManager';
import { RoomListSkeleton } from '@src/components/SkeletonLoader';
import { useAuth } from '@src/contexts/AuthContext';
import { useCategories } from '@src/contexts/CategoriesContext';
import { useRoomList } from '@src/contexts/RoomListContext';
import { useTheme } from '@src/contexts/ThemeContext';
import { Stack, useRouter } from 'expo-router'; // Importado para navegação
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Button,
    Dimensions,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';


export default function RoomListScreen() {
    const { joinedRooms, invitedRooms, isRoomsLoading, isLoadingFromCache, initialLoadComplete, loadRooms } = useRoomList();
    const { logout, client, userAvatarUrl } = useAuth();
    const { theme } = useTheme();
    const { categories, selectedCategory, selectCategory } = useCategories();
    const router = useRouter();

    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [showRoomTagManager, setShowRoomTagManager] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<{ id: string; name: string } | null>(null);
    const [processingInvite, setProcessingInvite] = useState<string | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const flatListRef = React.useRef<FlatList>(null);
    const tabScrollRef = React.useRef<ScrollView>(null);
    const screenWidth = Dimensions.get('window').width;

    const userId = client?.getUserId();

    // All categories including "All"
    const allCategories = React.useMemo(() => [
        { id: null, name: 'Todos', color: theme.primary },
        ...categories
    ], [categories, theme.primary]);

    // Get filtered rooms for each category
    const categorizedRooms = React.useMemo(() => {
        return allCategories.map(category => {
            const nonMuralRooms = joinedRooms.filter(room => !room.isMural);

            if (!category.id) return nonMuralRooms; // "Todos"

            return nonMuralRooms.filter(room => {
                const matrixRoom = client?.getRoom(room.roomId);
                if (!matrixRoom || !matrixRoom.tags) return false;

                const tagName = `u.dir.${category.id}`;
                return tagName in matrixRoom.tags;
            });
        });
    }, [allCategories, joinedRooms, client]);

    // ⭐️ 1. FUNÇÃO DE NAVEGAÇÃO DEFINIDA AQUI
    const navigateToRoom = (roomId: string) => {
        router.push(`/room/${roomId}`);
    };

    const navigateToSettings = () => {
        router.push('/settings');
    };

    const handleLongPressRoom = (roomId: string, roomName: string) => {
        setSelectedRoom({ id: roomId, name: roomName });
        setShowRoomTagManager(true);
    };

    const handleAcceptInvite = async (roomId: string) => {
        if (!client) {
            alert('Cliente Matrix não disponível.');
            return;
        }

        setProcessingInvite(roomId);
        try {
            await client.joinRoom(roomId);
            // Force reload rooms
            loadRooms();
            // Do not clear processingInvite immediately, let the list update handle it
        } catch (error: any) {
            console.error('Erro ao aceitar convite:', error);
            alert(`Falha ao aceitar convite: ${error.message || 'Erro desconhecido'}`);
            setProcessingInvite(null);
        }
    };

    const handleRejectInvite = async (roomId: string) => {
        if (!client) {
            alert('Cliente Matrix não disponível.');
            return;
        }

        setProcessingInvite(roomId);
        try {
            await client.leave(roomId);
            // Force reload rooms
            loadRooms();
            // Do not clear processingInvite immediately, let the list update handle it
        } catch (error: any) {
            console.error('Erro ao rejeitar convite:', error);
            alert(`Falha ao rejeitar convite: ${error.message || 'Erro desconhecido'}`);
            setProcessingInvite(null);
        }
    };

    // Handle category change from swipe
    const handleScroll = (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / screenWidth);

        if (index !== activeIndex && index >= 0 && index < allCategories.length) {
            setActiveIndex(index);
            const newCategory = allCategories[index];
            selectCategory(newCategory.id);
        }
    };

    // Handle tab press
    const handleTabPress = (index: number) => {
        setActiveIndex(index);
        flatListRef.current?.scrollToIndex({ index, animated: true });
        const newCategory = allCategories[index];
        selectCategory(newCategory.id);
    };

    // Sync activeIndex with selectedCategory
    React.useEffect(() => {
        const index = allCategories.findIndex(cat => cat.id === selectedCategory);
        if (index !== -1 && index !== activeIndex) {
            setActiveIndex(index);
        }
    }, [selectedCategory, allCategories]);

    // Show skeleton while loading from cache OR loading from server with no rooms
    // AND ensure we don't show empty state until initial server load is complete
    const showSkeleton = isLoadingFromCache || (isRoomsLoading && joinedRooms.length === 0) || (!initialLoadComplete && joinedRooms.length === 0);

    // Obtém URL do avatar do usuário do contexto
    // userId já foi obtido acima

    const InviteList = () => {
        if (invitedRooms.length === 0) return null;

        return (
            <View style={[styles.inviteContainer, { backgroundColor: theme.surfaceVariant, borderBottomColor: theme.divider }]}>
                <Text style={[styles.inviteHeader, { color: theme.primary }]}>Convites Pendentes ({invitedRooms.length})</Text>
                {invitedRooms.map(room => (
                    <View key={room.roomId} style={[styles.inviteItem, { borderBottomColor: theme.divider }]}>
                        <Text style={[styles.inviteName, { color: theme.text }]}>{room.name}</Text>
                        <View style={styles.inviteActions}>
                            {processingInvite === room.roomId ? (
                                <ActivityIndicator size="small" color={theme.primary} />
                            ) : (
                                <>
                                    <Button
                                        title="Aceitar"
                                        onPress={() => handleAcceptInvite(room.roomId)}
                                        color={theme.primary}
                                        disabled={processingInvite !== null}
                                    />
                                    <View style={{ width: 10 }} />
                                    <Button
                                        title="Rejeitar"
                                        color={theme.textSecondary}
                                        onPress={() => handleRejectInvite(room.roomId)}
                                        disabled={processingInvite !== null}
                                    />
                                </>
                            )}
                        </View>
                    </View>
                ))}
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen
                options={{
                    title: "Conversas",
                    headerStyle: {
                        backgroundColor: theme.surface,
                    },
                    headerTintColor: theme.text,
                    headerShadowVisible: false,
                    headerRight: () => (
                        <TouchableOpacity onPress={navigateToSettings} style={{ marginRight: 10 }}>
                            {userAvatarUrl ? (
                                <AuthenticatedImage
                                    mxcUrl={userAvatarUrl}
                                    style={{ width: 42, height: 42, borderRadius: 22, marginRight: 8 }}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: 16,
                                    backgroundColor: theme.primary,
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}>
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                                        {userId?.charAt(1).toUpperCase() || 'U'}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    )
                }}
            />

            {/* Category Filter Tabs */}
            <View style={[styles.categoryFilterContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
                <ScrollView
                    ref={tabScrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryScroll}
                >
                    {allCategories.map((category, index) => (
                        <TouchableOpacity
                            key={category.id || 'all'}
                            style={[
                                styles.categoryButton,
                                { backgroundColor: theme.background, borderColor: theme.border },
                                activeIndex === index && {
                                    backgroundColor: category.color || theme.primary,
                                    borderColor: category.color || theme.primary
                                }
                            ]}
                            onPress={() => handleTabPress(index)}
                        >
                            <Text style={[
                                styles.categoryButtonText,
                                { color: activeIndex === index ? '#fff' : theme.text }
                            ]}>
                                {category.name}
                            </Text>
                        </TouchableOpacity>
                    ))}

                    {/* Botão para gerenciar categorias */}
                    <TouchableOpacity
                        style={[styles.addCategoryButton, { borderColor: theme.border }]}
                        onPress={() => setShowCategoryManager(true)}
                    >
                        <Ionicons name="add-circle" size={32} color={theme.primary} />
                    </TouchableOpacity>
                </ScrollView>
            </View>

            <InviteList />

            {/* Swipeable Category Content */}
            <FlatList
                ref={flatListRef}
                data={allCategories}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id || 'all'}
                onMomentumScrollEnd={handleScroll}
                scrollEventThrottle={16}
                getItemLayout={(data, index) => ({
                    length: screenWidth,
                    offset: screenWidth * index,
                    index,
                })}
                renderItem={({ item: category, index }) => {
                    const rooms = categorizedRooms[index] || [];

                    return (
                        <View style={{ width: screenWidth }}>
                            {/* InviteList removed from here */}

                            {showSkeleton ? (
                                <RoomListSkeleton count={8} />
                            ) : rooms.length === 0 ? (
                                <View style={[styles.centered, { paddingTop: 50 }]}>
                                    <Ionicons name="chatbubbles-outline" size={64} color={theme.textTertiary} />
                                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                        {category.id ? `Nenhuma sala em "${category.name}"` : 'Nenhuma sala'}
                                    </Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={rooms}
                                    renderItem={({ item }) => (
                                        <RoomItem
                                            room={item}
                                            onPress={() => navigateToRoom(item.roomId)}
                                            onLongPress={() => handleLongPressRoom(item.roomId, item.name)}
                                        />
                                    )}
                                    keyExtractor={(item) => item.roomId}
                                />
                            )}
                        </View>
                    );
                }}
            />

            {/* Modals */}
            <CategoryManager visible={showCategoryManager} onClose={() => setShowCategoryManager(false)} />
            <RoomTagManager
                visible={showRoomTagManager}
                roomId={selectedRoom?.id || null}
                roomName={selectedRoom?.name || ''}
                onClose={() => {
                    setShowRoomTagManager(false);
                    setSelectedRoom(null);
                }}
            />
        </View>
    );
}

// ... (Styles permanecem no final)
const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    categoryFilterContainer: {
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
    },
    categoryScroll: {
        paddingHorizontal: 8,
        gap: 8,
    },
    categoryButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 0,
    },
    categoryButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    addCategoryButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    inviteContainer: {
        padding: 10,
        borderBottomWidth: 1,
    },
    inviteHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    inviteItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 5,
        borderBottomWidth: 1,
    },
    inviteName: {
        fontSize: 15,
        fontWeight: '500',
        flex: 1,
    },
    inviteActions: {
        flexDirection: 'row',
        marginLeft: 10,
    },
});