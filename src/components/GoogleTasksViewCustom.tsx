import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  RefreshCw, 
  Check, 
  Plus, 
  Trash2, 
  ArrowUpRight, 
  Layers, 
  Calendar, 
  User, 
  Sparkles, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GoogleTask {
  id: string;
  title: string;
  due?: string;
  notes?: string;
}

interface LocalTask {
  id: string;
  title: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'completed';
  category: string;
  brief?: string;
}

export default function GoogleTasksViewCustom() {
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleUser, setGoogleUser] = useState<any>(null);
  
  const [googleTasks, setGoogleTasks] = useState<GoogleTask[]>([]);
  const [localTasks, setLocalTasks] = useState<LocalTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  const [pushingTaskId, setPushingTaskId] = useState<string | null>(null);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchGoogleStatus();
    loadTasksData();
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

  const loadTasksData = async () => {
    setLoading(true);
    try {
      const [gTasksRes, localTasksRes] = await Promise.all([
        fetch('/api/integrations/tasks'),
        fetch('/api/tasks')
      ]);

      if (gTasksRes.ok) {
        const data = await gTasksRes.json();
        setGoogleTasks(data.tasks || []);
      }

      if (localTasksRes.ok) {
        const data = await localTasksRes.json();
        // filter out already checked off or keep all
        setLocalTasks(data || []);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  const handleSyncTasks = async () => {
    setSyncing(true);
    try {
      await loadTasksData();
      triggerBanner("Google Tasks lists successfully synchronized!");
    } catch (_) {
      triggerBanner("Workspace integration operating offline.");
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
          loadTasksData();
          triggerBanner("Authorized Google Tasks Client!");
          window.removeEventListener('message', handleMessage);
        }
      };
      window.addEventListener('message', handleMessage);
    } catch (err) {
      alert('Google Workspace connection failed to initialize');
    }
  };

  const handlePushToGoogle = async (taskId: string) => {
    setPushingTaskId(taskId);
    try {
      const res = await fetch('/api/integrations/tasks/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      });

      if (res.ok) {
        triggerBanner("Deliverable successfully synchronized with Google Tasks!");
        loadTasksData();
      }
    } catch (_) {
      alert("Error syncing database task");
    } finally {
      setPushingTaskId(null);
    }
  };

  const triggerBanner = (msg: string) => {
    setBannerMsg(msg);
    setTimeout(() => {
      setBannerMsg(null);
    }, 4000);
  };

  return (
    <div className="space-y-6" id="google-tasks-workspace">
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
          <div className="p-3 bg-yellow-500/10 rounded-2xl text-yellow-400">
            <CheckSquare className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-display text-white">Google Tasks Integration</h2>
            <p className="text-xs text-zinc-400 mt-1">
              {googleConnected 
                ? `Authorized as ${googleUser?.email}. Synced to your Google Tasks lists.`
                : "Authorize Google Tasks to synchronize client deliverables, deadlines, and milestones automatically."
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {googleConnected ? (
            <button 
              onClick={handleSyncTasks}
              disabled={syncing}
              className="px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 border border-yellow-500/20 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              Sync Tasks List
            </button>
          ) : (
            <button 
              onClick={handleGoogleLogin}
              className="px-4 py-2 bg-mint text-deep-night hover:bg-mint-light rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Connect Tasks API
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Google Synced Tasks */}
        <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 flex flex-col h-[550px]">
          <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
            <div>
              <h3 className="text-base font-bold text-white font-display">Synced Google Tasks</h3>
              <p className="text-xs text-zinc-500">Currently residing in your Google Default List</p>
            </div>
            <span className="text-[10px] uppercase font-bold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-lg border border-yellow-500/20">
              {googleTasks.length} tasks
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-zinc-600" />
              </div>
            ) : googleTasks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-500">
                <CheckSquare className="w-12 h-12 stroke-[1.5] text-zinc-600 mb-2" />
                <p className="text-xs">No tasks synchronized. Link Google Account or refresh.</p>
              </div>
            ) : (
              googleTasks.map(task => (
                <div key={task.id} className="p-4 bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-2xl transition-all flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-4 h-4 rounded-full border border-yellow-500/40 hover:border-yellow-500 flex-shrink-0 flex items-center justify-center text-yellow-400 mt-0.5">
                      <Check className="w-2.5 h-2.5 stroke-[4px]" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white block leading-snug">{task.title}</span>
                      {task.notes && <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{task.notes}</p>}
                    </div>
                  </div>
                  {task.due && (
                    <span className="text-[9px] font-mono text-yellow-400 bg-yellow-500/5 border border-yellow-500/10 px-2 py-0.5 rounded-md flex-shrink-0">
                      Due {task.due}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* AgencyOS Local Deliverables */}
        <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 flex flex-col h-[550px]">
          <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
            <div>
              <h3 className="text-base font-bold text-white font-display">AgencyOS Deliverables</h3>
              <p className="text-xs text-zinc-500">Local tasks assignable & syncable with Google</p>
            </div>
            <span className="text-[10px] uppercase font-bold text-mint bg-mint/10 px-2 py-0.5 rounded-lg border border-mint/20">
              {localTasks.filter(t => t.status !== 'completed').length} pending
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-zinc-600" />
              </div>
            ) : localTasks.length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-4">No local agency deliverables active.</p>
            ) : (
              localTasks.filter(t => t.status !== 'completed').map(task => (
                <div key={task.id} className="p-4 bg-white/[0.01] border border-white/5 hover:border-white/10 rounded-2xl transition-all flex items-center justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] uppercase font-mono font-bold tracking-wider text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                        {task.category}
                      </span>
                      <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        task.priority === 'high' ? 'bg-red-400/10 text-red-300' :
                        task.priority === 'medium' ? 'bg-orange-400/10 text-orange-300' : 'bg-zinc-500/10 text-zinc-400'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white leading-snug">{task.title}</h4>
                    {task.brief && <p className="text-[11px] text-zinc-400 line-clamp-1">{task.brief}</p>}
                    {task.due_date && (
                      <span className="text-[10px] text-zinc-500 block">
                        Due {task.due_date}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handlePushToGoogle(task.id)}
                    disabled={pushingTaskId === task.id || !googleConnected}
                    className="px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-300 hover:text-deep-night border border-yellow-500/20 hover:border-transparent rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all flex-shrink-0 disabled:opacity-40"
                    title={googleConnected ? "Sync to Google Tasks" : "Activate Google connection to sync"}
                  >
                    {pushingTaskId === task.id ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <ArrowUpRight className="w-3 h-3" />
                    )}
                    Push
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
