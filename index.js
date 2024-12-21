require('dotenv').config()
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('node:fs')
const dClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [
    Partials.Message,
    Partials.Channel
  ]
});
dClient.commands = new Collection() // slash commands collection
exports.dClient = dClient

const TwitchApi = require("node-twitch").default
const tClient = new TwitchApi({
    client_id: process.env.TTV_ID,
    client_secret: process.env.TTV_SECRET
});
exports.tClient = tClient

const { MongoClient } = require('mongodb');
const mClient = new MongoClient(process.env.MONGO_URL);
exports.mClient = mClient

fs.readdirSync('./handlers').forEach((handler) => {
	require(`./handlers/${handler}`)
});

dClient.login(process.env.DISCORD_Token)