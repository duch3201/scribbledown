const fs = require('fs')
const path = require('path')

class Logger {
    constructor(options = {}) {
        this.logToFile = options.logToFile
        this.logPath = options.logPath
        this.debug = options.isDebug
        

        if (this.logToFile == "true" && this.logPath) {
          // Ensure directory exists
          console.log("will log to file")
          fs.mkdirSync(path.dirname(this.logPath), { recursive: true });
          this.stream = fs.createWriteStream(this.logPath, { flags: 'a' });
        }    
    }

    //let's try to figure out where we were called
    //we call a new error and from the stacktrace we extract the line the logger was called from
    static getCaller() {
        const err = new Error()
        const stack = err.stack.split('\n')
        return stack[4] ? stack[4].trim() : '';
    }

    // pretty colors
    static getColors() {
        return {
            info: '\x1b[36m',   // cyan
            warn: '\x1b[33m',   // yellow
            error: '\x1b[31m',  // red
            debug: '\x1b[35m',  // magenta
            reset: '\x1b[0m',
            meta: '\x1b[90m',   // gray
        };
    }

  #log(level, ...args) {
    const colors = Logger.getColors();
    const color = colors[level] || colors.info;
    const reset = colors.reset;
    const meta = colors.meta;
    const caller = Logger.getCaller();
    const timestamp = new Date().toISOString();
    const message = args.join(' ');

    // Console output
    if (this.debug == "false") {
        console.log(
        `${color}[${level.toUpperCase()}]${reset} ${message}   | ${meta}${caller}${reset}`
        );    
    } else {    
        console.log(
            `${color}[${level.toUpperCase()}]${reset} ${message}`
        );
    }
        
    // File output (plain text, no colors)
    if (this.logToFile && this.stream) {
      this.stream.write(
        `[${timestamp}] [${level.toUpperCase()}] ${message} ${caller}\n`
      );
    }
  }

  info(...args) {
    this.#log('info', ...args);
  }

  warn(...args) {
    this.#log('warn', ...args);
  }

  error(...args) {
    this.#log('error', ...args);
  }

  debug(...args) {
    if (this.debugEnabled) {
      this.#log('debug', ...args);
    }
  }

  close() {
    if (this.stream) {
      this.stream.end();
    }
  }

}

module.exports = Logger