document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('tweetButton').addEventListener('click', function() {
        const tweetLink = document.getElementById('tweetLink').value;
        const tokenName = document.getElementById('tokenName').value;
        const ticker = document.getElementById('ticker').value;
        const devBuyNumber = document.getElementById('devBuyNumber').value;

        if (!tweetLink || !tokenName || !ticker || !devBuyNumber) {
            alert('Please fill in all fields.');
            return;
        }

        const devBuyPrompt = `Dev Buy: ${devBuyNumber}`;

        console.log('Tweet Link:', tweetLink);
        console.log('Token Name:', tokenName);
        console.log('Ticker:', ticker);
        console.log('Dev Buy Prompt:', devBuyPrompt);

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                console.log('Sending message to content script...');
                chrome.tabs.sendMessage(tabs[0].id, { 
                    action: 'captureTweet', 
                    tweetLink: tweetLink,
                    tokenName: tokenName,
                    ticker: ticker,
                    devBuyPrompt: devBuyPrompt 
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('chrome.runtime.lastError', chrome.runtime.lastError);
                        alert('There was an error: ' + chrome.runtime.lastError.message);
                        return;
                    }
                    if (response && response.success) {
                        const tweetImageData = response.image;
                        const savedTokenName = response.tokenName;
                        const savedTicker = response.ticker;
                        const savedDevBuyPrompt = response.devBuyPrompt;

                        console.log('Received Image Data:', tweetImageData);
                        console.log('Received Token Name:', savedTokenName);
                        console.log('Received Ticker:', savedTicker);
                        console.log('Received Dev Buy Prompt:', savedDevBuyPrompt);

                        const tweetImage = document.getElementById('tweetImage');
                        tweetImage.src = tweetImageData;

                        const downloadLink = document.createElement('a');
                        downloadLink.href = tweetImageData;
                        downloadLink.download = 'tweet.png';
                        downloadLink.textContent = 'Download Captured Image';
                        document.body.appendChild(downloadLink);


                        fetch('http://localhost:3000/create', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                tweetImageData: tweetImageData,
                                ticker: savedTicker,
                                name: savedTokenName,
                                description: '',
                                devBuyPrompt: savedDevBuyPrompt
                            }),
                        })
                        .then(response => response.json())
                        .then(data => {
                            console.log('Backend response:', data);
                            if (data.message === 'Coin created successfully!') {
                                alert('Coin created successfully!');
                            } else {
                                alert('Error: ' + data.message);
                            }
                        })
                        .catch((error) => {
                            console.error('Error:', error);
                            alert('There was an error creating the coin.');
                        });
                    } else {
                        alert(response.message || 'There was an error capturing the tweet.');
                    }
                });
            } else {
                alert('No active tab found.');
            }
        });
    });
});