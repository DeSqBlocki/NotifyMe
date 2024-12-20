const fs = require('node:fs')
const path = require('node:path')
const { dClient } = require('../index')

const eventsPath = path.join(__dirname, '../events')
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'))

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file)
    const event = require(filePath)
    if (event.once) {
        dClient.once(event.name, (...args) => event.execute(...args, dClient))
        // added dClient to commomerate global usage
    } else {
        dClient.on(event.name, (...args) => event.execute(...args, dClient))
        // added dClient to commomerate global usage
    }
}
