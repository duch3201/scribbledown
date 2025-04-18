const PluginInterface = require('../pluginInterface');
const {emitter} = require('../pluginLoader');

class defaultThemePlugin extends PluginInterface {
    constructor() {
        super('defaultTheme', '1.0.0')

        this.registerHook('beforeTemplate', async (template, content, frontmatter) => {
            this.log('adding in frontmatter data');
            // doing da frontmatter
            content = content.replace("<h1>", "<div id='heading'><h1 id='contentHeading'>")
            content = content.replace("</h1>", `</h1><div id="subtitle"><p class="subtitle-text">${frontmatter.date}</p><p class="reading-time subtitle-text">${frontmatter.readingTime} min read</p></div></div>`)
            
            return [template, content, frontmatter]
        })

        this.registerHook('afterTemplate', async (template, content, frontmatter, linksArray) => {
            this.log('adding in page nav');
            let processedFolders = {};
            let processedLinks = [];
            Object.keys(linksArray).forEach(key => {
                linksArray[key].forEach(link => {
                    if (key === "/") {
                        if (link === 'index') {
                            return;
                        }
                        if (link === '/') {
                            return
                        } else {
                            processedLinks.push(`<li><a href="/${link}">${link}</a></li>`);
                        }
        
                        
                    } else {
                        if (!processedFolders[key]) {
                            processedFolders[key] = [];
                            processedFolders[key].push(`<li><a href="/${link}">${link.split("/")[1]}</a></li>`);
                        } else {
                            processedFolders[key].push(`<li><a href="/${link}">${link.split("/")[1]}</a></li>`);
                        }
                    }
                });
            });
            if (Object.keys(processedFolders).length > 0) {
                Object.keys(processedFolders).forEach(folder => {
                    processedLinks.push(`<h3>${folder}</h3><ol>${processedFolders[folder].join('')}</ol>`);
                });
            }
            template = template.replace('{PAGES}', `<ul>${processedLinks.join('')}</ul>`);
            return [template, content, frontmatter, linksArray];
        });

        // this.registerHook('invokeRebuild', async () => {
        //     setTimeout(() => {
        //         this.log('[emojiPlugin]: Rebuilding the site!');
        //         // emitter.emit('rebuild', "index.md");
        //     }, 8000);
        // });
    }
}

module.exports = defaultThemePlugin;