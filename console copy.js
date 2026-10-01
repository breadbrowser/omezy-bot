let oldMessage = '';
let newMessage = '';

function removePrefix(str) {
  var temp = str.split(":");
  if (temp.length > 1) {
    temp = temp[1].trim();
  }
  return temp;
}

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const typeText = async (text, wpm = 50) => {
  const ta = document.getElementById('message-input');
  ta.removeAttribute('readonly');
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
  const baseDelay = 60000 / (wpm * 5); // ms per character (5 chars = 1 word)

  let current = '';
  for (const ch of text) {
    current += ch;
    setter.call(ta, current);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    // jitter of +/-40% around the average
    await wait(baseDelay * (0.6 + Math.random() * 0.8));
  }
};

// Non-blocking approval popup. Resolves with the (possibly edited) text on Accept, or null on Deny.
const askApproval = (strangerMsg, draft) => new Promise(resolve => {
  const box = document.createElement('div');
  box.style.cssText = `
    position:fixed; bottom:20px; right:20px; z-index:999999; width:320px;
    background:#1e1e1e; color:#fff; padding:14px; border-radius:10px;
    font:14px/1.4 sans-serif; box-shadow:0 4px 20px rgba(0,0,0,.5);
  `;

  const label = document.createElement('div');
  label.style.cssText = 'opacity:.6; font-size:12px; margin-bottom:4px;';
  label.textContent = 'Stranger: ' + strangerMsg;

  const draftEl = document.createElement('textarea');
  draftEl.value = draft;
  draftEl.style.cssText = `
    width:100%; height:70px; box-sizing:border-box; margin-bottom:10px;
    background:#2b2b2b; color:#fff; border:1px solid #444; border-radius:6px; padding:6px;
  `;

  const mkBtn = (text, color) => {
    const b = document.createElement('button');
    b.textContent = text;
    b.style.cssText = `background:${color}; color:#fff; border:0; border-radius:6px;
      padding:8px 14px; margin-right:8px; cursor:pointer;`;
    return b;
  };

  const accept = mkBtn('Accept', '#2e9e4f');
  const deny = mkBtn('Deny', '#c0392b');

  const done = (result) => { box.remove(); resolve(result); };
  accept.onclick = () => done(draftEl.value);
  deny.onclick = () => done(null);

  box.append(label, draftEl, accept, deny);
  document.body.appendChild(box);
});

const clearChat = async () => {
  const response = await fetch('http://localhost:625/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: "/56" })
  });
  const data = await response.json();
  console.log(data);
};

const checksr = async () => {
  const status_message = document.getElementById("send-btn").disabled;
  if (status_message == true) {
    console.log("finding stranger");
    await clearChat(1);
    document.getElementById("skip-btn").click();
    await wait(150);
    document.getElementById("skip-btn").click();
    await wait(5000);
    const status_message = document.getElementById("send-btn").disabled;
    if (status_message == true) {
      console.log("stranger disconnected");
      await clearChat(1);
      document.getElementById("skip-btn").click();
      await wait(5000);
    } else {
      console.log("stranger is connected");
    }
  } else {
    console.log("stranger is connected");
  }
};

const getStrangerMessage = async () => {
  const messages = (document.getElementById('messages').outerText).split("\n");
  if (messages[messages.length - 1].includes("Stranger: ")) {
    const lastYouIndex = messages.findLastIndex(item => item.includes("You:"));
    const combo = messages.slice(lastYouIndex + 1);
    var together = "".concat(combo).replace("Stranger: ", "").replaceAll("Stranger: ", ". ");
    const lastMessage = together;
    console.log(lastMessage);
    newMessage = lastMessage;
  } else {
    console.log("No messages found");
    await wait(1000);
  }
};

const sendBotMessage = async (input) => {
  const strangerText = removePrefix(input);
  const response = await fetch('http://localhost:625/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: strangerText })
  });
  const data2 = await response.json();
  let data = data2[0].replace(/\*/g, "").replace(/\!/g, "");
  console.log("Draft:", data);

  // Wait for your decision before anything gets sent
  const approved = await askApproval(strangerText, data);
  if (approved === null) {
    console.log("Denied, not sending");
    return;
  }

  const sendBtn = document.getElementById('send-btn');
  await typeText(approved, 150);
  await wait(100);
  if (!sendBtn.disabled) {
    sendBtn.click();
  } else {
    console.log("send button still disabled, not connected?");
  }
};

const checkAFK = async () => {
  while (true) {
    await checksr();
    await wait(300);
    await getStrangerMessage();
    if (newMessage === oldMessage) {
      console.log("waiting to see user is just typing");
      await wait(1000);
    } else {
      oldMessage = newMessage;
      await sendBotMessage(newMessage);
    }
  }
};

const main = async () => {
  await checkAFK();
};

main();