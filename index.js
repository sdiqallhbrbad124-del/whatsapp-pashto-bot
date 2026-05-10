const {
default: makeWASocket,
useMultiFileAuthState,
fetchLatestBaileysVersion,
DisconnectReason,
Browsers
} = require('@whiskeysockets/baileys')

const pino = require('pino')
const axios = require('axios')

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
logger: pino({ level: 'silent' }),
browser: Browsers.ubuntu('Chrome')
})

// Save session
sock.ev.on('creds.update', saveCreds)

// Connection
sock.ev.on('connection.update', (update) => {

const { connection, lastDisconnect } = update

if (connection === 'connecting') {
console.log('🔄 CONNECTING...')
}

if (connection === 'open') {
console.log('✅ CONNECTED SUCCESSFULLY')
}

if (connection === 'close') {
const reason = lastDisconnect?.error?.output?.statusCode

console.log('❌ CLOSED:', reason)

if (reason !== DisconnectReason.loggedOut) {
startBot()
}
}
})


// ================== PAIRING CODE ==================
setTimeout(async () => {
try {
if (!sock.authState.creds.registered) {

const code = await sock.requestPairingCode('93703930172')

console.log(`
=====================
PAIR CODE: ${code}
=====================
`)
}
} catch (err) {
console.log('PAIR ERROR:', err)
}
}, 10000)


// ================== MESSAGES ==================
sock.ev.on('messages.upsert', async ({ messages }) => {

const msg = messages[0]
if (!msg.message || msg.key.fromMe) return

const from = msg.key.remoteJid

const text =
msg.message.conversation ||
msg.message.extendedTextMessage?.text || ''

const body = text.toLowerCase()


// ================== GREETING ==================
if (body.includes('سلام') || body.includes('hi')) {

await sock.sendMessage(from, {
text: `🌸 وعلیکم سلام!\n🤖 زه ستاسو AI بوټ یم.`
})

}

// ================== WHO ARE YOU ==================
else if (body.includes('ته څوک یې')) {

await sock.sendMessage(from, {
text: `🤖 زه د ویصال احمد AI بوټ یم`
})

}


// ================== 🎨 DESIGN / IMAGE ==================
else if (body.startsWith('ډیزاین') || body.startsWith('عکس')) {

const prompt = text.replace('ډیزاین', '').replace('عکس', '').trim()

if (!prompt) {
await sock.sendMessage(from, {
text: '🖼️ مثال: ډیزاین ښکلی غر د لمر سره'
})
return
}

try {

// FREE IMAGE API
const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`

await sock.sendMessage(from, {
image: { url: imageUrl },
caption: `🎨 ډیزاین جوړ شو:\n${prompt}`
})

} catch (e) {

await sock.sendMessage(from, {
text: '❌ عکس جوړ نه شو، وروسته بیا هڅه وکړه'
})

}
}


// ================== AUDIO ==================
else if (msg.message.audioMessage) {

await sock.sendMessage(from, {
text: '🎤 صوتي پیغام ترلاسه شو'
})

}


// ================== DEFAULT (FIXED) ==================
else {

await sock.sendMessage(from, {
text: `📩 تاسو وویل:\n${text}\n\n🤖 ویصال AI بوټ`
})

}

})

}

startBot()
