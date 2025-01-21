class PluginInterface {
    constructor(name, version) {
        this.name = name;
        this.version = version;
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

    registerHook(hookName, callback) {
        if (this.hooks[hookName]) {
            const wrappedCallback = async (...args) => {
                try {
                    return await callback(...args);
                } catch (error) {
                    error.pluginName = this.name;
                    throw error;
                }
            };
            // console.log(hookName, callback);
            this.hooks[hookName].push(wrappedCallback);
        } else {
            throw new Error(`Hook ${hookName} does not exist`);
        }
    }
}

module.exports = PluginInterface;