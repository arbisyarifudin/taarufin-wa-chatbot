const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const util = require('util');
const urlExists = require('url-exists');
const isUrlExists = util.promisify(urlExists);

const { sequelize, Setting, Block, BlockOption, User, UserData, BlockImage } = require('./models');

const wwebVersion = '2.2407.3';
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'session-123',
    }),
    qrMaxRetries: 10,
    restartOnAuthFail: true,
    takeoverOnConflict: true,
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

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', async (message) => {
    // console.log('Message received:', message);
    if (!message.from.includes('@c.us') || !message.body || message.body.trim().length === 0 || message.from.includes('status@broadcast') || message.hasMedia) {
        return;
    }
    
    const chatId = message.from;
    let user = await User.findOne({ where: { waChatId: chatId } });

    if (!user) {
        const waNumber = message.from.split('@')[0];
        const waInfo = await client.getContactById(chatId);
        const name = waInfo.pushname || waInfo.verifiedName || waInfo.formattedName || waInfo.shortName;
        user = await User.create({ name, waChatId: chatId, waNumber, waInfo, lastBlockId: null });
    }

    await handleUserMessage(message, user);
});

const handleUserMessage = async (message, user) => {
    // const chatId = message.from;
    const currentBlock = user.lastBlockId ? await Block.findByPk(user.lastBlockId) : null;
    const userInput = message.body.trim().toLowerCase();

    // check if last block at is more than 48 hours
    const isBackToReset = (currentBlock && user.lastBlockAt && (new Date() - user.lastBlockAt) > 48 * 60 * 60 * 1000) || !user.lastBlockId; 

    // if (!currentBlock || isBackToReset) {
    if (isBackToReset) {
        const startBlock = await Block.findOne({ where: { isStartPoint: true } });
        if (!startBlock) {
            return;
        }
        user.lastBlockId = startBlock.id;
        user.lastBlockAt = new Date();
        await user.save();
        await sendBlockMessage(message, startBlock, user);
        return;
    }

    if (!currentBlock) {
        return;
    }

    if (currentBlock.type === 'buttons') {
        const options = await BlockOption.findAll({ where: { blockId: currentBlock.id } });

        let option;
        const optionIndex = parseInt(userInput) - 1;
        if (!isNaN(optionIndex)) {
            if (options[optionIndex]) {
                option = options[optionIndex];
            }
        }

        if (!option) {
            option = options.find(opt => opt.text.toLowerCase().includes(userInput));
        }

        if (option) {
            const nextBlock = await Block.findByPk(option.nextId);
            user.lastBlockId = nextBlock.id;
            user.lastBlockAt = new Date();
            await user.save();
            await sendBlockMessage(message, nextBlock, user);
        } else {
            if (options.length > 1) {
                await message.reply('Balasan tidak valid. Silakan pilih dari opsi yang tersedia.');
            } else {
                await message.reply('Balasan tidak valid.');
            }
        }
    } else if (currentBlock.type === 'question') {
        const inputKey = currentBlock.input;
        // await UserData.create({ userId: user.id, key: inputKey, value: message.body });

        // create or update userdata by key and userid
        let userData = await UserData.findOne({ where: { userId: user.id, key: inputKey } });
        if (!userData) {
            userData = await UserData.create({ userId: user.id, key: inputKey, value: message.body });
        } else {
            userData.value = message.body;
            await userData.save();
        }

        const nextBlock = await Block.findByPk(currentBlock.nextId);
        user.lastBlockId = nextBlock.id;
        user.lastBlockAt = new Date();
        await user.save();
        await sendBlockMessage(message, nextBlock, user);
    } else if (currentBlock.type === 'message') {
        await message.reply(currentBlock.text);
        if (currentBlock.nextId) {
            const nextBlock = await Block.findByPk(currentBlock.nextId);
            user.lastBlockId = nextBlock.id;
            user.lastBlockAt = new Date();
            await user.save();
            await sendBlockMessage(message, nextBlock, user);
        } else {
            user.lastBlockId = null;
            user.lastBlockAt = null;
            await user.save();
            // await handleUserMessage(message, user);
        }
    }
};

const sendBlockMessage = async (message, block, user) => {

    // validate request
    if (!block || !message || !user) {
        return;
    }

    // validate message
    const matchRules = block.matchRules;
    if (matchRules && matchRules.length > 0) {
        for (const rule of matchRules) {
            if (rule.type === 'greaterThan') {
                if (message.body.trim().length <= rule.value) {
                    await message.reply(`Silakan masukkan minimal ${rule.value} karakter.`);
                    return;
                }
            } else if (rule.type === 'validEmail') {
                if (!message.body.trim().includes('@')) {
                    await message.reply('Silakan masukkan alamat email yang valid.');
                    return;
                }
            } else if (rule.type === 'validDate') {
                const pattern = rule.pattern || 'DD-MM-YYYY';
                const moment = require('moment');
                if (!moment(message.body.trim(), pattern).isValid()) {
                    await message.reply(`Silakan masukkan tanggal yang valid dengan format ${pattern}.`);
                    return;
                }
            } else if (rule.type === 'inArray') {
                if (!rule.in.includes(message.body.trim())) {
                    await message.reply(`Balasan tidak valid. Silakan pilih dari opsi yang tersedia.`);
                    return;
                }
            }
        }
    }


    let replyMessage = block.text;

    const settings = await Setting.findAll();
    settings.forEach(setting => {
        replyMessage = replyMessage.replace(`{${setting.key}}`, setting.value);
    });

    const userDatas = await UserData.findAll({ where: { userId: user.id } });
    userDatas.forEach(data => {
        replyMessage = replyMessage.replace(`{${data.key}}`, `*${data.value}*`);
    });

    if (block.type === 'buttons') {
        const options = await BlockOption.findAll({ where: { blockId: block.id } });
        replyMessage += '\n\n';
        options.forEach((option, index) => {
            if (option.length > 1) {
                replyMessage += `${index + 1}. ${option.text}\n`;
            } else {
                replyMessage += `${option.text}\n`;
            }
        });
    }

    const images = await BlockImage.findAll({ where: { blockId: block.id } });
    for (const image of images) {
        let messageMediaContent;
        if (image.type === 'url') {
            if (!await isUrlExists(image.image)) {
                continue;
            }
            messageMediaContent = await MessageMedia.fromUrl(image.image, { unsafeMime: true });
        } else {
            messageMediaContent = MessageMedia.fromFilePath(image.image);
        }
        await client.sendMessage(message.from, messageMediaContent);
    }

    await message.reply(replyMessage);

    // if (!block.nextId) {
    //     user.lastBlockId = null;
    //     user.lastBlockAt = null;
    //     await user.save();
    // }
};

client.initialize();
