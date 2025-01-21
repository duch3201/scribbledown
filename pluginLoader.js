const fs = require('fs');
const path = require('path');
const PluginInterface = require('./pluginInterface');

class PluginLoader {
    constructor() {
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
    }

    async loadPlugins() {
        const pluginDir = path.join(__dirname, 'plugins');
        const plugins = fs.readdirSync(pluginDir);

        for (const plugin of plugins) {
            if (plugin.endsWith('.js')) {
                const pluginPath = path.join(pluginDir, plugin);
                const Plugin = require(pluginPath);
                const pluginInstance = new Plugin();
                this.plugins.set(pluginInstance.name, pluginInstance);

                Object.keys(pluginInstance.hooks).forEach(hookName => {
                    if (pluginInstance.hooks[hookName].length > 0) {
                        this.hooks[hookName].push(...pluginInstance.hooks[hookName]);
                        console.log(`[PluginLoader]: Registered ${pluginInstance.name} for ${hookName}`);
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

        let result = args;
        for (const plugin of this.plugins.values()) {
            for (const hook of this.hooks[hookName]) {
                try {
                    const hookResult = await hook(...result);
                    if (hookResult !== undefined) {
                        result = Array.isArray(hookResult) ? hookResult : [hookResult];
                    }
                } catch (error) {
                    throw new Error(`Plugin "${error.pluginName}" failed in hook "${hookName}": ${error.message}`);
                }
            }
        }
        return args.length === 1 ? result[0] : result;
    }

    setRebuildFunction(rebuildFn) {
        this.rebuildFunction = rebuildFn;
    }

}

module.exports = new PluginLoader();