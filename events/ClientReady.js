const { Events, ActivityType, EmbedBuilder } = require('discord.js');
const { mClient, tClient, dClient } = require('../index');

// Global Maps and Sets
const channelList = new Map(); // Stores channel names and their subscribers
const isLive = new Set(); // Stores channels that are live
const isOffline = new Set(); // Stores channels that are offline

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);

        // Set bot presence
        client.user.setPresence({
            activities: [{
                name: 'Notifications for you',
                type: ActivityType.Streaming,
                url: 'https://twitch.tv/desq_blocki',
            }],
            status: 'online',
        });

        // Main interval loop
        setInterval(async () => {
            await updateCache();
            await checkLive();
        }, 15000); // Every 15 seconds
    },
};

// Update the cache from the database and clean up stale data
async function updateCache() {
    const db = mClient.db('notifyme');
    const channelsColl = db.collection('channels');

    try {
        const channels = await channelsColl.find({}).toArray();
        const dbChannelNames = new Set(channels.map(channel => channel.name));

        // Update channelList
        channelList.clear();
        channels.forEach(channel => channelList.set(channel.name, channel.subscribers));

        // Remove stale entries from isLive and isOffline
        cleanUpSet(isLive, dbChannelNames);
        cleanUpSet(isOffline, dbChannelNames);


        // Debug
        // console.log({
        //     isLive: Array.from(isLive),
        //     isOffline: Array.from(isOffline),
        //     channels: Array.from(channelList.entries()),
        // });
       

    } catch (error) {
        console.error('Error updating cache:', error);
    }
}

// Notify subscribers about live status changes
async function checkLive() {
    for (const [channelName, subscribers] of channelList) {
        try {
            // Attempt to fetch stream data
            const streamData = await tClient.getStreams({ channel: channelName });

            if (streamData?.data && streamData.data.length > 0) {
                // Stream is live
                if (!isLive.has(channelName)) {
                    await notifyLive(channelName, subscribers, streamData.data[0]);
                }
            } else {
                // Stream is offline, do not remove from channelList
                if (isLive.has(channelName)) {
                    console.log(`${channelName} went offline!`);
                    isLive.delete(channelName);
                }
                isOffline.add(channelName); // Mark as offline
            }
        } catch (error) {
            // Specific handling for the TypeError
            if (error instanceof TypeError && error.message.includes("Cannot read properties of undefined")) {
                console.warn(`Channel "${channelName}" returned an invalid response. Removing from cache.`);
                channelList.delete(channelName);
                isLive.delete(channelName);
                isOffline.delete(channelName);
            } else {
                // Log unexpected errors
                console.error(`Error notifying for ${channelName}:`, error);
            }
        }
    }
}


// Notify subscribers that a channel has gone live
async function notifyLive(channelName, subscribers, streamData) {
    const liveData = {
        streamer: streamData.user_name,
        game: streamData.game_name,
        title: streamData.title,
        thumbnail: streamData.thumbnail_url.replace('-{width}x{height}', ''),
        tags: streamData.tags,
    };

    const embed = new EmbedBuilder()
        .setTitle(`${escapeMarkdown(liveData.streamer)} is live!`)
        .setDescription(`They're playing ${liveData.game}`)
        .addFields({ name: '\u200B', value: `${liveData.title}` })
        .setImage(liveData.thumbnail)
        .setURL(`https://twitch.tv/${channelName}`)
        .setFooter({ text: liveData.tags.map(tag => `#${tag}`).join(' ') });

    for (const subscriber of subscribers) {
        try {
            const user = await dClient.users.fetch(subscriber);
            await user.send({ embeds: [embed] });
            console.log(`${user.username} notified that ${channelName} went live!`);
        } catch (error) {
            console.error(`Error notifying ${subscriber}:`, error);
        }
    }

    isLive.add(channelName);
    isOffline.delete(channelName);
}

// Helper function to clean up stale data in a set
function cleanUpSet(set, validEntries) {
    for (const entry of set) {
        if (!validEntries.has(entry)) {
            set.delete(entry);
        }
    }
}

// Escape special markdown characters
function escapeMarkdown(input) {
    return input.replace(/([*_#\[!\]()`>+\-.|])/g, '\\$1');
}