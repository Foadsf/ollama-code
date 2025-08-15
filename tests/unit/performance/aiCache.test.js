import { jest } from '@jest/globals';
import { AIResponseCache } from '../../../src/performance/aiCache.js';

describe('AIResponseCache', () => {
    let cache;

    beforeEach(() => {
        // Use fake timers to control time-based logic (ttl)
        jest.useFakeTimers();
        cache = new AIResponseCache({ ttl: 10000 }); // 10 second TTL for tests
    });

    afterEach(() => {
        jest.useRealTimers();
        cache.destroy(); // Clear interval
    });

    test('should set and get a cache entry', () => {
        const key = 'test-key';
        const response = { message: 'hello' };
        cache.set(key, response);

        const result = cache.get(key);
        expect(result).toEqual(response);
        expect(cache.getStats().hits).toBe(1);
    });

    test('should return null for a non-existent key', () => {
        const result = cache.get('non-existent-key');
        expect(result).toBeNull();
        expect(cache.getStats().misses).toBe(1);
    });

    test('should return null for an expired key', () => {
        const key = 'test-key';
        const response = { message: 'hello' };
        cache.set(key, response);

        // Advance time past the TTL
        jest.advanceTimersByTime(15000);

        const result = cache.get(key);
        expect(result).toBeNull();
        expect(cache.getStats().misses).toBe(1);
    });

    test('should evict the least recently used item when max size is reached', () => {
        cache.maxSize = 2;

        cache.set('key1', 'response1');
        jest.advanceTimersByTime(100);
        cache.set('key2', 'response2');
        jest.advanceTimersByTime(100);

        // Access key1 to make it the most recently used
        cache.get('key1');

        // Add a third item to trigger eviction
        cache.set('key3', 'response3');

        expect(cache.get('key1')).not.toBeNull();
        expect(cache.get('key3')).not.toBeNull();
        expect(cache.get('key2')).toBeNull(); // key2 should have been evicted
    });

    test('should generate a consistent key', () => {
        const messages = [{role: 'user', content: 'hello'}];
        const model = 'test-model';

        const key1 = cache.generateKey(messages, model);
        const key2 = cache.generateKey(messages, model);

        expect(key1).toBe(key2);
    });
});
