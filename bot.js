const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const util = require('util');
const urlExists = require('url-exists');
const isUrlExists = util.promisify(urlExists);
const moment = require('moment');

const { sequelize, Setting, Block, BlockOption, User, UserData, BlockImage } = require('./models');

const wwebVersion = '2.2407.3';

let sessionName = 'session-123';
if (process.argv.length > 2) {
    sessionName = process.argv[2];
}
console.log('Session name:', sessionName);

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: sessionName,
        dataPath: '.puppeteer/chatbot_data',
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
    console.log('Message received:', message.body, 'from:', message.from, 'isGroup:', message.isGroupMsg, 'hasMedia:', message.hasMedia, 'isStatus:', message.from.includes('status@broadcast'));
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

// validate message
const validateMessage = async (message, block) => {
    const messageBody = message.body.trim();
    const matchRules = block.matchRules;
    if (matchRules && matchRules.length > 0) {
        for (const rule of matchRules) {
            // console.log('blockID:', block.id);
            // console.log('rule:', rule);
            if (rule.type === 'greaterThan') {
                if (messageBody.length <= rule.value) {
                    await message.reply(`Silakan masukkan minimal ${rule.value} karakter.`);
                    return;
                }
            }

            if (rule.type === 'greaterThanAndEqual') {
                // console.log('greaterThanAndEqual:', messageBody.length, rule.value);
                if (messageBody.length < rule.value) {
                    await message.reply(`Silakan masukkan minimal ${rule.value} karakter.`);
                    return;
                }
            }

            if (rule.type === 'validEmail') {
                if (!messageBody.includes('@')) {
                    await message.reply('Silakan masukkan alamat email yang valid.');
                    return;
                }
            }

            if (rule.type === 'validDate') {
                const pattern = rule.pattern || 'DD-MM-YYYY';
                const date = moment(messageBody, pattern, true);
                if (!date.isValid()) {
                    await message.reply(`Silakan masukkan tanggal yang valid dengan format ${pattern}.`);
                    return;
                }

                // tidak boleh kurang dari 18 tahun
                const age = new Date().getFullYear() - date.year();
                if (age < 18) {
                    await message.reply(`Maaf, usia kamu harus minimal 18 tahun.`);
                    return;
                }
            }

            if (rule.type === 'inArray') {
                if (!rule.in.includes(messageBody)) {
                    await message.reply(`Silakan pilih dari pilihan yang tersedia. *[${rule.in.join(', ')}]*`);
                    return;
                }
            }

            if (rule.type === 'contains') {
                const messageBodyToLower = messageBody.toLowerCase();
                if (Array.isArray(rule.value)) {
                    if (!rule.value.some(val => messageBodyToLower.includes(val.toLowerCase()))) {
                        await message.reply(`Balasan tidak valid. Silakan periksa kembali..`);
                        return;
                    }
                } else {
                    if (!messageBodyToLower.includes(rule.value.toLowerCase())) {
                        await message.reply(`Balasan tidak valid. Silakan periksa kembali..`);
                        return;
                    }
                }
            }

            if (rule.type === 'contains_all') {
                const messageBodyToLower = messageBody.toLowerCase();
                if (Array.isArray(rule.value)) {
                    if (!rule.value.every(val => messageBodyToLower.includes(val.toLowerCase()))) {
                        await message.reply(`Balasan tidak valid. Silakan periksa kembali..`);
                        return;
                    }
                } else {
                    if (!messageBodyToLower.includes(rule.value.toLowerCase())) {
                        await message.reply(`Balasan tidak valid. Silakan periksa kembali..`);
                        return;
                    }
                }
            }
        }
    }

    return true
}

