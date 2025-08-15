export class AIResponseCache {
    constructor(options = {}) {
        this.cache = new Map();
        this.maxSize = options.maxSize || 1000;
        this.ttl = options.ttl || 3600000; // 1 hour default
        this.hitCount = 0;
        this.missCount = 0;
        this.cleanupInterval = setInterval(() => this.cleanup(), 300000); // 5 minutes
    }

    generateKey(messages, model, options = {}) {
        // Create a deterministic key from the conversation context
        const contextHash = this.hashMessages(messages);
        const optionsHash = this.hashObject(options);
        return `${model}:${contextHash}:${optionsHash}`;
    }

    hashMessages(messages) {
        // Hash the last few messages for context-aware caching
        const relevantMessages = messages.slice(-5); // Last 5 messages
        const content = relevantMessages.map(m => `${m.role}:${m.content}`).join('|');
        return this.simpleHash(content);
    }

    hashObject(obj) {
        return this.simpleHash(JSON.stringify(obj));
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    get(key) {
        const entry = this.cache.get(key);

        if (!entry) {
            this.missCount++;
            return null;
        }

        if (Date.now() > entry.expires) {
            this.cache.delete(key);
            this.missCount++;
            return null;
        }

        this.hitCount++;
        entry.lastAccessed = Date.now();
        return entry.response;
    }

    set(key, response) {
        // Implement LRU eviction if cache is full
        if (this.cache.size >= this.maxSize) {
            this.evictLRU();
        }

        this.cache.set(key, {
            response,
            created: Date.now(),
            lastAccessed: Date.now(),
            expires: Date.now() + this.ttl
        });
    }

    evictLRU() {
        let oldestKey = null;
        let oldestTime = Date.now();

        for (const [key, entry] of this.cache.entries()) {
            if (entry.lastAccessed < oldestTime) {
                oldestTime = entry.lastAccessed;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }

    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expires) {
                this.cache.delete(key);
            }
        }
    }

    getStats() {
        return {
            size: this.cache.size,
            hitRate: this.hitCount / (this.hitCount + this.missCount) || 0,
            hits: this.hitCount,
            misses: this.missCount
        };
    }

    clear() {
        this.cache.clear();
        this.hitCount = 0;
        this.missCount = 0;
    }

    destroy() {
        clearInterval(this.cleanupInterval);
        this.clear();
    }
}
