import { Logger } from "./logger.js";

export class Version {
    static loadedLogger = new Logger();
    static loadedData = { };

    static sanitize(path, fallback, callback = null) {
        const value = path.reduce((scope, key) => (scope?.[key] !== undefined) ? scope[key] : undefined, this.loadedData);
        if (value === undefined) {
            this.loadedLogger.warn(`Missing expected key path [ ${path.join(" -> ")} ] in stored data, defaulting to fallback value.`);
            return fallback;
        }

        if (typeof callback === "function") {
            const modValue = callback(value);
            if (modValue === undefined) {
                this.loadedLogger.warn(`Invalid value at key path [ ${path.join(" -> ")} ] in stored data, defaulting to fallback value.`);
                return fallback;
            }

            return modValue;
        }

        return value;
    }

    static exists(...path) {
        const value = path.reduce((scope, key) => (scope?.[key] !== undefined) ? scope[key] : undefined, this.loadedData);
        return value !== undefined;
    }

    static deprecated(...path) {
        if (this.exists(...path)) {
            this.loadedLogger.warn(`Skipped deprecated key path [ ${path.join(" -> ")} ] in stored data.`, true);
            return true;
        }

        return false;
    }

    static reset(...path) {
        this.loadedLogger.warn(`Resetting key path [ ${path.join(" -> ")} ] in stored data to default value.`);
        const value = path.reduce((scope, key) => (scope?.[key] !== undefined) ? scope[key] : undefined, this.default);
        if (value === undefined) {
            this.loadedLogger.dev(`Could not find default value for key path [ ${path.join(" -> ")} ] in stored data.`);
            return;
        }

        const final = path.pop();
        const scope = path.reduce((scope, key) => {
            if (scope[key] === undefined) {
                scope[key] = { };
            }
            return scope[key];
        }, this.loadedData);

        scope[final] = value;
    }

    static restrictObject(obj, ...path) {
        if (!isObject(obj)) {
            this.reset(...path);
            return false;
        }

        const keys = Object.keys(path.reduce((scope, key) => (scope?.[key] !== undefined) ? scope[key] : undefined, this.default));
        Object.keys(obj).forEach(key => {
            if (!keys.includes(key)) {
                this.loadedLogger.warn(`Removing unexpected key [ ${[ ...path, key ].join(" -> ")} ] from stored data.`);
                delete obj[key]; // remove unexpected keys
            }
        });

        return true;
    }

    static number = 0;
    static get default() {
        return { version: 0 };
    }

    static init(logger, data) {
        this.loadedLogger = logger;
        this.loadedData = data;

        return true;
    }

    // upgrade from previous version to this version
    static upgrade() {
        if (this.loadedData.version !== this.number - 1) {
            this.loadedLogger.dev(`[INVALID_UPGRADE_ATTEMPT] Attempted to upgrade from version ${this.loadedData.version} to version ${this.number}, but this upgrade method only supports upgrades from version ${this.number - 1}.`);
            throw new Error("INVALID_UPGRADE_ATTEMPT");
        }

        return { };
    }

    static validate() {
        const root = this.loadedData;
        this.restrictObject(root, );

        if (root.version !== this.number) {
            this.loadedLogger.error(`Stored data version ${root.version} does not match expected version ${this.number}.`);
            return false;
        }

        return true;
    }
}