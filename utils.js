var crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');


/**
 * processes the `files/` subdir to generate an array containing a pathname and the file name, used by plugins to display page nav
 * @param {*} linksArray 
 * @returns {Array}
 */
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

// function "borrowed" from https://gist.github.com/zfael/a1a6913944c55843ed3e999b16350b50
function generateChecksum(str, algorithm, encoding) {
    return crypto
        .createHash(algorithm || 'md5')
        .update(str, 'utf8')
        .digest(encoding || 'hex');
}

/**
 * a helper function made to help with first time initialization / after update initalization
 * TODO: 
 * - get git commit hash string for update tracking save it to .scribbledown-pastFirstrun, currently using only semantic versioning instead of semanting versioning+git hash
 * - create a update part of this function
 * - (maybe rename the function after adding the updating part???)
 */
async function firstTimeRun() {
    const flagFile = path.join(__dirname, '.scribbledown-pastFirstrun');
    if (fs.existsSync(flagFile)) return;

    console.log("Running for the first time, preparing... (go grab a coffee)");

    const dirsToCheck = ['files', 'images', 'plugins', 'template'];
    try {
        console.log("Creating required directories...");

        for (const dir of dirsToCheck) {
            const fullPath = path.join(__dirname, dir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
                console.log(`Created ${dir} folder.`);
            }

            const defaultPath = path.join(__dirname, 'defaults', dir);
            if (fs.existsSync(defaultPath)) {
                const files = fs.readdirSync(defaultPath);
                if (files.length > 0) {
                    for (const file of files) {
                        const src = path.join(defaultPath, file);
                        const dest = path.join(fullPath, file);
                        await fsp.cp(src, dest, { recursive: true });
                    }
                    console.log(`Copied default content for ${dir}`);
                }
            }
        }

        console.log("Creating required files...");

        const blogConfPath = path.join(__dirname, 'blog.conf');
        if (!fs.existsSync(blogConfPath)) {
            const defaultConfig = {
                blogname: "scribbledown blog",
                footerContent: "<p>© {year}</p> <a href='https://github.com/duch3201'>shadowman</a>",
                dev: "true",
                arePluginsEnabled: "true",
                currentTheme: "default"
            };
            fs.writeFileSync(blogConfPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
        }

        const indexMdPath = path.join(__dirname, 'files', 'index.md');
        if (!fs.existsSync(indexMdPath)) {
            fs.writeFileSync(indexMdPath, "# Scribbledown\nWelcome, everything is fine!", 'utf8');
        }

        fs.writeFileSync(flagFile, `yep`, 'utf8');
        console.log("Done!");

    } catch (err) {
        console.error(`------\nAn error occurred during first-time setup!\n${err}\n------`);
    }
}

/**
    calculate an estimated reading time of the page
    @param {string} text

*/

function calculateReadingTime(text) {
    const wordsPerMinute = 200;
    const wordCount = text.trim().split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / wordsPerMinute);
    return readingTime;
}

/** 
    TODO: scan each plugin to see if it contains any sus imports

    @param {string} pluginName 
*/
function scanPlugins() {
    return
}
 
function escapeHtml(str) {
    return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

module.exports = {
    processlinks,
    generateChecksum,
    calculateReadingTime,
    firstTimeRun,
    escapeHtml
};