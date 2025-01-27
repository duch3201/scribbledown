const express = require('express');
const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const cssnano = require('cssnano');
const Terser = require('terser');
var compression = require('compression')
var crypto = require('crypto');
const {pluginLoader, emitter} = require('./pluginLoader');


let blogConfig
let isAppModeDev;
let rebuild;
let currentTheme;
let currentThemeConfig;
let processedLinks


const app = express();
app.use(express.json());
app.use(compression());
app.use((req, res, next) => {
    // console.log(req)
    console.log(`New ${req.method} request | ${req.url} | ${new Date().toISOString()} | ${req.ip} | ${req.get('User-Agent')}`);
    next();
});

async function build(fileName) {

    // get links
    let linksArray = {"/":[]};
    processedLinks = processlinks(linksArray);

    if (fileName) {
        let fileToBuild;
        try {
            console.log(`Rebuilding ${fileName}`);
            if (fileName.split('/').length > 1) {
                fileToBuild = fs.readFileSync(path.join(__dirname, 'files', fileName[0], fileName[1]), 'utf8');
            } else {
                fileToBuild = fs.readFileSync(path.join(__dirname, 'files', fileName), 'utf8');
            }

            const {content, frontmatter} = await parseMarkdown(fileToBuild);
            const HTMLtemplate = fs.readFileSync(path.join(__dirname, 'template', 'index.html'), 'utf8');
            const builtPage = await yeettotemplate(HTMLtemplate, content, frontmatter, processedLinks, fileName);

            if (fileName.split('/').length > 1) {
                fs.writeFileSync(path.join(__dirname, 'builtFiles', fileName[0], fileName[1].replace('.md', '.html')), builtPage);
            } else {
                fs.writeFileSync(path.join(__dirname, 'builtFiles', fileName.replace('.md', '.html')), builtPage);
            }

            const checksums = JSON.parse(fs.readFileSync(path.join(__dirname, 'checksums.json'), 'utf8'));
            checksums[fileName] = generateChecksum(fileToBuild);
            fs.writeFileSync(path.join(__dirname, 'checksums.json'), JSON.stringify(checksums, null, 4));

            console.log(`Rebuilding ${fileName} success`);
            return;

        } catch (error) {
            console.error('----------');
            console.error(error.message);
            throw error;
        }

    }
    try {
        await pluginLoader.executeHook('beforeBuild');
    } catch (error) {
        console.error('----------');
        console.error(error.message);
        throw error;
    }
    console.log('Building files...');
    const HTMLtemplate = await fs.readFileSync(path.join(__dirname, 'template', currentTheme, 'index.html'), 'utf8');
    let fileContent;
    let checksums = {};
    if (fs.existsSync(path.join(__dirname, 'checksums.json'))) {
        checksums = JSON.parse(fs.readFileSync(path.join(__dirname, 'checksums.json'), 'utf8'));
    }

    isAppModeDev = false;
    if (fs.existsSync(path.join(__dirname, 'builtFiles'))) {
        console.log('found previous build, rebuilding');
        fs.rmdirSync(path.join(__dirname, 'builtFiles'), { recursive: true });
    }
    fs.mkdirSync(path.join(__dirname, 'builtFiles'), { recursive: true });

    const files = fs.readdirSync(path.join(__dirname, 'files'));
    for (const file of files) {
        const fileName = file;
        const stats = fs.statSync(path.join(__dirname, 'files', file));

        if (fileName.endsWith('.md')) {

            console.log(`[build]: Building ${fileName}`);

            fileContent = await fs.readFileSync(path.join(__dirname, 'files', fileName), 'utf8');
            const {content, frontmatter} = await parseMarkdown(fileContent);
            const builtPage = await yeettotemplate(HTMLtemplate, content, frontmatter, processedLinks, fileName);

            fs.writeFileSync(path.join(__dirname, 'builtFiles', fileName.replace('.md', '.html')), builtPage);
            checksums[fileName] = generateChecksum(fileContent);

            console.log(`[build]: Building ${fileName} success`);

        } else if (stats.isDirectory()) {

            fs.mkdirSync(path.join(__dirname, 'builtFiles', fileName), { recursive: true });
            const subfiles = fs.readdirSync(path.join(__dirname, 'files', fileName));

            for (const subfile of subfiles) {
                if (subfile.endsWith('.md')) {

                    console.log(`[build]: Building ${fileName}/${subfile}`);

                    fileContent = await fs.readFileSync(path.join(__dirname, 'files', fileName, subfile), 'utf8');
                    const {content, frontmatter} = await parseMarkdown(fileContent);
                    const builtPage = await yeettotemplate(HTMLtemplate, content, frontmatter, processedLinks, fileName);

                    fs.writeFileSync(path.join(__dirname, 'builtFiles', fileName, subfile.replace('.md', '.html')), builtPage);
                    checksums[`${fileName}/${subfile}`] = generateChecksum(fileContent);

                    console.log(`[build]: Building ${fileName} success`);
                }
            }
        }
    }

    // add checksums for template, css, and js files
    const css = fs.readFileSync(path.join(__dirname, 'template', currentTheme, 'index.css'), 'utf8');
    const js = fs.readFileSync(path.join(__dirname, 'template', currentTheme, 'app.js'), 'utf8');
    const currentChecksum = generateChecksum(HTMLtemplate + css + js);
    checksums['template'] = currentChecksum;

    // add checksum for the config
    checksums['config'] = generateChecksum(JSON.stringify(blogConfig));

    // Save checksums after all files are processed
    console.log('Saving checksums...');
    fs.writeFileSync(path.join(__dirname, 'checksums.json'), JSON.stringify(checksums, null, 4));
    console.log('Build complete!');
    try {
        await pluginLoader.executeHook('afterBuild');   
    } catch (error) {
        console.error('----------');
        console.error(error.message);
        throw error;
    }



}


