const PluginInterface = require('../pluginInterface');

class theme2Plugin extends PluginInterface {
    constructor() {
        super('theme2Plugin', '1.0.0')
        
        this.registerHook('beforeTemplate', async (template, content, frontmatter, fileName) => {
            this.log('adding in frontmatter data');
            
            // Only modify content if it contains the target elements
            // if (content.includes('</h1>')) {
            content = content.replace("</h1>", `</h1><div id="subtitle"><p class="subtitle-text">${frontmatter.date}</p><p class="reading-time subtitle-text">${frontmatter.readingTime} min read</p></div></div>`);
            // }
            
            return [template, content, frontmatter];
        });

        this.registerHook('afterTemplate', async (template, content, frontmatter, linksArray, fileName) => {
            console.log('[theme2Plugin]: adding in page nav');
            if (!linksArray) {
                return [template, content, frontmatter];
            }

            
            // doing da nav
            let processedFolders = {};
            // let linksArray = {"/":[]};
            let processedLinks = [];
            Object.keys(linksArray).forEach(key => {
                linksArray[key].forEach(link => {
                    // console.log(link, key)
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

            // Only modify template if it contains the target placeholder
            // if (template.includes('{PAGES}')) {
                template = template.replace('{PAGES}', `<ul>${processedLinks.join('')}</ul>`);
                // }
                this.log("KURWAAAA")
            this.log(template)
                
            return [template, content, frontmatter];

        });
    }
}

module.exports = theme2Plugin;
