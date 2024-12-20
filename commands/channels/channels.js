const { configDotenv } = require('dotenv');
const { MongoClient } = require('mongodb');
const TwitchApi = require("node-twitch").default
const tClient = new TwitchApi({
    client_id: process.env.TTV_ID,
    client_secret: process.env.TTV_SECRET
});
configDotenv
const mClient = new MongoClient(process.env.MONGO_URL);
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

async function SubscribeChannel(interaction) {
    const channelName = encodeURI(await interaction.options.getString('channel')).toLowerCase()
    const userID = interaction.user.id
    try {
        let streamData = await tClient.getStreams({ channel: channelName })
        //console.log(await tClient.searchChannels({query: `${channelName}`})) // returns too many results and not exact match first
    } catch (error) {
        return interaction.reply({
            content: `**[ERROR]:** Could not validate channel name for *${channelName}*!\r\n${error}`,
            ephemeral: true
        }).then(setTimeout(() => {
            interaction.deleteReply()
        }, 5000))
    }

    const db = mClient.db('notifyme')
    const channelsColl = db.collection('channels')

    const find = await channelsColl.find({ channel: channelName }).toArray()

    if (find[0]) {
        if (find[0].users.includes(userID)) {
            return interaction.reply({
                content: `**[WARNING]:** You are already subscribed to *${channelName}*!`,
                ephemeral: true
            }).then(setTimeout(() => {
                interaction.deleteReply()
            }, 5000))
        }
    }

    try {
        const res = await channelsColl.findOneAndUpdate({
            channel: channelName
        }, {
            $set: {
                channel: channelName,
            },
            $push: {
                users: userID
            }
        }, {
            upsert: true,
            returnDocument: 'after'
        })
    } catch (error) {
        return interaction.reply({
            content: `**[ERROR]:** There was an issue updating the database!\r\n${error}`,
            ephemeral: true
        }).then(setTimeout(() => {
            interaction.deleteReply()
        }, 5000))
    }
    //console.log(res) // debug
    return interaction.reply({
        content: `**[SUCCESS]:** You are now subscribed to *${channelName}*!`,
        ephemeral: true
    }).then(setTimeout(() => {
        interaction.deleteReply()
    }, 5000))
}

async function UnsubscribeChannel(interaction) {
    const channelName = encodeURI(await interaction.options.getString('channel')).toLowerCase()
    const userID = interaction.user.id

    const db = mClient.db('notifyme')
    const channelsColl = db.collection('channels')

    const find = await channelsColl.find({ channel: channelName }).toArray()

    if (find[0]) {
        if (!find[0].users.includes(userID)) {
            return interaction.reply({
                content: `**[WARNING]:** You were not subscribed to *${channelName}*!`,
                ephemeral: true
            }).then(setTimeout(() => {
                interaction.deleteReply()
            }, 5000))
        }
    }

    try {
        const res = await channelsColl.findOneAndUpdate({
            channel: channelName
        }, {
            $set: {
                channel: channelName,
            },
            $pull: {
                users: userID
            }
        }, {
            upsert: true,
            returnDocument: 'after'
        })
    } catch (error) {
        return interaction.reply({
            content: `**[ERROR]:** There was an issue with the database!\r\n${error}`,
            ephemeral: true
        }).then(setTimeout(() => {
            interaction.deleteReply()
        }, 5000))
    }
    //console.log(res) // debug
    return interaction.reply({
        content: `**[SUCCESS]:** You are no longer subscribed to *${channelName}*!`,
        ephemeral: true
    }).then(setTimeout(() => {
        interaction.deleteReply()
    }, 5000))
}

async function ListChannel(interaction) {
    const userID = interaction.user.id

    const db = mClient.db('notifyme')
    const channelsColl = db.collection('channels')

    const find = await channelsColl.find({ users: userID }).toArray()
    var channelList = []
    find.forEach((document) => {
        channelList.push(document.channel)
    })
    const embed = new EmbedBuilder()
        .setTitle('Lists of Subscribed Channels:')
        .setDescription(channelList.join("\n"))

    return interaction.reply({
        embeds: [embed],
        ephemeral: true
    })
}

async function InfoChannel(interaction) {
    const channelName = encodeURI(await interaction.options.getString('channel')).toLowerCase()
    try {
        let streamData = await tClient.getStreams({ channel: channelName })
        if (streamData?.data[0]) {
            let liveData = {
                streamer: streamData.data[0].user_name,
                game: streamData.data[0].game_name,
                title: streamData.data[0].title,
                thumbnail: streamData.data[0].thumbnail_url.replace('-{width}x{height}', ''),
                tags: streamData.data[0].tags
            }
            const embed = new EmbedBuilder()
                .setTitle(`${liveData.streamer} is live!`)
                .setDescription(`They're playing ${liveData.game}`)
                .addFields(
                    { name: '\u200B', value: `${liveData.title}` })
                .setImage(liveData.thumbnail)
                .setURL(`https://twitch.tv/${channelName}`)
            let footer = ""
            liveData.tags.forEach((tag) => {
                footer +=  `${footer?',':''} #${tag}`
            })
                embed.setFooter({
                    text: footer
                })

            return interaction.reply({
                embeds: [embed],
                ephemeral: true
            })
        } else {
            const embed = new EmbedBuilder()
                .setTitle(`${channelName} is currently offline!`)
                .setImage('https://media.discordapp.net/attachments/1061304429724319794/1319800268770250883/no-signal-tv-descendant-network-rainbow-bars-abstract-background-vector.jpg?ex=67674748&is=6765f5c8&hm=d539944a67fccec461b0183a9f0300e19ac485deda7b23090165088567f2c84f&=&format=webp')
                .setURL(`https://twitch.tv/${channelName}`)
            return interaction.reply({
                embeds: [embed],
                ephemeral: true
            })
        }
        //streamData = streamData.
        //console.log(await tClient.searchChannels({query: `${channelName}`})) // returns too many results and not exact match first
    } catch (error) {
        console.error(error)
        return interaction.reply({
            content: `**[ERROR]:** Could not validate channel name for *${channelName}*!\r\n${error}`,
            ephemeral: true
        }).then(setTimeout(() => {
            interaction.deleteReply()
        }, 5000))
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('channel')
        .setDescription('channel related commands')
        .addSubcommand(s =>
            s
                .setName('subscribe')
                .setDescription('subscribe to notifications when this channel goes live')
                .addStringOption(o =>
                    o
                        .setName('channel')
                        .setDescription('channel name')
                        .setRequired(true)
                )
        )
        .addSubcommand(s =>
            s
                .setName('unsubscribe')
                .setDescription('unsubscribe to notifications when this channel goes live')
                .addStringOption(o =>
                    o
                        .setName('channel')
                        .setDescription('channel name')
                        .setRequired(true)
                )
        )
        .addSubcommand(s =>
            s
                .setName('list')
                .setDescription('list your subscribed channels')
        )
        .addSubcommand(s =>
            s
                .setName('info')
                .setDescription('get information on a live channel')
                .addStringOption(o =>
                    o
                        .setName('channel')
                        .setDescription('channel name')
                        .setRequired(true)
                )
        ),
    async execute(interaction) {
        switch (interaction.options._subcommand) {
            case 'subscribe':
                SubscribeChannel(interaction)
                break;
            case 'unsubscribe':
                UnsubscribeChannel(interaction)
                break;
            case 'list':
                ListChannel(interaction)
                break;
            case 'info':
                InfoChannel(interaction)
                break;
            default:
                break;
        }
    }
}