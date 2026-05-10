const {
default: makeWASocket,
useMultiFileAuthState,
fetchLatestBaileysVersion,
DisconnectReason,
Browsers
} = require('@whiskeysockets/baileys')

const pino = require('pino')
const axios = require('axios')

// 🔑 خپل OpenAI API Key دلته واچوه
const API_KEY = 'YOUR_OPENAI_API_KEY'

// ================= AI FUNCTION =================
async function askAI(question) {
try {

const res = await axios.post(
'https://api.openai.com/v1/chat/completions',
{
model: 'gpt-4o-mini',
messages: [
{
role: 'system',
content: `
You are a smart multilingual AI assistant.

Rules:
- Reply in Pashto if user speaks Pashto
- Speak all languages
- Know Afghanistan history and world knowledge
- Be friendly and helpful
`
},
{
role: 'user',
content: question
}
],
temperature: 0.7
},
{
headers: {
Authorization: `Bearer ${API_KEY}`,
'Content-Type': 'application/json'
}
}
)

return res.data.choices[0].message.content

} catch (err) {
console.log('AI ERROR =>', err.response?.data || err.message)
return '❌ AI مشکل لري. API KEY یا internet وګوره.'
}
}

// ================= START BOT =================
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

// SAVE SESSION
sock.ev.on('creds.update', saveCreds)

// ================= CONNECTION =================
sock.ev.on('connection.update', (update) => {

const { connection, lastDisconnect } = update

if (connection === 'connecting') {
console.log('🔄 CONNECTING...')
}

if (connection === 'open') {
console.log('✅ AI BOT CONNECTED')
}

if (connection === 'close') {

const reason =
lastDisconnect?.error?.output?.statusCode

console.log('❌ CONNECTION CLOSED:', reason)

if (reason !== DisconnectReason.loggedOut) {
console.log('♻️ RECONNECTING...')
startBot()
}
}
})

// ================= PAIRING CODE =================
setTimeout(async () => {
try {

if (!sock.authState.creds.registered) {

const code =
await sock.requestPairingCode('93703930172')

console.log(`
========================
PAIR CODE: ${code}
========================
`)
}

} catch (err) {
console.log('PAIR ERROR:', err)
}
}, 5000)

// ================= MESSAGES =================
sock.ev.on('messages.upsert', async ({ messages }) => {

try {

const msg = messages[0]

if (!msg.message) return
if (msg.key.fromMe) return

const from = msg.key.remoteJid

const text =
msg.message.conversation ||
msg.message.extendedTextMessage?.text ||
''

if (!text) return

console.log('📩 MESSAGE:', text)

// 🤖 AI REPLY
const reply = await askAI(text)

await sock.sendMessage(from, {
text: reply
})

} catch (err) {
console.log('MESSAGE ERROR:', err)
}
})

console.log('🤖 AI BOT RUNNING...')
}

startBot()
