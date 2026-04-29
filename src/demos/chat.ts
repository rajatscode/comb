// Chat demo — two-user split-pane chat with shared reactive state
import { createSignal, createComb, createEffect, batch, circuit } from '../runtime/index';
import { SignalInspector } from '../inspector';
import { CircuitVisualizer } from '../visualizer';
import { highlightComb } from '../highlight';

const CHAT_SOURCE = `module Chat {
  signal messages: {text: string, sender: string, ts: int}[] = [];
  signal alice_input: string = "";
  signal bob_input: string = "";
  signal alice_typing: bool = false;
  signal bob_typing: bool = false;

  comb message_count = messages.len();
  comb has_messages = message_count > 0;

  always @(send_alice) {
    messages <= [...messages, {
      text: alice_input, sender: "Alice", ts: now()
    }];
    alice_input <= "";
    alice_typing <= false;
  }

  always @(send_bob) {
    messages <= [...messages, {
      text: bob_input, sender: "Bob", ts: now()
    }];
    bob_input <= "";
    bob_typing <= false;
  }

  view {
    <div class="chat-split">
      <ChatPane user="Alice" input={alice_input}
        typing={bob_typing} />
      <ChatPane user="Bob" input={bob_input}
        typing={alice_typing} />
    </div>
  }
}`;

interface Message {
  text: string;
  sender: string;
  ts: number;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function mount(container: HTMLElement) {
  circuit.reset();
  container.innerHTML = '';
  container.className = 'split-view three-pane';

  // --- Signals ---
  const MODULE = 'Chat';
  const [messages, setMessages] = createSignal<Message[]>([], 'messages', MODULE);
  const [aliceInput, setAliceInput] = createSignal('', 'alice_input', MODULE);
  const [bobInput, setBobInput] = createSignal('', 'bob_input', MODULE);
  const [aliceTyping, setAliceTyping] = createSignal(false, 'alice_typing', MODULE);
  const [bobTyping, setBobTyping] = createSignal(false, 'bob_typing', MODULE);

  // --- Combs ---
  const messageCount = createComb(() => messages().length, 'message_count', MODULE);
  const hasMessages = createComb(() => messageCount() > 0, 'has_messages', MODULE);

  // --- Typing timeout handles ---
  let aliceTypingTimer: ReturnType<typeof setTimeout> | null = null;
  let bobTypingTimer: ReturnType<typeof setTimeout> | null = null;

  // --- Send handlers ---
  function sendMessage(sender: 'Alice' | 'Bob') {
    const text = sender === 'Alice' ? aliceInput() : bobInput();
    if (!text.trim()) return;

    batch(() => {
      setMessages(prev => [...prev, { text: text.trim(), sender, ts: Date.now() }]);
      if (sender === 'Alice') {
        setAliceInput('');
        setAliceTyping(false);
      } else {
        setBobInput('');
        setBobTyping(false);
      }
    });
  }

  function handleInput(sender: 'Alice' | 'Bob', value: string) {
    if (sender === 'Alice') {
      setAliceInput(value);
      setAliceTyping(value.length > 0);
      if (aliceTypingTimer) clearTimeout(aliceTypingTimer);
      aliceTypingTimer = setTimeout(() => setAliceTyping(false), 2000);
    } else {
      setBobInput(value);
      setBobTyping(value.length > 0);
      if (bobTypingTimer) clearTimeout(bobTypingTimer);
      bobTypingTimer = setTimeout(() => setBobTyping(false), 2000);
    }
  }

  // --- Source panel ---
  const sourcePanel = document.createElement('div');
  sourcePanel.className = 'source-panel';
  sourcePanel.innerHTML = `
    <div class="panel-header">chat.comb</div>
    <pre>${highlightComb(CHAT_SOURCE)}</pre>
  `;
  container.appendChild(sourcePanel);

  // --- App panel (two-pane chat) ---
  const appPanel = document.createElement('div');
  appPanel.className = 'app-panel';
  appPanel.style.padding = '0';
  appPanel.style.alignItems = 'stretch';
  appPanel.style.justifyContent = 'stretch';

  const chatSplit = document.createElement('div');
  chatSplit.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--border);width:100%;height:100%;min-height:460px;';

