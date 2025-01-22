const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const availableHooks = [
    'beforeBuild',
    'afterBuild',
    'beforeParse',
    'afterParse',
    'beforeTemplate',
    'afterTemplate',
    'invokeRebuild'
];

async function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function generatePlugin() {
    try {
        // Ensure plugins directory exists
        const pluginsDir = path.join(__dirname, '..', 'plugins');
        if (!fs.existsSync(pluginsDir)) {
            fs.mkdirSync(pluginsDir);
        }

        const pluginName = await question('Enter plugin name: ');
        
        // Validate plugin name
        if (!pluginName) {
            console.error('Plugin name is required');
            rl.close();
            return;
        }

        const version = await question('Enter plugin version (default 1.0.0): ') || '1.0.0';
        
        console.log('\nAvailable hooks:');
        availableHooks.forEach((hook, i) => {
            console.log(`${i + 1}. ${hook}`);
        });
        
        // TODO fix this

        const selectedHooks = (await question('\nEnter hook numbers (comma-separated) or "all": '))
            .toLowerCase();
        
        const hooks = selectedHooks === 'all' 
            ? availableHooks 
            : selectedHooks.split(',')
                .map(n => availableHooks[parseInt(n.trim()) - 1])
                .filter(Boolean);

        const template = `const PluginInterface = require('../pluginInterface');

class ${pluginName}Plugin extends PluginInterface {
    constructor() {
        super('${pluginName}Plugin', '${version}')
        
        ${hooks.map(hook => `this.registerHook('${hook}', async (...args) => {
            console.log('[${pluginName}Plugin]: ${hook} hook executing');
            // Add your ${hook} logic here
            return args;
        });`).join('\n\n        ')}
    }
}

module.exports = ${pluginName}Plugin;
`;

        const pluginPath = path.join(pluginsDir, `${pluginName}Plugin.js`);
        
        // Check if plugin already exists
        if (fs.existsSync(pluginPath)) {
            const overwrite = await question('Plugin already exists. Overwrite? (y/N): ');
            if (overwrite.toLowerCase() !== 'y') {
                console.log('Plugin generation cancelled.');
                rl.close();
                return;
            }
        }

        fs.writeFileSync(pluginPath, template);
        console.log(`\nPlugin created at: ${pluginPath}`);
    } catch (error) {
        console.error('Error generating plugin:', error);
    } finally {
        rl.close();
    }
}

// Immediately execute the function
generatePlugin();
