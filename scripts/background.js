const update_icon = () =>
  browser.tabs.query({ currentWindow: true, active: true }).then((tabs) => {
    let tab = tabs[0]; // Safe to assume there will only be one result
    if (is_valid_page(tab.url))
      browser.browserAction.setIcon({
        path: "../assets/icon-64.png",
      });
    else
      browser.browserAction.setIcon({
        path: "../assets/icon-64-disabled.png",
      });
  }, console.error);

browser.tabs.onActivated.addListener(update_icon);
browser.tabs.onUpdated.addListener(update_icon);
browser.windows.onFocusChanged.addListener(update_icon);

function is_valid_page(url) {
  return url.match(/https:\/\/.*\/ebook\/.*/);
}

let converting = false;
let converting_tab = -1;
let convert_progress = {
  title: "",
  from_page: -1,
  cur_page: -1,
  to_page: -1,
  page_count: -1,
  time_begin: 0,
};

browser.runtime.onMessage.addListener(onMessage);

function onMessage(message) {
  if (message.type === "start_converting") {
    converting = true;
    convert_progress = message.convert_progress;
  } else if (message.type === "update_tabid") {
    converting_tab = message.tabid;
  } else if (message.type === "is_converting") {
    return Promise.resolve({ converting, converting_tab });
  } else if (message.type === "get_progress") {
    return Promise.resolve({ convert_progress });
  } else if (message.type === "stop_converting") {
    converting = false;
    converting_tab = -1;
  } else if (message.type === "update_progress") {
    convert_progress = message.convert_progress;
    if (convert_progress.cur_page === convert_progress.to_page) {
      converting = false;
      converting_tab = -1;
    }
  } else if (message.type === "remove_materialize_css") {
    browser.tabs.query({ currentWindow: true, active: true }).then((tabs) => () => {});
  }
}
