// app/src/services/MediaCacheService.ts

import * as FileSystem from 'expo-file-system/legacy';

// Cast para evitar erro de tipagem se necessário, mas cacheDirectory deve existir
const CACHE_FOLDER = `${(FileSystem as any).cacheDirectory} media_cache / `;

class MediaCacheService {
    constructor() {
        this.ensureCacheDirectory();
    }

    /**
     * Garante que o diretório de cache existe
     */
    private async ensureCacheDirectory() {
        try {
            const dirInfo = await FileSystem.getInfoAsync(CACHE_FOLDER);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(CACHE_FOLDER, { intermediates: true });
            }
        } catch (error) {
            console.error('Error creating cache directory:', error);
        }
    }

    /**
     * Gera um nome de arquivo único baseado na URL
     */
    private getFileNameFromUrl(url: string): string {
        // Remove protocolo e caracteres especiais para criar um nome de arquivo seguro
        const safeName = url.replace(/[^a-zA-Z0-9]/g, '_');
        // Limita o tamanho do nome do arquivo
        return safeName.substring(safeName.length - 50);
    }

    /**
     * Retorna o caminho local para uma URL, se existir no cache
     */
    async getCachedPath(url: string): Promise<string | null> {
        if (!url) return null;

        try {
            const fileName = this.getFileNameFromUrl(url);
            const path = `${CACHE_FOLDER}${fileName} `;
            const fileInfo = await FileSystem.getInfoAsync(path);

            if (fileInfo.exists) {
                return path;
            }
            return null;
        } catch (error) {
            console.error('Error checking cached path:', error);
            return null;
        }
    }

    /**
     * Baixa um arquivo e salva no cache
     */
    async downloadAndCache(url: string, authHeader?: string): Promise<string> {
        try {
            await this.ensureCacheDirectory();

            const fileName = this.getFileNameFromUrl(url);
            const path = `${CACHE_FOLDER}${fileName} `;

            // Verifica se já existe
            const fileInfo = await FileSystem.getInfoAsync(path);
            if (fileInfo.exists) {
                return path;
            }

            // Configura headers se necessário (para mídias autenticadas)
            const headers: Record<string, string> = {};
            if (authHeader) {
                headers['Authorization'] = authHeader;
            }

            // Faz o download
            const downloadResumable = FileSystem.createDownloadResumable(
                url,
                path,
                { headers }
            );

            const result = await downloadResumable.downloadAsync();

            if (result && result.uri) {

                return result.uri;
            } else {
                throw new Error('Download failed');
            }
        } catch (error) {
            console.error('Error downloading file:', error);
            throw error;
        }
    }

    /**
     * Limpa todo o cache de mídia
     */
    async clearCache(): Promise<void> {
        try {
            await FileSystem.deleteAsync(CACHE_FOLDER, { idempotent: true });
            await this.ensureCacheDirectory();

        } catch (error) {
            console.error('Error clearing media cache:', error);
        }
    }

    /**
     * Retorna o tamanho total do cache em bytes
     */
    async getCacheSize(): Promise<number> {
        try {
            const dirInfo = await FileSystem.getInfoAsync(CACHE_FOLDER);
            if (dirInfo.exists && dirInfo.isDirectory) {
                // Nota: FileSystem.getInfoAsync em diretórios não retorna tamanho recursivo no Expo
                // Precisaríamos listar arquivos e somar. Para simplificar, retornamos 0 ou implementamos depois.
                // Implementação simples listando arquivos:
                const files = await FileSystem.readDirectoryAsync(CACHE_FOLDER);
                let totalSize = 0;

                for (const file of files) {
                    const fileInfo = await FileSystem.getInfoAsync(`${CACHE_FOLDER}${file} `);
                    if (fileInfo.exists && !fileInfo.isDirectory) {
                        totalSize += fileInfo.size;
                    }
                }
                return totalSize;
            }
            return 0;
        } catch (error) {
            console.error('Error getting cache size:', error);
            return 0;
        }
    }
}

export const mediaCacheService = new MediaCacheService();
