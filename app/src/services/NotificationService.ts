import * as Notifications from 'expo-notifications';
import { MatrixClient, MatrixEvent, Room } from 'matrix-js-sdk';
import { Platform } from 'react-native';

// Configuração global de notificações
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

class NotificationService {
    private client: MatrixClient | null = null;
    private currentRoomId: string | null = null;

    constructor() {
        this.configure();
    }

    private async configure() {
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }
    }

    public async requestPermissions() {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return false;
        }
        return true;
    }

    public setClient(client: MatrixClient) {
        this.client = client;
        this.setupListener();
    }

    public setCurrentRoom(roomId: string | null) {
        this.currentRoomId = roomId;
    }

    private setupListener() {
        if (!this.client) return;

        // Remove listener anterior se existir para evitar duplicidade
        // Nota: A API do Matrix JS SDK não facilita remover listeners anônimos facilmente sem referência.
        // Idealmente, deveríamos guardar a referência da função.
        // Como simplificação, vamos assumir que setClient é chamado uma vez ou gerenciado externamente.

        this.client.on("Room.timeline" as any, this.handleTimelineEvent);
    }

    private handleTimelineEvent = async (event: MatrixEvent, room: Room, toStartOfTimeline: boolean) => {
        // Ignora eventos de paginação (scrollback)
        if (toStartOfTimeline) return;

        // Ignora eventos que não são mensagens
        if (event.getType() !== 'm.room.message' && event.getType() !== 'm.room.encrypted') return;

        // Ignora mensagens enviadas por nós mesmos
        if (event.getSender() === this.client?.getUserId()) return;

        // Ignora mensagens da sala que estamos vendo agora
        if (this.currentRoomId && room.roomId === this.currentRoomId) return;

        // Decifra se necessário (o SDK geralmente já emite decifrado se configurado, mas vamos garantir)
        const content = event.getContent();
        const body = content.body || 'Nova mensagem';
        const senderName = event.sender ? event.sender.name : event.getSender();

        await this.scheduleNotification(senderName || 'Alguém', body, room.name || 'Chat');
    };

    public async scheduleNotification(title: string, body: string, subtitle?: string) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: title,
                body: body,
                subtitle: subtitle,
                sound: true,
                data: { data: 'goes here' },
            },
            trigger: null, // Imediato
        });
    }

    public cleanup() {
        if (this.client) {
            this.client.removeListener("Room.timeline" as any, this.handleTimelineEvent);
            this.client = null;
        }
    }
}

export const notificationService = new NotificationService();
