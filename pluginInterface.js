const fs = require('fs');
const EventEmitter = require('events');
// const emitter = new EventEmitter();

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
        this.callableFunctions = new Map();
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

    setPluginConfig(config) {
        try {
            let data = fs.readFileSync('pluginConfigs.json', 'utf8');
            let temp = JSON.parse(data);
            temp[this.name] = config;
            fs.writeFileSync('pluginConfigs.json', JSON.stringify(temp, null, 4));
        } catch (error) {
            console.error(error);
            return {"error": error};
        }
    }

    getPluginConfig() {
        try {
            const config = fs.readFileSync('pluginConfigs.json', 'utf8');
            return JSON.parse(config)[this.name];
        } catch (error) {
            console.error(error);
            return {"error": error};
        }
    }

    log(message, status) {
        // console.log(status, message);
        if (typeof status === 'string') {
            message = status;
            status = Number(status);
        } else if (status === undefined) {
            status = 0;
        }

        if (typeof message === 'object') {
            message = JSON.stringify(message, null, 4);
        }

        switch (status) {
            case 0:
                console.log(`(log)[${this.name}]: ${message}`);
                break;
            case 1:
                console.warn(`(warn)[${this.name}]: ${message}`);
                break;
            case 2:
                console.error(`(error)[${this.name}]: ${message}`);
                break;
        }
    }

    registerCallableFunction(functionName, callback) {
        if (this.callableFunctions.has(functionName)) {
            throw new Error(`Function ${functionName} already registered`);
        }
        this.callableFunctions.set(functionName, callback);
    }

    // todo fix this
    // async runBuild(file) {
    //     console.log("test")
    //     if (!file) {
    //         console.log(`a plugin triggered a rebuild of all files`);
    //         emitter.emit('rebuild')
    //     } else {
    //         console.log(`a plugin triggered a rebuild`)
    //         emitter.emit('rebuild', file)
    //     }
    // }
}

module.exports = PluginInterface;