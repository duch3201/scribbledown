const express = require('express');
const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const cssnano = require('cssnano');
const Terser = require('terser');
var compression = require('compression')
var crypto = require('crypto');

let blogConfig
let isAppModeDev;
let rebuild;


const app = express();
app.use(express.json());
app.use(compression());
app.use((req, res, next) => {
    // console.log(req)
    console.log(`New ${req.method} request | ${req.url} | ${new Date().toISOString()} | ${req.ip} | ${req.get('User-Agent')}`);
    next();
});

async function build() {
    console.log('Building files...');
    const HTMLtemplate = await fs.readFileSync('./template/index.html', 'utf8');
    let fileContent;
    let checksums = {};
    if (fs.existsSync('./checksums.json')) {
        checksums = JSON.parse(fs.readFileSync('./checksums.json', 'utf8'));
    }

    isAppModeDev = false;
    if (fs.existsSync('./builtFiles')) {
        console.log('found previous build, rebuilding');
        fs.rmdirSync('./builtFiles', { recursive: true });
    }
    fs.mkdirSync('./builtFiles', { recursive: true });

    const files = fs.readdirSync('./files');
    for (const file of files) {
        const fileName = file;
        const stats = fs.statSync(`./files/${file}`);

        if (fileName.endsWith('.md')) {
            fileContent = await fs.readFileSync(`./files/${fileName}`, 'utf8');
            const {content, frontmatter} = parseMarkdown(fileContent);
            const builtPage = await yeettotemplate(HTMLtemplate, content, frontmatter);
            fs.writeFileSync(`./builtFiles/${fileName.replace('.md', '.html')}`, builtPage);
            checksums[fileName] = generateChecksum(fileContent);
        } else if (stats.isDirectory()) {
            fs.mkdirSync(`./builtFiles/${fileName}`, { recursive: true });
            const subfiles = fs.readdirSync(`./files/${fileName}`);
            for (const subfile of subfiles) {
                if (subfile.endsWith('.md')) {
                    fileContent = await fs.readFileSync(`./files/${fileName}/${subfile}`, 'utf8');
                    const {content, frontmatter} = parseMarkdown(fileContent);
                    const builtPage = await yeettotemplate(HTMLtemplate, content, frontmatter);
                    fs.writeFileSync(`./builtFiles/${fileName}/${subfile.replace('.md', '.html')}`, builtPage);
                    checksums[`${fileName}/${subfile}`] = generateChecksum(fileContent);
                }
            }
        }
    }

    // add checksums for template, css, and js files
    const css = fs.readFileSync('./template/index.css', 'utf8');
    const js = fs.readFileSync('./template/app.js', 'utf8');
    const currentChecksum = generateChecksum(HTMLtemplate + css + js);
    checksums['template'] = currentChecksum;

    // add checksum for the config
    checksums['config'] = generateChecksum(JSON.stringify(blogConfig));

    // Save checksums after all files are processed
    console.log('Saving checksums...');
    fs.writeFileSync('./checksums.json', JSON.stringify(checksums, null, 4));
    console.log('Build complete!');
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
    try {

        // read and parse config
        try {
            blogConfig = fs.readFileSync('./blog.conf', 'utf8');
            blogConfig = JSON.parse(blogConfig);
        } catch (error) {
            console.error('Error reading blog.conf:', error);
            console.error('Creating a new blog.conf file with default values');
            blogConfig = {
                blogname: 'My Blog',
                footerContent: '© {year} My Blog. All rights reserved.',
                mode: 'dev'
            };
            fs.writeFileSync('./blog.conf', JSON.stringify(blogConfig, null, 4));

        }

        // see if the checksums.json file exists if it does check every file in the files directory
        try {
            if (!fs.existsSync('./checksums.json')) {
                fs.writeFileSync('./checksums.json', JSON.stringify({}));
            }

            let checksums = JSON.parse(fs.readFileSync('./checksums.json', 'utf8'));
            rebuild = false; // Reset rebuild flag

            // Check if the files have changed
            fs.readdirSync('./files').forEach(file => {
                const fileName = file;
                const stats = fs.statSync(`./files/${file}`);

                if (fileName.endsWith('.md')) {
                    const fileContent = fs.readFileSync(`./files/${fileName}`, 'utf8');
                    const currentChecksum = generateChecksum(fileContent);
                    if (!checksums[fileName] || checksums[fileName] !== currentChecksum) {
                        console.log(`File ${fileName} has changed`);
                        rebuild = true;
                    }
                } else if (stats.isDirectory()) {
                    fs.readdirSync(`./files/${fileName}`).forEach(subfile => {
                        if (subfile.endsWith('.md')) {
                            const fileContent = fs.readFileSync(`./files/${fileName}/${subfile}`, 'utf8');
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
            const HTMLtemplate = fs.readFileSync('./template/index.html', 'utf8');
            const css = fs.readFileSync('./template/index.css', 'utf8');
            const js = fs.readFileSync('./template/app.js', 'utf8');
            const currentChecksum = generateChecksum(HTMLtemplate + css + js);
            if (!checksums['template'] || checksums['template'] !== currentChecksum) {
                console.log('Template, CSS, or JS files have changed');
                rebuild = true;
            }

            // check if the config file has changed
            const configChecksum = generateChecksum(JSON.stringify(blogConfig));
            if (!checksums['config'] || checksums['config'] !== configChecksum) {
                console.log('Config file has changed');
                rebuild = true;
            }

        } catch (error) {
            console.error('Error reading checksums.json:', error);
            rebuild = true;
        }

        if (blogConfig.dev === 'true') {
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
    fs.readdirSync('./files').forEach(file => {
        // console.log(file)
        const fileName = file;
        // if (file.isFile) {
        //     console.log("test")
        // }
        file = fs.statSync(`./files/${file}`);
        // console.log(file)
        if (fileName.endsWith('.md')) {
            if (fileName === 'index.md') {
                linksArray["/"].push('/');
            }
            // console.log(file)
            let link = fileName.replace('.md', '');
            linksArray["/"].push(link);
        } else {
            // console.log("KURWAA")
            if (file.isDirectory) {
                // console.log(file)
                // console.log("FILE is a directory")
                // linksArray.push(file);
                linksArray[fileName] = [];
                fs.readdirSync(`./files/${fileName}`).forEach(subfile => {
                    // linksArray.push(filename:[])
                    if (subfile.endsWith('.md')) {
                        let link = subfile.replace('.md', '');
                        linksArray[fileName].push(fileName+"/"+link);
                    }
                })
            }
        }
    });

    // console.log(linksArray)
}

async function yeettotemplate(template, content, frontmatter) {
    // content = content.html

    const hightlightjstheme = fs.readFileSync('./dracula.css', 'utf-8');
    
    try {
        const css = fs.readFileSync('./template/index.css', 'utf8');
        const js = fs.readFileSync('./template/app.js', 'utf8');

        // Process CSS
        const cssResult = await postcss([cssnano])
            .process(css, { from: undefined });
        template = template.replace("</head>", `</head><style>${cssResult.css}</style></head>`);

        // Process JS
        const jsResult = await Terser.minify(js);
        template = template.replace("</body>", `</body><script>${jsResult.code}</script></body>`);

        // return content;
    } catch (error) {
        console.error('Error in yeettotemplate:', error);
        throw error;
    }

    // get links
    let linksArray = {"/":[]};
    // console.log(fs.readdirSync('./files'))
    processlinks(linksArray);

    // Replace 'index' with '/' in the array
    // linksArray = linksArray.map(link => link === 'index' ? '/' : link);

    let processedFolders = {};
    let processedLinks = [];
    Object.keys(linksArray).forEach(key => {
        linksArray[key].forEach(link => {
            // console.log(link, key)
            if (key === "/") {
                if (link === 'index') {
                    // processedLinks.push(`<li><a href="/">${link}</a></li>`);
                    return;
                }
                if (link === '/') {
                    // processedLinks.push(`<li><a href="/">/</a></li>`);
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
            // if (link === '/') {
            //     processedLinks.push(`<li><a href="/">index</a></li>`);
            // } else if (link includes("/")) {
            //     let [folder, page] = link.split("/");
            //     if (!processedLinks.includes(`<h3>${folder}</h3>`)) {
            //         processedLinks.push(`<h3>${folder}</h3><ul><li><a href="/${link}">${page}</a></li></ul>`);
            //     } else {
            //         processedLinks.push(`<li><a href="/${link}">${page}</a></li>`);
            //     }
            // } else {
            //     processedLinks.push(`<li><a href="/${link}">${link}</a></li>`);
            // }
        });
    });

    if (Object.keys(processedFolders).length > 0) {
        Object.keys(processedFolders).forEach(folder => {
            // console.log("KUWAR TEST  "+folder)
            // console.error("KUWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\n"+folder)
            processedLinks.push(`<h3>${folder}</h3><ol>${processedFolders[folder].join('')}</ol>`);
        });
    }

    // console.log(processedFolders)
    // console.log(((content.split("---")[1]).split("\n")[2]).split(":")[1].trim())

    console.log(frontmatter)

    // content = content.replace("</head>", )

    content = content.replace("<h1>", "<div id='heading'><h1 id='contentHeading'>")
    content = content.replace("</h1>", `</h1><div id="subtitle"><p class="subtitle-text">${frontmatter.date}</p><p class="reading-time subtitle-text">${frontmatter.readingTime} min read</p></div></div>`)
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
    // console.log(linksArray)
    template = template.replace('</body>', `</body><style>${hightlightjstheme}</style>`);
    template = template.replace('{FOOTERCONTENT}', (blogConfig.footerContent).replace("{year}", new Date().getFullYear()));
    template = template.replace('{PAGES}', `<ul>${processedLinks.join('')}</ul>`);

    // console.log(template)

    return template
}

function parseMarkdown(markdown) {
    // Input validation and frontmatter handling stays the same
    if (typeof markdown !== 'string') {
        throw new TypeError('Input must be a string');
    }

    let html = markdown;
    const frontmatter = {};
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

    // First, protect code blocks with unique tokens
    const codeBlocks = new Map();
    let codeBlockId = 0;

    // Handle fenced code blocks with language specification
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

    // Convert headers (h1-h6)
    for (let i = 6; i >= 1; i--) {
        const pattern = new RegExp(`^${('#').repeat(i)}\\s+(.+)$`, 'gm');
        html = html.replace(pattern, `<h${i}>$1</h${i}>`);
    }

    // Convert other Markdown elements
    html = html.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
    html = html.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
    html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, 
        (match, alt, url) => `<img src="${url}" alt="${alt}">`);
    html = html.replace(/\[([^\]]+)\]\(([^)"]+)(?:\s+"([^"]+)")?\)/g, 
        (match, text, url, title) => `<a href="${url}"${title ? ` title="${title}"` : ''}>${text}</a>`);


    // Convert lists
    html = html.replace(/^[\*\-\+]\s+(.+)/gm, '<li>$1</li>');
    html = html.replace(/^\d+\.\s+(.+)/gm, '<li>$1</li>');
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

    // Convert blockquotes and horizontal rules
    html = html.replace(/^>\s*(.*$)/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/^(?:[\t ]*(?:-{3,}|\*{3,}|_{3,})[\t ]*?)$/gm, '<hr>');

    // Handle paragraphs
    html = html.split(/\n\n+/).map(block => {
        block = block.trim();
        if (!block) return '';
        
        // Skip if block is a token or HTML element
        if (block.startsWith('%%CODE') || 
            block.startsWith('<') && block.endsWith('>')) {
            return block;
        }
        
        return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    }).join('\n\n');

    // Restore code blocks
    html = html.replace(/%%INLINECODE\d+%%/g, match => {
        const block = codeBlocks.get(match);
        return `<code class="inline">${block.code}</code>`;
    });

    html = html.replace(/%%CODEBLOCK\d+%%/g, match => {
        const block = codeBlocks.get(match);
        return `<pre><code class="language-${block.language}">${block.code}</code></pre>`;
    });

    const readingTime = calculateReadingTime(html);
    frontmatter.readingTime = readingTime;

    return {
        content: html.trim(),
        frontmatter
    };
}

app.get('/', async (req, res) => {
    if (isAppModeDev) {
        try {
            let template = fs.readFileSync('./template/index.html', 'utf8');
            const contentContent = fs.readFileSync('./files/index.md', 'utf8');
            let {content, frontmatter} = parseMarkdown(contentContent);
            

            res.send(await yeettotemplate(template, content, frontmatter));
        } catch (error) {
            console.error('Error in / route:', error);
            res.status(500).send('Error reading the file.');
        } 
    } else {
        console.log("lol")
        res.sendFile(path.join(__dirname, 'builtFiles/index.html'));
    }

});

app.get('/image/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'images', req.params[0]));
});

app.get('/*', async (req, res) => {
    if (isAppModeDev) {
    try {
        const filePath = path.join(__dirname, 'files', req.params[0] + '.md');
        console.log(filePath)
        let template = fs.readFileSync('./template/index.html', 'utf8');
        const contentContent = fs.readFileSync(filePath, 'utf8');
        let {content, frontmatter} = parseMarkdown(contentContent);

        // console.log("LOOOOL:",content, frontmatter)

        res.send(await yeettotemplate(template, content, frontmatter));
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
        console.log("lol")
        res.sendFile(path.join(__dirname, 'builtFiles', req.params[0] + '.html'));
    }
});



// Start server
const PORT = 3001;
app.listen(PORT, () => {
    init();
    console.log(`Server is running on port ${PORT}`);
});