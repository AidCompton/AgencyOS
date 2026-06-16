import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  Check, 
  RefreshCw, 
  Trash2, 
  User, 
  Plus, 
  ArrowUpRight, 
  Globe, 
  Paperclip,
  CheckSquare,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GmailMessage {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  label: string;
}

export default function GmailViewCustom() {
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleUser, setGoogleUser] = useState<any>(null);
  
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  // Compose email state
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchGoogleStatus();
    loadGmailMessages();
  }, []);

  const fetchGoogleStatus = async () => {
    try {
      const res = await fetch('/api/integrations/google/status');
      if (res.ok) {
        const data = await res.json();
        setGoogleConnected(data.connected);
        if (data.connected) {
          setGoogleUser(data);
        }
      }
    } catch (_) {}
  };

  const loadGmailMessages = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/integrations/gmail/messages');
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  const handleSyncGmail = async () => {
    setSyncing(true);
    try {
      await loadGmailMessages();
      triggerBanner("Gmail messages successfully synced!");
    } catch (_) {
      triggerBanner("Gmail integration is operating offline.");
    } finally {
      setSyncing(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      const { url } = await res.json();
      const authWindow = window.open(url, 'google_oauth', 'width=600,height=700');
      
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
          fetchGoogleStatus();
          loadGmailMessages();
          triggerBanner("Successfully authorized with Gmail Workspace!");
          window.removeEventListener('message', handleMessage);
        }
      };
      window.addEventListener('message', handleMessage);
    } catch (err) {
      alert('Google Workspace connection failed to initialize');
    }
  };

  const handleSendEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailTo || !emailSubject || !emailBody) return;

    setSending(true);
    try {
      const res = await fetch('/api/integrations/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailTo,
          subject: emailSubject,
          body: emailBody
        })
      });

      if (res.ok) {
        setSendSuccess(true);
        setEmailSubject('');
        setEmailBody('');
        triggerBanner("Outreach message dispatched via Gmail API!");
        setTimeout(() => {
          setSendSuccess(false);
        }, 5000);
      }
    } catch (_) {
      alert("Error dispatching email");
    } finally {
      setSending(false);
    }
  };

  const triggerBanner = (msg: string) => {
    setBannerMsg(msg);
    setTimeout(() => {
      setBannerMsg(null);
    }, 4000);
  };

  return (
    <div className="space-y-6 animate-fadeIn" id="gmail-sync-workspace">
      {/* Dynamic Banner Indicator */}
      <AnimatePresence>
        {bannerMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-[120] bg-mint text-deep-night px-6 py-4 rounded-2xl shadow-xl font-bold flex items-center gap-3 text-sm"
          >
            <Check className="w-5 h-5 stroke-[3px]" />
            {bannerMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Connection Status Card */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/70 to-zinc-950 border border-white/5 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-500/10 rounded-2xl text-red-400">
            <Mail className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-display text-white">Gmail Communications Portal</h2>
            <p className="text-xs text-zinc-400 mt-1">
              {googleConnected 
                ? `Authorized as ${googleUser?.email}. Synced with client communications outbox.`
                : "Authorize Gmail to send high-fidelity client updates and sync communication archives."
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {googleConnected ? (
            <button 
              onClick={handleSyncGmail}
              disabled={syncing}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              Sync Gmail Inbox
            </button>
          ) : (
            <button 
              onClick={handleGoogleLogin}
              className="px-4 py-2 bg-mint text-deep-night hover:bg-mint-light rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
            >
              <Globe className="w-3.5 h-3.5" />
              Connect Gmail API
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Sync Inbox Reader */}
        <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 flex flex-col h-[600px]">
          <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
            <div>
              <h3 className="text-base font-bold text-white font-display">Communication Log</h3>
              <p className="text-xs text-zinc-500">Live Client Inbox Feed</p>
            </div>
            
            <span className="text-[10px] uppercase font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-lg border border-red-500/20">
              {messages.length} messages
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-zinc-600" />
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500">
                <Mail className="w-12 h-12 stroke-[1.5] mb-2 text-zinc-600" />
                <p className="text-xs">No email conversation history found. Click sync to retrieve.</p>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className="p-4 bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-2xl transition-all space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <span className="text-xs font-extrabold text-white block truncate">{msg.from.split(" <")[0]}</span>
                      <span className="text-[9px] text-zinc-500 block truncate">{msg.from.includes("<") ? msg.from.split("<")[1].replace(">", "") : ""}</span>
                    </div>
                    <span className="text-[9px] font-mono text-zinc-500 bg-zinc-850 px-2 py-0.5 rounded-md">
                      {new Date(msg.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-zinc-200">{msg.subject}</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">{msg.snippet}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Compose Outreach */}
        <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 flex flex-col h-[600px] justify-between">
          <div className="space-y-4 flex-1 flex flex-col">
            <div className="pb-4 border-b border-white/5">
              <h3 className="text-base font-bold text-white font-display">Compose Direct Client Outreach</h3>
              <p className="text-xs text-zinc-500">Sent directly using your Workspace account profile</p>
            </div>

            <form onSubmit={handleSendEmailSubmit} className="space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Recipient Email</label>
                  <input 
                    type="email" 
                    placeholder="e.g. client-ceo@techflow.com" 
                    required
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Subject Line</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Retainer Q3 Deliverables Status" 
                    required
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/20"
                  />
                </div>

                <div className="space-y-1.5 flex-1 flex flex-col">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Email Body Message</label>
                  <textarea 
                    placeholder="Provide professional project feedback, task sign-offs, or deliverables breakdown..." 
                    required
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="w-full flex-1 bg-white/5 border border-white/5 rounded-xl p-4 text-xs text-white focus:outline-none resize-none focus:border-red-500/20"
                    rows={10}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                {sendSuccess ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-2 animate-bounce">
                    <Check className="w-4 h-4 stroke-[3]" />
                    Outbox Synced: Message Successfully Dispatched!
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={sending || !emailTo}
                    className="w-full py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                  >
                    {sending ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Disbursing email...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Dispatch Outreach Log
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

      </div>

    </div>
  );
}
