const express = require('express');
const puppeteer = require('puppeteer-extra');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const axios = require('axios');
const cron = require('node-cron');
const FormData = require('form-data');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Use Puppeteer Stealth plugin
puppeteer.use(StealthPlugin());

const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'; // constant auth token

const app = express();

// Replace with the path to your Phantom Wallet extension
const phantomExtensionPath = 'C:\\Users\\Jason\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Extensions\\bfnaelmomeimhlpmgjnjophhpkkoljpa\\24.14.0_0';

const walletName = 'MyWallet';
const privateKey = '3nTgnq3mYa8bsqtj9ieRm6PuTdu85LhMM8FJUyJPgvEgWT3yBh6PaNjtt61JRt2HF376WCYiEXanWwgGkMyDgpB1';
const walletPassword = 'password';

const allowedOrigins = [
    'http://pump.fun//create',
    'chrome-extension://emcjgmgdfakfaddjloelmaloiohdddpe',  // Add your Chrome extension ID here (find it in details under chrome extensions)
    'http://pump.fun/api/ipfs'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));

async function createCoin(tweetImageData, ticker, name, description, devBuyPrompt) {
    const imagePath = path.join(__dirname, 'tweet.png');
    fs.writeFileSync(imagePath, Buffer.from(tweetImageData, 'base64'));

    let notificationPage;

    try {
        const browser = await puppeteer.launch({
            headless: false,
            args: [
                `--disable-extensions-except=${phantomExtensionPath}`,
                `--load-extension=${phantomExtensionPath}`
            ],
        });


        // Add delay to ensure all tabs are fully loaded
        await new Promise(resolve => setTimeout(resolve, 1000));

        const pages = await browser.pages();
        const phantomPage = pages[1];

        // Interact with the Phantom Wallet tab
        await phantomPage.bringToFront();
        try {
            await phantomPage.goto('chrome-extension://bfnaelmomeimhlpmgjnjophhpkkoljpa/onboarding.html', { waitUntil: 'networkidle2', timeout: 60000 });
            console.log('Navigated to Phantom Wallet onboarding');
        } catch (error) {
            console.error('Error navigating to Phantom Wallet onboarding:', error);
            throw error;
        }

        // Click "Import an existing wallet"
        try {
            await phantomPage.waitForSelector('button', { timeout: 60000 });
            const buttons = await phantomPage.$$('button');
            await buttons[1].click(); // Assuming the second button is "Import an existing wallet"
            console.log('Clicked "Import an existing wallet"');
        } catch (error) {
            console.error('Error clicking "Import an existing wallet":', error);
            throw error;
        }

        // Click "Import Private Key"
        try {
            await phantomPage.waitForSelector('div[data-testid="import-private-key-button"]', { timeout: 60000 });
            await phantomPage.click('div[data-testid="import-private-key-button"]');
            console.log('Clicked "Import Private Key"');
        } catch (error) {
            console.error('Error clicking "Import Private Key":', error);
            throw error;
        }

        // Fill out the import form
        try {
            await phantomPage.waitForSelector('input[name="name"]', { timeout: 60000 });
            await phantomPage.type('input[name="name"]', walletName);
            await phantomPage.type('textarea', privateKey); // Use class selector for textarea
            console.log('Filled out wallet name and private key');
        } catch (error) {
            console.error('Error filling out wallet form:', error);
            throw error;
        }

        // Click "Import"
        try {
            await phantomPage.waitForSelector('button[data-testid="onboarding-form-submit-button"]', { timeout: 60000 });
            await phantomPage.click('button[data-testid="onboarding-form-submit-button"]');
            console.log('Clicked "Import"');
        } catch (error) {
            console.error('Error clicking "Import":', error);
            throw error;
        }

        // Fill out the password form
        try {
            await phantomPage.waitForSelector('input[data-testid="onboarding-form-password-input"]', { timeout: 60000 });
            await phantomPage.type('input[data-testid="onboarding-form-password-input"]', walletPassword);
            await phantomPage.type('input[data-testid="onboarding-form-confirm-password-input"]', walletPassword);
            await phantomPage.click('input[type="checkbox"]');
            console.log('Filled out password and accepted terms');
        } catch (error) {
            console.error('Error filling out password form:', error);
            throw error;
        }

        // Click "Continue"
        try {
            await phantomPage.waitForSelector('button[data-testid="onboarding-form-submit-button"]', { timeout: 60000 });
            await phantomPage.click('button[data-testid="onboarding-form-submit-button"]');
            console.log('Clicked "Continue"');
        } catch (error) {
            console.error('Error clicking "Continue":', error);
            throw error;
        }

        // Open the pump.fun tab explicitly
        const pumpPage = await browser.newPage();
        await pumpPage.goto('http://pump.fun/create', { waitUntil: 'networkidle2' });
        

        // Handle the initial popup
        try {
            await pumpPage.waitForSelector('button', { text: "I'm ready to pump", timeout: 60000 });
            await pumpPage.click('button', { text: "I'm ready to pump" });
            console.log('Clicked the "I\'m ready to pump" button');
        } catch (error) {
            console.error('Error clicking the "I\'m ready to pump" button:', error);
            throw error;
        }

        // Wait for the necessary input fields to be available
        try {
            await pumpPage.waitForSelector('#name', { timeout: 60000 });
            await pumpPage.waitForSelector('#ticker', { timeout: 60000 });
            await pumpPage.waitForSelector('#text', { timeout: 60000 });
            await pumpPage.waitForSelector('input[type="file"]', { timeout: 60000 });
        } catch (error) {
            console.error('Error waiting for input fields:', error);
            throw error;
        }

  // Fill out the form
  try {
    await pumpPage.type('#name', name);
    await pumpPage.type('#ticker', ticker);
    await pumpPage.type('#text', description);

    const input = await pumpPage.$('input[type="file"]');
    await input.uploadFile(imagePath);
    console.log('Uploaded tweet image');
} catch (error) {
    console.error('Error filling out form:', error);
    throw error;
}

// Click "Connect Wallet"
try {
    await pumpPage.waitForSelector('button.text-sm.text-slate-50', { timeout: 60000 });
    await pumpPage.evaluate(() => {
        const buttons = [...document.querySelectorAll('button.text-sm.text-slate-50')];
        buttons.find(btn => btn.textContent.includes('[connect wallet]')).click();
    });
    console.log('Clicked "Connect Wallet"');
} catch (error) {
    console.error('Error clicking "Connect Wallet":', error);
    throw error;
}




  // Click "Phantom"
try {
    await pumpPage.waitForSelector('button', { text: 'Phantom' });
    await pumpPage.evaluate(() => {
        const buttons = [...document.querySelectorAll('button')];
        buttons.find(btn => btn.textContent.includes('Phantom')).click();
    });
    console.log('Clicked "Phantom"');
} catch (error) {
    console.error('Error clicking "Phantom":', error);
    throw error;
}
// Handle Phantom Wallet connection and confirmation
let notificationPage;

// Click "Connect" in Phantom Wallet notification
try {
    notificationPage = await browser.waitForTarget(target => target.url().includes('notification.html')).then(target => target.page());
    await notificationPage.bringToFront();
    await notificationPage.waitForSelector('button[data-testid="primary-button"]', { timeout: 60000 });
    await notificationPage.click('button[data-testid="primary-button"]');
    console.log('Clicked "Connect" in Phantom Wallet');
} catch (error) {
    console.error('Error clicking "Connect" in Phantom Wallet:', error);
    throw error;
}
// Wait for new notification page and click "Confirm"
try {
// Wait for the new notification page to appear
    await new Promise(resolve => setTimeout(resolve, 1000));
    notificationPage = await browser.waitForTarget(target => target.url().includes('notification.html')).then(target => target.page());
    await notificationPage.bringToFront();
    await notificationPage.waitForSelector('button[data-testid="primary-button"]', { timeout: 60000 });
    await notificationPage.click('button[data-testid="primary-button"]');
    console.log('Clicked "Confirm" in Phantom Wallet');
} catch (error) {
    console.error('Error clicking "Confirm":', error);
    throw error;
}

// Switch focus back to pump.fun page
await pumpPage.bringToFront();




        const closeSelector = 'div.text-slate-50.hover\\:font-bold.hover\\:text-slate-50.cursor-pointer.w-fit.justify-self-center';

        // Click the 1st "Close" button back on pump.fun
        try {
            await pumpPage.waitForFunction(
                (selector) => {
                    const elements = Array.from(document.querySelectorAll(selector));
                    return elements.some(element => element.textContent.trim() === '[close]');
                },
                { timeout: 60000 },
                closeSelector
            );
            const closeButtonElements = await pumpPage.evaluate((selector) => {
                return Array.from(document.querySelectorAll(selector))
                    .filter(element => element.textContent.trim() === '[close]')
                    .map(element => element.outerHTML); // Return outerHTML for debugging
            }, closeSelector);
        
            console.log('Close button elements found:', closeButtonElements);
        
            if (closeButtonElements.length > 0) {
                await pumpPage.evaluate((selector) => {
                    const element = Array.from(document.querySelectorAll(selector))
                        .find(element => element.textContent.trim() === '[close]');
                    if (element) element.click();
                }, closeSelector);
                console.log('Clicked 1st "Close" on pump.fun');
            }
        } catch (error) {
            console.error('Error clicking first "Close" on pump.fun:', error);
            throw error;
        }
        
        // Click the 2nd "Close" button back on pump.fun
        try {
            await pumpPage.waitForFunction(
                (selector) => {
                    const elements = Array.from(document.querySelectorAll(selector));
                    return elements.some(element => element.textContent.trim() === '[close]');
                },
                { timeout: 60000 },
                closeSelector
            );
            const closeButtonElements = await pumpPage.evaluate((selector) => {
                return Array.from(document.querySelectorAll(selector))
                    .filter(element => element.textContent.trim() === '[close]')
                    .map(element => element.outerHTML); // Return outerHTML for debugging
            }, closeSelector);
        
            console.log('Close button elements found:', closeButtonElements);
        
            if (closeButtonElements.length > 1) {
                await pumpPage.evaluate((selector) => {
                    const elements = Array.from(document.querySelectorAll(selector))
                        .filter(element => element.textContent.trim() === '[close]');
                    if (elements.length > 1) elements[1].click();
                }, closeSelector);
                console.log('Clicked 2nd "Close" on pump.fun');
            }
        } catch (error) {
            console.error('Error clicking second "Close" on pump.fun:', error);
            throw error;
        }

        const rejectAllSelector = '#btn-reject-all';

// Click the "Reject All" button for cookie settings
try {
    await pumpPage.waitForSelector(rejectAllSelector, { timeout: 60000 });
    await pumpPage.evaluate((selector) => {
        const button = document.querySelector(selector);
        if (button) {
            button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        }
    }, rejectAllSelector);
    console.log('Clicked "Reject All" button for cookie settings');
} catch (error) {
    console.error('Error clicking "Reject All" button for cookie settings:', error);
    throw error;
}




      // Click the "Create coin" button
try {
    await pumpPage.waitForSelector('button', { timeout: 60000 });
    await pumpPage.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        buttons.find(btn => btn.textContent.trim() === 'Create coin').click();
    });
    console.log('Clicked the "Create coin" button');
} catch (error) {
    console.error('Error clicking the "Create coin" button:', error);
    throw error;
}