// function "borrowed" from https://gist.github.com/zfael/a1a6913944c55843ed3e999b16350b50
function generateChecksum(str, algorithm, encoding) {
    return crypto
        .createHash(algorithm || 'md5')
        .update(str, 'utf8')
        .digest(encoding || 'hex');
}

function calculateReadingTime(text) {
    const wordsPerMinute = 200;
    const wordCount = text.trim().split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / wordsPerMinute);
    return readingTime;
}

async function init() {
    console.log("scribbledown init!");

    try {

        // read and parse config
        try {
            console.log("Reading blog.conf");
            blogConfig = fs.readFileSync(path.join(__dirname, 'blog.conf'), 'utf8');
            const configstat = fs.statSync(path.join(__dirname, 'blog.conf'));
            if (configstat.size === 0) {
                console.log("Config file is empty!");
                console.error('writing the default to blog.conf');
                blogConfig = {
                    blogname: 'scribbledown blog',
                    footerContent: '© {year} scribbledown.',
                    dev: 'false',
                    currentTheme: 'default'
                };
                fs.writeFileSync(path.join(__dirname, 'blog.conf'), JSON.stringify(blogConfig, null, 4));
                blogConfig = fs.readFileSync(path.join(__dirname, 'blog.conf'), 'utf8');
            }
            blogConfig = JSON.parse(blogConfig);
            currentTheme = blogConfig.currentTheme;
        } catch (error) {
            console.error('---------\nError reading blog.conf:', error);
            throw error;
        }

        try {
            const themeConfig = fs.readFileSync(path.join(__dirname, 'template', currentTheme, 'config.json'), 'utf8');
            currentThemeConfig = JSON.parse(themeConfig);
        } catch (error) {
            console.warn('---------\nError reading theme config:\n', error);
            console.warn(`will not be able to display theme's name and author\n----------`)
        }

        const date = new Date();
        const formattedDate = `${date.getDate()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
        // check if the files directory is empty
        if (fs.existsSync(path.join(__dirname, 'files'))) {
            const files = fs.readdirSync(path.join(__dirname, 'files'));
            if (files.length === 0) {
                console.log('Files directory is empty!\nAssuming first run!');
                fs.writeFileSync(path.join(__dirname, 'files', 'index.md'), `---\ntitle: Welcome to scribbledown\ndate:${formattedDate}\n---\n# Welcome to scribbledown\n\nIf you're reading this. Welcome, everything is fine.`);
                fs.writeFileSync(path.join(__dirname, 'files', 'welcome.md'), `---\ntitle: Welcome to scribbledown v2\ndate:${formattedDate}\n---\n# Welcome\n\n[shadowman](https://github.com/duch3201) here, welcome to scribbledown, thanks for checking it out.\n\nThis is a really cool blogging engine thingy and im so happy you decided to check it out, have fun creating templates or just writing your blog!`);
            }
        }

        // check the template directory
        console.log("Checking template directory");
        if (fs.existsSync(path.join(__dirname, 'template'))) {
            const templateFiles = fs.readdirSync(path.join(__dirname, 'template'));
            if (templateFiles.length === 0) {
                console.error("----------\nTemplate directory is empty!");
                throw new Error('Template directory is empty!');
            }
        }

        // see if the checksums.json file exists if it does check every file in the files directory
        console.log("Checking checksums.json");
        try {
            if (!fs.existsSync(path.join(__dirname, 'checksums.json'))) {
                fs.writeFileSync(path.join(__dirname, 'checksums.json'), JSON.stringify({}));
            }

            let checksums = JSON.parse(fs.readFileSync(path.join(__dirname, 'checksums.json'), 'utf8'));
            rebuild = false; // Reset rebuild flag

            // Check if the files have changed
            fs.readdirSync(path.join(__dirname, 'files')).forEach(file => {
                const fileName = file;
                const stats = fs.statSync(path.join(__dirname, 'files', file));

                if (fileName.endsWith('.md')) {
                    // const fileContent = fs.readFileSync(`./files/${fileName}`, 'utf8');
                    const fileContent = fs.readFileSync(path.join(__dirname, 'files', fileName), 'utf8');
                    const currentChecksum = generateChecksum(fileContent);
                    if (!checksums[fileName] || checksums[fileName] !== currentChecksum) {
                        console.log(`File ${fileName} has changed`);
                        rebuild = true;
                    }
                } else if (stats.isDirectory()) {
                    fs.readdirSync(path.join(__dirname, 'files', fileName)).forEach(subfile => {
                        if (subfile.endsWith('.md')) {
                            // const fileContent = fs.readFileSync(`./files/${fileName}/${subfile}`, 'utf8');
                            const fileContent = fs.readFileSync(path.join(__dirname, 'files', fileName, subfile), 'utf8');
                            const currentChecksum = generateChecksum(fileContent);
                            const filePath = `${fileName}/${subfile}`;
                            if (!checksums[filePath] || checksums[filePath] !== currentChecksum) {
                                console.log(`File ${filePath} has changed`);
                                rebuild = true;
                            }
                        }
                    });
                }
            });

            // check if the template, css or js files have changed
            console.log('Checking template, CSS, and JS files');
            const HTMLtemplate = fs.readFileSync(path.join(__dirname, 'template', 'index.html'), 'utf8');
            const css = fs.readFileSync(path.join(__dirname, 'template', 'index.css'), 'utf8');
            const js = fs.readFileSync(path.join(__dirname, 'template', 'app.js'), 'utf8');
            const currentChecksum = generateChecksum(HTMLtemplate + css + js);
            if (!checksums['template'] || checksums['template'] !== currentChecksum) {
                console.log('Template, CSS, or JS files have changed');
                rebuild = true;
            }

            // check if the config file has changed
            console.log('Checking config file for changes');
            const configChecksum = generateChecksum(JSON.stringify(blogConfig));
            if (!checksums['config'] || checksums['config'] !== configChecksum) {
                console.log('Config file has changed');
                rebuild = true;
            }

        } catch (error) {
            console.error('----------\nError reading checksums.json:', error);
            rebuild = true;
        }

        try {
            console.log('Loading plugins...');
            await pluginLoader.loadPlugins();

            const shouldRebuild = await pluginLoader.executeHook('invokeRebuild');
            if (shouldRebuild) {
                console.log('Rebuild requested by plugin');
                rebuild = true;
            }
        } catch (error) {
            console.error(`--------\nError loading plugins\n${error}`);
            throw error;
        }

        if (blogConfig.dev === 'true') {
            console.warn("Running in dev mode!!");
            isAppModeDev = true;
        } else if (rebuild) {
            build();
            rebuild = false;
        } else {
            // build()
        }

    } catch (error) {
        console.error('Error in init:', error);
        throw error;
    }
}

