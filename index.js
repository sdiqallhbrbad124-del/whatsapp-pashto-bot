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
import { default as makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';

const phoneNumber = '93703930172';
const authFolder = './auth_info';

// 1. هر ځل Deploy کې زوړ Session ووهه
if (fs.existsSync(authFolder)) {
    fs.rmSync(authFolder, { recursive: true, force: true });
    console.log('>>> زوړ Session پاک شو. نوی کوډ غوښتل کیږي...');
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        mobile: false, // ← دا مهم دی
        logger: pino({ level: 'silent' }),
        browser: ['Windows', 'Chrome', '110.0.0'] // ← دا نوم 8 رقمي کوډ راوړي
    });

    // 2. که راجسټر نه وي، سمدستي کوډ وغواړه
    if (!sock.authState.creds.registered) {
        await new Promise(r => setTimeout(r, 1500)); // 1.5 ثانیه انتظار
        try {
            const code = await sock.requestPairingCode(phoneNumber);
            console.log('');
            console.log('================ PAIRING CODE ================');
            console.log('>>>  ', code, '  <<<');
            console.log('================ PAIRING CODE ================');
            console.log('دا کوډ په WhatsApp کې ولیکه: Linked devices > Link with phone number');
        } catch (err) {
            console.log('❌ کوډ ونه غوښتل شو:', err.message);
        }
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log('✅ بوټ وټساپ سره وصل شو!');
        }
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log('قطع شو. Status:', statusCode);
            if (statusCode !== DisconnectReason.loggedOut) {
                startBot();
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

startBot();
