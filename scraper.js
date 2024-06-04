const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
// const cron = require('node-cron');

const INSTAGRAM_URL = 'https://www.instagram.com';
const TARGET_USERNAME = 'taaruf.co.id';
const USERNAME = 'taarufin.official';
const PASSWORD = 'Taarufin@2024.2';
const CAPTIONS_FILE = 'storages/scraper_captions';
const POST_IDS_FILE = 'storages/scraper_ids.json';
const COOKIES_FILE = 'storages/scraper_cookies.json';

const userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.39 Safari/537.36';

// Fungsi untuk login ke Instagram
async function loginInstagram(page, username, password) {
    // await page.goto(`${INSTAGRAM_URL}/accounts/login/`, { waitUntil: 'networkidle2' });
    // await page.waitForSelector('input[name="username"]');
    // await page.type('input[name="username"]', username);
    // await page.type('input[name="password"]', password);

    try {
        await page.waitForSelector('input[aria-label="Phone number, username or email address"]', { timeout: 5000 });

        await page.type('input[aria-label="Phone number, username or email address"]', username, { delay: Math.floor(Math.random() * 150) + 100 });
        await page.type('input[aria-label="Password"]', password, { delay: Math.floor(Math.random() * 150) + 100 });
        await page.click('button[type="submit"]');

        // check if login has error message in 'form#loginForm > div + span > div' element textContent
        await waitForTimeout();

        const errorMessage = await page.evaluate(() => {
            const errorElement = document.querySelector('form#loginForm > div + span > div');
            return errorElement ? errorElement.textContent : null;
        });

        if (errorMessage) {
            console.error('Login failed:', errorMessage);
            return false;
        }
    } catch (error) {
        if (error instanceof puppeteer.errors.TimeoutError) {
            console.error(error);

            // check apakah kita dibawah ke halaman /challenge
            const pathname = await page.evaluate(() => window.location.pathname);
            console.log('window.location.pathname:', pathname);

            const isChallenged = pathname === '/challenge' || pathname === '/challenge/';

            console.log('isChallenged:', isChallenged);

            if (isChallenged) {
                console.log('Challenge page detected!');
                // await waitForTimeout(5000);
                // click 'Dismiss' button in div[data-bloks-name="bk.components.Flexbox"][role="button"]
                await page.click('div[data-bloks-name="bk.components.Flexbox"][role="button"]');
                await waitForTimeout();
                return true;
            }
        } else {
            console.error(error)
        }

        return false
    }
    return true;
}

