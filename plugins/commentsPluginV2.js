const PluginInterface = require('../pluginInterface');

function sanitize(string) {
  const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      "/": '&#x2F;',
  };
  const reg = /[&<>"'/]/ig;
  return string.replace(reg, (match)=>(map[match]));
}

class commentsPluginV2 extends PluginInterface {
    constructor() {
        super('commentsPluginV2', '1.0.0')

        let config = this.getPluginConfig()
        var sampleComments = {
            ["index.md"]: [
                {
                    "author": "John Doe",
                    "comment": "This is a comment.",
                    "date": "2021-01-01"
                },
                {
                    "author": "Jane Doe",
                    "comment": "This is another comment.",
                    "date": "2021-01-02"
                }
            ]
        }

        this.registerHook('beforeTemplate', async (template, content, frontmatter, fileName) => {
            if (!template) {
                this.log('Template is undefined!', 2);
                return [template, content, frontmatter, fileName];
            }
            
            this.log(`adding comments to ${fileName}!`);
            let convertedComments = [];
            if (sampleComments[fileName]) {
                this.log(sampleComments[fileName]);
                sampleComments[fileName].forEach(comment => {
                    convertedComments.push(`<div class="comment"><p>${sanitize(comment.comment)}</p><p>By ${sanitize(comment.author)} on ${sanitize(comment.date)}</p></div>`);
                });
            }
            
            let newTemplate = template.replace('{COMMENTS}', `${convertedComments.join('')}`);
            this.log(newTemplate)

            return [newTemplate, content, frontmatter, fileName];
        })

        this.registerCallableFunction('addComment', async (args) => {
            let {name, comment, page} = args;
            
            
            if ()
            if (!sampleComments[page]) {
                sampleComments[page] = [];
            }

            if (page == "/") {
                page = 'index.md'
            }

            comment = sanitize(comment);
            const author = sanitize(name);
            const date = new Date().toISOString().split('T')[0];

            sampleComments[page].push({
                author,
                comment,
                date
            });  
            
            this.log(sampleComments)

            return sampleComments;
        })

        this.registerCallableFunction('rebuildPage', async (fileName) => {
            this.runBuild(fileName);
        })

    }
}

module.exports = commentsPluginV2;