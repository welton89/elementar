// app/(tabs)/explore.tsx

import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AuthenticatedImage } from '../src/components/AuthenticatedImage';
import { useAuth } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';

type SearchTab = 'rooms' | 'spaces' | 'users';

interface SearchResult {
  id: string;
  name: string;
  avatarUrl?: string;
  description?: string;
  memberCount?: number;
  isPublic?: boolean;
}

export default function ExploreScreen() {
  const { theme } = useTheme();
  const { client } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('rooms');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery.trim());
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  const performSearch = async (query: string) => {
    if (!client) return;

    setIsSearching(true);
    try {
      if (activeTab === 'rooms') {
        await searchRooms(query);
      } else if (activeTab === 'spaces') {
        await searchSpaces(query);
      } else if (activeTab === 'users') {
        await searchUsers(query);
      }
    } catch (error) {
      console.error('Erro na busca:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const searchRooms = async (query: string) => {
    if (!client) return;

    try {
      const response = await client.publicRooms({
        filter: {
          generic_search_term: query,
        },
        limit: 20,
      });

      const roomResults: SearchResult[] = response.chunk
        .filter(room => {
          // Filtrar espaços dos resultados de salas
          return room.room_type !== 'm.space';
        })
        .map(room => ({
          id: room.room_id,
          name: room.name || 'Sala sem nome',
          avatarUrl: room.avatar_url,
          description: room.topic,
          memberCount: room.num_joined_members,
          isPublic: room.world_readable,
        }));

      setResults(roomResults);
    } catch (error) {
      console.error('Erro ao buscar salas:', error);
      setResults([]);
    }
  };

  const searchSpaces = async (query: string) => {
    if (!client) return;

    try {
      const response = await client.publicRooms({
        filter: {
          generic_search_term: query,
          room_types: ['m.space'] as any,
        },
        limit: 20,
      });

      const spaceResults: SearchResult[] = response.chunk.map(space => ({
        id: space.room_id,
        name: space.name || 'Espaço sem nome',
        avatarUrl: space.avatar_url,
        description: space.topic,
        memberCount: space.num_joined_members,
        isPublic: space.world_readable,
      }));

      setResults(spaceResults);
    } catch (error) {
      console.error('Erro ao buscar espaços:', error);
      setResults([]);
    }
  };

  const searchUsers = async (query: string) => {
    if (!client) return;

    try {
      const response = await client.searchUserDirectory({
        term: query,
        limit: 20,
      });

      const userResults: SearchResult[] = response.results.map(user => ({
        id: user.user_id,
        name: user.display_name || user.user_id,
        avatarUrl: user.avatar_url,
        description: user.user_id,
      }));

      setResults(userResults);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      setResults([]);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    if (!client) return;

    try {
      await client.joinRoom(roomId);
      router.push(`/room/${roomId}`);
    } catch (error) {
      console.error('Erro ao entrar na sala:', error);
      alert('Não foi possível entrar na sala');
    }
  };

  const handleStartChat = async (userId: string) => {
    if (!client) return;

    try {
      // Cria a sala como DM
      const result = await client.createRoom({
        preset: 'trusted_private_chat' as any,
        is_direct: true,
        invite: [userId],
        visibility: 'private' as any,
      });

      // Atualiza m.direct account data (seguindo padrão do Element Web)
      const mDirectEvent = (client as any).getAccountData('m.direct');
      const currentContent = mDirectEvent?.getContent() || {};

      // Pega a lista atual de DMs com este usuário
      const roomsList = currentContent[userId] || [];

      // Adiciona o novo room ID se não existir
      if (!roomsList.includes(result.room_id)) {
        roomsList.push(result.room_id);
      }

      // Atualiza o conteúdo
      currentContent[userId] = roomsList;

      // Salva de volta no account data
      await (client as any).setAccountData('m.direct', currentContent);

      console.log('DM criado e marcado em m.direct:', result.room_id);

      router.push(`/room/${result.room_id}`);
    } catch (error) {
      console.error('Erro ao criar conversa:', error);
      alert('Não foi possível iniciar conversa');
    }
  };

  const renderResultItem = ({ item }: { item: SearchResult }) => {
    const isUser = activeTab === 'users';
    const isSpace = activeTab === 'spaces';

    return (
      <TouchableOpacity
        style={[styles.resultItem, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}
        onPress={() => {
          if (isUser) {
            handleStartChat(item.id);
          } else {
            handleJoinRoom(item.id);
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.resultAvatar}>
          {item.avatarUrl ? (
            <AuthenticatedImage
              mxcUrl={item.avatarUrl}
              style={styles.avatar}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
              <Ionicons
                name={isUser ? 'person' : isSpace ? 'planet' : 'chatbubbles'}
                size={24}
                color="#fff"
              />
            </View>
          )}
        </View>

        <View style={styles.resultInfo}>
          <View style={styles.resultHeader}>
            <Text style={[styles.resultName, { color: theme.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.isPublic && (
              <View style={[styles.publicBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.publicBadgeText}>Público</Text>
              </View>
            )}
          </View>

          {item.description && (
            <Text style={[styles.resultDescription, { color: theme.textSecondary }]} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          {item.memberCount !== undefined && (
            <Text style={[styles.memberCount, { color: theme.textTertiary }]}>
              {item.memberCount} {item.memberCount === 1 ? 'membro' : 'membros'}
            </Text>
          )}
        </View>

        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: 'Explorar',
          headerStyle: {
            backgroundColor: theme.surface,
          },
          headerTintColor: theme.text,
          headerShadowVisible: false,
        }}
      />

      {/* Search Input */}
      <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Buscar..."
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'rooms' && { borderBottomColor: theme.primary, borderBottomWidth: 2 }
            ]}
            onPress={() => setActiveTab('rooms')}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === 'rooms' ? theme.primary : theme.textSecondary }
            ]}>
              Salas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'spaces' && { borderBottomColor: theme.primary, borderBottomWidth: 2 }
            ]}
            onPress={() => setActiveTab('spaces')}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === 'spaces' ? theme.primary : theme.textSecondary }
            ]}>
              Espaços
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'users' && { borderBottomColor: theme.primary, borderBottomWidth: 2 }
            ]}
            onPress={() => setActiveTab('users')}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === 'users' ? theme.primary : theme.textSecondary }
            ]}>
              Pessoas
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Results */}
      {isSearching ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.centerText, { color: theme.textSecondary }]}>Buscando...</Text>
        </View>
      ) : searchQuery.trim() === '' ? (
        <View style={styles.centerContainer}>
          <Ionicons name="search" size={64} color={theme.textTertiary} />
          <Text style={[styles.centerText, { color: theme.textSecondary }]}>
            Digite para buscar {activeTab === 'rooms' ? 'salas' : activeTab === 'spaces' ? 'espaços' : 'pessoas'}
          </Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="sad-outline" size={64} color={theme.textTertiary} />
          <Text style={[styles.centerText, { color: theme.textSecondary }]}>
            Nenhum resultado encontrado
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderResultItem}
          contentContainerStyle={styles.resultsList}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 24,
  },
  tab: {
    paddingVertical: 8,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  centerText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  resultsList: {
    padding: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  resultAvatar: {
    width: 48,
    height: 48,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultInfo: {
    flex: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  publicBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  publicBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  resultDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 12,
  },
});
