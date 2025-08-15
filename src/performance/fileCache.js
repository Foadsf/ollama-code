import * as fs from 'fs/promises';

export class FileCache {
    constructor(options = {}) {
        this.cache = new Map();
        this.maxSize = options.maxSize || 200;
        this.ttl = options.ttl || 30000; // 30 seconds for file cache
        this.watchedFiles = new Map();
        this.stats = { hits: 0, misses: 0, invalidations: 0 };
    }

    async get(filePath) {
        const entry = this.cache.get(filePath);

        if (!entry) {
            this.stats.misses++;
            return null;
        }

        // Check if file has been modified
        try {
            const stats = await fs.stat(filePath);
            if (stats.mtime.getTime() > entry.mtime) {
                this.cache.delete(filePath);
                this.stats.invalidations++;
                this.stats.misses++;
                return null;
            }
        } catch (error) {
            // File might not exist anymore
            this.cache.delete(filePath);
            this.stats.invalidations++;
            this.stats.misses++;
            return null;
        }

        if (Date.now() > entry.expires) {
            this.cache.delete(filePath);
            this.stats.misses++;
            return null;
        }

        this.stats.hits++;
        return entry.content;
    }

    async set(filePath, content) {
        if (this.cache.size >= this.maxSize) {
            this.evictOldest();
        }

        try {
            const stats = await fs.stat(filePath);
            this.cache.set(filePath, {
                content,
                mtime: stats.mtime.getTime(),
                expires: Date.now() + this.ttl,
                size: Buffer.byteLength(content, 'utf8')
            });
        } catch (error) {
            // Handle error silently - file might not exist yet
        }
    }

    evictOldest() {
        let oldestKey = null;
        let oldestTime = Date.now();

        for (const [key, entry] of this.cache.entries()) {
            if (entry.expires < oldestTime) {
                oldestTime = entry.expires;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }

    invalidate(filePath) {
        this.cache.delete(filePath);
        this.stats.invalidations++;
    }

    getStats() {
        const totalRequests = this.stats.hits + this.stats.misses;
        return {
            size: this.cache.size,
            hitRate: totalRequests ? this.stats.hits / totalRequests : 0,
            ...this.stats
        };
    }

    clear() {
        this.cache.clear();
        this.stats = { hits: 0, misses: 0, invalidations: 0 };
    }
}
