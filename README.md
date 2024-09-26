# poru-deezer

## Example Usage

```
const { Poru } = require("poru");
const Deezer  = require("poru-deezer");
const deezer =  new Deezer()

const nodes = [
  {
    name: "local-node",
    host: "localhost",
    port: 2333,
    password: "youshallnotpass",
  },
];
const PoruOptions = {
  library:"discord.js",
  defaultPlatform: "scsearch",
  plugins:[deezer]
};
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});
client.poru = new Poru(client, nodes, PoruOptions);


const resolve  = poru.resolve({query:"tum hi aana",source:"deezer",requester:"test"})
```