// Fill out the "devBuy" input field
try {
    await pumpPage.waitForSelector('#amount', { timeout: 60000 });

    // Extract numeric value from devBuyPrompt
const devBuyNumber = devBuyPrompt.match(/\d+(\.\d+)?/)[0];
console.log(devBuyNumber);
console.log(devBuyPrompt);
await pumpPage.type('#amount', devBuyNumber);
    console.log('Filled out the devBuy input field');
} catch (error) {
    console.error('Error filling out the devBuy input field:', error);
    throw error;
}

    // Click the "Create coin" button
try {
    // Added a delay to ensure the correct button is rendered
    await new Promise(resolve => setTimeout(resolve, 500)); // Adjust delay as needed

    await pumpPage.waitForSelector('button', { timeout: 60000 });
    const clicked = await pumpPage.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const createCoinButtons = buttons.filter(btn => btn.textContent.trim() === 'Create coin');
        
        if (createCoinButtons.length > 1) {
            // Log the found buttons for debugging
            console.log('Found "Create coin" buttons:', createCoinButtons);
            
            // Assuming the correct button is the second one
            const createCoinButton = createCoinButtons[1];
            createCoinButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            return true;
        } else if (createCoinButtons.length === 1) {
            const createCoinButton = createCoinButtons[0];
            createCoinButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            return true;
        } else {
            return false;
        }
    });

    if (clicked) {
        console.log('Clicked the "Create coin" button');
    } else {
        console.error('Could not find the "Create coin" button');
        throw new Error('Could not find the "Create coin" button');
    }
} catch (error) {
    console.error('Error clicking the "Create coin" button:', error);
    throw error;
}

