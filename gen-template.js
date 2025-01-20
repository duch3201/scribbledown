const fs = require('fs');
const readline = require('node:readline');

const templateConfig = {
    name: '',
    author: '',
    version: '1.0.0'
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function init() {
    try {
        templateConfig.name = await question('Enter the template name: ');
        templateConfig.author = await question('Enter the author name: ');
        rl.close();
        createTemplate();
    } catch (err) {
        console.error(err);
        rl.close();
    }
}

function createTemplate() {
try {
fs.mkdirSync(`template/${templateConfig.name}`, { recursive: true });
fs.writeFileSync(`template/${templateConfig.name}/app.js`, `document.addEventListener('DOMContentLoaded', function() {
    console.log("Hello, World!");
});

var sidebarClosed = true
function showSidebar() {
    if (sidebarClosed) {
        document.getElementById("sidebar").style.display = "block";
        sidebarClosed = false;
    } else {
        document.getElementById("sidebar").style.display = "none";
        sidebarClosed = true;
    }
}`);
fs.writeFileSync(`template/${templateConfig.name}/index.css`, ``);
fs.writeFileSync(`template/${templateConfig.name}/index.html`, `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="index.css">
    <title>{BLOGNAMETITLE} | {PAGETITLE}</title>
</head>
<body>
    <div id="app">
        <div id="topbar">
            <div id="titlediv">
                <button onclick="showSidebar()" id="ham"><svg width="25px" height="25px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 18L20 18" stroke="#000000" stroke-width="2" stroke-linecap="round"/>
                    <path d="M4 12L20 12" stroke="#000000" stroke-width="2" stroke-linecap="round"/>
                    <path d="M4 6L20 6" stroke="#000000" stroke-width="2" stroke-linecap="round"/>
                    </svg></button>
                <h1>{BLOGNAME}</h1>
                <div id="nav">
                    {PAGES}
                </div>
            </div>
        </div>
        <main>
            {PAGECONTENT}
        </main>
    </div>
    <footer>{FOOTERCONTENT}</footer>
    <script src="app.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/go.min.js"></script>
    <script>hljs.highlightAll();</script>
</body>
</html>`);
fs.writeFileSync(`template/${templateConfig.name}/config.json`, JSON.stringify(templateConfig, null, 2));
} catch (err) {
    console.error(err);
}
}

init();