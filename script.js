// DOM Elements
const chatBox = document.getElementById('chat-box');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('typing-indicator');
const sidebar = document.getElementById('sidebar');
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const overlay = document.getElementById('overlay');
const newChatBtn = document.getElementById('new-chat-btn');
const charCount = document.getElementById('char-count');
const chatList = document.getElementById('chat-list');

// Configuration
const MAX_CHARS = 2000;
const API_KEY = 'AIzaSyB3F-cANRqjHTtS7T68nMpE29kO6hkJoBs'; // Gemini API key as provided

// State management
let currentChatId = null;
let chatHistory = [];
let allChats = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  loadAllChats();
  setupEventListeners();
  updateCharCount();
  createNewChat();
});

// Event Listeners
function setupEventListeners() {
  chatForm.addEventListener('submit', handleSubmit);
  mobileMenuToggle.addEventListener('click', toggleSidebar);
  overlay.addEventListener('click', closeSidebar);
  newChatBtn.addEventListener('click', createNewChat);
  userInput.addEventListener('input', updateCharCount);
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('quick-action')) {
      const message = e.target.getAttribute('data-message');
      console.log('Quick action clicked with message:', message); // Debug log
      userInput.value = message;
      // Simulate form submission
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      chatForm.dispatchEvent(submitEvent);
    }
  });
  userInput.addEventListener('input', autoResizeTextarea);
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  });
}

// Chat Submission Handler with Improved Message Handling
async function handleSubmit(e) {
  e.preventDefault();
  if (!userInput.value.trim()) return;
  const message = userInput.value.trim();

  // Add user message to chat history and render immediately
  chatHistory.push({ role: "user", content: message });
  renderChatHistory();

  // Attempt to save user message to database, but don't block UI update
  try {
    const userResponse = await fetch('save_message.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `chat_id=${currentChatId}&role=user&content=${encodeURIComponent(message)}`
    });
    const userResult = await userResponse.json();
    if (!userResult.success) {
      console.error('Failed to save user message to database:', userResult.error);
    }
  } catch (error) {
    console.error('Error saving user message to database:', error);
  }

  userInput.value = "";
  updateCharCount();
  typingIndicator.style.display = "flex";

  // Local responses for quick action buttons
  let botResponse;
  const lowerMessage = message.toLowerCase();
  if (message === "Tell me a joke") {
    botResponse = "Why did the computer go to school? Because it wanted to improve its *byte*! Hope that made you smile!";
  } else if (message === "Explain quantum physics") {
    botResponse = "Quantum physics studies the behavior of particles at very small scales, like atoms and subatomic particles. It’s based on principles like superposition (particles exist in multiple states at once), entanglement (particles can be instantly connected despite vast distances), and wave-particle duality (particles exhibit both wave and particle properties). It’s key to understanding phenomena like quantum computing and atomic behavior. Want to dive deeper into a specific aspect?";
  } else if (message === "Write a creative story") {
    botResponse = "Once upon a time in a forest of whispering trees, a young fox named Ember discovered a glowing crystal that granted her the ability to speak with the wind. The wind told her of a hidden realm where dreams shaped reality, but only the brave could enter. Ember embarked on a journey, facing trials of courage and wit, and ultimately learned that the true magic was in believing in herself. Would you like to continue the story?";
  } else {
    // Call Gemini API for other messages
    try {
      const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + API_KEY;
      const requestBody = {
        contents: [{ parts: [{ text: message }] }]
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      if (response.ok && data.candidates && data.candidates[0].content.parts[0].text) {
        botResponse = data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('API response error');
      }
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      botResponse = "I'm sorry, I'm having trouble responding right now. Please try again later.";
    }
  }

  // Attempt to save bot response to database, but don't block UI update
  try {
    const botResponseSave = await fetch('save_message.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `chat_id=${currentChatId}&role=bot&content=${encodeURIComponent(botResponse)}`
    });
    const botResult = await botResponseSave.json();
    if (!botResult.success) {
      console.error('Failed to save bot message to database:', botResult.error);
    }
  } catch (error) {
    console.error('Error saving bot message to database:', error);
  }

  setTimeout(() => {
    chatHistory.push({ role: "bot", content: botResponse });
    renderChatHistory();
    typingIndicator.style.display = "none";
  }, 1000);

  saveCurrentChat();
}