// Wait for new notification page and click "Confirm"
try {
    // Wait for the new notification page to appear
        await new Promise(resolve => setTimeout(resolve, 300));
        notificationPage = await browser.waitForTarget(target => target.url().includes('notification.html')).then(target => target.page());
        await notificationPage.bringToFront();
        await notificationPage.waitForSelector('button[data-testid="primary-button"]', { timeout: 60000 });
        await notificationPage.click('button[data-testid="primary-button"]');
        console.log('Clicked "Confirm" in Phantom Wallet');
    } catch (error) {
        console.error('Error clicking "Confirm":', error);
        throw error;
    }


 // Send the request to the API with the auth token
 const formData = new FormData();
 formData.append('tweetImageData', tweetImageData);
 formData.append('ticker', ticker);
 formData.append('name', name);
 formData.append('description', description);
 formData.append('devBuyPrompt', devBuyPrompt);

 try {
     const response = await axios.post('https://pump.fun/api/ipfs', formData, {
         headers: {
             'Authorization': `Bearer ${authToken}`,
             ...formData.getHeaders(),
         }
     });
 } catch (error) {
     throw error;
 }

 console.log('Coin created successfully!');
} catch (error) {
 console.error('Error creating coin:', error);
} finally {
 fs.unlinkSync(imagePath);
}
}

// Define a POST route
app.post('/api/ipfs', (req, res) => {
// Your route logic here
res.send('IPFS endpoint');
});

app.post('/create', (req, res) => {
    let { tweetImageData, ticker, name, description, devBuyPrompt } = req.body;

    // Remove the data URL scheme part if it exists
    if (tweetImageData.startsWith('data:image/png;base64,')) {
        tweetImageData = tweetImageData.replace('data:image/png;base64,', '');
    }

    createCoin(tweetImageData, ticker, name, description, devBuyPrompt)
        .then(() => res.json({ message: 'Coin created successfully!' }))
        .catch((error) => {
            console.error('Error during coin creation:', error);  // Improved logging
            res.status(500).json({ message: 'Error creating coin', error: error.message });
        });
});

// Define the port
const port = 3000;

// Start the server on the defined port
app.listen(port, () => {
console.log(`Server running at http://localhost:${port}`);
});