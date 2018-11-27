const EventEmitter = require('events').EventEmitter;
class Builder extends EventEmitter {
    build(data) {
        console.log(`Start building with options : ${JSON.stringify(data, null, 2)}`);
    }
}

module.exports = new Builder();