const handleUserMessage = async (message, user) => {
    // const chatId = message.from;
    const currentBlock = user.lastBlockId ? await Block.findByPk(user.lastBlockId) : null;
    const userInput = message.body.trim().toLowerCase();

    // user.lastBlockAt = user.lastBlockAt === 'Invalid Date' || typeof user.lastBlockAt === 'Invalid Date' ? new Date() : user.lastBlockAt;
    user.lastBlockAt = moment(user.lastBlockAt).isValid() || !user.lastBlockAt ? user.lastBlockAt : null;

    // check if last block at is more than 48 hours
    const isBackToReset = (currentBlock && user.lastBlockAt && (new Date() - user.lastBlockAt) > 48 * 60 * 60 * 1000) || (!user.lastBlockId && !user.lastBlockAt);

    // console.log('user:', user);
    // console.log('currentBlock:', currentBlock);
    // console.log('isBackToReset:', isBackToReset);

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

    // validate message
    if (await validateMessage(message, currentBlock) !== true) {
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
            // option = options.find(opt => opt.text.toLowerCase().includes(userInput));

            // match words
            option = options.find(opt => opt.text.toLowerCase().split(' ').some(word => userInput.toLowerCase().includes(word)));
        }

        if (option) {
            const nextBlock = await Block.findByPk(option.nextId);
            if (!nextBlock || !option.nextId) {
                await resetUserState(user)
                return
            }
            // user.lastBlockId = nextBlock.id;
            // user.lastBlockAt = new Date();
            // await user.save();
            await sendBlockMessage(message, nextBlock, user, option);
        } else {
            if (options.length > 1) {
                // await message.reply('Balasan tidak valid. Silakan pilih dari opsi yang tersedia.');
                await message.reply('Sepertinya balasan tidak sesuai pilihan yang tersedia. Mohon periksa kembali ya..');
            } else {
                // await message.reply('Balasan tidak valid.');
                await message.reply('Sepertinya balasan kamu tidak sesuai. Mohon periksa kembali ya..');
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

        // update userData 'age' if 'dob' is updated
        if (inputKey === 'dob') {
            // const dob = new Date(message.body);
            const dob = message.body;
            const date = moment(dob, 'DD-MM-YYYY', true)
            const age = new Date().getFullYear() - date.year();
            console.log('age:', age);
            let ageUserData = await UserData.findOne({ where: { userId: user.id, key: 'age' } });
            if (!ageUserData) {
                ageUserData = await UserData.create({ userId: user.id, key: 'age', value: age > 0 ? age : 0});
            } else {
                ageUserData.value = age > 0 ? age : 0;
                await ageUserData.save();
            }
        }

        const nextBlock = await Block.findByPk(currentBlock.nextId);
        if (!nextBlock || !currentBlock.nextId) {
            await resetUserState(user)
            return
        }
        // user.lastBlockId = nextBlock.id;
        // user.lastBlockAt = new Date();
        // await user.save();
        await sendBlockMessage(message, nextBlock, user);
    } else if (currentBlock.type === 'message') {
        // await message.reply(currentBlock.text);
        const nextBlock = await Block.findByPk(currentBlock.nextId);
        if (!nextBlock || !currentBlock.nextId) {
            await resetUserState(user)
            return
        }

        await sendBlockMessage(message, nextBlock, user);
    }
};

const sendBlockMessage = async (message, block, user, option = null) => {

    // console.log('sendBlockMessage:', block, user, option);

    // validate request
    if (!block || !message || !user) {
        return;
    }

    // prepare reply message

    let replyMessage = block.text;

    const settings = await Setting.findAll();
    settings.forEach(setting => {
        const regex = new RegExp(`{${setting.key}}`, 'g');
        replyMessage = replyMessage.replace(regex, setting.value);
    });
    
    const userDatas = await UserData.findAll({ where: { userId: user.id } });
    userDatas.forEach(data => {
        const regex = new RegExp(`{${data.key}}`, 'g');
        replyMessage = replyMessage.replace(regex, `*${data.value}*`);
    });
    
    if (block.type === 'buttons') {
        const options = await BlockOption.findAll({ where: { blockId: block.id } });
        if (options.length > 1) {
            replyMessage += '\n\n*Pilihan*: \n';
        } else {
            replyMessage += '\n\n';
        }
        options.forEach((option, index) => {
            if (options.length > 1) {
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

    
    user.lastBlockId = block.id;
    // user.lastBlockAt = new Date();
    user.lastBlockAt = moment().toDate();
    await user.save();

    // save user state
    if (block.type !== 'buttons' && !block.nextId) {
        await resetUserState(user)
        return
    } else if (block.type === 'buttons' && (option && !option?.nextId)) {
        await resetUserState(user)
        return
    }
};

const resetUserState = async (user) => {
    if (!user) return
    user.lastBlockId = null;
    // user.lastBlockAt = null;
    // user.lastBlockAt = new Date();
    user.lastBlockAt = moment().toDate();
    await user.save();
}

client.initialize();