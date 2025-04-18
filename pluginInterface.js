const pluginConfigInterface = require("./pluginConfigInterface")
class PluginInterface {
    constructor(name, version) {
        this.name = name;
        this.version = version;
        this.config = new pluginConfigInterface(this.name)
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

    /**
     * a simple log function, will be displayed in both the console and in the log file
     * @param {string} msg 
     */
    log(msg) {
        console.log(`[${this.name}]:${msg}`)
    }


    /**
     * the main function used in plugin making, allows the plugin to hook into the app, see docs for more info
     * @param {String} hookName 
     * @param {object} callback 
     */
    registerHook(hookName, callback) {
        if (this.hooks[hookName]) {
            const wrappedCallback = async (...args) => {
                try {
                    return await callback(...args);
                } catch (error) {
                    error.pluginName = this.name;
                    error.message = `${this.name}: `+ error.message
                    throw error;
                }
            };
            // console.log(hookName, callback);
            this.hooks[hookName].push(wrappedCallback);
        } else {
            throw new Error(`Hook ${hookName} does not exist`);
        }
    }

    /**
     * Allows the plugin to register a function, which then will be availible to be called from the frontend
     * @param {string} functionName 
     * @param {object} callback 
     */
    registerCallableFunction(functionName, callback) {
        if (this.callableFunctions.has(functionName)) {
            throw new Error(`Function ${functionName} already registered`);
        }
        this.callableFunctions.set(functionName, callback);
    }
}

module.exports = PluginInterface;