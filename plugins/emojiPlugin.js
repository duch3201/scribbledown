const PluginInterface = require('../pluginInterface');


class emojiPlugin extends PluginInterface {
    constructor() {
        super('emojiPlugin', '0.1.0')

        let config = this.getPluginConfig()

        // this.log(JSON.stringify(config));

        const emojiList = config.emojiList;

        this.registerHook('beforeParse', async (markdown) => {
            console.log('[emojiPlugin]: looking through content to find your emojies!');
            for (const [key, value] of Object.entries(emojiList)) {
                markdown = markdown.replaceAll(key, value);
            }
            return markdown;    
        });

        // this.registerHook('invokeRebuild', async () => {
        //     setTimeout(() => {
        //         console.log('[emojiPlugin]: Rebuilding the site!');
        //         // emitter.emit('rebuild', "index.md");
        //     }, 8000);
        // });
    }
}

module.exports = emojiPlugin;