function processlinks(linksArray) {
    fs.readdirSync(path.join(__dirname, 'files')).forEach(file => {
        const fileName = file;
        const stats = fs.statSync(path.join(__dirname, 'files', file));
        
        if (fileName.endsWith('.md')) {
            if (fileName === 'index.md') {
                linksArray["/"].push('/');
            }
            let link = fileName.replace('.md', '');
            linksArray["/"].push(link);
        } else if (stats.isDirectory()) {
            linksArray[fileName] = [];
            fs.readdirSync(path.join(__dirname, 'files', fileName)).forEach(subfile => {
                if (subfile.endsWith('.md')) {
                    let link = subfile.replace('.md', '');
                    linksArray[fileName].push(fileName+"/"+link);
                }
            });
        }
    });
    return linksArray
}

// async function yeettotemplate(template, content, frontmatter, processedLinks, fileName) {
//     const css = fs.readFileSync(path.join(__dirname, 'template', currentTheme, 'index.css'), 'utf8');
//     const js = fs.readFileSync(path.join(__dirname, 'template', currentTheme, 'app.js'), 'utf8');
//     const hightlightjstheme = fs.readFileSync(path.join(__dirname, 'dracula.css'), 'utf-8');

//     try {
//         [template, content, frontmatter] = await pluginLoader.executeHook('beforeTemplate', template, content, frontmatter, fileName);

