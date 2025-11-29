import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ChatInterface from './components/ChatInterface';
import KnowledgeBrowser from './components/KnowledgeBrowser';
import DocumentDrafter from './components/DocumentDrafter';
import { analyzeQuery, checkSafety } from './utils/legalBrain';
import { generateLegalReport } from './utils/reportGenerator';

function AppContent() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load sessions
  useEffect(() => {
    const savedSessions = localStorage.getItem('nyaya_sessions');
    if (savedSessions) {
      const parsedSessions = JSON.parse(savedSessions);
      setSessions(parsedSessions);
      if (parsedSessions.length > 0) {
        setCurrentSessionId(parsedSessions[0].id);
      } else {
        createNewSession();
      }
    } else {
      createNewSession();
    }
  }, []);

  // Save sessions
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('nyaya_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  const createNewSession = () => {
    const newSession = {
      id: Date.now().toString(),
      title: `Case File #${Math.floor(Math.random() * 1000)}`,
      date: new Date().toLocaleDateString(),
      messages: [{
        role: 'ai',
        content: "Namaste Aryan. I am NyayaSahayak, your AI Legal Counsel.\n\nI can assist you with:\n1. Constitutional Rights & Duties\n2. Criminal Law (BNS 2023)\n3. Cyber Law (IT Act 2000) & Safety (NIST)\n4. Filing FIRs and Legal Remedies\n\nHow may I help you today?",
        contextUsed: false
      }]
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    navigate('/'); // Go to chat
  };

  const getCurrentMessages = () => {
    const session = sessions.find(s => s.id === currentSessionId);
    return session ? session.messages : [];
  };

  const updateCurrentSessionMessages = (newMessages) => {
    setSessions(prev => prev.map(session =>
      session.id === currentSessionId
        ? { ...session, messages: newMessages }
        : session
    ));
  };

  const handleSendMessage = async (text) => {
    const currentMessages = getCurrentMessages();
    const newHistory = [...currentMessages, { role: 'user', content: text }];
    updateCurrentSessionMessages(newHistory);
    setIsTyping(true);

    // 1. Safety Check
    const safetyCheck = checkSafety(text);
    if (!safetyCheck.safe) {
      updateCurrentSessionMessages([...newHistory, { role: 'ai', content: safetyCheck.message, contextUsed: false }]);
      setIsTyping(false);
      return;
    }

    // 2. Analyze Query
    const analysis = await analyzeQuery(text, currentMessages);

    let responseContent = "";

    if (analysis.isCloud) {
      responseContent = analysis.results[0].text;
    } else if (analysis.results.length > 0) {
      const topResult = analysis.results[0];
      if (topResult.isExternal) {
        responseContent = `${topResult.text}\n\n${topResult.externalUrls.map(link => `• [${link.label}](${link.url})`).join('\n')}`;
      } else {
        responseContent = `Based on **${topResult.source}**, specifically **${topResult.section} (${topResult.title})**:\n\n"${topResult.text}"\n\n**LEGAL REMEDY:**\n${topResult.remedy}\n\n**RECOMMENDED STEPS:**\n${topResult.steps.map(step => `• ${step}`).join('\n')}`;
        if (topResult.evidence && topResult.evidence.length > 0) responseContent += `\n\n**EVIDENCE COLLECTION (HOW TO PROVE):**\n${topResult.evidence.map(e => `• ${e}`).join('\n')}`;
        if (topResult.caseLaws && topResult.caseLaws.length > 0) {
          responseContent += `\n\n**RELEVANT CASE LAWS:**\n${topResult.caseLaws.map(c => {
            const safeQuery = c.replace(/[()]/g, '');
            return `• [${c}](https://www.google.com/search?q=${encodeURIComponent(safeQuery + " supreme court judgment")})`;
          }).join('\n')}`;
        }
        if (analysis.results.length > 1 && !analysis.results[1].isExternal) responseContent += `\n\n**ALSO RELEVANT:**\nSee ${analysis.results[1].section} of ${analysis.results[1].source}.`;
        responseContent += `\n\n**FURTHER RESEARCH:**\n• [Google Search](https://www.google.com/search?q=${encodeURIComponent(text + " indian law")})\n• [India Code](https://www.indiacode.nic.in/)\n• [Constitution of India](https://legislative.gov.in/constitution-of-india/)`;
      }
    } else {
      responseContent = "I could not find a specific legal section in my current database matching your query. However, generally in Indian Law, you should document all evidence and approach the nearest police station or consult a lawyer for specific advice. \n\nWould you like me to search for something else?";
    }

    updateCurrentSessionMessages([...newHistory, { role: 'ai', content: responseContent, contextUsed: analysis.contextUsed }]);
    setIsTyping(false);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans selection:bg-orange-500/30">
      <Sidebar
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        setCurrentSessionId={(id) => { setCurrentSessionId(id); navigate('/'); }}
        startNewChat={createNewSession}
        // No longer passing setMode, Sidebar will use Links or we pass navigation functions
        navigate={navigate}
        currentPath={location.pathname}
      />

      <div className={`flex-1 flex flex-col transition-all duration-300 ${isMobile ? 'ml-0' : sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <Header
          currentMode={location.pathname === '/' ? 'chat' : location.pathname.substring(1)}
          handlePrintReport={() => generateLegalReport(getCurrentMessages())}
        />

        <main className="flex-1 overflow-hidden relative">
          <Routes>
            <Route path="/" element={
              <ChatInterface
                history={getCurrentMessages()}
                onSendMessage={handleSendMessage}
                isTyping={isTyping}
              />
            } />
            <Route path="/knowledge" element={
              <div className="h-full overflow-y-auto custom-scrollbar">
                <KnowledgeBrowser />
              </div>
            } />
            <Route path="/draft" element={
              <DocumentDrafter onBack={() => navigate('/')} />
            } />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
