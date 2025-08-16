    const API_ENDPOINT = "https://asterix-api-chats-ai.vercel.app/api/zeus";
    const chatArea = document.getElementById('chatArea');
    const prompt = document.getElementById('prompt');
    const sendBtn = document.getElementById('sendBtn');
    const micBtn = document.getElementById('micBtn');
    const codeBtn = document.getElementById('codeBtn');
    const chatInput = document.getElementById('chatInput');
    const codeInput = document.getElementById('codeInput');
    const codeLanguage = document.getElementById('codeLanguage');
    const codePrompt = document.getElementById('codePrompt');
    const generateCodeBtn = document.getElementById('generateCodeBtn');
    const chatBtn = document.getElementById('chatBtn');
    const codeOutput = document.getElementById('codeOutput');
    const toggleSidebar = document.getElementById('toggleSidebar');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarClose = document.getElementById('sidebarClose');
    const newChatBtn = document.getElementById('newChatBtn');
    const conversationList = document.getElementById('conversationList');

    let conversationHistory = [];
    let conversations = JSON.parse(localStorage.getItem('conversations')) || [];
    let currentConversationId = null;
    let recognition = null;

    // Initialize Web Speech API for voice input
    if ('webkitSpeechRecognition' in window) {
      recognition = new webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        prompt.value = transcript;
        micBtn.classList.remove('active');
        recognition.stop();
      };
      recognition.onend = function() {
        micBtn.classList.remove('active');
      };
    }

    // Helper function to generate UUID
    function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    // Append message to chat area
    function appendMessage(text, sender) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${sender}-message`;
      const messageText = document.createElement('span');
      messageText.className = 'message-text';
      messageText.textContent = text;
      const timestamp = document.createElement('div');
      timestamp.className = 'message-time';
      timestamp.textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      messageDiv.appendChild(messageText);
      messageDiv.appendChild(timestamp);
      chatArea.appendChild(messageDiv);
      chatArea.scrollTop = chatArea.scrollHeight;
    }

    // Append code to output area
    function appendCode(code) {
      codeOutput.textContent = code;
      codeOutput.classList.add('active');
      chatArea.scrollTop = chatArea.scrollHeight;
    }

    // Save conversation to localStorage
    function saveConversation() {
      if (currentConversationId) {
        const conversation = {
          id: currentConversationId,
          messages: conversationHistory,
          timestamp: new Date().toISOString()
        };
        const existingIndex = conversations.findIndex(conv => conv.id === currentConversationId);
        if (existingIndex !== -1) {
          conversations[existingIndex] = conversation;
        } else {
          conversations.push(conversation);
        }
        localStorage.setItem('conversations', JSON.stringify(conversations));
        updateConversationList();
      }
    }

    // Update conversation list in sidebar
    function updateConversationList() {
      conversationList.innerHTML = '';
      conversations.forEach(conv => {
        const li = document.createElement('li');
        li.className = `conversation-item ${conv.id === currentConversationId ? 'active' : ''}`;
        const p = document.createElement('p');
        p.textContent = conv.messages[0]?.content || 'New Conversation';
        const time = document.createElement('span');
        time.className = 'time';
        time.textContent = new Date(conv.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        li.appendChild(p);
        li.appendChild(time);
        li.onclick = () => loadConversation(conv.id);
        conversationList.appendChild(li);
      });
    }

    // Load a conversation
    function loadConversation(id) {
      const conversation = conversations.find(conv => conv.id === id);
      if (conversation) {
        currentConversationId = id;
        conversationHistory = conversation.messages;
        chatArea.innerHTML = '';
        conversationHistory.forEach(msg => {
          appendMessage(msg.content, msg.role);
        });
        updateConversationList();
      }
    }

    // Start new conversation
    function startNewConversation() {
      currentConversationId = generateUUID();
      conversationHistory = [];
      chatArea.innerHTML = `
        <div class="message bot-message">
          <span class="message-text">Hello ! how can I help you today? <i class="fas fa-brain"></i></span>
          <div class="message-time">${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      `;
      codeOutput.classList.remove('active');
      saveConversation();
    }

    // Send chat message
    async function sendMessage() {
      const message = prompt.value.trim();
      if (!message) return;

      appendMessage(message, 'user');
      prompt.value = '';

      conversationHistory.push({ role: 'user', content: message });
      saveConversation();

      const typingIndicator = document.createElement('div');
      typingIndicator.className = 'typing-message active';
      typingIndicator.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
      chatArea.appendChild(typingIndicator);
      chatArea.scrollTop = chatArea.scrollHeight;

      try {
        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userMessage: conversationHistory.map(msg => `${msg.role === 'user' ? 'User' : 'Zeus'}: ${msg.content}`).join('\n') })
        });

        chatArea.removeChild(typingIndicator);

        if (!response.ok) throw new Error(`Error: ${response.status}`);

        const data = await response.json();
        let botReply = data.reply || (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) || 'Unexpected response format';

        appendMessage(botReply, 'bot');
        conversationHistory.push({ role: 'bot', content: botReply });
        saveConversation();
      } catch (error) {
        if (chatArea.contains(typingIndicator)) chatArea.removeChild(typingIndicator);
        appendMessage(`⚠️ Error: ${error.message}`, 'bot');
      }
    }

    // Generate code
    async function generateCode() {
      const language = codeLanguage.value.trim();
      const description = codePrompt.value.trim();
      if (!language || !description) return;

      const fullPrompt = `Generate ${language} code: ${description}`;
      appendMessage(fullPrompt, 'user');
      codeLanguage.value = '';
      codePrompt.value = '';

      conversationHistory.push({ role: 'user', content: fullPrompt });
      saveConversation();

      const typingIndicator = document.createElement('div');
      typingIndicator.className = 'typing-message active';
      typingIndicator.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
      chatArea.appendChild(typingIndicator);
      chatArea.scrollTop = chatArea.scrollHeight;

      try {
        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userMessage: fullPrompt })
        });

        chatArea.removeChild(typingIndicator);

        if (!response.ok) throw new Error(`Error: ${response.status}`);

        const data = await response.json();
        let code = data.reply || (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) || 'Unexpected response format';

        appendCode(code);
        conversationHistory.push({ role: 'bot', content: code });
        saveConversation();
      } catch (error) {
        if (chatArea.contains(typingIndicator)) chatArea.removeChild(typingIndicator);
        appendMessage(`⚠️ Error: ${error.message}`, 'bot');
      }
    }

    // Event listeners
    sendBtn.addEventListener('click', sendMessage);
    prompt.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    micBtn.addEventListener('click', () => {
      if (recognition) {
        micBtn.classList.add('active');
        recognition.start();
      } else {
        appendMessage('⚠️ Voice recognition not supported in this browser.', 'bot');
      }
    });

    codeBtn.addEventListener('click', () => {
      chatInput.style.display = 'none';
      codeInput.style.display = 'flex';
    });

    chatBtn.addEventListener('click', () => {
      codeInput.style.display = 'none';
      chatInput.style.display = 'flex';
      codeOutput.classList.remove('active');
    });

    generateCodeBtn.addEventListener('click', generateCode);
    codePrompt.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        generateCode();
      }
    });

    toggleSidebar.addEventListener('click', () => {
      sidebar.classList.add('active');
      sidebarOverlay.classList.add('active');
    });

    sidebarClose.addEventListener('click', () => {
      sidebar.classList.remove('active');
      sidebarOverlay.classList.remove('active');
    });

    sidebarOverlay.addEventListener('click', () => {
      sidebar.classList.remove('active');
      sidebarOverlay.classList.remove('active');
    });

    newChatBtn.addEventListener('click', startNewConversation);

    // Initialize
    startNewConversation();