//     } catch (error) {
//         console.error('----------');
//         console.error(error.message);
//         throw error;
//     }


//     template = template.replace("</head>", `</head><style>${css}</style></head>`);
//     template = template.replace("</body>", `</body><script>${js}</script></body>`);

//     template = template.replace('{PAGECONTENT}', content);

//     template = template.replace('{BLOGNAMETITLE}', blogConfig.blogname);
//     template = template.replace('{PAGETITLE}', frontmatter.title);
//     template = template.replace('{BLOGNAME}', `<a href="/" id="blogname"><span>${blogConfig.blogname}</span></a>`);
//     template = template.replace('</body>', `</body><style>${hightlightjstheme}</style>`);
//     template = template.replace('{FOOTERCONTENT}', (blogConfig.footerContent).replace("{year}", new Date().getFullYear()));
//     // template = template.replace('<script>', '<script>let linksArray = ' + JSON.stringify(processedLinks) + ';');
//     // template = template.replace('<script>', '<script>let frontmatter = ' + JSON.stringify(frontmatter) + ';');
    
    
//     return template
// }

async function yeettotemplate(template, content, frontmatter, processedLinks, fileName) {
    try {
        // console.log(frontmatter)
        const [newTemplate, newContent, newFrontmatter] = await pluginLoader.executeHook('beforeTemplate', template, content, frontmatter, fileName);
        template = newTemplate;
        content = newContent;
        frontmatter = newFrontmatter;
        // console.log('\n\n[yettotemplate (beforeTemplate Hook)]: \n',newTemplate)
    } catch (error) {
        console.error('----------');
        console.error(error.message);
        throw error;
    }

    // console.log("lollll  "+template)

    const hightlightjstheme = fs.readFileSync(path.join(__dirname, 'dracula.css'), 'utf-8');
    const css = fs.readFileSync(path.join(__dirname, 'template', currentTheme, 'index.css'), 'utf8');
    const js = fs.readFileSync(path.join(__dirname, 'template', currentTheme, 'app.js'), 'utf8');

    if (!isAppModeDev) {
        try {
            // Process CSS
            const cssResult = await postcss([cssnano])
                .process(css, { from: undefined });
            template = template.replace("</head>", `</head><style>${cssResult.css}</style></head>`);

            // Process JS
            const jsResult = await Terser.minify(js);
            template = template.replace("</body>", `</body><script>${jsResult.code}</script></body>`);
        } catch (error) {
            console.error('----------\nError in yeettotemplate:', error);
            throw error;
        }
    } else {
        template = template.replace("</head>", `</head><style>${css}</style></head>`);
        template = template.replace("</body>", `</body><script>${js}</script></body>`);
    }



    // Replace 'index' with '/' in the array
    // linksArray = linksArray.map(link => link === 'index' ? '/' : link);

    // content = content.replace("</head>", )

    // content = content.replace("<h1>", "<div id='heading'><h1 id='contentHeading'>")
    // content = content.replace("</h1>", `</h1><div id="subtitle"><p class="subtitle-text">${frontmatter.date}</p><p class="reading-time subtitle-text">${frontmatter.readingTime} min read</p></div></div>`)
    content = content.replace(/---[\s\S]*?---/, "")
    // Add validation checks
    if (!template.includes('{BLOGNAME}')) {
        console.error('Template is missing {BLOGNAME} placeholder');
    }
    if (!template.includes('{PAGECONTENT}')) {
        console.error('Template is missing {PAGECONTENT} placeholder');
    }
    if (!blogConfig.blogname) {
        console.error('blogConfig.blogname is undefined');
    }

    template = template.replace('{PAGECONTENT}', content);

    template = template.replace('{BLOGNAMETITLE}', blogConfig.blogname);
    template = template.replace('{PAGETITLE}', frontmatter.title);
    template = template.replace('{BLOGNAME}', `<a href="/" id="blogname"><span>${blogConfig.blogname}</span></a>`);
    template = template.replace('</body>', `</body><style>${hightlightjstheme}</style>`);
    template = template.replace('{FOOTERCONTENT}', (blogConfig.footerContent).replace("{year}", new Date().getFullYear()));
    // template = template.replace('<script>', '<script>let linksArray = ' + JSON.stringify(processedLinks) + ';');
    // template = template.replace('<script>', '<script>let frontmatter = ' + JSON.stringify(frontmatter) + ';');
    
    // console.log("[yettotemplate]: ",template)
    
    try {
        // console.log(processedLinks)
        const processedLinksl = processedLinks;
        const [newNewTemplate] = await pluginLoader.executeHook('afterTemplate', template, content, frontmatter, processedLinksl, fileName);
        template = newNewTemplate;
        // console.log("\n\n[yettotemplate (afterTemplate Hook)]: ",newNewTemplate)
    } catch (error) {
        console.error('----------');
        console.error(error.message);
        throw error;
    }
    return template
}

