const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys')

const pino = require('pino')

async function startBot() {

  const { state, saveCreds } =
    await useMultiFileAuthState('./session')

  const { version } =
    await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: state,
    browser: ['Wisal Bot', 'Chrome', '1.0.0'],
    printQRInTerminal: false,
    usePairingCode: true
  })

  sock.ev.on('creds.update', saveCreds)

  if (!sock.authState.creds.registered) {

    const code =
      await sock.requestPairingCode('93703930172')

    console.log(`
========================
PAIRING CODE: ${code}
========================
`)
  }

  sock.ev.on('connection.update', ({ connection }) => {

    if (connection === 'open') {
      console.log('✅ BOT CONNECTED')
    }

  })

  sock.ev.on('messages.upsert', async ({ messages }) => {

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
          'زه د ویصال احمد بوټ یم 🤖\nزه د ویصال احمد لخوا جوړ شوی یم.'
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

    // Default Reply
    else {

      await sock.sendMessage(from, {
        text:
          `تاسو وویل:\n${text}\n\n🤖 ویصال AI بوټ`
      })

    }

  })

}

startBot()
