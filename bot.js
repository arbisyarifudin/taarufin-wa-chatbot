const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const util = require('util')
const urlExists = require('url-exists')
const isUrlExists = util.promisify(urlExists)

const { blocks, settings } = require('./datas.js');

const wwebVersion = '2.2407.3'
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'session-123',
    }),
    qrMaxRetries: 10,
    restartOnAuthFail: true,
    takeoverOnConflict: true,
    // webVersion: '2.2323.4',
    webVersionCache: {
        type: 'remote',
        remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/${wwebVersion}.html`
    },
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // <- this one doesn't works in Windows
            '--disable-gpu'
        ]
    }
});

let userState = {};

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', message => {
    const chatId = message.from;

    // console.log('Message received from', chatId);
    // console.log('userState', userState[chatId])
    // console.log('Message body', message.body)

    if (!userState[chatId]) {
        userState[chatId] = { currentBlock: null, data: {} };
    }

    handleUserMessage(message);
});

const handleUserMessage = async (message) => {
    const chatId = message.from;
    const state = userState[chatId];
    const currentBlock = state.currentBlock;
    const userInput = message.body.trim().toLowerCase();

    if (!currentBlock) {
        state.currentBlock = blocks.find(block => block.isStartPoint);
        await sendBlockMessage(message, state);
        return;
    }

    if (currentBlock.type === 'buttons') {
        // Cek apakah userInput adalah nomor urut
        let option;
        const optionIndex = parseInt(userInput) - 1;
        if (!isNaN(optionIndex) && currentBlock.options[optionIndex]) {
            option = currentBlock.options[optionIndex];
        }

        // Jika bukan nomor urut atau tidak ditemukan, cari berdasarkan teks
        if (!option) {
            option = currentBlock.options.find(opt => opt.text.toLowerCase().includes(userInput));
        }

        if (option) {
            state.currentBlock = blocks.find(block => block.id === option.next);
            await sendBlockMessage(message, state);
        } else {
            await message.reply('Silakan pilih opsi yang valid.');
        }
    } else if (currentBlock.type === 'question') {
        const inputKey = currentBlock.input;
        state.data[inputKey] = message.body;
        state.currentBlock = blocks.find(block => block.id === currentBlock.next);
        await sendBlockMessage(message, state);
    } else if (currentBlock.type === 'message') {
        // message.reply(currentBlock.text);
        if (currentBlock.next) {
            state.currentBlock = blocks.find(block => block.id === currentBlock.next);
            await sendBlockMessage(message, state);
        }

        // if current block doesn't have next block, reset user state
        if (!currentBlock.next) {
            // reset userstate
            userState[chatId] = { currentBlock: null, data: {} };
            state.currentBlock = null;

            await handleUserMessage(message);
        }
    }
    
};

const sendBlockMessage = async (message, state) => {
    const currentBlock = state.currentBlock;
    let replyMessage = currentBlock?.text || '';

    // Gantikan placeholder dalam teks
    replyMessage = replyMessage.replace(/{(\w+)}/g, (_, key) => {
        const setting = settings.find(s => s.key === key);
        return setting ? setting.value : (state.data[key] || key);
    });

    // if user has options
    if (currentBlock.type === 'buttons') {
        replyMessage += '\n\n';
        currentBlock.options.forEach((option, index) => {
            replyMessage += `${index + 1}. ${option.text}\n`;
        });
    }

    if (currentBlock.type === 'buttons' && currentBlock.image) {
        // check if image is url or base64 or file path
        const isUrl = currentBlock.image.startsWith('http');
        const isFilePath = currentBlock.image.startsWith('file://');
        let messageMediaContent = null;
        if (isUrl) {
            messageMediaContent = await MessageMedia.fromUrl(currentBlock.image, { unsafeMime: true });
        } else if (isFilePath) {
            const filePath = currentBlock.image.replace('file://', '');
            messageMediaContent = MessageMedia.fromFilePath(filePath);
        }

        
        if (messageMediaContent) {
            console.log('Sending image:', currentBlock.image);
            await client.sendMessage(message.from, messageMediaContent);

            console.log('Sent reply:', replyMessage);
            await message.reply(replyMessage);

        }
    } else {
        console.log('Sent reply:', replyMessage);
        await message.reply(replyMessage);
    }

};


client.initialize();