async function parseMarkdown(markdown) {
    try {
        markdown = await pluginLoader.executeHook('beforeParse', markdown);
    } catch (error) {
        console.error('----------');
        console.error(error.message);
        throw error;
    }

    if (typeof markdown !== 'string') {
        throw new TypeError('Input must be a string');
    }

    let html = markdown;
    let frontmatter = {};
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const frontmatterMatch = html.match(frontmatterRegex);
    
    if (frontmatterMatch) {
        const frontmatterContent = frontmatterMatch[1];
        frontmatterContent.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length) {
                frontmatter[key.trim()] = valueParts.join(':').trim();
            }
        });
        html = html.slice(frontmatterMatch[0].length).trim();
    }

    // Protect code blocks
    const codeBlocks = new Map();
    let codeBlockId = 0;

    html = html.replace(/```([^\n]*)\n([\s\S]*?)```/g, (match, lang, code) => {
        const token = `%%CODEBLOCK${codeBlockId}%%`;
        codeBlocks.set(token, {
            language: lang.trim() || 'plaintext',
            code: code.trim()
        });
        codeBlockId++;
        return token;
    });

    // Handle inline code
    html = html.replace(/`([^`]+)`/g, (match, code) => {
        const token = `%%INLINECODE${codeBlockId}%%`;
        codeBlocks.set(token, {
            language: 'inline',
            code: code
        });
        codeBlockId++;
        return token;
    });

    // Improved list and paragraph processing
    let processedLines = [];
    let isInList = false;
    let currentListType = null;

    html.split('\n').forEach(line => {
        // Unordered list item detection
        const unorderedListMatch = line.match(/^[\*\-\+]\s+(.+)/);
        // Ordered list item detection
        const orderedListMatch = line.match(/^\d+\.\s+(.+)/);
        // Blockquote detection
        const blockquoteMatch = line.match(/^>\s*(.*)/);
        // Heading detection
        const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
        // Horizontal rule detection
        const hrMatch = line.match(/^(?:[\t ]*(?:-{3,}|\*{3,}|_{3,})[\t ]*?)$/);

        if (unorderedListMatch) {
            if (!isInList || currentListType !== 'ul') {
                // Start of a new unordered list
                processedLines.push('<ul>');
                isInList = true;
                currentListType = 'ul';
            }
            processedLines.push(`<li>${unorderedListMatch[1]}</li>`);
        } else if (orderedListMatch) {
            if (!isInList || currentListType !== 'ol') {
                // Start of a new ordered list
                processedLines.push('<ol>');
                isInList = true;
                currentListType = 'ol';
            }
            processedLines.push(`<li>${orderedListMatch[1]}</li>`);
        } else if (blockquoteMatch) {
            // Close any open list
            if (isInList) {
                processedLines.push(currentListType === 'ul' ? '</ul>' : '</ol>');
                isInList = false;
                currentListType = null;
            }
            processedLines.push(`<blockquote>${blockquoteMatch[1]}</blockquote>`);
        } else if (headingMatch) {
            // Close any open list
            if (isInList) {
                processedLines.push(currentListType === 'ul' ? '</ul>' : '</ol>');
                isInList = false;
                currentListType = null;
            }
            // Convert heading based on number of #
            const headingLevel = headingMatch[1].length;
            processedLines.push(`<h${headingLevel}>${headingMatch[2]}</h${headingLevel}>`);
        } else if (hrMatch) {
            // Close any open list
            if (isInList) {
                processedLines.push(currentListType === 'ul' ? '</ul>' : '</ol>');
                isInList = false;
                currentListType = null;
            }
            processedLines.push('<hr>');
        } else {
            // Not a list item
            if (isInList) {
                // Close the previous list
                processedLines.push(currentListType === 'ul' ? '</ul>' : '</ol>');
                isInList = false;
                currentListType = null;
            }

            // Trim the line and add non-empty lines as paragraphs
            const trimmedLine = line.trim();
            if (trimmedLine) {
                processedLines.push(`<p>${trimmedLine}</p>`);
            }
        }
    });

    // Close any open list at the end
    if (isInList) {
        processedLines.push(currentListType === 'ul' ? '</ul>' : '</ol>');
    }

    // Join the processed lines
    let processedContent = processedLines.join('\n');

    // Additional Markdown conversions
    processedContent = processedContent.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
    processedContent = processedContent.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
    processedContent = processedContent.replace(/~~(.*?)~~/g, '<del>$1</del>');
    processedContent = processedContent.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, 
        (match, alt, url) => `<img src="${url}" alt="${alt}">`);
    processedContent = processedContent.replace(/\[([^\]]+)\]\(([^)"]+)(?:\s+"([^"]+)")?\)/g, 
        (match, text, url, title) => `<a href="${url}"${title ? ` title="${title}"` : ''}>${text}</a>`);

    // Restore code blocks
    processedContent = processedContent.replace(/%%INLINECODE\d+%%/g, match => {
        const block = codeBlocks.get(match);
        return `<code class="inline">${block.code}</code>`;
    });

    processedContent = processedContent.replace(/%%CODEBLOCK\d+%%/g, match => {
        const block = codeBlocks.get(match);
        return `<pre><code class="language-${block.language}">${block.code}</code></pre>`;
    });

    const readingTime = calculateReadingTime(processedContent);
    frontmatter.readingTime = readingTime;

    try {
        const [newHtml, newFrontmatter] = await pluginLoader.executeHook('afterParse', processedContent, frontmatter);
        processedContent = newHtml;
        frontmatter = newFrontmatter;
    } catch (error) {
        console.error('----------');
        console.error(error.message);
        throw error;
    }

    return {
        content: processedContent.trim(),
        frontmatter
    };
}

// TODO fix this (emitter.on is not a function)

emitter.on('rebuild', data => {
    console.log(data);
    build(data);
});

app.post('/plugin/:pluginName/:functionName', async (req, res) => {
    try {
        const result = await pluginLoader.callPluginFunction(
            req.params.pluginName,
            req.params.functionName,
            req.body
        );
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});


app.get('/', async (req, res) => {
    if (isAppModeDev) {
        try {
            let template = fs.readFileSync(path.join(__dirname, 'template', currentTheme, 'index.html'), 'utf8');
            const contentContent = fs.readFileSync(path.join(__dirname, 'files', 'index.md'), 'utf8');
            let {content, frontmatter} = await parseMarkdown(contentContent);
            
            let linksArray = {"/":[]};
            processedLinks = processlinks(linksArray);

            // console.log(frontmatter)

            res.send(await yeettotemplate(template, content, frontmatter, processedLinks, 'index.md'));
        } catch (error) {
            console.error('Error in / route:', error);
            res.status(500).send('Error reading the file.');
        } 
    } else {
        res.sendFile(path.join(__dirname, 'builtFiles', 'index.html'));
    }

});

app.get('/image/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'images', req.params[0]));
});

app.get('/*', async (req, res) => {
    if (isAppModeDev) {
        try {
            const filePath = path.join(__dirname, 'files', req.params[0] + '.md');
            let template = fs.readFileSync(path.join(__dirname, 'template', currentTheme, 'index.html'), 'utf8');
            const contentContent = fs.readFileSync(filePath, 'utf8');
            let {content, frontmatter} = await parseMarkdown(contentContent);
            let linksArray = {"/":[]};
            const processedLinks = processlinks(linksArray);

            res.send(await yeettotemplate(template, content, frontmatter, processedLinks, req.params[0] + '.md'));
        } catch (e) {
            // console.error(name, "\n", message)
            if (e instanceof Error && e.code === 'ENOENT') {
                res.status(404).send('404 | File not found.');
            } else {
                console.log(e)
                res.status(500).send('Error reading the file.');
            }
            // res.status(404).send('File not found.');
        }
    } else {
        res.sendFile(path.join(__dirname, 'builtFiles', req.params[0] + '.html'));
    }
});



// Start server
const PORT = 3001;
app.listen(PORT, () => {
    init();
    console.log(`Server is running on port ${PORT}`);
});