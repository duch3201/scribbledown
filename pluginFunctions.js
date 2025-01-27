const fs = require('fs');

async function configFile(mode, data) {
    if (mode == 'r') {
        try {
            let config = fs.readFileSync('pluginConfigs.json', 'utf8');
            return JSON.parse(config);
        } catch (error) {
            console.error(error);
            return {"error": error};
        }
    } else if (mode == 'w') {
        try {
            fs.writeFileSync('pluginConfigs.json', JSON.stringify(data, null, 4));
        } catch (error) {
            console.error(error);
            return {"error": error};
        }
    } else {
        return {"error": "Invalid mode"};
    }

}



module.exports = {configFile};