// Chat Management
function createNewChat() {
  currentChatId = generateId();
  chatHistory = [];
  chatBox.innerHTML = `
    <div class="welcome-message">
      <div class="welcome-icon">
        <i class="fas fa-sparkles"></i>
      </div>
      <h2>Welcome to AI Chat</h2>
      <p>Ask me anything! I'm here to help you with questions, creative tasks, and more.</p>
      <div class="quick-actions">
        <button class="quick-action" data-message="Tell me a joke">
          <i class="fas fa-laugh"></i>
          Tell me a joke
        </button>
        <button class="quick-action" data-message="Explain quantum physics">
          <i class="fas fa-atom"></i>
          Explain quantum physics
        </button>
        <button class="quick-action" data-message="Write a creative story">
          <i class="fas fa-pen-fancy"></i>
          Write a story
        </button>
      </div>
    </div>
  `;
  // Add the new chat to allChats
  const newChat = {
    id: currentChatId,
    title: 'New Chat',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  allChats.unshift(newChat);
  updateChatList();
}

function loadChat(chatId) {
  const chat = allChats.find(c => c.id === chatId);
  if (chat) {
    currentChatId = chatId;
    chatHistory = chat.messages;
    renderChatHistory();
    updateChatList();
  }
}

function saveCurrentChat() {
  if (!currentChatId || chatHistory.length === 0) return;
  const existingChatIndex = allChats.findIndex(c => c.id === currentChatId);
  const chatData = {
    id: currentChatId,
    title: generateChatTitle(),
    messages: [...chatHistory],
    createdAt: existingChatIndex === -1 ? new Date().toISOString() : allChats[existingChatIndex].createdAt,
    updatedAt: new Date().toISOString()
  };
  if (existingChatIndex === -1) {
    allChats.unshift(chatData);
  } else {
    allChats[existingChatIndex] = chatData;
  }
  updateChatList();
  localStorage.setItem('chats', JSON.stringify(allChats));
}

function loadAllChats() {
  const storedChats = localStorage.getItem('chats');
  if (storedChats) {
    allChats = JSON.parse(storedChats);
  }
  updateChatList();
}

function updateChatList() {
  chatList.innerHTML = '';
  allChats.forEach(chat => {
    const chatItem = document.createElement('div');
    chatItem.classList.add('chat-item');
    if (chat.id === currentChatId) chatItem.classList.add('active');
    chatItem.innerHTML = `
      <div class="chat-item-title">${chat.title}</div>
      <div class="chat-item-preview">${chat.messages[0]?.content || 'No messages'}</div>
      <div class="chat-item-time">${new Date(chat.updatedAt).toLocaleTimeString()}</div>
    `;
    chatItem.addEventListener('click', () => loadChat(chat.id));
    chatList.appendChild(chatItem);
  });
}

function renderChatHistory() {
  chatBox.innerHTML = '';
  chatHistory.forEach(message => {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', message.role === 'user' ? 'user-message' : 'bot-message');
    messageDiv.innerHTML = `
      <div class="message-avatar">
        <i class="fas fa-${message.role === 'user' ? 'user' : 'robot'}"></i>
      </div>
      <div class="message-content">
        ${message.content}
        <div class="message-time">${new Date().toLocaleTimeString()}</div>
      </div>
    `;
    chatBox.appendChild(messageDiv);
  });
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Utility Functions
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function generateChatTitle() {
  return chatHistory[0]?.content?.substring(0, 20) || 'New Chat';
}

function updateCharCount() {
  const count = userInput.value.length;
  charCount.textContent = `${count}/${MAX_CHARS}`;
  sendBtn.disabled = count > MAX_CHARS;
}

function autoResizeTextarea() {
  userInput.style.height = 'auto';
  userInput.style.height = `${userInput.scrollHeight}px`;
}

function toggleSidebar() {
  sidebar.classList.toggle('active');
  overlay.classList.toggle('active');
}

function closeSidebar() {
  sidebar.classList.remove('active');
  overlay.classList.remove('active');
}
// script.js
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const error = document.getElementById('error');

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
        });

        if (response.ok) {
            // Redirect to index.html after successful login
            window.location.href = '/index.html';
        } else {
            error.style.display = 'block';
        }
    } catch (err) {
        error.style.display = 'block';
        error.textContent = 'Error connecting to server';
    }
});