var crypto = require('crypto');
const fs = require('fs');
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

function firstTimeRun() {
    console.log("Running for the first time, preparing... (go grab a coffee)")
    try {

        console.log("Creating required directories...")
        fs.mkdirSync(path.join(__dirname, 'files'));
        fs.mkdirSync(path.join(__dirname,  'images'));
        fs.mkdirSync(path.join(__dirname,  'plugins'));
        console.log("Creating required files...")
        fs.writeFileSync(path.join(__dirname, 'blog.conf'), {
            "blogname":"scribbledown blog",
            "footerContent":"<p>© {year}</p> <a href='https://github.com/duch3201'>shadowman</a>",
            "dev":"true",
            "arePluginsEnabled":"true",
            "currentTheme":"default"
        }, 'utf8');
        
        fs.writeFileSync(path.join(__dirname, 'files', 'index.md'), "#Scribbledown\nWelcome, everything is fine!", 'utf8');
    
        fs.writeFileSync(path.join(__dirname, '.scribbledown-pastFirstrun'), "yep", 'utf8');
        console.log("Done!")
    
    } catch (err) {
        console.error(`------\n An error occured during first time setup! \n ${err} \n------`);
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
 
module.exports = {
    processlinks,
    generateChecksum,
    calculateReadingTime,
    firstTimeRun
};