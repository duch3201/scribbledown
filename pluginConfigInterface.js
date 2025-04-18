const fs = require("fs");
const path = require("path");

class pluginConfigInterface {
    constructor(pluginName) {
        this.pluginName = pluginName;
        this.pluginConfigPath = path.join(__dirname, 'plugins', 'pluginData', `${pluginName}.json`);
        
        if (!fs.existsSync(this.pluginConfigPath)) {
            fs.mkdirSync(path.dirname(this.pluginConfigPath), { recursive: true });
            fs.writeFileSync(this.pluginConfigPath, JSON.stringify({}), 'utf-8');
        }


        this.config = JSON.parse(fs.readFileSync(this.pluginConfigPath));
    }


    /**
     * returns the value of the passed key, returns undefined if key doesn't exist
     * @param {string} key 
     * @returns 
     */
    get(key) {
        return this.config[key] !== undefined ? this.config[key] : 0;
    }


    /**
     * creates a new key with the provided value, returns 0 if saved correctly, returns 1 if it failed
     * @param {string} key 
     * @param {*} value 
     */
    set(key, value) {
        this.config[key] = value;
        try {
            fs.writeFileSync(this.pluginConfigPath, JSON.stringify(this.config));
            return 0
        } catch (err) {
            console.error(`------\nFailed to save config change in plugin ${this.pluginName}! \n${err}`)
            return 1
        }
    }

    /**
     * returns all of the created config keys
     */
    getAll() {
        return this.config;
    }
}
module.exports = pluginConfigInterface;