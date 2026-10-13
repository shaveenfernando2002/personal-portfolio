
const CHAT_API_URL = '/api/chat';


const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add('is-visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));


const sections = ['about', 'projects', 'faq', 'contact']
  .map((id) => document.getElementById(id))
  .filter(Boolean);
const navLinks = document.querySelectorAll('[data-nav]');

const navObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      navLinks.forEach((l) => l.classList.toggle(
        'active',
        l.getAttribute('href') === '#' + e.target.id
      ));
    }
  });
}, { rootMargin: '-45% 0px -50% 0px' });
sections.forEach((s) => navObserver.observe(s));


document.querySelectorAll('.faq-item').forEach((item) => {
  item.querySelector('.faq-q').addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach((i) => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});


const chatToggle = document.getElementById('chat-toggle');
const chatPanel = document.getElementById('chat-panel');
const chatClose = document.getElementById('chat-close');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');
const chatSuggestions = document.getElementById('chat-suggestions');

let isSending = false;
let greeted = false;

function openChat() {
  chatPanel.classList.add('open');
  if (!greeted) {
    addMessage("Hi! I'm Shaveen's assistant. Ask me about his projects, skills, or the kind of role he's after.", 'bot');
    greeted = true;
  }
  chatInput.focus();
}
function closeChat() { chatPanel.classList.remove('open'); }

chatToggle.addEventListener('click', () => {
  chatPanel.classList.contains('open') ? closeChat() : openChat();
});
chatClose.addEventListener('click', closeChat);

function addMessage(text, who) {
  const div = document.createElement('div');
  div.className = 'msg ' + who;
  div.textContent = text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

function showTyping() {
  const div = document.createElement('div');
  div.className = 'msg bot';
  div.innerHTML = '<span class="typing"><span></span><span></span><span></span></span>';
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

async function sendMessage(text) {
  text = (text || '').trim();
  if (!text || isSending) return;

  addMessage(text, 'user');
  chatInput.value = '';
  isSending = true;
  chatSend.disabled = true;
  const typing = showTyping();

  try {
    const res = await fetch(CHAT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    });
    if (!res.ok) throw new Error('Bad response');
    const data = await res.json();
    typing.remove();
    addMessage(data.reply || "Sorry, I couldn't come up with an answer to that.", 'bot');
  } catch (err) {
    typing.remove();
    addMessage("I'm having trouble reaching the server right now. Try again in a moment, or reach Shaveen directly via the contact section.", 'bot');
  } finally {
    isSending = false;
    chatSend.disabled = false;
    chatInput.focus();
  }
}

chatSend.addEventListener('click', () => sendMessage(chatInput.value));
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage(chatInput.value);
});
chatSuggestions.querySelectorAll('button').forEach((btn) => {
  btn.addEventListener('click', () => sendMessage(btn.dataset.q));
});