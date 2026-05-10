const {
default: makeWASocket,
useMultiFileAuthState,
fetchLatestBaileysVersion,
DisconnectReason,
Browsers
} = require('@whiskeysockets/baileys')

const pino = require('pino')

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
logger: pino({ level: 'silent' }),
browser: Browsers.ubuntu('Chrome')
})

// Save Session
sock.ev.on('creds.update', saveCreds)

// Connection
sock.ev.on('connection.update',
async (update) => {

const {
connection,
lastDisconnect
} = update

if (connection === 'connecting') {

console.log('🔄 CONNECTING...')

}

if (connection === 'open') {

console.log('✅ CONNECTED SUCCESSFULLY')

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

// Pairing Code
setTimeout(async () => {

try {

if (!sock.authState.creds.registered) {

const code =
await sock.requestPairingCode(
'93703930172'
)

console.log(`
========================
PAIR CODE:
${code}
========================
`)

}

} catch (err) {

console.log('PAIR ERROR:', err)

}

}, 10000)

// Messages
sock.ev.on('messages.upsert',
async ({ messages }) => {

try {

const msg = messages[0]

if (!msg.message) return

// مهم: خپل message ته reply مه کوه
if (msg.key.fromMe) return

const from = msg.key.remoteJid

const text =
msg.message.conversation ||
msg.message.extendedTextMessage?.text ||
''

const body = text.toLowerCase()

// سلام
if (
body.includes('سلام') ||
body.includes('hi') ||
body.includes('hello')
) {

await sock.sendMessage(from, {
text:
'🌸 وعلیکم سلام\nزه ستاسو AI بوټ یم.'
})

}

// ته څوک یې
else if (
body.includes('ته څوک یې') ||
body.includes('ته څوک يي')
) {

await sock.sendMessage(from, {
text:
'🤖 زه د ویصال احمد بوټ یم.\nزه د ویصال احمد لخوا جوړ شوی یم.'
})

}

// صوتي پیغام
else if (msg.message.audioMessage) {

await sock.sendMessage(from, {
text:
'🎤 ستاسو صوتي پیغام مې ترلاسه کړ.'
})

}

// Default Reply
else {

await sock.sendMessage(from, {
text:
`📩 تاسو وویل:\n${text}\n\n🤖 ویصال AI بوټ`
})

}

} catch (err) {

console.log(err)

}

})

}

startBot()
