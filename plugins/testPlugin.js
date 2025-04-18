const PluginInterface = require("../pluginInterface")

class MyCoolPlugin extends PluginInterface {
    constructor() {
        super("my-cool-plugin", "1.0.0");

        this.registerHook('beforeTemplate', async (template, content, frontmatter) => {
            let counter = this.config.get("buildCount");
            this.log(counter)
            this.config.set("buildCount", counter + 1 );
            this.log(`Built ${counter + 1} times!`);

            return [template, content, frontmatter]
        })
    }
}
module.exports = MyCoolPlugin