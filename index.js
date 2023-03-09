const { Client, Events, GatewayIntentBits, Partials } = require('discord.js');
const client = new Client({
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

const TwitchApi = require("node-twitch").default
const fs = require('fs')
const channels = JSON.parse(fs.readFileSync('./channels.json', 'utf-8'))
console.log(channels)
const isLive = new Set()
require('dotenv').config()

const TwitchClient = new TwitchApi({
  client_id: process.env.TTV_ID,
  client_secret: process.env.TTV_SECRET
});
async function getStreamdata(stream) {
  var streamData
  await TwitchClient.getStreams({ channel: stream }).then(async data => {
    const r = data.data[0]
    if (r) {
      //stream online
      if (!isLive.has(stream)) {
        //not yet in memory
        streamData = {
          "game": r.game_name,
          "title": r.title,
        }
        isLive.add(stream)
      } else {
        //already in memory
      }
    } else {
      //stream offline
      if (isLive.has(stream)) {
        //was in memory
        console.log(`${stream} went offline :c`)
        isLive.delete(stream)
      } else {
        //was not in memory
      }
    }
  })
  return streamData
}

async function doInterval() {
  const guild = client.guilds.fetch('848610258306072576')
  for (const [key, value] of Object.entries(channels)) {
    //key: channel, value: [ users ]
    let streamdata = await getStreamdata(key)
    if(streamdata){
      value.forEach(async userID =>{
        (await guild).members.fetch(userID)
        .then((u => {
          u.send(`https://twitch.tv/${key} is live!`)
          console.log(`${key} is live!`)
        }))
      })
    }
  }
}
client.once(Events.ClientReady, async client => {
  console.log(`Ready! Logged in as ${client.user.tag}`)
  doInterval()
  setInterval(async () => {
    doInterval()
  }, 2000)
});

client.on(Events.MessageCreate, async (msg) => {
  if (msg.author.bot) { return }
  console.log(msg.content)
  if (!msg.content.startsWith('!')) { return }

  const args = msg.content.substring(1).split(' ')
  switch (args[0]) {
    case "add":
      addChannel(args[1], msg)
      break;
    case "remove":
      delChannel(args[1], msg)
      break;
    default:
      break;
  }
})

function addChannel(channel, msg) {
  if (!channels[channel]) {
    channels[channel] = [msg.author.id]
  } else {
    channels[channel].push(msg.author.id)
  }
  fs.writeFileSync('./channels.json', JSON.stringify(channels), 'utf-8')
  msg.reply({
    content: `Subscribed to [${channel}] Notifications!`
  })
}
function delChannel(channel, msg) {
  let index = channels[channel].indexOf(msg.author.id)
  channels[channel].splice(index)
  if (channels[channel].length === 0) {
    delete channels[channel]
  }
  fs.writeFileSync('./channels.json', JSON.stringify(channels), 'utf-8')
  msg.reply({
    content: `Unsubscribed from [${channel}] Notifications!`
  })
}
client.login(process.env.DISCORD_Token);
