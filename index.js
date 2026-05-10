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
browser: Browsers.macOS('Desktop')
})

// Save Session
sock.ev.on('creds.update', saveCreds)

// Connection Update
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

// Auto reconnect
if (reason !== DisconnectReason.loggedOut) {

console.log('♻️ RECONNECTING...')

startBot()

}

}

})

// مهم Delay
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

}, 25000)

// Messages
sock.ev.on('messages.upsert',
async ({ messages }) => {

try {

const msg = messages[0]

if (!msg.message) return

const from = msg.key.remoteJid

const text =
msg.message.conversation ||
msg.message.extendedTextMessage?.text ||
''

// ته څوک یې
if (
text.includes('ته څوک یې') ||
text.includes('ته څوک يي')
) {

await sock.sendMessage(from, {
text:
'🤖 زه د ویصال احمد بوټ یم.\nزه د ویصال احمد لخوا جوړ شوی یم.'
})

}

// سلام
else if (
text.includes('سلام') ||
text.includes('hi')
) {

await sock.sendMessage(from, {
text:
'وعلیکم سلام 🌸\nزه ستاسو AI بوټ یم.'
})

}

// Voice Message
else if (msg.message.audioMessage) {

await sock.sendMessage(from, {
text:
'🎤 ستاسو صوتي پیغام مې ترلاسه کړ.'
})

}

} catch (err) {

console.log(err)

}

})

}

startBot()
