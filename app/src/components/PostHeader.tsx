import { AuthenticatedImage } from '@src/components/AuthenticatedImage';
import { AuthenticatedVideo } from '@src/components/AuthenticatedVideo';
import { ResizeMode } from 'expo-av';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface PostHeaderProps {
    body: string;
    msgtype: string;
    url?: string;
    theme: any;
}

export const PostHeader = React.memo(({ body, msgtype, url, theme }: PostHeaderProps) => (
    <View style={styles.postContainer}>
        {/* Media */}
        <View style={styles.mediaContainer}>
            {msgtype === 'm.image' && url && (
                <AuthenticatedImage
                    mxcUrl={url}
                    style={styles.media}
                    resizeMode="contain"
                />
            )}
            {msgtype === 'm.video' && url && (
                <AuthenticatedVideo
                    mxcUrl={url}
                    style={styles.media}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={true}
                    useNativeControls={true}
                />
            )}
        </View>

        {/* Caption */}
        {body && !/\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|mkv|mp3|m4a)$/i.test(body) && (
            <View style={styles.captionContainer}>
                <Text style={[styles.caption, { color: theme.text }]}>
                    {body}
                </Text>
            </View>
        )}

        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <Text style={[styles.commentsTitle, { color: theme.textSecondary }]}>Comentários</Text>
    </View>
));

const styles = StyleSheet.create({
    postContainer: {
        marginBottom: 10,
    },
    mediaContainer: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    media: {
        width: '100%',
        height: '100%',
    },
    captionContainer: {
        padding: 16,
    },
    caption: {
        fontSize: 16,
        lineHeight: 22,
    },
    divider: {
        height: 1,
        width: '100%',
        marginVertical: 10,
    },
    commentsTitle: {
        paddingHorizontal: 16,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 10,
    },
});
