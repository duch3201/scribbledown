const PluginInterface = require('../pluginInterface');
const {emitter} = require('../pluginLoader');

class testPlugin extends PluginInterface {
    constructor() {
        super('emojiPlugin', '0.1.0')

        const emojiList = {
            ":smile:": "😊",
            ":laugh:": "😂",
            ":sad:": "😢",
            ":angry:": "😠",
            ":heart:": "❤️",
            ":star:": "⭐",
            ":fire:": "🔥",
            ":check:": "✅",
            ":cross:": "❌",
            ":warning:": "⚠️",
            ":info:": "ℹ️",
            ":question:": "❓",
            ":exclamation:": "❗",
            ":plus:": "➕",
            ":minus:": "➖",
            ":multiply:": "✖️",
            ":divide:": "➗",
            ":arrow-up:": "⬆️",
            ":arrow-down:": "⬇️",
            ":arrow-left:": "⬅️",
            ":arrow-right:": "➡️",
            ":arrow-up-right:": "↗️",
            ":arrow-up-left:": "↖️",
            ":arrow-down-right:": "↘️",
            ":computer:": "💻",
            ":internet:": "🌐",
            ":email:": "📧",
            ":phone:": "📞"
        }

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

module.exports = testPlugin;