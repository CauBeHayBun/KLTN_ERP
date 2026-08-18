const WebSocket = require('ws');

let wss = null;
let cskhSessions = [];

// Helper to deduplicate sessions by customerName & sessionId
const deduplicateSessions = (sessions) => {
  const map = new Map();
  sessions.forEach(s => {
    // Key by customerName or sessionId
    const key = (s.customerName || s.id).toLowerCase().trim();
    if (!map.has(key)) {
      map.set(key, s);
    } else {
      // Merge messages into existing session
      const existing = map.get(key);
      const combinedMsgs = [...existing.messages, ...(s.messages || [])];
      // Keep unique messages
      const msgSet = new Map();
      combinedMsgs.forEach(m => {
        const mKey = `${m.sender}_${m.text}_${m.time}`;
        if (!msgSet.has(mKey)) msgSet.set(mKey, m);
      });
      existing.messages = Array.from(msgSet.values());
      // Update session ID if new one is session_user_
      if (s.id && s.id.startsWith('session_user_')) {
        existing.id = s.id;
      }
    }
  });
  return Array.from(map.values());
};

const initWebSocket = (server) => {
  wss = new WebSocket.Server({ server, path: '/ws/cskh' });

  console.log('==================================================');
  console.log('[WebSocket] Server initialized on ws://localhost:5000/ws/cskh');
  console.log('==================================================');

  wss.on('connection', (ws) => {
    cskhSessions = deduplicateSessions(cskhSessions);
    ws.send(JSON.stringify({
      type: 'INIT_SESSIONS',
      sessions: cskhSessions
    }));

    ws.on('message', (messageStr) => {
      try {
        const data = JSON.parse(messageStr);
        handleWSMessage(ws, data);
      } catch (err) {
        console.error('[WebSocket] Error parsing message:', err);
      }
    });
  });
};

const broadcast = (data) => {
  if (!wss) return;
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
};

const handleWSMessage = (ws, data) => {
  if (!data || !data.type) return;

  const { type, payload } = data;
  const time = payload?.time || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  if (type === 'CUSTOMER_SEND_MSG') {
    const { sessionId, text, customerName } = payload || {};
    if (!text || !sessionId) return;
    
    let name = customerName;
    if (!name || name.includes('undefined')) {
      name = 'Khách Hàng Vãng Lai';
    }

    // Find session by id OR by customerName to prevent duplicates
    let session = cskhSessions.find(s => s.id === sessionId || (name !== 'Khách Hàng Vãng Lai' && s.customerName.toLowerCase().trim() === name.toLowerCase().trim()));

    if (session) {
      session.id = sessionId; // Ensure session ID matches current
      session.customerName = name;
      session.messages.push({ sender: 'customer', text, time });
    } else {
      session = {
        id: sessionId,
        customerName: name,
        status: 'ONLINE',
        messages: [{ sender: 'customer', text, time }]
      };
      cskhSessions.unshift(session);
    }

    cskhSessions = deduplicateSessions(cskhSessions);

    broadcast({
      type: 'UPDATE_SESSIONS',
      sessions: cskhSessions,
      newMsg: { sender: 'customer', text, time, sessionId: session.id }
    });
  } 
  else if (type === 'STAFF_SEND_MSG') {
    const { sessionId, text } = payload || {};
    if (!text || !sessionId) return;

    let session = cskhSessions.find(s => s.id === sessionId);
    if (session) {
      session.messages.push({ sender: 'staff', text, time });
    }

    cskhSessions = deduplicateSessions(cskhSessions);

    broadcast({
      type: 'UPDATE_SESSIONS',
      sessions: cskhSessions,
      newMsg: { sender: 'staff', text, time, sessionId }
    });
  }
  else if (type === 'DELETE_SESSION') {
    const { sessionId } = payload || {};
    if (!sessionId) return;

    cskhSessions = cskhSessions.filter(s => s.id !== sessionId);

    broadcast({
      type: 'UPDATE_SESSIONS',
      sessions: cskhSessions
    });
  }
};

const getSessions = () => {
  cskhSessions = deduplicateSessions(cskhSessions);
  return cskhSessions;
};

const addCustomerMessage = ({ sessionId, text, customerName, time }) => {
  if (!sessionId || !text) return null;
  const msgTime = time || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  let name = customerName;
  if (!name || name.includes('undefined')) {
    name = 'Khách Hàng Vãng Lai';
  }

  let session = cskhSessions.find(s => s.id === sessionId || (name !== 'Khách Hàng Vãng Lai' && s.customerName.toLowerCase().trim() === name.toLowerCase().trim()));

  if (session) {
    session.id = sessionId;
    session.customerName = name;
    session.messages.push({ sender: 'customer', text, time: msgTime });
  } else {
    session = {
      id: sessionId,
      customerName: name,
      status: 'ONLINE',
      messages: [{ sender: 'customer', text, time: msgTime }]
    };
    cskhSessions.unshift(session);
  }

  cskhSessions = deduplicateSessions(cskhSessions);

  broadcast({
    type: 'UPDATE_SESSIONS',
    sessions: cskhSessions,
    newMsg: { sender: 'customer', text, time: msgTime, sessionId: session.id }
  });

  return session;
};

const addStaffMessage = ({ sessionId, text, time }) => {
  if (!sessionId || !text) return null;
  const msgTime = time || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  let session = cskhSessions.find(s => s.id === sessionId);
  if (session) {
    session.messages.push({ sender: 'staff', text, time: msgTime });
  }

  cskhSessions = deduplicateSessions(cskhSessions);

  broadcast({
    type: 'UPDATE_SESSIONS',
    sessions: cskhSessions,
    newMsg: { sender: 'staff', text, time: msgTime, sessionId }
  });

  return session;
};

module.exports = {
  initWebSocket,
  broadcast,
  getSessions,
  addCustomerMessage,
  addStaffMessage
};
