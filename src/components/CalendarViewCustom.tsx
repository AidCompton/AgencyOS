import React, { useState, useEffect } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameDay, 
  isToday, 
  isSameMonth, 
  subMonths, 
  addMonths, 
  parseISO 
} from 'date-fns';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  Check, 
  RefreshCw, 
  AlertCircle, 
  Trash2, 
  FileText, 
  CheckSquare, 
  Sliders,
  Sparkles,
  Link2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  end_date?: string;
  type?: string;
  description?: string;
}

interface Task {
  id: string;
  title: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'completed';
  category: string;
  brief?: string;
}

export default function CalendarViewCustom() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'day'>('month');
  
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  // Google connection status
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleUser, setGoogleUser] = useState<any>(null);

  // Quick event creation
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTime, setNewTime] = useState('10:00');
  const [saving, setSaving] = useState(false);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchGoogleStatus();
    loadAllData();
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

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [eventsRes, tasksRes] = await Promise.all([
        fetch('/api/integrations/calendar/events'),
        fetch('/api/tasks')
      ]);
      
      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.events || []);
      }
      
      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncGoogleCalendar = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/integrations/calendar/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        triggerBanner("Google Calendar events successfully synchronized!");
      }
    } catch (_) {
      triggerBanner("Google sync momentarily offline.");
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
          loadAllData();
          triggerBanner("Successfully authorized with Google Calendar!");
          window.removeEventListener('message', handleMessage);
        }
      };
      window.addEventListener('message', handleMessage);
    } catch (err) {
      alert('Google Workspace connection failed to initialize');
    }
  };

  const triggerBanner = (msg: string) => {
    setBannerMsg(msg);
    setTimeout(() => {
      setBannerMsg(null);
    }, 4000);
  };

  const handleCreateEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    setSaving(true);
    try {
      // Build ISO DateTime
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const fullIsoDate = `${dateStr}T${newTime}:00`;

      const res = await fetch('/api/integrations/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          date: fullIsoDate,
          description: newDesc
        })
      });

      if (res.ok) {
        setNewTitle('');
        setNewDesc('');
        setShowAddForm(false);
        triggerBanner("Event scheduled and synced successfully!");
        loadAllData();
      }
    } catch (_) {
      alert("Error scheduling event");
    } finally {
      setSaving(false);
    }
  };

  // Date parsing safely
  const parseEventDate = (dateStr: string): Date => {
    try {
      return parseISO(dateStr);
    } catch (_) {
      return new Date(dateStr);
    }
  };

  const checkEventOnDate = (date: Date, event: CalendarEvent) => {
    if (!event.date) return false;
    const evDate = parseEventDate(event.date);
    return isSameDay(evDate, date);
  };

  const checkTaskOnDate = (date: Date, task: Task) => {
    if (!task.due_date) return false;
    // tasks are usually yyyy-MM-dd
    try {
      const tDate = parseISO(task.due_date);
      return isSameDay(tDate, date);
    } catch (_) {
      return false;
    }
  };

  // Get items for selected or specific date
  const getEventsForDate = (date: Date) => {
    return events.filter(ev => checkEventOnDate(date, ev));
  };

  const getTasksForDate = (date: Date) => {
    return tasks.filter(t => checkTaskOnDate(date, t));
  };

  // Month navigation
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  // Build Calendar Month Cells
  const renderMonthGrid = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    const formattedWeekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
      <div key={d} className="text-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest py-3 border-b border-white/5">
        {d}
      </div>
    ));

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const dayEvents = getEventsForDate(cloneDay);
        const dayTasks = getTasksForDate(cloneDay);
        const isCurrentMonth = isSameMonth(cloneDay, currentMonth);
        const isSel = isSameDay(cloneDay, selectedDate);
        const isTodayDay = isToday(cloneDay);

        days.push(
          <div
            key={cloneDay.toString()}
            onClick={() => {
              setSelectedDate(cloneDay);
              setViewMode('day');
            }}
            className={`min-h-[110px] p-2 border-r border-b border-white/5 cursor-pointer flex flex-col justify-between transition-all relative group ${
              isCurrentMonth ? 'bg-zinc-900/40 text-white' : 'bg-zinc-950/20 text-zinc-600'
            } ${isSel ? 'bg-mint/5 border-mint/20' : 'hover:bg-white/[0.02]'} ${
              isTodayDay ? 'border-t border-t-mint/50' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${
                isTodayDay ? 'bg-mint text-deep-night px-2 py-0.5 rounded-full text-[10px]' : 
                isSel ? 'text-mint' : ''
              }`}>
                {format(cloneDay, 'd')}
              </span>
              
              {/* Event count badges */}
              <div className="flex gap-1">
                {dayEvents.length > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" title={`${dayEvents.length} Meetings`} />
                )}
                {dayTasks.length > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" title={`${dayTasks.length} Tasks`} />
                )}
              </div>
            </div>

            {/* Event Previews (Max 2) */}
            <div className="mt-2 space-y-1 flex-1 overflow-hidden">
              {dayEvents.slice(0, 2).map(ev => (
                <div key={ev.id} className="text-[9px] px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded font-medium truncate">
                  {ev.title}
                </div>
              ))}
              {dayTasks.slice(0, 1).map(t => (
                <div key={t.id} className="text-[9px] px-1.5 py-0.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 rounded font-medium truncate">
                  {t.title}
                </div>
              ))}
              {(dayEvents.length + dayTasks.length) > 3 && (
                <div className="text-[8px] text-zinc-500 text-right font-mono font-bold">
                  +{ (dayEvents.length + dayTasks.length) - 3 } more
                </div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7">
          {days}
        </div>
      );
      days = [];
    }

    return (
      <div className="border border-white/5 rounded-2xl bg-zinc-900/20 overflow-hidden backdrop-blur-md">
        <div className="grid grid-cols-7 bg-zinc-900/60 font-semibold text-zinc-300">
          {formattedWeekDays}
        </div>
        <div className="divide-y divide-white/5">
          {rows}
        </div>
      </div>
    );
  };

  const selectedDateEvents = getEventsForDate(selectedDate);
  const selectedDateTasks = getTasksForDate(selectedDate);

  return (
    <div className="space-y-6" id="calendar-workspace">
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

      {/* Synchronized Header with Connection Status */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/70 to-zinc-950 border border-white/5 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
            <Calendar className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-display text-white">Central Sync Calendar</h2>
            <p className="text-xs text-zinc-400 mt-1">
              {googleConnected 
                ? `Dynamically syncing meetings & invites from Google Calendar for ${googleUser?.email}`
                : "Synchronize your Google Workspace events and schedule meetings directly."
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-stretch md:self-auto">
          {googleConnected ? (
            <button 
              onClick={handleSyncGoogleCalendar}
              disabled={syncing}
              className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              Sync Google Calendar
            </button>
          ) : (
            <button 
              onClick={handleGoogleLogin}
              className="px-4 py-2 bg-mint text-deep-night hover:bg-mint-light rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
            >
              <Link2 className="w-3.5 h-3.5" />
              Link Google Calendar
            </button>
          )}
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* Month Calendar Component */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold font-display text-white">{format(currentMonth, 'MMMM yyyy')}</h3>
              <span className="text-[10px] uppercase font-bold text-mint bg-mint/10 border border-mint/20 px-2 py-0.5 rounded-md">Month View</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={prevMonth}
                className="p-1.5 border border-white/5 rounded-lg bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => {
                  setCurrentMonth(new Date());
                  setSelectedDate(new Date());
                }}
                className="px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-white border border-white/5 bg-zinc-900/40 rounded-lg hover:bg-zinc-800"
              >
                Today
              </button>
              <button 
                onClick={nextMonth}
                className="p-1.5 border border-white/5 rounded-lg bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {renderMonthGrid()}
        </div>

        {/* Selected Date Day Agenda Context */}
        <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 space-y-6 h-full flex flex-col justify-between min-h-[500px]">
          <div>
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <div>
                <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-widest block">Selected Agenda</span>
                <h4 className="text-lg font-bold text-white mt-1">{format(selectedDate, 'eeee, MMM d, yyyy')}</h4>
              </div>
              <button 
                onClick={() => setShowAddForm(!showAddForm)}
                className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-xl hover:bg-blue-500/20 hover:text-white transition-all"
                title="Schedule Meeting"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {showAddForm ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Add Meeting event</span>
                <form onSubmit={handleCreateEventSubmit} className="space-y-3">
                  <input 
                    type="text" 
                    placeholder="Meeting title" 
                    required 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none" 
                  />
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    <input 
                      type="time" 
                      required 
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="bg-white/5 border border-white/5 rounded-lg px-2 py-1 text-xs text-white focus:outline-none flex-1" 
                    />
                  </div>
                  <textarea 
                    placeholder="Details, objectives, or invite links..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-xs text-white focus:outline-none resize-none" 
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => setShowAddForm(false)}
                      className="flex-1 py-2 border border-white/5 rounded-lg text-xs font-bold text-zinc-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={saving}
                      className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-xs font-bold"
                    >
                      {saving ? "Scheduling..." : "Create Event"}
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
              <div className="space-y-6">
                
                {/* 1. Google calendar meetings listing */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    Calendar Meetings ({selectedDateEvents.length})
                  </span>
                  
                  {selectedDateEvents.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic py-2 pl-2">No meetings synchronized on this date.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedDateEvents.map(ev => {
                        const parsedTime = ev.date ? format(parseEventDate(ev.date), 'hh:mm a') : 'Anytime';
                        return (
                          <div key={ev.id} className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-blue-300">{parsedTime}</span>
                              <span className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded">Invite</span>
                            </div>
                            <h5 className="text-xs font-bold text-white">{ev.title}</h5>
                            {ev.description && <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">{ev.description}</p>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Tasks Due on this date */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                    Pending / Synced Tasks ({selectedDateTasks.length})
                  </span>
                  
                  {selectedDateTasks.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic py-2 pl-2">No deliverables due on this date.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedDateTasks.map(t => (
                        <div key={t.id} className="p-3 bg-zinc-900 border border-white/5 rounded-xl flex items-center justify-between gap-2.5">
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-white truncate">{t.title}</h5>
                            <span className="text-[10px] text-zinc-500">{t.category}</span>
                          </div>
                          <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                            t.priority === 'high' ? 'bg-red-400/10 text-red-400' :
                            t.priority === 'medium' ? 'bg-orange-400/10 text-orange-400' : 'bg-zinc-500/10 text-zinc-400'
                          }`}>
                            {t.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <span>Month/Day Agenda Synchronization Engine</span>
            <span className="text-mint">Active</span>
          </div>

        </div>

      </div>
    </div>
  );
}
