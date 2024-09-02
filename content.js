if (typeof html2canvas !== 'undefined') {
    console.log('html2canvas is loaded correctly.');

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'captureTweet') {
            const tweetLink = request.tweetLink;
            const tokenName = request.tokenName;
            const ticker = request.ticker;
            const devBuyPrompt = request.devBuyPrompt;

            // Log received data for debugging
            console.log('Received message in content script:');
            console.log('Tweet Link:', tweetLink);
            console.log('Token Name:', tokenName);
            console.log('Ticker:', ticker);
            console.log('Dev Buy:', devBuyPrompt);

            // Capture the tweet from the currently rendered page
            let tweet = document.querySelector('[data-testid="tweet"]');

            if (!tweet) {
                tweet = document.querySelector('[data-testid="cellInnerDiv"]');
            }

            if (tweet) {
                console.log('Tweet found, capturing image.');
                html2canvas(tweet, { 
                    useCORS: true,
                    backgroundColor: 'black'
                }).then(canvas => {
                    const imgData = canvas.toDataURL('image/png');

                    // Log the image data for debugging
                    console.log('Captured Image Data:', imgData);

                    // Send the image data and other inputs back to the popup
                    sendResponse({ 
                        success: true, 
                        image: imgData,
                        tokenName: tokenName,
                        ticker: ticker,
                        devBuyPrompt: devBuyPrompt // Include devBuyPrompt in the response
                    });
                }).catch(error => {
                    console.error('Error capturing tweet:', error);
                    sendResponse({ success: false, message: 'Failed to capture the tweet.' });
                });
            } else {
                console.error('Failed to find the tweet content.');
                sendResponse({ success: false, message: 'Failed to fetch the tweet content.' });
            }

            // Indicate that we will send a response asynchronously
            return true;
        }
    });
} else {
    console.error('html2canvas is not loaded correctly.');
}

chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed");
});

chrome.action.onClicked.addListener((tab) => {
    console.log('Injecting content script');
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
    });
});