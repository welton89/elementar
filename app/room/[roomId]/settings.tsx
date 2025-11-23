// // app/room/[roomId]/settings.tsx

// import { Ionicons } from '@expo/vector-icons';
// import { useAuth } from '@src/contexts/AuthContext';
// import { useTheme } from '@src/contexts/ThemeContext';
// import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
// import React, { useState } from 'react';
// import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// export default function RoomSettingsScreen() {
//     const { roomId } = useLocalSearchParams<{ roomId: string }>();
//     const { client } = useAuth();
//     const { theme } = useTheme();
//     const router = useRouter();
//     const [isDeleting, setIsDeleting] = useState(false);

//     const room = client?.getRoom(roomId);
//     const userId = client?.getUserId();

//     // Check if user is admin (power level 100)
//     const powerLevels = room?.currentState.getStateEvents('m.room.power_levels', '');
//     const userPowerLevel = powerLevels?.getContent()?.users?.[userId || ''] || 0;
//     const isAdmin = userPowerLevel >= 100;

//     const handleDeleteRoom = () => {
//         Alert.alert(
//             'Apagar Sala',
//             `Tem certeza que deseja apagar "${room?.name}"? Esta ação não pode ser desfeita.`,
//             [
//                 {
//                     text: 'Cancelar',
//                     style: 'cancel'
//                 },
//                 {
//                     text: 'Apagar',
//                     style: 'destructive',
//                     onPress: async () => {
//                         if (!client || !roomId) return;

//                         setIsDeleting(true);
//                         try {
//                             // In Matrix, you can't truly "delete" a room, but you can:
//                             // 1. Leave the room
//                             // 2. If you're the last member, the room becomes inaccessible
//                             // 3. Optionally, you can "forget" the room from your list

//                             await client.leave(roomId);
//                             await client.forget(roomId);

//                             Alert.alert('Sucesso', 'Sala removida com sucesso!');
//                             router.replace('/');
//                         } catch (error: any) {
//                             console.error('Error deleting room:', error);
//                             Alert.alert('Erro', `Falha ao apagar a sala: ${error.message || 'Erro desconhecido'}`);
//                         } finally {
//                             setIsDeleting(false);
//                         }
//                     }
//                 }
//             ]
//         );
//     };

//     if (!room) {
//         return (
//             <View style={[styles.container, { backgroundColor: theme.background }]}>
//                 <Stack.Screen
//                     options={{
//                         title: 'Configurações da Sala',
//                         headerStyle: { backgroundColor: theme.surface },
//                         headerTintColor: theme.text,
//                         headerShadowVisible: false,
//                     }}
//                 />
//                 <View style={styles.centered}>
//                     <Text style={{ color: theme.text }}>Sala não encontrada</Text>
//                 </View>
//             </View>
//         );
//     }

//     return (
//         <View style={[styles.container, { backgroundColor: theme.background }]}>
//             <Stack.Screen
//                 options={{
//                     title: 'Configurações da Sala',
//                     headerStyle: { backgroundColor: theme.surface },
//                     headerTintColor: theme.text,
//                     headerShadowVisible: false,
//                 }}
//             />

//             <ScrollView style={styles.scrollView}>
//                 {/* Room Info Section */}
//                 <View style={[styles.section, { backgroundColor: theme.surface }]}>
//                     <Text style={[styles.sectionTitle, { color: theme.text }]}>Informações</Text>

//                     <View style={styles.infoRow}>
//                         <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Nome:</Text>
//                         <Text style={[styles.infoValue, { color: theme.text }]}>{room.name}</Text>
//                     </View>

//                     <View style={styles.infoRow}>
//                         <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Membros:</Text>
//                         <Text style={[styles.infoValue, { color: theme.text }]}>{room.getJoinedMemberCount()}</Text>
//                     </View>

//                     <View style={styles.infoRow}>
//                         <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Seu nível:</Text>
//                         <Text style={[styles.infoValue, { color: theme.text }]}>
//                             {userPowerLevel} {isAdmin && '(Admin)'}
//                         </Text>
//                     </View>
//                 </View>

//                 {/* Danger Zone */}
//                 {isAdmin && (
//                     <View style={[styles.section, styles.dangerSection]}>
//                         <Text style={[styles.sectionTitle, { color: '#ff3b30' }]}>Zona de Perigo</Text>

//                         <TouchableOpacity
//                             style={[styles.deleteButton, { opacity: isDeleting ? 0.5 : 1 }]}
//                             onPress={handleDeleteRoom}
//                             disabled={isDeleting}
//                         >
//                             {isDeleting ? (
//                                 <ActivityIndicator color="#fff" />
//                             ) : (
//                                 <>
//                                     <Ionicons name="trash-outline" size={20} color="#fff" />
//                                     <Text style={styles.deleteButtonText}>Apagar Sala</Text>
//                                 </>
//                             )}
//                         </TouchableOpacity>

//                         <Text style={[styles.warningText, { color: theme.textSecondary }]}>
//                             Esta ação não pode ser desfeita. Você sairá da sala e ela será removida da sua lista.
//                         </Text>
//                     </View>
//                 )}

//                 {!isAdmin && (
//                     <View style={[styles.section, { backgroundColor: theme.surface }]}>
//                         <Text style={[styles.infoText, { color: theme.textSecondary }]}>
//                             Apenas administradores podem apagar a sala.
//                         </Text>
//                     </View>
//                 )}
//             </ScrollView>
//         </View>
//     );
// }

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//     },
//     centered: {
//         flex: 1,
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     scrollView: {
//         flex: 1,
//     },
//     section: {
//         margin: 16,
//         padding: 16,
//         borderRadius: 12,
//     },
//     dangerSection: {
//         backgroundColor: 'rgba(255, 59, 48, 0.1)',
//         borderWidth: 1,
//         borderColor: 'rgba(255, 59, 48, 0.3)',
//     },
//     sectionTitle: {
//         fontSize: 18,
//         fontWeight: 'bold',
//         marginBottom: 16,
//     },
//     infoRow: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         paddingVertical: 8,
//         borderBottomWidth: 1,
//         borderBottomColor: 'rgba(0,0,0,0.1)',
//     },
//     infoLabel: {
//         fontSize: 14,
//     },
//     infoValue: {
//         fontSize: 14,
//         fontWeight: '600',
//     },
//     deleteButton: {
//         backgroundColor: '#ff3b30',
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'center',
//         padding: 16,
//         borderRadius: 8,
//         gap: 8,
//         marginBottom: 12,
//     },
//     deleteButtonText: {
//         color: '#fff',
//         fontSize: 16,
//         fontWeight: '600',
//     },
//     warningText: {
//         fontSize: 12,
//         textAlign: 'center',
//         fontStyle: 'italic',
//     },
//     infoText: {
//         fontSize: 14,
//         textAlign: 'center',
//     },
// });
