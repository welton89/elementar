import { Ionicons } from '@expo/vector-icons';
import { CreateMuralModal } from '@src/components/CreateMuralModal';
import { RoomItem } from '@src/components/RoomItem';
import { useAuth } from '@src/contexts/AuthContext';
import { useRoomList } from '@src/contexts/RoomListContext';
import { useTheme } from '@src/contexts/ThemeContext';
import { Stack, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function MuralScreen() {
    const { joinedRooms } = useRoomList();
    const { client } = useAuth();
    const { theme } = useTheme();
    const router = useRouter();
    const [isMyMuralsCollapsed, setIsMyMuralsCollapsed] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const userId = client?.getUserId();

    const { myMurals, otherMurals } = useMemo(() => {
        const allMurals = joinedRooms.filter(room => room.isMural);

        // Ordenação: Não lidas > Última mensagem (aproximado pelo nome por enquanto, idealmente timestamp)
        // Como SimpleRoom não tem timestamp da última mensagem, vamos manter a ordem padrão do RoomListContext (nome)
        // ou melhorar a ordenação se o contexto já fornecer ordenado.
        // O RoomListContext já ordena por nome. Vamos refinar se necessário.

        const my = [];
        const other = [];

        for (const room of allMurals) {
            // Verifica se o usuário criou a sala
            // O SDK não expõe facilmente o criador no objeto Room sem buscar o evento m.room.create
            // Vamos assumir que se o usuário tem power level 100 (admin) ele pode ser o criador ou admin
            // Para simplificar, vamos considerar "Meus Murais" aqueles onde sou Admin
            const roomObj = client?.getRoom(room.roomId);
            const powerLevels = roomObj?.currentState.getStateEvents('m.room.power_levels', '');
            const userPowerLevel = powerLevels?.getContent()?.users?.[userId || ''] || 0;

            if (userPowerLevel >= 100) {
                my.push(room);
            } else {
                other.push(room);
            }
        }

        return { myMurals: my, otherMurals: other };
    }, [joinedRooms, client, userId]);

    const navigateToRoom = (roomId: string) => {
        router.push(`/room/${roomId}`);
    };

    const renderSectionHeader = (title: string, isCollapsed: boolean, onToggle?: () => void) => (
        <TouchableOpacity
            style={[styles.sectionHeader, { backgroundColor: theme.surfaceVariant }]}
            onPress={onToggle}
            disabled={!onToggle}
        >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
            {onToggle && (
                <Ionicons
                    name={isCollapsed ? "chevron-down" : "chevron-up"}
                    size={20}
                    color={theme.textSecondary}
                />
            )}
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen
                options={{
                    title: "Mural",
                    headerStyle: {
                        backgroundColor: theme.surface,
                    },
                    headerTintColor: theme.text,
                    headerShadowVisible: false,
                    headerRight: () => (
                        <TouchableOpacity onPress={() => setShowCreateModal(true)} style={{ marginRight: 10 }}>
                            <Ionicons name="add-circle-outline" size={28} color={theme.primary} />
                        </TouchableOpacity>
                    )
                }}
            />

            <FlatList
                data={[]} // Lista principal vazia, usamos ListHeaderComponent para as seções
                renderItem={null}
                ListHeaderComponent={
                    <View>
                        {/* Seção Meus Murais */}
                        {myMurals.length > 0 && (
                            <View>
                                {renderSectionHeader(`Meus Murais (${myMurals.length})`, isMyMuralsCollapsed, () => setIsMyMuralsCollapsed(!isMyMuralsCollapsed))}
                                {!isMyMuralsCollapsed && myMurals.map(room => (
                                    <RoomItem
                                        key={room.roomId}
                                        room={room}
                                        onPress={() => navigateToRoom(room.roomId)}
                                    />
                                ))}
                            </View>
                        )}

                        {/* Seção Outros Murais */}
                        <View style={{ marginTop: myMurals.length > 0 ? 10 : 0 }}>
                            {renderSectionHeader(`Murais (${otherMurals.length})`, false)}
                            {otherMurals.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                        Nenhum mural encontrado.
                                    </Text>
                                </View>
                            ) : (
                                otherMurals.map(room => (
                                    <RoomItem
                                        key={room.roomId}
                                        room={room}
                                        onPress={() => navigateToRoom(room.roomId)}
                                    />
                                ))
                            )}
                        </View>
                    </View>
                }
            />

            {/* Modal de Criação */}
            <CreateMuralModal
                visible={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                client={client || null}
                onSuccess={() => {
                    // Opcional: recarregar lista ou mostrar feedback
                    console.log("Mural criado com sucesso!");
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 1,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
    }
});
