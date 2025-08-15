import { jest } from '@jest/globals';

export class MockHelper {
    constructor() {
        this.spies = [];
    }

    async mockModule(modulePath, mockImplementation) {
        const module = await import(modulePath);
        const spy = jest.spyOn(module, 'default').mockImplementation(mockImplementation);
        this.spies.push(spy);
        return spy;
    }

    async mockFunction(modulePath, functionName, mockImplementation) {
        const module = await import(modulePath);
        const spy = jest.spyOn(module, functionName).mockImplementation(mockImplementation);
        this.spies.push(spy);
        return spy;
    }

    restoreAll() {
        this.spies.forEach(spy => spy.mockRestore());
        this.spies = [];
    }
}
