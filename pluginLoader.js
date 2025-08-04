const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const emitter = new EventEmitter();

let pluginLoaderInstance = null;

class PluginLoader {
    constructor(logger) {
        this.logger = logger
        this.plugins = new Map();
        this.hooks = {
            beforeBuild: [],
            afterBuild: [],
            beforeParse: [],
            afterParse: [],
            beforeTemplate: [],
            afterTemplate: [],
            invokeRebuild: []
        }
        this.callableFunctions = new Map();
    }

    async loadPlugins() {
        const pluginDir = path.join(__dirname, 'plugins');
        const plugins = fs.readdirSync(pluginDir);

        for (const plugin of plugins) {
            if (plugin.endsWith('.js')) {
                const pluginPath = path.join(pluginDir, plugin);
                const Plugin = require(pluginPath);
                this.logger.info(`[PluginLoader]: Loading plugin ${plugin}`);
                const pluginInstance = new Plugin();
                this.plugins.set(pluginInstance.name, pluginInstance);

                Object.keys(pluginInstance.hooks).forEach(hookName => {
                    if (pluginInstance.hooks[hookName].length > 0) {
                        this.hooks[hookName].push(...pluginInstance.hooks[hookName]);
                        this.logger.info(`[PluginLoader]: Registered ${pluginInstance.name} for ${hookName}`);
                    }
                });

            }
        }
    }

    async executeHook(hookName, ...args) {
        if (!this.hooks[hookName]) {
            throw new Error(`Hook ${hookName} does not exist`);
        }

        if (this.hooks[hookName].length === 0) {
            return args.length === 1 ? args[0] : args;
        }

        if (hookName === 'invokeRebuild') {
            return await this.runBuild();
        }

        let result = args;
        for (const hook of this.hooks[hookName]) {
            try {
                const hookResult = await hook(...result);
                if (hookResult !== undefined) {
                    result = Array.isArray(hookResult) ? hookResult : [hookResult];
                }
            } catch (error) {
                throw new Error(`Plugin failed in hook "${hookName}", ${error.message}`);
            }
        }
        return args.length === 1 ? result[0] : result;
    }

    async callPluginFunction(pluginName, functionName, args) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) {
            throw new Error(`Plugin ${pluginName} not found`);
        }

        const func = plugin.callableFunctions.get(functionName);
        if (!func) {
            throw new Error(`Function ${functionName} not found in plugin ${pluginName}`);
        }

        return await func(args);
    }


    // todo fix this
    async runBuild(file) {
        console.log("test")
        if (!file) {
            this.logger.info(`a plugin triggered a rebuild of all files`);
            emitter.emit('rebuild')
        } else {
            this.logger.info(`a plugin triggered a rebuild`)
            emitter.emit('rebuild', file)
        }
    }

    
}

//having this here feels like a hack, but it will work for now. 
// ngl the codebase is kinda becoming a mess, things just ducktaped to the side of the original idea. 
// im gonna have to rewrite the whole thing pretty sure
// this time with a set amount of features, and i won't add any additional just randomly, i'll actually thing stuff through
function createPluginLoader(logger) {
    if (!pluginLoaderInstance) {
        pluginLoaderInstance = new PluginLoader(logger);
    }
    return pluginLoaderInstance;
}

function getPluginLoader() {
    if (!pluginLoaderInstance) {
        throw new Error('PluginLoader not initialized! Call createPluginLoader(logger) first.');
    }
    return pluginLoaderInstance;
}

module.exports = { createPluginLoader, getPluginLoader, emitter };