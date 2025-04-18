# Scribbledown Plugin System

Scribbledown features a powerful plugin system that allows you to extend and customize the functionality of your markdown blogging platform. This documentation will guide you through creating and using plugins.

## Table of Contents

- [Plugin Structure](#plugin-structure)
- [Creating a Plugin](#creating-a-plugin)
- [Hook System](#hook-system)
- [Plugin Configuration](#plugin-configuration)
- [Callable Functions](#callable-functions)
- [Example Plugins](#example-plugins)
- [Best Practices](#best-practices)

## Plugin Structure

Each plugin in Scribbledown is a JavaScript class that extends the `PluginInterface`. Plugins are loaded automatically from the `plugins` directory. Each plugin file should export a class that extends `PluginInterface`.

## Creating a Plugin

To create a plugin, follow these steps:

1. Create a new JavaScript file in the `plugins` directory
2. Import the `PluginInterface` class
3. Create a class that extends `PluginInterface`
4. Initialize the plugin with a name and version in the constructor
5. Register hooks and callable functions as needed

Here's a basic plugin template:

```javascript
const PluginInterface = require('../pluginInterface');

class MyPlugin extends PluginInterface {
    constructor() {
        super('myPlugin', '1.0.0');
        
        // Register hooks here
        this.registerHook('beforeParse', async (markdown) => {
            this.log('Processing markdown...');
            // Modify markdown here
            return markdown;  // Always return the parameters you receive
        });
        
        // Register callable functions here
        this.registerCallableFunction('myFunction', async (args) => {
            // Function implementation
            return result;
        });
    }
}

module.exports = MyPlugin;
```

## Hook System

Hooks are specific points in the build process where plugins can intercept and modify data. It's **crucial** that your hook functions always return the parameters they receive (potentially modified).

### Available Hooks

| Hook Name      | Parameters                                   | Description                                            |
|----------------|----------------------------------------------|--------------------------------------------------------|
| beforeBuild    | None             | Runs before the build process starts                    |
| afterBuild     | None                                | Runs after the build process completes                  |
| beforeParse    | (markdown)                                   | Runs before markdown parsing begins                     |
| afterParse     | (parsed content)                             | Runs after markdown has been parsed                     |
| beforeTemplate | (template, content, frontmatter)             | Runs before the content is inserted into the template   |
| afterTemplate  | (template, content, frontmatter, linksArray) | Runs after the content is inserted into the template    |
| invokeRebuild  | (file) - optional                            | Triggers a rebuild of all files or a specific file      |

### Hook Execution Order

1. Hooks run in the order they are registered
2. Multiple plugins can register for the same hook
3. For each hook type, all registered callbacks will run sequentially
4. Each plugin's hook function receives the output from the previous plugin's hook function

### Returning Values from Hooks

**Important:** All hook callback functions MUST return the parameters they receive, even if unmodified. This allows the chain of hooks to pass data correctly.

For example:

```javascript
// Correct - returns the modified markdown
this.registerHook('beforeParse', async (markdown) => {
    markdown = markdown.replace('foo', 'bar');
    return markdown;
});

// Also correct - returns all parameters as an array
this.registerHook('beforeTemplate', async (template, content, frontmatter) => {
    content = content.replace('<h1>', '<h1 class="fancy">');
    return [template, content, frontmatter];
});
```

## Plugin Configuration

Plugins can store and retrieve configuration values using the built-in configuration interface:

```javascript
// Get a configuration value
const value = this.config.get('key');

// Set a configuration value
this.config.set('key', 'value');

// Get all configuration values
const allConfig = this.config.getAll();
```

Configuration values are automatically stored in JSON files in the `plugins/pluginData/` directory, with one file per plugin.

## Callable Functions

Plugins can register functions that can be called from the frontend:

```javascript
this.registerCallableFunction('functionName', async (args) => {
    // Function implementation
    return result;
});
```

To call these functions from the frontend, you would use:

```javascript
// Frontend code example - implementation details may vary
const result = await callPluginFunction('pluginName', 'functionName', args);
```

## Triggering Rebuilds

Plugins can trigger a rebuild of the site:

```javascript
// Rebuild all files
this.registerHook('invokeRebuild', async () => {
    // This will trigger a rebuild of all files
});

// Rebuild a specific file
const {emitter} = require('../pluginLoader');
emitter.emit('rebuild', "index.md");
```

## Logging

Plugins have access to a built-in logging function:

```javascript
this.log('This message will be displayed in the console and log file');
```

## Example Plugins

### Emoji Plugin

This plugin replaces emoji shortcodes with actual emoji characters in markdown content:

```javascript
const PluginInterface = require('../pluginInterface');

class EmojiPlugin extends PluginInterface {
    constructor() {
        super('emojiPlugin', '0.1.0')

        const emojiList = {
            ":smile:": "😊",
            ":laugh:": "😂",
            // ... more emojis
        }

        this.registerHook('beforeParse', async (markdown) => {
            this.log('Looking through content to find your emojis!');
            for (const [key, value] of Object.entries(emojiList)) {
                markdown = markdown.replaceAll(key, value);
            }
            return markdown;    
        });
    }
}

module.exports = EmojiPlugin;
```

### Default Theme Plugin

This plugin enhances the HTML output with additional styling and structure:

```javascript
const PluginInterface = require('../pluginInterface');

class DefaultThemePlugin extends PluginInterface {
    constructor() {
        super('defaultTheme', '1.0.0')

        this.registerHook('beforeTemplate', async (template, content, frontmatter) => {
            this.log('Adding in frontmatter data');
            // Enhance the heading with metadata
            content = content.replace("<h1>", "<div id='heading'><h1 id='contentHeading'>");
            content = content.replace("</h1>", `</h1><div id="subtitle">
                <p class="subtitle-text">${frontmatter.date}</p>
                <p class="reading-time subtitle-text">${frontmatter.readingTime} min read</p>
                </div></div>`);
            
            return [template, content, frontmatter];
        });

        this.registerHook('afterTemplate', async (template, content, frontmatter, linksArray) => {
            this.log('Adding in page nav');
            // Create navigation from links
            // ... implementation
            return [template, content, frontmatter, linksArray];
        });
    }
}

module.exports = DefaultThemePlugin;
```

## Best Practices

1. **Always return hook parameters**: All hook callbacks must return the parameters they received (modified or not).

2. **Error handling**: Use try/catch blocks in your hook functions to prevent plugin errors from crashing the build process.

3. **Version your plugins**: Always specify a version number when creating a plugin.

4. **Use meaningful log messages**: Make your log messages clear and informative.

5. **Clean up resources**: If your plugin creates temporary files or uses resources, make sure to clean them up.

6. **Avoid blocking operations**: Use async/await for operations that might block the event loop.

7. **Document your plugin**: Add comments and documentation to make your plugin easier to understand.

8. **Keep plugins focused**: Each plugin should have a clear, specific purpose.

## Plugin Development Tips

- Test your plugin thoroughly before deploying it
- Use the plugin configuration system for user-configurable options
- Check compatibility with other plugins
- Keep performance in mind, especially for hooks that run on every page

## Troubleshooting

- If your plugin isn't loading, make sure it's in the correct directory and has the `.js` extension
- If hooks aren't executing, check that they're registered with the correct name
- For debugging, use the `this.log()` function to output information during execution