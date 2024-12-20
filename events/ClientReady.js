const { Events, ActivityType } = require('discord.js');
module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`)
        client.user.setPresence({
            activities: [{
                name: 'Notyfing',
                type: ActivityType.Streaming,
                url: 'https://twitch.tv/desq_blocki'
            }],
            status: 'online'
        })
        
    }
}