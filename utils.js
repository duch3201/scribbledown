var crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

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

function calculateReadingTime(text) {
    const wordsPerMinute = 200;
    const wordCount = text.trim().split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / wordsPerMinute);
    return readingTime;
}

module.exports = {
    processlinks,
    generateChecksum,
    calculateReadingTime
};