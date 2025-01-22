const PluginInterface = require('../pluginInterface');
const {emitter} = require('../pluginLoader');

class commentsPlugin extends PluginInterface {
    constructor() {
        super('commentsPlugin', '0.1.0')
        var comments = [
            {
                name: 'John Doe',
                comment: 'This is a great article!',
                date: '2021-01-01'
            },
            {
                name: 'Jane Doe',
                comment: 'I have a question. Can you help me?',
                date: '2021-01-02'
            }
        ];
        const commentsArray = []
        let newTemplate

        this.registerHook('beforeTemplate', async (template, content, frontmatter) => {
            // console.log(template);
            console.log('[commentsPlugin]: Adding comments to the page');
            // try {
            //     newTemplate = template.replace('</main>', '</main><div id="comments"></div>');
            // } catch (error) {
            //     console.error('Error adding comments:', error);
            //     return newTemplate;
            // }

            for (const comment of comments) {
                commentsArray.push(`
                    <div class="comment">
                        <p>${comment.comment}</p>
                        <p>By ${comment.name} on ${new Date(comment.date).toDateString()}</p>
                    </div>
                `);
            }

            const modifiedTemplate = template.replace('</main>', `</main><input type="text" id="commentInput"><button id="commentBtn">submit</button></input><div id="comments">${commentsArray}</div>`);

            // console.log(template.replace('</main>', `</main><div id="comments">${commentsArray}</div>`))
            // console.log(newTemplate);
            return [modifiedTemplate, content, frontmatter];
        });

        this.registerCallableFunction('getComments', async () => {
            return comments;
        });

        this.registerCallableFunction('addComment', async (args) => {
            const {name, comment} = args;
            comments.push({
                name,
                comment,
                date: new Date().toISOString()
            });
            return comments;
        });

        this.registerCallableFunction('rebuildPage', async (args) => {
            console.log('[commentsPlugin]: Rebuilding the page!');
            emitter.emit('rebuild', args.name);
            return true;
        })

    }
}

module.exports = commentsPlugin;