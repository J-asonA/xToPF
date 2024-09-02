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
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'createCoin') {
          const { tokenName, ticker, description, amount, image } = request;
  
          // Create form data
          const formData = new FormData();
          formData.append('name', tokenName);
          formData.append('ticker', ticker);
          formData.append('description', description);
          formData.append('amount', amount);
          if (image) {
              formData.append('image', dataURItoBlob(image), 'image.png');
          }
  
          // Send POST request to pump.fun
          fetch('https://pump.fun/create', {
              method: 'POST',
              body: formData
          })
          .then(response => response.json())
          .then(data => {
              console.log('Success:', data);
              sendResponse({ success: true, data });
          })
          .catch((error) => {
              console.error('Error:', error);
              sendResponse({ success: false, message: 'Failed to create the coin.' });
          });
  
          // Indicate that we will send a response asynchronously
          return true;
      }
  });
  
  // Helper function to convert data URI to Blob
  function dataURItoBlob(dataURI) {
      const byteString = atob(dataURI.split(',')[1]);
      const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
      }
      return new Blob([ab], { type: mimeString });
  }