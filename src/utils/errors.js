/**
 * Base class for custom application errors.
 */
class OLCError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}

/**
 * Represents an error related to network operations, typically with the Ollama API.
 */
export class NetworkError extends OLCError {
    constructor(message, cause) {
        super(message);
        if (cause) {
            this.cause = cause;
        }
    }
}

/**
 * Represents an error that occurs during the execution of a tool.
 */
export class ToolError extends OLCError {
    constructor(message, toolName) {
        super(message);
        this.toolName = toolName;
    }
}

/**
 * Represents an error due to insufficient permissions.
 */
export class PermissionError extends OLCError {
    constructor(message) {
        super(message);
    }
}

/**
 * Represents an error caused by invalid user input.
 */
export class UserInputError extends OLCError {
    constructor(message) {
        super(message);
    }
}
