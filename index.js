const fs = require('fs');
const path = require('path');
const Terser = require('terser');
const postcss = require('postcss');
const cssnano = require('cssnano');
const express = require('express');
const Logger = require('./logger');
var compression = require('compression')
const {parseMarkdown} = require('./parser');
const {createPluginLoader, emitter} = require('./pluginLoader');
const {processlinks, generateChecksum, firstTimeRun} = require('./utils');

let blogConfig
let isAppModeDev;
let rebuild;
let currentTheme;
let arePluginsEnabled;
let currentThemeConfig;
let processedLinks
var logger;
let pluginLoader;

const app = express();
app.use(express.json());
app.use(compression());
app.use((req, res, next) => {
    // logger.info(req)
    logger.info(`New ${req.method} request | ${req.url} | ${new Date().toISOString()} | ${req.ip} | ${req.get('User-Agent')}`);
    next();
});


/**
 * by default goes over the `files/` directory and converts each .md file to a .html file, if `fileName` is present it will only covert that specific file
 * @param {string} fileName - optional
 */
async function build(fileName) {

    // get links
    let linksArray = {"/":[]};
    processedLinks = processlinks(linksArray);

    if (fileName) {
        let fileToBuild;
        try {
            logger.info(`Rebuilding ${fileName}`);
            if (fileName.split('/').length > 1) {
                fileToBuild = fs.readFileSync(path.join(__dirname, 'files', fileName[0], fileName[1]), 'utf8');
            } else {
                fileToBuild = fs.readFileSync(path.join(__dirname, 'files', fileName), 'utf8');
            }

            const {content, frontmatter} = await parseMarkdown(fileToBuild);
            const HTMLtemplate = fs.readFileSync(path.join(__dirname, 'template', 'index.html'), 'utf8');
            const builtPage = await yeettotemplate(HTMLtemplate, content, frontmatter, processedLinks);

            if (fileName.split('/').length > 1) {
                fs.writeFileSync(path.join(__dirname, 'builtFiles', fileName[0], fileName[1].replace('.md', '.html')), builtPage);
            } else {
                fs.writeFileSync(path.join(__dirname, 'builtFiles', fileName.replace('.md', '.html')), builtPage);
            }

            const checksums = JSON.parse(fs.readFileSync(path.join(__dirname, 'checksums.json'), 'utf8'));
            checksums[fileName] = generateChecksum(fileToBuild);
            fs.writeFileSync(path.join(__dirname, 'checksums.json'), JSON.stringify(checksums, null, 4));

            logger.info(`Rebuilding ${fileName} success`);
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
        // throw error;
    }
    logger.info('Building files...');
    const HTMLtemplate = await fs.readFileSync(path.join(__dirname, 'template', currentTheme, 'index.html'), 'utf8');
    let fileContent;
    let checksums = {};
    if (fs.existsSync(path.join(__dirname, 'checksums.json'))) {
        checksums = JSON.parse(fs.readFileSync(path.join(__dirname, 'checksums.json'), 'utf8'));
    }

    isAppModeDev = false;
    if (fs.existsSync(path.join(__dirname, 'builtFiles'))) {
        logger.info('found previous build, rebuilding');
        fs.rmdirSync(path.join(__dirname, 'builtFiles'), { recursive: true });
    }
    fs.mkdirSync(path.join(__dirname, 'builtFiles'), { recursive: true });

    const files = fs.readdirSync(path.join(__dirname, 'files'));
    for (const file of files) {
        const fileName = file;
        const stats = fs.statSync(path.join(__dirname, 'files', file));

        if (fileName.endsWith('.md')) {

            logger.info(`[build]: Building ${fileName}`);

            fileContent = await fs.readFileSync(path.join(__dirname, 'files', fileName), 'utf8');
            const {content, frontmatter} = await parseMarkdown(fileContent);
            const builtPage = await yeettotemplate(HTMLtemplate, content, frontmatter, processedLinks);

            fs.writeFileSync(path.join(__dirname, 'builtFiles', fileName.replace('.md', '.html')), builtPage);
            checksums[fileName] = generateChecksum(fileContent);

            logger.info(`[build]: Building ${fileName} success`);

        } else if (stats.isDirectory()) {

            fs.mkdirSync(path.join(__dirname, 'builtFiles', fileName), { recursive: true });
            const subfiles = fs.readdirSync(path.join(__dirname, 'files', fileName));

            for (const subfile of subfiles) {
                if (subfile.endsWith('.md')) {

                    logger.info(`[build]: Building ${fileName}/${subfile}`);

                    fileContent = await fs.readFileSync(path.join(__dirname, 'files', fileName, subfile), 'utf8');
                    const {content, frontmatter} = await parseMarkdown(fileContent);
                    const builtPage = await yeettotemplate(HTMLtemplate, content, frontmatter, processedLinks);

                    fs.writeFileSync(path.join(__dirname, 'builtFiles', fileName, subfile.replace('.md', '.html')), builtPage);
                    checksums[`${fileName}/${subfile}`] = generateChecksum(fileContent);

                    logger.info(`[build]: Building ${fileName} success`);
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
    logger.info('Saving checksums...');
    fs.writeFileSync(path.join(__dirname, 'checksums.json'), JSON.stringify(checksums, null, 4));
    logger.info('Build complete!');
    try {
        await pluginLoader.executeHook('afterBuild');   
    } catch (error) {
        console.error('----------');
        console.error(error.message);
        // throw error;
    }



}




/**
 *  simple init function
 */
async function init() {
    console.log("scribbledown init!");

    try {

        // check if we're running for the first time
        if (!fs.existsSync(path.join(__dirname, '.scribbledown-pastFirstrun'))) {
            firstTimeRun();
        }

        // read and parse config
        try {
            console.log("Reading blog.conf");
            blogConfig = fs.readFileSync(path.join(__dirname, 'blog.conf'), 'utf8');
            const configstat = fs.statSync(path.join(__dirname, 'blog.conf'));
            if (configstat.size === 0) {
                console.log("Config file is empty!");
                console.error('writing defaults to blog.conf');
                blogConfig = {
                    blogname: 'scribbledown blog',
                    footerContent: '© {year} scribbledown.',
                    dev: 'false',
                    arePluginsEnabled: 'false',
                    currentTheme: 'default',
                    port: '3001',
                    logging: {
                        saveLogToFile:'false',
                        saveLogFilePath:''
                    }
                };
                fs.writeFileSync(path.join(__dirname, 'blog.conf'), JSON.stringify(blogConfig, null, 4));
                blogConfig = fs.readFileSync(path.join(__dirname, 'blog.conf'), 'utf8');
            }
            blogConfig = JSON.parse(blogConfig);
            currentTheme = blogConfig.currentTheme;

            if (blogConfig.port === undefined || blogConfig.port == "" || blogConfig.port == NaN) {
                blogConfig.port = 3001
                console.warn("===\nPort not set, continuing with 3001.\nplease set a port in the blog.conf\n===")
            }

        } catch (error) {
            console.error('---------\nError reading blog.conf:', error);
            throw error;
        }

        // start the logger
        try {
            logger = new Logger({
                isDebug:blogConfig.dev,
                logPath:blogConfig.logging.saveLogFilePath,
                logToFile:blogConfig.logging.saveLogToFile
            })
        } catch (error) {
            console.log(error)
        }

        try {
            const themeConfig = fs.readFileSync(path.join(__dirname, 'template', currentTheme, 'config.json'), 'utf8');
            currentThemeConfig = JSON.parse(themeConfig);
        } catch (error) {
            console.warn('---------\nError reading theme config:\n', error);
            console.warn(`will not be able to display theme's name and author\n----------`)
        }

        logger.info("hgc")
        
        const date = new Date();
        const formattedDate = `${date.getDate()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
        // check if the files directory is empty
        if (fs.existsSync(path.join(__dirname, 'files'))) {
            const files = fs.readdirSync(path.join(__dirname, 'files'));
            if (files.length === 0) {
                logger.info('Files directory is empty!\nAssuming first run!');
                fs.writeFileSync(path.join(__dirname, 'files', 'index.md'), `---\ntitle: Welcome to scribbledown\ndate:${formattedDate}\n---\n# Welcome to scribbledown\n\nIf you're reading this. Welcome, everything is fine.`);
                fs.writeFileSync(path.join(__dirname, 'files', 'welcome.md'), `---\ntitle: Welcome to scribbledown v2\ndate:${formattedDate}\n---\n# Welcome\n\n[shadowman](https://github.com/duch3201) here, welcome to scribbledown, thanks for checking it out.\n\nThis is a really cool blogging engine thingy and im so happy you decided to check it out, have fun creating templates or just writing your blog!`);
            }
        }

        // check the template directory
        logger.info("Checking template directory");
        if (fs.existsSync(path.join(__dirname, 'template'))) {
            const templateFiles = fs.readdirSync(path.join(__dirname, 'template'));
            if (templateFiles.length === 0) {
                console.error("----------\nTemplate directory is empty!");
                throw new Error('Template directory is empty!');
            }
        }

        // see if the checksums.json file exists if it does check every file in the files directory
        logger.info("Checking checksums.json");
        try {
            if (!fs.existsSync(path.join(__dirname, 'checksums.json'))) {
                fs.writeFileSync(path.join(__dirname, 'checksums.json'), JSON.stringify({}));
            }

            let checksums = JSON.parse(fs.readFileSync(path.join(__dirname, 'checksums.json'), 'utf8'));
            rebuild = false; // Reset rebuild flag

            // Check if the checksums file is empty
            if (checksums === null || Object.keys(checksums).length === 0) {
                logger.info('Checksums file is empty!');
                build();
            }

            // Check if the files have changed
            fs.readdirSync(path.join(__dirname, 'files')).forEach(file => {
                const fileName = file;
                const stats = fs.statSync(path.join(__dirname, 'files', file));

                if (fileName.endsWith('.md')) {
                    // const fileContent = fs.readFileSync(`./files/${fileName}`, 'utf8');
                    const fileContent = fs.readFileSync(path.join(__dirname, 'files', fileName), 'utf8');
                    const currentChecksum = generateChecksum(fileContent);
                    if (!checksums[fileName] || checksums[fileName] !== currentChecksum) {
                        logger.info(`File ${fileName} has changed`);
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
                                logger.info(`File ${filePath} has changed`);
                                rebuild = true;
                            }
                        }
                    });
                }
            });

            // check if the template, css or js files have changed
            logger.info('Checking template, CSS, and JS files'); // could turn the fs.readFileSyncs below to a helper function that retursn three variables, HTMLTemplate, css, js
            const HTMLtemplate = fs.readFileSync(path.join(__dirname, 'template', currentTheme, 'index.html'), 'utf8');
            const css = fs.readFileSync(path.join(__dirname, 'template', currentTheme, 'index.css'), 'utf8');
            const js = fs.readFileSync(path.join(__dirname, 'template', currentTheme, 'app.js'), 'utf8');
            const currentChecksum = generateChecksum(HTMLtemplate + css + js);
            if (!checksums['template'] || checksums['template'] !== currentChecksum) {
                logger.info('Template, CSS, or JS files have changed');
                rebuild = true;
            } else {
                logger.info('Template, CSS, and JS files are unchanged');
            }

            // check if the config file has changed
            logger.info('Checking config file for changes');
            const configChecksum = generateChecksum(JSON.stringify(blogConfig));
            if (!checksums['config'] || checksums['config'] !== configChecksum) {
                logger.info('Config file has changed');
                rebuild = true;
            } else {
                logger.info('Config file is unchanged');
            }

        } catch (error) {
            console.error('----------\nError reading checksums.json:', error);
            rebuild = true;
        }

        // check if plugins are enabled
        if (blogConfig.arePluginsEnabled === 'true') {
            arePluginsEnabled = true;
        } else {
            arePluginsEnabled = false;
        }

        if (arePluginsEnabled) {
            try {
                logger.info('Loading plugins...');
                pluginLoader = createPluginLoader(logger);
                await pluginLoader.loadPlugins();
                
                const shouldRebuild = await pluginLoader.executeHook('invokeRebuild');
                if (shouldRebuild) {
                    logger.info('Rebuild requested by plugin');
                    rebuild = true;
                }
            } catch (error) {
                console.error(`--------\nError loading plugins\n${error}`);
                throw error;
            }
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



async function yeettotemplate(template, content, frontmatter, processedLinks) {
    try {
        // logger.info(frontmatter)
        const [newTemplate, newContent, newFrontmatter] = await pluginLoader.executeHook('beforeTemplate', template, content, frontmatter);
        template = newTemplate;
        content = newContent;
        frontmatter = newFrontmatter;
        // logger.info('\n\n[yettotemplate (beforeTemplate Hook)]: \n',newTemplate)
    } catch (error) {
        console.error('----------');
        console.error(error);
        // throw error;
    }

    // logger.info("lollll  "+JSON.stringify(processedLinks))

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

    // logger.info("[yettotemplate]: ",template)

    try {
        // logger.info(processedLinks)
        const processedLinksl = processedLinks;
        const [newNewTemplate] = await pluginLoader.executeHook('afterTemplate', template, content, frontmatter, processedLinksl);
        template = newNewTemplate;
        // logger.info("\n\n[yettotemplate (afterTemplate Hook)]: ",newNewTemplate)
    } catch (error) {
        console.error('----------');
        console.error(error.message);
        // throw error;
    }
    return template
}



emitter.on('rebuild', data => {
    logger.info(data);
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

            // logger.info(frontmatter)

            res.send(await yeettotemplate(template, content, frontmatter, processedLinks));
        } catch (error) {
            console.error('Error in / route:', error);
            res.status(500).send('Error reading the file.');
        } 
    } else {
        res.sendFile(path.join(__dirname, 'builtFiles', 'index.html'));
    }

});

// v2.2.0: fix path traversal (oops, sorry!)
app.get('/image/*', (req, res) => {
    const safeBase = path.join(__dirname, 'public', 'images');
    const requestedPath = path.normalize(path.join(safeBase, req.params[0]));
    if (!requestedPath.startsWith(safeBase)) {
        return res.status(400).send('Invalid path');
    }
    fs.readFile(requestedPath, (err, data) => {
        if (err) return res.status(404).send('Not found');
        res.send(data);
    });
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

            res.send(await yeettotemplate(template, content, frontmatter, processedLinks));
        } catch (e) {
            // console.error(name, "\n", message)
            if (e instanceof Error && e.code === 'ENOENT') {
                res.status(404).send('404 | File not found.');
            } else {
                logger.info(e)
                res.status(500).send('Error reading the file.');
            }
            // res.status(404).send('File not found.');
        }
    } else {
        res.sendFile(path.join(__dirname, 'builtFiles', req.params[0] + '.html'));
    }
});



// Start server
(async function main() {
    await init();
    const PORT = parseInt(blogConfig.port);
    app.listen(PORT, '0.0.0.0', () => {
        logger.info(`\n====\nServer is running on port http://0.0.0.0:${PORT}\n===`);
    });
})();
// logger.close()