(() => {

    // stop program if it has already been injected
    if (window.d4s_detection) return;
    window.d4s_detection = true;

    console.log("injected d4s detection");


    browser.runtime.onMessage.addListener(onMessage);
    console.log(browser)

    function onMessage(message) {
        if (message.type === "valid") {
            let svg_container = document.evaluate("//*[@id=\"jpedal\"]/div[2]/object", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            let valid_d4s_site = svg_container !== null && svg_container.type === "image/svg+xml";

            console.log(document.evaluate("//*[@id=\"jpedal\"]/div[2]/object", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue)
            return Promise.resolve({injected: valid_d4s_site, title: document.title});
        }
    }

})();