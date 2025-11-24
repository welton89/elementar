import { useTheme } from '@src/contexts/ThemeContext';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export const UnreadMessagesSeparator: React.FC = () => {
    const { theme } = useTheme();

    return (
        <View style={styles.container}>
            <View style={[styles.line, { backgroundColor: theme.primary }]} />
            <Text style={[styles.text, { color: theme.primary }]}>
                Mensagens não lidas
            </Text>
            <View style={[styles.line, { backgroundColor: theme.primary }]} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
        paddingHorizontal: 10,
    },
    line: {
        flex: 1,
        height: 1,
    },
    text: {
        fontSize: 12,
        fontWeight: '600',
        marginHorizontal: 12,
        textTransform: 'uppercase',
    },
});
