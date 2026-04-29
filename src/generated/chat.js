import { createSignal, createComb, createEffect, batch } from '../runtime/signals.js';
import { circuit } from '../runtime/circuit.js';

export function Message({ text, sender, timestamp }, root) {
  const moduleId = 'Message';

  // Combinational: time_display
  const time_display = createComb(() => new Date(timestamp).toLocaleTimeString(), 'time_display', moduleId);

  // View
  function render() {
    const el1 = document.createElement('div');
    el1.setAttribute('class', ("message " + ((sender == "me") ? "sent" : "received")));
    const el2 = document.createElement('span');
    el2.setAttribute('class', 'sender');
    const txt3 = document.createTextNode(String(sender));
    el2.appendChild(txt3);
    el1.appendChild(el2);
    const el4 = document.createElement('p');
    el4.setAttribute('class', 'text');
    const txt5 = document.createTextNode(String(text));
    el4.appendChild(txt5);
    el1.appendChild(el4);
    const el6 = document.createElement('span');
    el6.setAttribute('class', 'time');
    const txt7 = document.createTextNode('');
    createEffect(() => { txt7.textContent = String(time_display()); }, 'text_txt7', moduleId);
    el6.appendChild(txt7);
    el1.appendChild(el6);
    root.appendChild(el1);
  }

  render();

}

export function Chat(root) {
  const moduleId = 'Chat';

  // Signal: messages
  const [messages, setMessages] = createSignal([], 'messages', moduleId);

  // Signal: input_text
  const [input_text, setInput_text] = createSignal("", 'input_text', moduleId);

  // Signal: username
  const [username, setUsername] = createSignal("user", 'username', moduleId);

  // Signal: is_typing
  const [is_typing, setIs_typing] = createSignal(false, 'is_typing', moduleId);

  // Signal: connected
  const [connected, setConnected] = createSignal(true, 'connected', moduleId);

  // Combinational: message_count
  const message_count = createComb(() => messages().length, 'message_count', moduleId);

  // Combinational: has_messages
  const has_messages = createComb(() => (message_count() > 0), 'has_messages', moduleId);

  // Combinational: can_send
  const can_send = createComb(() => ((input_text().length > 0) && connected()), 'can_send', moduleId);

  // Event handler: send
  function send() {
    batch(() => {
      if (can_send()) {
        setMessages([...messages(), { text: input_text(), sender: username(), ts: Date.now() }]);
        setInput_text("");
      }
    });
  }

  // Event handler: receive
  function receive(msg) {
    batch(() => {
      setMessages([...messages(), msg]);
    });
  }

  // Event handler: clear
  function clear() {
    batch(() => {
      setMessages([]);
    });
  }

  // Event handler: typing
  function typing() {
    batch(() => {
      setIs_typing((input_text().length > 0));
    });
  }

  // View
  function render() {
    const el1 = document.createElement('div');
    el1.setAttribute('class', 'chat');
    const el2 = document.createElement('h1');
    const txt3 = document.createTextNode('Comb Chat');
    el2.appendChild(txt3);
    el1.appendChild(el2);
    const el4 = document.createElement('div');
    el4.setAttribute('class', 'status-bar');
    const el5 = document.createElement('span');
    createEffect(() => { el5.setAttribute('class', ("status " + (connected() ? "online" : "offline"))); }, 'attr_class', moduleId);
    const txt6 = document.createTextNode('');
    createEffect(() => { txt6.textContent = String((connected() ? "connected" : "disconnected")); }, 'text_txt6', moduleId);
    el5.appendChild(txt6);
    el4.appendChild(el5);
    const el7 = document.createElement('span');
    el7.setAttribute('class', 'count');
    const txt8 = document.createTextNode('');
    createEffect(() => { txt8.textContent = String(message_count()); }, 'text_txt8', moduleId);
    el7.appendChild(txt8);
    const txt9 = document.createTextNode('messages');
    el7.appendChild(txt9);
    el4.appendChild(el7);
    el1.appendChild(el4);
    const el10 = document.createElement('div');
    el10.setAttribute('class', 'message-list');
    const anchor11 = document.createComment('@if');
    el10.appendChild(anchor11);
    let ifBlock12 = null;
    createEffect(() => {
      if (ifBlock12) { ifBlock12.remove(); ifBlock12 = null; }
      if (!has_messages()) {
        ifBlock12 = document.createElement('div');
        ifBlock12.style.display = 'contents';
        const el14 = document.createElement('p');
        el14.setAttribute('class', 'empty');
        const txt15 = document.createTextNode('No messages yet. Say something!');
        el14.appendChild(txt15);
        ifBlock12.appendChild(el14);
        anchor11.parentNode.insertBefore(ifBlock12, anchor11.nextSibling);
      }
    }, 'if_anchor11', moduleId);
    const forAnchor16 = document.createComment('@for');
    el10.appendChild(forAnchor16);
    let forBlock17 = null;
    createEffect(() => {
      if (forBlock17) { forBlock17.remove(); forBlock17 = null; }
      forBlock17 = document.createElement('div');
      forBlock17.style.display = 'contents';
      const __items = messages();
      for (const msg of __items) {
        const container18 = document.createElement('div');
        container18.style.display = 'contents';
        Message({ text: msg.text, sender: msg.sender, timestamp: msg.ts }, container18);
        forBlock17.appendChild(container18);
      }
      forAnchor16.parentNode.insertBefore(forBlock17, forAnchor16.nextSibling);
    }, 'for_forAnchor16', moduleId);
    const anchor19 = document.createComment('@if');
    el10.appendChild(anchor19);
    let ifBlock20 = null;
    createEffect(() => {
      if (ifBlock20) { ifBlock20.remove(); ifBlock20 = null; }
      if (is_typing()) {
        ifBlock20 = document.createElement('div');
        ifBlock20.style.display = 'contents';
        const el22 = document.createElement('div');
        el22.setAttribute('class', 'typing-indicator');
        const el23 = document.createElement('span');
        el23.setAttribute('class', 'dot');
        el22.appendChild(el23);
        const el24 = document.createElement('span');
        el24.setAttribute('class', 'dot');
        el22.appendChild(el24);
        const el25 = document.createElement('span');
        el25.setAttribute('class', 'dot');
        el22.appendChild(el25);
        ifBlock20.appendChild(el22);
        anchor19.parentNode.insertBefore(ifBlock20, anchor19.nextSibling);
      }
    }, 'if_anchor19', moduleId);
    el1.appendChild(el10);
    const el26 = document.createElement('div');
    el26.setAttribute('class', 'input-area');
    const el27 = document.createElement('input');
    el27.setAttribute('placeholder', 'Type a message...');
    el27.value = input_text();
    createEffect(() => { el27.value = input_text(); }, 'bind_input_text', moduleId);
    el27.addEventListener('input', (e) => { setInput_text(e.target.value); });
    el27.addEventListener('input', typing);
    el27.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
    el26.appendChild(el27);
    const el28 = document.createElement('button');
    createEffect(() => { el28.setAttribute('disabled', !can_send()); }, 'attr_disabled', moduleId);
    el28.addEventListener('click', send);
    const txt29 = document.createTextNode('Send');
    el28.appendChild(txt29);
    el26.appendChild(el28);
    el1.appendChild(el26);
    root.appendChild(el1);
  }

  render();

}
