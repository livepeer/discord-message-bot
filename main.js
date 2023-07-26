const { Client, Events } = require("pg");
const Discord = require("discord.js");
require("dotenv").config();
const express = require("express");
const app = express();

const bot = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.MessageContent,
    Discord.GatewayIntentBits.GuildMembers,
  ],
});

const db = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// create table discord (
// 	msg_time    numeric,
// 	author_id	  numeric,
// 	author_name text,
// 	msg			    text,
// 	channel 	  text,
// 	channel_id 	numeric,
// 	roles 		  text[],
// 	server_name	text
// )

let db_conn = false;

db.connect((err) => {
  if (err) {
    console.error("PostgreSQL error: ", err.toString());
  } else {
    console.log("Connected to DB");
    db_conn = true;
  }
});

const port = parseInt(process.env.PORT) || 8080;
app.listen(port, () => {
  console.log(`helloworld: listening on port ${port}`);
  bot.on("ready", () => {
    console.log("Connected to Discord");
    console.log(bot.guilds.cache.map((guild) => guild.id).join("\n"));
  });

  bot.on("error", (e) => {
    console.error("Discord error: " + e.toString());
  });

  bot.on("messageCreate", (msg) => {
    //Docs: https://discord.js.org/#/docs/discord.js/main/class/Message
    // You probably want msg.author.username (string) and msg.author.id (a "snowflake", basically a massive number, but best to treat like a string since most databases can't handle numbers this massive well) for "who sent it"
    // (the ID is constant, the username can change at any time!)
    // msg.content has the message contents (e.g. text) as a string
    // msg.createdTimestamp has the message creation time (integer)

    // Make sure DB is connected before we start inserting
    roles = msg.guild.members
      .fetch(msg.author)
      .then((m) => {
        let roles = [];
        for (const role of m.roles.cache) {
          roles.push(role[1].name);
        }
        return roles;
      })
      .catch((e) => {
        console.error("missing roles", e.stack)
        return null
      })

    Promise.allSettled([roles]).then((values) => {
      row = [
        Number(msg.createdTimestamp),
        Number(msg.author.id),
        msg.author.username,
        msg.content,
        msg.channel.name,
        Number(msg.channelId),
        values[0].value,
        msg.guild.name,
      ]
      if (db_conn) {
        console.log(
          "writing to db",
          row.join(", ")
        );
        db.query(
          "INSERT INTO discord (msg_time, author_id, author_name, msg, channel, channel_id, roles, server_name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
          row
        )
          .then(() => { console.log("message created successfully", row.join(", ")); })
          .catch((e) => console.error(e.stack));
      }
    })
  })

  bot.login(process.env.BOT_TOKEN).catch(console.error);
});
