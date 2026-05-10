const {
default: makeWASocket,
useMultiFileAuthState,
fetchLatestBaileysVersion,
DisconnectReason,
Browsers
} = require('@whiskeysockets/baileys')

const pino = require('pino')
const axios = require('axios')

// 🔥 AI FUNCTION
async function askAI(question) {
try {

const res = await axios.post(
"https://api.openai.com/v1/chat/completions",
{
model: "gpt-3.5-turbo",
messages: [
{
role: "system",
content: "You are a smart AI assistant. You answer in Pashto, English, Dari or any language. You know world history including Afghanistan history."
},
{
role: "user",
content: question
}
]
},
{
headers: {
"Authorization": "Bearer YOUR_OPENAI_API_KEY",
"Content-Type": "application/json"
}
}
)

return res.data.choices[0].message.content

} catch (e) {
return "❌ AI error occurred"
}
}

async function startBot() {

const { state, saveCreds } =
await useMultiFileAuthState('./auth_info')

const { version } =
await fetchLatestBaileysVersion()

const sock = makeWASocket({
version,
auth: state,
printQRInTerminal: false,
logger: pino({ level: 'silent' }),
browser: Browsers.ubuntu('Chrome')
})

sock.ev.on('creds.update', saveCreds)


// ================== 🔑 PAIRING CODE ==================
setTimeout(async () => {
try {

if (!sock.authState.creds.registered) {

const code = await sock.requestPairingCode('93703930172')

console.log(`
=====================
📱 PAIR CODE: ${code}
=====================
`)
}

} catch (err) {
console.log("PAIR ERROR:", err)
}
}, 5000)


// ================== CONNECTION ==================
sock.ev.on('connection.update', (update) => {

const { connection, lastDisconnect } = update

if (connection === 'connecting') {
console.log('🔄 CONNECTING...')
}

if (connection === 'open') {
console.log('✅ BOT CONNECTED')
}

if (connection === 'close') {
const reason = lastDisconnect?.error?.output?.statusCode

if (reason !== DisconnectReason.loggedOut) {
startBot()
}
}
})


// ================== MESSAGES ==================
sock.ev.on('messages.upsert', async ({ messages }) => {

const msg = messages[0]
if (!msg.message || msg.key.fromMe) return

const from = msg.key.remoteJid

const text =
msg.message.conversation ||
msg.message.extendedTextMessage?.text || ''

// 🤖 AI RESPONSE
const reply = await askAI(text)

await sock.sendMessage(from, {
text: `🤖 AI Reply:\n\n${reply}`
})

})

console.log("🤖 AI Bot Running...")
}

startBot()
