import ora from 'ora';

export class ProgressManager {
    constructor() {
        this.activeOperations = new Map();
        this.completedOperations = [];
    }

    createOperation(name, totalSteps) {
        const operation = {
            id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            totalSteps,
            currentStep: 0,
            status: 'starting',
            startTime: Date.now(),
            spinner: ora(`Starting ${name}...`).start(),
            subOperations: []
        };

        this.activeOperations.set(operation.id, operation);
        return operation.id;
    }

    updateProgress(operationId, step, message) {
        const operation = this.activeOperations.get(operationId);
        if (!operation) return;

        operation.currentStep = step;
        operation.status = 'running';

        const percentage = Math.round((step / operation.totalSteps) * 100);
        operation.spinner.text = `${operation.name} (${percentage}%): ${message}`;
    }

    addSubOperation(parentId, name, steps) {
        const parent = this.activeOperations.get(parentId);
        if (!parent) return null;

        const subOp = {
            id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            totalSteps: steps,
            currentStep: 0,
            parentId
        };

        parent.subOperations.push(subOp);
        return subOp.id;
    }

    updateSubProgress(subOpId, step, message) {
        for (const [parentId, parent] of this.activeOperations.entries()) {
            const subOp = parent.subOperations.find(sub => sub.id === subOpId);
            if (subOp) {
                subOp.currentStep = step;
                const percentage = Math.round((step / subOp.totalSteps) * 100);
                parent.spinner.text = `${parent.name}: ${subOp.name} (${percentage}%) - ${message}`;
                break;
            }
        }
    }

    completeOperation(operationId, message = 'Complete') {
        const operation = this.activeOperations.get(operationId);
        if (!operation) return;

        operation.status = 'completed';
        operation.endTime = Date.now();
        operation.duration = operation.endTime - operation.startTime;

        operation.spinner.succeed(`${operation.name} completed (${operation.duration}ms)`);

        this.completedOperations.push(operation);
        this.activeOperations.delete(operationId);
    }

    failOperation(operationId, error) {
        const operation = this.activeOperations.get(operationId);
        if (!operation) return;

        operation.status = 'failed';
        operation.error = error;
        operation.endTime = Date.now();
        operation.duration = operation.endTime - operation.startTime;

        operation.spinner.fail(`${operation.name} failed: ${error}`);

        this.completedOperations.push(operation);
        this.activeOperations.delete(operationId);
    }

    getStats() {
        return {
            active: this.activeOperations.size,
            completed: this.completedOperations.length,
            failed: this.completedOperations.filter(op => op.status === 'failed').length,
            averageDuration: this.completedOperations.length > 0
                ? this.completedOperations.reduce((sum, op) => sum + (op.duration || 0), 0) / this.completedOperations.length
                : 0
        };
    }
}

// Global progress manager instance
export const progressManager = new ProgressManager();
