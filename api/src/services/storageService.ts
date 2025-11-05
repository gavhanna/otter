import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

export type StorageUsage = {
    totalBytes: number;
    totalFiles: number;
    formattedSize: string;
    usagePercentage: number;
    limitBytes?: number;
};

export async function calculateStorageUsage(
    storageDir: string,
    limitBytes?: number
): Promise<StorageUsage> {
    let totalBytes = 0;
    let totalFiles = 0;

    try {
        const entries = await readdir(storageDir, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.isFile()) {
                const filePath = join(storageDir, entry.name);
                const fileStat = await stat(filePath);
                totalBytes += fileStat.size;
                totalFiles++;
            } else if (entry.isDirectory()) {
                // Recursively calculate size of subdirectories
                const subDirPath = join(storageDir, entry.name);
                const subDirUsage = await calculateStorageUsage(subDirPath);
                totalBytes += subDirUsage.totalBytes;
                totalFiles += subDirUsage.totalFiles;
            }
        }
    } catch (error) {
        console.warn(`Failed to calculate storage usage for ${storageDir}:`, error);
    }

    return {
        totalBytes,
        totalFiles,
        formattedSize: formatBytes(totalBytes),
        usagePercentage: limitBytes ? (totalBytes / limitBytes) * 100 : 0,
        limitBytes,
    };
}

function formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function getStorageLimit(): number {
    // Default limit: 5GB in bytes
    // Can be made configurable via environment variables in the future
    const defaultLimit = 5 * 1024 * 1024 * 1024; // 5GB
    const envLimit = process.env.STORAGE_LIMIT_GB;

    if (envLimit && !isNaN(Number(envLimit))) {
        return Number(envLimit) * 1024 * 1024 * 1024;
    }

    return defaultLimit;
}