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

    // check if last block at is more than 1 hours
    const isMoreThanHour = currentBlock && user.lastBlockAt && (new Date() - user.lastBlockAt) > 3600000;

    if (!currentBlock || isMoreThanHour) {
        const startBlock = await Block.findOne({ where: { isStartPoint: true } });
        if (!startBlock) {
            return;
        }
        user.lastBlockId = startBlock.id;
        await user.save();
        await sendBlockMessage(message, startBlock, user);
        return;
    }

    if (currentBlock.type === 'buttons') {
        let option;
        const optionIndex = parseInt(userInput) - 1;
        if (!isNaN(optionIndex)) {
            const options = await BlockOption.findAll({ where: { blockId: currentBlock.id } });
            if (options[optionIndex]) {
                option = options[optionIndex];
            }
        }

        if (!option) {
            const options = await BlockOption.findAll({ where: { blockId: currentBlock.id } });
            option = options.find(opt => opt.text.toLowerCase().includes(userInput));
        }

        if (option) {
            const nextBlock = await Block.findByPk(option.nextId);
            user.lastBlockId = nextBlock.id;
            await user.save();
            await sendBlockMessage(message, nextBlock, user);
        } else {
            await message.reply('Silakan pilih opsi yang valid.');
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
        await user.save();
        await sendBlockMessage(message, nextBlock, user);
    } else if (currentBlock.type === 'message') {
        await message.reply(currentBlock.text);
        if (currentBlock.nextId) {
            const nextBlock = await Block.findByPk(currentBlock.nextId);
            user.lastBlockId = nextBlock.id;
            await user.save();
            await sendBlockMessage(message, nextBlock, user);
        } else {
            user.lastBlockId = null;
            await user.save();
            await handleUserMessage(message, user);
        }
    }
};

const sendBlockMessage = async (message, block, user) => {
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
            replyMessage += `${index + 1}. ${option.text}\n`;
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
};

client.initialize();
