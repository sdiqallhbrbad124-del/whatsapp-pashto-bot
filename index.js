const {
default: makeWASocket,
useMultiFileAuthState,
fetchLatestBaileysVersion,
DisconnectReason,
Browsers
} = require('@whiskeysockets/baileys')

const pino = require('pino')
const axios = require('axios')

// ================= AI FUNCTION =================
async function askAI(question) {
try {
const res = await axios.post(
"https://api.openai.com/v1/chat/completions",
{
model: "gpt-4o-mini",
messages: [
{
role: "system",
content: `
You are a powerful multilingual AI assistant.

RULES:
- Always reply in the same language user uses (especially Pashto)
- If user writes Pashto, reply in natural fluent Pashto
- You know world history and Afghanistan history in detail
- Be friendly, smart, and clear
- Answer everything (no refusal unless harmful)
`
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
return "❌ AI error: API key یا internet مشکل لري"
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

sock.ev.on('creds.update', saveCreds)

// ================= CONNECTION =================
sock.ev.on('connection.update', (update) => {

const { connection, lastDisconnect } = update

if (connection === 'connecting') {
console.log("🔄 Connecting...")
}

if (connection === 'open') {
console.log("✅ AI BOT ONLINE")
}

if (connection === 'close') {
const reason = lastDisconnect?.error?.output?.statusCode

console.log("❌ Disconnected:", reason)

if (reason !== DisconnectReason.loggedOut) {
startBot()
}
}
})

// ================= PAIRING CODE =================
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

// ================= MESSAGES =================
sock.ev.on('messages.upsert', async ({ messages }) => {

const msg = messages[0]
if (!msg.message || msg.key.fromMe) return

const from = msg.key.remoteJid

const text =
msg.message.conversation ||
msg.message.extendedTextMessage?.text || ''

// 🔥 SEND TO AI
const reply = await askAI(text)

await sock.sendMessage(from, {
text: reply
})

})

console.log("🤖 AI Bot Running...")
}

startBot()