  function buildChatPane(user: 'Alice' | 'Bob'): HTMLElement {
    const pane = document.createElement('div');
    pane.className = 'chat';
    pane.style.background = 'var(--bg-secondary)';

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'padding:0.6rem 1rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;';
    const nameEl = document.createElement('span');
    nameEl.style.cssText = 'font-weight:600;font-size:0.9rem;';
    nameEl.textContent = user;
    const dot = document.createElement('span');
    dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:var(--signal-green);display:inline-block;margin-left:0.5rem;';
    const nameWrap = document.createElement('span');
    nameWrap.style.display = 'flex';
    nameWrap.style.alignItems = 'center';
    nameWrap.appendChild(nameEl);
    nameWrap.appendChild(dot);
    const countEl = document.createElement('span');
    countEl.className = 'msg-count';
    countEl.style.cssText = 'font-family:var(--font-mono);font-size:0.7rem;color:var(--text-muted);';
    header.appendChild(nameWrap);
    header.appendChild(countEl);
    pane.appendChild(header);

    // Message list
    const msgList = document.createElement('div');
    msgList.className = 'message-list';
    pane.appendChild(msgList);

    // Typing indicator
    const typingEl = document.createElement('div');
    typingEl.style.cssText = 'padding:0 1rem 0.4rem;font-size:0.75rem;color:var(--text-muted);font-style:italic;height:1.2rem;';
    pane.appendChild(typingEl);

    // Input area
    const inputArea = document.createElement('div');
    inputArea.className = 'input-area';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `${user}: Type a message...`;
    const sendBtn = document.createElement('button');
    sendBtn.className = 'primary';
    sendBtn.textContent = 'Send';
    inputArea.appendChild(input);
    inputArea.appendChild(sendBtn);
    pane.appendChild(inputArea);

    // Event handlers
    input.addEventListener('input', () => handleInput(user, input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        sendMessage(user);
        input.value = '';
      }
    });
    sendBtn.addEventListener('click', () => {
      sendMessage(user);
      input.value = '';
    });

    // --- Effects for this pane ---

    // Sync input value from signal (for clearing after send)
    createEffect(() => {
      const val = user === 'Alice' ? aliceInput() : bobInput();
      if (input.value !== val) input.value = val;
    }, `${user.toLowerCase()}_input_sync`, MODULE);

    // Render messages
    createEffect(() => {
      const msgs = messages();
      const count = messageCount();
      countEl.textContent = `${count} msg${count !== 1 ? 's' : ''}`;

      msgList.innerHTML = '';
      if (!hasMessages()) {
        const empty = document.createElement('p');
        empty.style.cssText = 'color:var(--text-muted);text-align:center;padding:2rem 0;font-size:0.85rem;';
        empty.textContent = 'No messages yet...';
        msgList.appendChild(empty);
      } else {
        for (const msg of msgs) {
          const el = document.createElement('div');
          el.className = `message ${msg.sender === user ? 'sent' : 'received'} fade-in`;

          const senderSpan = document.createElement('div');
          senderSpan.style.cssText = 'font-size:0.65rem;font-weight:600;margin-bottom:2px;opacity:0.7;';
          senderSpan.textContent = msg.sender === user ? 'You' : msg.sender;

          const textSpan = document.createElement('div');
          textSpan.textContent = msg.text;

          const timeSpan = document.createElement('div');
          timeSpan.style.cssText = 'font-size:0.6rem;opacity:0.5;margin-top:3px;text-align:right;';
          timeSpan.textContent = formatTime(msg.ts);

          el.appendChild(senderSpan);
          el.appendChild(textSpan);
          el.appendChild(timeSpan);
          msgList.appendChild(el);
        }
      }

      // Scroll to bottom
      msgList.scrollTop = msgList.scrollHeight;
    }, `${user.toLowerCase()}_render_messages`, MODULE);

    // Typing indicator
    createEffect(() => {
      const otherTyping = user === 'Alice' ? bobTyping() : aliceTyping();
      const otherName = user === 'Alice' ? 'Bob' : 'Alice';
      typingEl.textContent = otherTyping ? `${otherName} is typing...` : '';
    }, `${user.toLowerCase()}_typing_indicator`, MODULE);

    return pane;
  }

  chatSplit.appendChild(buildChatPane('Alice'));
  chatSplit.appendChild(buildChatPane('Bob'));
  appPanel.appendChild(chatSplit);
  container.appendChild(appPanel);

  // --- Right panel: circuit viz + signal inspector ---
  const rightPanel = document.createElement('div');
  rightPanel.style.display = 'flex';
  rightPanel.style.flexDirection = 'column';
  rightPanel.style.gap = '1rem';

  const circuitContainer = document.createElement('div');
  circuitContainer.className = 'circuit-panel';
  circuitContainer.style.flex = '1';
  rightPanel.appendChild(circuitContainer);

  const inspectorContainer = document.createElement('div');
  rightPanel.appendChild(inspectorContainer);
  container.appendChild(rightPanel);

  // Attach inspector
  const inspector = new SignalInspector(inspectorContainer);
  inspector.attach(circuit);

  // Build circuit visualization
  const viz = new CircuitVisualizer(circuitContainer);
  const graphData = circuit.getModule(MODULE);
  if (graphData.nodes.length > 0) {
    viz.renderStatic({
      modules: [{
        name: MODULE,
        nodes: graphData.nodes.map(n => ({
          id: n.id,
          name: n.name,
          type: n.type,
          deps: Array.from(n.dependencies),
        })),
        wires: graphData.wires.map(w => ({ from: w.from, to: w.to })),
      }],
    });

    circuit.subscribe((event) => {
      if (event.type === 'signal-change' || event.type === 'comb-recompute') {
        viz.onSignalChange(event.nodeId, event.newValue);
      }
    });
  }
}
