const {
default: makeWASocket,
useMultiFileAuthState,
fetchLatestBaileysVersion,
DisconnectReason,
Browsers
} = require('@whiskeysockets/baileys')

const pino = require('pino')
const axios = require('axios')

// ================= CONFIG =================

// 🔑 خپل OpenAI API KEY دلته واچوه
const API_KEY = 'YOUR_OPENAI_API_KEY'

// 📱 خپل WhatsApp نمبر
const PHONE_NUMBER = '93703930172'

// ==========================================


// ================= AI FUNCTION =================
async function askAI(question) {

try {

const response = await axios.post(
'https://api.openai.com/v1/chat/completions',
{
model: 'gpt-4o-mini',

messages: [
{
role: 'system',
content: `
You are an advanced multilingual AI assistant.

Rules:
- Reply in the same language as user
- Speak Pashto fluently
- Know Afghanistan history
- Answer clearly and smartly
- Be friendly
- Help users with technology, education, religion, history, coding, and general knowledge
`
},
{
role: 'user',
content: question
}
],

temperature: 0.7,
max_tokens: 1000

},
{
headers: {
Authorization: `Bearer ${API_KEY}`,
'Content-Type': 'application/json'
}
}
)

return response.data.choices[0].message.content

} catch (error) {

console.log(
'AI ERROR:',
error.response?.data || error.message
)

return '❌ AI مشکل لري. API Key یا internet وګوره.'
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

markOnlineOnConnect: true,

syncFullHistory: false,

defaultQueryTimeoutMs: 60000,

connectTimeoutMs: 60000,

keepAliveIntervalMs: 10000,

logger: pino({
level: 'silent'
}),

browser: Browsers.ubuntu('Chrome')

})

// ================= SAVE SESSION =================
sock.ev.on('creds.update', saveCreds)


// ================= CONNECTION =================
sock.ev.on(
'connection.update',
async (update) => {

const {
connection,
lastDisconnect
} = update

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

}
)


// ================= PAIRING CODE =================
setTimeout(async () => {

try {

if (!sock.authState.creds.registered) {

const code =
await sock.requestPairingCode(
PHONE_NUMBER
)

console.log(`
========================
📱 PAIR CODE: ${code}
========================
`)

}

} catch (err) {

console.log('PAIR ERROR:', err)

}

}, 5000)


// ================= MESSAGE SYSTEM =================
sock.ev.on(
'messages.upsert',

async ({ messages }) => {

try {

const msg = messages[0]

if (!msg.message) return

// ❌ خپل message ignore کړه
if (msg.key.fromMe) return

const from = msg.key.remoteJid

const text =
msg.message.conversation ||
msg.message.extendedTextMessage?.text ||
''

if (!text) return

console.log('📩 MESSAGE:', text)


// ================= SIMPLE COMMANDS =================

// سلام
if (
text.includes('سلام') ||
text.toLowerCase().includes('hi') ||
text.toLowerCase().includes('hello')
) {

await sock.sendMessage(from, {
text:
'🌸 وعلیکم سلام!\n🤖 زه ستاسو پرمختللی AI بوټ یم.'
})

return
}


// وخت
if (
text.includes('وخت') ||
text.toLowerCase() === 'time'
) {

const now = new Date()

await sock.sendMessage(from, {
text:
`🕒 وخت:\n${now.toLocaleString()}`
})

return
}


// ================= IMAGE GENERATOR =================
if (
text.startsWith('عکس') ||
text.startsWith('ډیزاین')
) {

const prompt =
text
.replace('عکس', '')
.replace('ډیزاین', '')
.trim()

if (!prompt) {

await sock.sendMessage(from, {
text:
'🖼️ مثال:\nعکس ښکلی غر د لمر سره'
})

return
}

const imageUrl =
`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`

await sock.sendMessage(from, {

image: {
url: imageUrl
},

caption:
`🎨 ستاسو عکس جوړ شو:\n${prompt}`

})

return
}


// ================= AUDIO MESSAGE =================
if (msg.message.audioMessage) {

await sock.sendMessage(from, {
text:
'🎤 ستاسو صوتي پیغام ترلاسه شو.'
})

return
}


// ================= AI REPLY =================
const aiReply = await askAI(text)

await sock.sendMessage(from, {
text: aiReply
})

} catch (err) {

console.log('MESSAGE ERROR:', err)

}

}
)

console.log('🤖 AI BOT RUNNING...')

}

startBot()
