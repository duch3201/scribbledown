const PluginInterface = require("../pluginInterface")

class RegisterFuncPluginTest extends PluginInterface {
    constructor() {
        super("registerFuncPluginTest", "1.0.0");

        this.registerCallableFunction("testFunc", async () => {
            this.log("lol it worked!");
            return 0;
        })
    }
}
module.exports = RegisterFuncPluginTest