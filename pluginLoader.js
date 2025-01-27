const fs = require('fs');
const path = require('path');


let data

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
        this.callableFunctions = new Map();
    }

    async loadPlugins() {
        const pluginDir = path.join(__dirname, 'plugins');
        const plugins = fs.readdirSync(pluginDir);

        for (const plugin of plugins) {
            if (plugin.endsWith('.js')) {
                const pluginPath = path.join(pluginDir, plugin);
                const Plugin = require(pluginPath);
                const pluginInstance = new Plugin();
                console.log(`[PluginLoader]: Loading plugin ${plugin}`);
                // try {
                //     data = fs.readFileSync("pluginConfigs.json", "utf8");
                // } catch (error) {
                //     if (error.code === 'ENOENT') {
                //         fs.writeFileSync('pluginConfigs.json', "{}");
                //         console.log(`[PluginLoader]: Created pluginConfigs.json`);
                //     }
                // }
                // if (JSON.parse(data)[pluginInstance.name] == undefined) {
                //     let temp = JSON.parse(data);
                //     temp[Plugin.name] = {};
                //     try {
                //         fs.writeFileSync("pluginConfigs.json", JSON.stringify(temp, null, 4));
                //     } catch (error) {
                //         console.error("---------\nfailed to save new plugin's config");
                //         throw error;
                //     }
                //     console.log(`[PluginLoader]: Created config for ${pluginInstance.name}`);
                // }

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

        if (hookName === 'invokeRebuild') {
            return await this.runBuild();
        }

        console.log(`executeHook ${hookName} received:`, args.map(arg => typeof arg));

        let result = args;
        for (const hook of this.hooks[hookName]) {
            try {
                const hookResult = await hook(...result);
                if (hookResult !== undefined) {
                    result = Array.isArray(hookResult) ? hookResult : [hookResult];
                }
            } catch (error) {
                throw new Error(`Plugin (${error.pluginName}) failed in hook "${hookName}": ${error.message}`);
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

}
const pluginLoader = new PluginLoader()
module.exports = pluginLoader;