// Fungsi untuk mengambil ID dan caption dari 9 postingan terbaru
async function getLatestPosts(page, targetUsername) {
    await page.goto(`${INSTAGRAM_URL}/${targetUsername}/`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('a img');

    const posts = await page.evaluate(() => {
        const nodes = Array.from(document.querySelectorAll('a img'));

        const fetchTotal = 12; // get X total latest posts
        return nodes.slice(1, fetchTotal + 1).map(node => {
            const parent = node.closest('a');
            const hrefArray = parent.href.split('/');
            if (!hrefArray.length) {
                return null;
            }
            const postId = hrefArray[hrefArray.length - 2];
            const postType = hrefArray[hrefArray.length - 3];
            const caption = node.alt;
            return { postId, postType, caption };
        }).filter(v => v !== null);

    });

    return posts;
}

// Fungsi untuk memeriksa apakah pengguna sudah login
async function isUserLoggedIn(page) {

    // get cookies
    console.log('Checking cookies...');
    if (fs.existsSync(COOKIES_FILE)) {
        const cookies = fs.readFileSync(COOKIES_FILE, 'utf-8');
        const cookiesArr = JSON.parse(cookies);
        console.log('Setting cookies...');
        await page.setCookie(...cookiesArr);
    }

    // await page.goto(INSTAGRAM_URL, { waitUntil: 'networkidle2' });
    await page.goto(`${INSTAGRAM_URL}/accounts/login/`, { waitUntil: 'networkidle2' });
    try {
        await page.waitForSelector('svg[aria-label="Settings"]', { timeout: 5000 });
        return true;
    } catch (error) {
        return false;
    }
}

async function waitForTimeout(timeout = null) {
    const randomTime = timeout || Math.floor(Math.random() * (10000 - 5000 + 1)) + 5000;
    console.log('Waiting for', randomTime, 'ms...');
    return await new Promise(resolve => setTimeout(resolve, randomTime));
}

// Fungsi utama untuk mengelola proses
async function main() {

    const tempDir = path.resolve('./.puppeteer/scrapper_data/');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        userDataDir: tempDir
    });
    const page = await browser.newPage();

    // Set the user agent and disable the webdriver flag
    await page.setUserAgent(userAgent);
    await page.evaluateOnNewDocument(() => {
        // Object.defineProperty(navigator, 'webdriver', {
        //     get: () => undefined
        // });
        delete navigator.__proto__.webdriver;
    }
    );

    try {

        console.log('Checking if user is logged in...');
        const loggedIn = await isUserLoggedIn(page);
        if (!loggedIn) {
            console.log('Logging in...');
            if (await loginInstagram(page, USERNAME, PASSWORD) === false) {
                // console.error('Login failed!');
                throw new Error('Login failed!');
            }

            console.log('Go to Instagram home page...');
            await page.waitForNavigation({ waitUntil: 'networkidle2' }, { timeout: 60000 });

            // Wait for user to login
            await page.waitForSelector('svg[aria-label="Settings"]');
            console.log('Login success!');

            // Save cookies
            const cookies = await page.cookies();
            console.log('Saving cookies...');
            fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
        }

        console.log('Getting latest posts...');

        const currentDateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // Baca ID postingan yang sudah diambil sebelumnya
        let savedPostIds = [];
        if (fs.existsSync(POST_IDS_FILE)) {
            try {
                savedPostIds = JSON.parse(fs.readFileSync(POST_IDS_FILE, 'utf-8'));
            } catch (error) {
                // savedPostIds = [];                
                savedPostIds = {};
            }
        }

        await waitForTimeout();
        const posts = await getLatestPosts(page, TARGET_USERNAME);
        // console.log('Posts:', posts);

        let newCaptions = [];
        let newPostIds = [];

        posts.forEach(post => {
            // if (!savedPostIds.includes(post.postId)) {
            if (!savedPostIds[currentDateStr]) {
                savedPostIds[currentDateStr] = [];
            }

            // check in all dates
            let isAlreadySaved = false;
            for (const date in savedPostIds) {
                if (savedPostIds[date].includes(post.postId)) {
                    isAlreadySaved = true;
                    break;
                }
            }

            // if (!savedPostIzds[currentDateStr].includes(post.postId)) {
            if (!isAlreadySaved) {
                // Skip caption yang tidak ada kata-kata "Nama:" atau "Nama :" atau "Jns kelamin:" atau "Jns kelamin :"
                if (!post.caption.match(/Nama\s*:/) && !post.caption.match(/Jns kelamin\s*:/)) {
                    return;
                }

                // newCaptions.push(post.caption);
                const headerTitle = `=====${TARGET_USERNAME}/${post.postType}/${post.postId}=====`;
                newCaptions.push(headerTitle + '\n' + post.caption);
                newPostIds.push(post.postId);
            }
        });

        console.log('New post found:', newCaptions.length);
        if (newCaptions.length > 0) {
            console.log('Saving captions...');
            const captionsText = newCaptions.join('\n\n');
            // fs.writeFileSync(CAPTIONS_FILE, captionsText, { flag: 'a' });
            fs.writeFileSync(CAPTIONS_FILE + `_${currentDateStr}.txt`, captionsText);
            // console.log('Captions saved:', newCaptions);
            console.log('Captions saved!');

            // Simpan ID postingan baru
            // savedPostIds = savedPostIds.concat(newPostIds);
            savedPostIds[currentDateStr] = savedPostIds[currentDateStr].concat(newPostIds);
            fs.writeFileSync(POST_IDS_FILE, JSON.stringify(savedPostIds, null, 2));
        }
    } catch (error) {
        console.error(error);
    } finally {
        await browser.close();
    }
}

// Jadwalkan tugas untuk dijalankan setiap 1 jam
// cron.schedule('0 * * * *', main);

main();
