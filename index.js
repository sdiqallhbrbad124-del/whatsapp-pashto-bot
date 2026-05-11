const {
default: makeWASocket,
useMultiFileAuthState,
fetchLatestBaileysVersion,
DisconnectReason,
Browsers
} = require('@whiskeysockets/baileys')

const pino = require('pino')
const OpenAI = require('openai')

// =====================================
// OPENAI API KEY
// =====================================
const openai = new OpenAI({
apiKey: 'YOUR_OPENAI_API_KEY'
})

// =====================================
// START BOT
// =====================================
async function startBot() {

const { state, saveCreds } =
await useMultiFileAuthState('./auth_info')

const { version } =
await fetchLatestBaileysVersion()

const sock = makeWASocket({
version,
auth: state,
printQRInTerminal: true,
markOnlineOnConnect: true,
syncFullHistory: false,
defaultQueryTimeoutMs: 60000,
connectTimeoutMs: 60000,
keepAliveIntervalMs: 10000,
logger: pino({ level: 'silent' }),
browser: Browsers.ubuntu('Chrome')
})

// =====================================
// SAVE SESSION
// =====================================
sock.ev.on('creds.update', saveCreds)

// =====================================
// CONNECTION UPDATE
// =====================================
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

console.log('✅ BOT CONNECTED SUCCESSFULLY')

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

// =====================================
// PAIRING CODE
// =====================================
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

}, 5000)

// =====================================
// MESSAGE SYSTEM
// =====================================
sock.ev.on('messages.upsert',
async ({ messages }) => {

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

// =====================================
// AUDIO MESSAGE
// =====================================
if (msg.message.audioMessage) {

await sock.sendMessage(from, {
text:
'🎤 ستاسو صوتي پیغام ترلاسه شو.'
})

return

}

// =====================================
// IMAGE / DESIGN REQUEST
// =====================================
if (
text.toLowerCase().includes('عکس') ||
text.toLowerCase().includes('ډیزاین') ||
text.toLowerCase().includes('design') ||
text.toLowerCase().includes('image') ||
text.toLowerCase().includes('logo')
) {

await sock.sendMessage(from, {
text:
`🎨 ستاسو د عکس/ډیزاین غوښتنه ترلاسه شوه:

🖼️ ${text}

🤖 وروسته به ریښتینی AI Image Generator هم فعال شي.`
})

return

}

// =====================================
// CHATGPT AI SYSTEM
// =====================================
try {

const ai =
await openai.chat.completions.create({
model: 'gpt-4.1-mini',

messages: [

{
role: 'system',

content: `
ته یو ډیر هوښیار WhatsApp AI بوټ یې.

قواعد:

- د نړۍ په ټولو ژبو خبرې کولی شې.
- که کاروونکی پښتو ولیکي، په پښتو ځواب ورکړه.
- که انګلیسي ولیکي، په انګلیسي ځواب ورکړه.
- که عربي، اردو، فارسي یا بله ژبه وي، هماغه ژبه وکاروه.
- د افغانستان تاریخ، اسلام، ساینس، ټکنالوژي، موبایل، پروګرامینګ او عمومي معلوماتو کې ماهر یې.
- دوستانه او محترمانه خبرې کوه.
- لنډ او واضح ځوابونه ورکړه.
- که څوک سلام وکړي، ښه سلام ورته وکړه.
- که څوک سوال وکړي، دقیق جواب ورکړه.
`
},

{
role: 'user',
content: text
}

]

})

const reply =
ai.choices[0].message.content

await sock.sendMessage(from, {
text: reply
})

} catch (err) {

console.log('OPENAI ERROR:', err)

await sock.sendMessage(from, {
text:
'❌ AI جواب کې مشکل راغی.\n\n🔑 API Key وګوره.'
})

}

} catch (err) {

console.log('MESSAGE ERROR:', err)

}

})

}

// =====================================
// RUN BOT
// =====================================
startBot()
