import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  TrendingUp, 
  Settings, 
  Plus, 
  Search, 
  Bell,
  ChevronRight,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  Heart,
  Zap,
  Target,
  BarChart3,
  PieChart,
  ShieldAlert,
  FileText,
  Activity,
  DollarSign,
  History,
  ExternalLink,
  Check,
  Globe,
  Upload,
  Megaphone,
  Flag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  ComposedChart,
  ReferenceLine
} from 'recharts';
import { cn } from './lib/utils';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday
} from 'date-fns';
import { AgencyOverview, Lead, Client, Campaign, CampaignMetric, Task, CalendarEvent, TeamMember, Retainer, Service, TimeEntry, Contract } from './types';

// --- Components ---

const ClientCalendar = ({ events, onDateClick }: { events: CalendarEvent[], onDateClick: (date: Date) => void }) => {
  const [currentDate, setCurrentDate] = useState(new Date('2026-03-05'));
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold font-display text-white">
          {format(currentDate, 'MMMM yyyy')}
        </h3>
        <div className="flex gap-2">
          <button 
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 text-zinc-500 hover:text-white transition-colors bg-white/5 rounded-lg"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <button 
            onClick={() => setCurrentDate(new Date('2026-03-05'))}
            className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors bg-white/5 rounded-lg"
          >
            Today
          </button>
          <button 
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 text-zinc-500 hover:text-white transition-colors bg-white/5 rounded-lg"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-px bg-white/5 border border-white/5 rounded-xl overflow-hidden">
        {weekDays.map((day, i) => (
          <div key={`${day}-${i}`} className="bg-white/[0.02] py-3 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            {day}
          </div>
        ))}
        
        {calendarDays.map((day, i) => {
          const dayEvents = events.filter(e => {
            const start = new Date(e.date);
            const end = e.end_date ? new Date(e.end_date) : start;
            return isSameDay(day, start) || (day >= start && day <= end);
          });
          
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isTodayDate = isToday(day);
          
          return (
            <div 
              key={i} 
              onClick={() => onDateClick(day)}
              className={cn(
                "min-h-[100px] p-2 bg-deep-night/40 transition-all cursor-pointer hover:bg-white/5 relative group",
                !isCurrentMonth && "opacity-20",
                isTodayDate && "bg-mint/5"
              )}
            >
              <div className="flex justify-between items-start">
                <span className={cn(
                  "text-xs font-bold",
                  isTodayDate ? "text-mint" : "text-zinc-500",
                  !isCurrentMonth && "text-zinc-700"
                )}>
                  {format(day, 'd')}
                </span>
                {isTodayDate && (
                  <div className="w-1 h-1 bg-mint rounded-full shadow-[0_0_10px_#4EFFA8]" />
                )}
              </div>
              
              <div className="mt-2 space-y-1">
                {dayEvents.slice(0, 3).map(event => (
                  <div 
                    key={event.id}
                    className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded-sm font-bold truncate",
                      event.type === 'meeting' || event.type === 'client_meeting' ? "bg-mint/20 text-mint" :
                      event.type === 'upload' ? "bg-sky/20 text-sky" :
                      event.type === 'deadline' ? "bg-rose-400/20 text-rose-400" :
                      event.type === 'campaign' || event.type === 'campaign_launch' ? "bg-orange-400/20 text-orange-400" :
                      "bg-zinc-500/20 text-zinc-500"
                    )}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[8px] text-zinc-600 font-bold pl-1">
                    + {dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ClientDetailView: React.FC<{ 
  client: Client, 
  onBack: () => void,
  activeTimer: any,
  setActiveTimer: any,
  elapsedSeconds: number,
  formatTime: (s: number) => string
}> = ({ client, onBack, activeTimer, setActiveTimer, elapsedSeconds, formatTime }) => {
  const [retainer, setRetainer] = useState<Retainer | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogTime, setShowLogTime] = useState(false);
  const [showTimerSetup, setShowTimerSetup] = useState(false);
  const [showScheduleEvent, setShowScheduleEvent] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const [logTimeData, setLogTimeData] = useState({
    service_id: '',
    hours: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const [timerSetupData, setTimerSetupData] = useState({
    service_id: '',
    description: ''
  });

  const [eventData, setEventData] = useState({
    title: '',
    type: 'meeting' as CalendarEvent['type'],
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    end_date: ''
  });

  const handleStartTimer = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveTimer({
      startTime: Date.now(),
      service_id: timerSetupData.service_id,
      description: timerSetupData.description,
      client_id: client.id,
      client_name: client.name
    });
    setShowTimerSetup(false);
    setTimerSetupData({ service_id: '', description: '' });
  };

  const handleStopTimer = () => {
    if (!activeTimer) return;
    const hours = (elapsedSeconds / 3600).toFixed(2);
    setLogTimeData({
      service_id: activeTimer.service_id,
      hours: hours,
      description: activeTimer.description,
      date: format(new Date(), 'yyyy-MM-dd')
    });
    setActiveTimer(null);
    setShowLogTime(true);
  };

  const fetchData = async () => {
    try {
      const [retRes, servRes, timeRes, contRes, eventRes] = await Promise.all([
        fetch(`/api/clients/${client.id}/retainer`),
        fetch(`/api/clients/${client.id}/services`),
        fetch(`/api/clients/${client.id}/time-entries`),
        fetch(`/api/clients/${client.id}/contracts`),
        fetch(`/api/events?client_id=${client.id}`)
      ]);

      setRetainer(await retRes.json());
      setServices(await servRes.json());
      setTimeEntries(await timeRes.json());
      setContracts(await contRes.json());
      setEvents(await eventRes.json());
    } catch (err) {
      console.error("Failed to fetch client details", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [client.id]);

  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...logTimeData,
          client_id: client.id,
          user_id: 'user_1', // Mock current user
          hours: parseFloat(logTimeData.hours)
        })
      });

      if (res.ok) {
        setShowLogTime(false);
        setLogTimeData({ service_id: '', hours: '', description: '', date: format(new Date(), 'yyyy-MM-dd') });
        fetchData();
      }
    } catch (err) {
      console.error("Failed to log time", err);
    }
  };

  const handleScheduleEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...eventData,
          client_id: client.id,
          agency_id: 'agency_1'
        })
      });

      if (res.ok) {
        setShowScheduleEvent(false);
        setEventData({ title: '', type: 'meeting', description: '', date: format(new Date(), 'yyyy-MM-dd'), end_date: '' });
        fetchData();
      }
    } catch (err) {
      console.error("Failed to schedule event", err);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-white/5 border-t-mint rounded-full animate-spin"></div>
    </div>
  );

  const totalUsedHours = services.reduce((acc, s) => acc + (s.used_hours || 0), 0);
  const totalAllocatedHours = retainer?.total_hours || 0;
  const usagePercent = totalAllocatedHours > 0 ? (totalUsedHours / totalAllocatedHours) * 100 : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 text-zinc-500 hover:text-white transition-colors bg-white/5 rounded-xl">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-display">{client.name}</h2>
            <p className="text-sm text-zinc-500 mt-1 font-medium">Retainer & Service Management</p>
          </div>
        </div>
        <div className="flex gap-3">
          {activeTimer && activeTimer.client_id === client.id ? (
            <div className="flex items-center gap-4 px-4 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl animate-pulse">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Timer Running</span>
                <span className="text-lg font-mono font-bold text-white">{formatTime(elapsedSeconds)}</span>
              </div>
              <button 
                onClick={handleStopTimer}
                className="p-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
              >
                <Clock className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowTimerSetup(true)}
              className="flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-widest text-deep-night bg-sky rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(56,212,245,0.2)]"
            >
              <Zap className="w-4 h-4" />
              Start Timer
            </button>
          )}
          <button 
            onClick={() => setShowLogTime(true)}
            className="flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-widest text-deep-night bg-mint rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(78,255,168,0.2)]"
          >
            <Clock className="w-4 h-4" />
            Log Time
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          {/* Retainer Usage Graph */}
          <div className="p-8 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold font-display">Retainer Utilization</h3>
                <p className="text-xs text-zinc-500 mt-1">Hours used vs. allocated this period</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{totalUsedHours.toFixed(1)} / {totalAllocatedHours}h</p>
                <p className={cn(
                  "text-[10px] font-bold uppercase tracking-widest mt-1",
                  usagePercent > 100 ? "text-rose-400" : "text-mint"
                )}>
                  {usagePercent > 100 ? `Overage: ${(totalUsedHours - totalAllocatedHours).toFixed(1)}h` : `${(totalAllocatedHours - totalUsedHours).toFixed(1)}h remaining`}
                </p>
              </div>
            </div>

            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={services} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#71717a', fontWeight: 600}} width={120} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                    contentStyle={{ backgroundColor: '#0A0F0D', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                  <Bar dataKey="allocated_hours" fill="rgba(255,255,255,0.05)" radius={[0, 4, 4, 0]} barSize={20} />
                  <Bar dataKey="used_hours" fill="#4EFFA8" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Individual Services & Projects */}
          <div className="p-8 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
            <h3 className="text-xl font-bold font-display mb-8">Retainer Services</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map(service => (
                <div key={service.id} className="p-5 bg-white/[0.02] border border-white/5 rounded-xl hover:border-mint/30 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-white font-display">{service.name}</h4>
                    <Activity className="w-4 h-4 text-mint" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      <span>Utilization</span>
                      <span className={cn(
                        (service.used_hours || 0) > service.allocated_hours ? "text-rose-400" : "text-white"
                      )}>
                        {((service.used_hours || 0) / service.allocated_hours * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          (service.used_hours || 0) > service.allocated_hours ? "bg-rose-400" : "bg-mint"
                        )}
                        style={{ width: `${Math.min(100, ((service.used_hours || 0) / service.allocated_hours * 100))}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-600">Used: <span className="text-white font-bold">{(service.used_hours || 0).toFixed(1)}h</span></span>
                      <span className="text-zinc-600">Allocated: <span className="text-white font-bold">{service.allocated_hours}h</span></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Time Entries */}
          <div className="p-8 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold font-display">Recent Activity</h3>
              <History className="w-5 h-5 text-zinc-600" />
            </div>
            <div className="space-y-4">
              {timeEntries.map(entry => (
                <div key={entry.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl group hover:border-mint/20 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-deep-teal/20 flex items-center justify-center text-mint font-bold text-xs">
                      {entry.hours}h
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{entry.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">{entry.service_name}</span>
                        <span className="text-zinc-700 text-[9px]">•</span>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">{entry.date}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Logged by</p>
                    <p className="text-xs font-bold text-white">{entry.user_name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Client Calendar */}
          <div className="p-8 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold font-display">Client Calendar</h3>
                <p className="text-xs text-zinc-500 mt-1">Important dates, meetings, and campaigns</p>
              </div>
              <button 
                onClick={() => {
                  setEventData({ ...eventData, date: format(new Date(), 'yyyy-MM-dd') });
                  setShowScheduleEvent(true);
                }}
                className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-deep-night bg-mint rounded-lg hover:scale-105 transition-all"
              >
                <Plus className="w-3 h-3" />
                Schedule
              </button>
            </div>
            <ClientCalendar 
              events={events} 
              onDateClick={(date) => {
                setSelectedDate(date);
                setEventData({ ...eventData, date: format(date, 'yyyy-MM-dd') });
              }} 
            />
            
            {selectedDate && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 p-6 bg-white/[0.02] border border-white/5 rounded-xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-white font-display">
                    {format(selectedDate, 'MMMM d, yyyy')}
                  </h4>
                  <button 
                    onClick={() => setShowScheduleEvent(true)}
                    className="text-[10px] font-bold text-mint uppercase tracking-widest hover:underline"
                  >
                    + Add Event
                  </button>
                </div>
                <div className="space-y-3">
                  {events.filter(e => {
                    const start = new Date(e.date);
                    const end = e.end_date ? new Date(e.end_date) : start;
                    return selectedDate >= start && selectedDate <= end;
                  }).length > 0 ? (
                    events.filter(e => {
                      const start = new Date(e.date);
                      const end = e.end_date ? new Date(e.end_date) : start;
                      return selectedDate >= start && selectedDate <= end;
                    }).map(event => (
                      <div key={event.id} className="flex items-start gap-4 p-3 bg-white/5 rounded-lg border border-white/5 group">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                          event.type === 'meeting' || event.type === 'client_meeting' ? "bg-mint/10 text-mint" :
                          event.type === 'upload' ? "bg-sky/10 text-sky" :
                          event.type === 'deadline' ? "bg-rose-400/10 text-rose-400" :
                          event.type === 'campaign' || event.type === 'campaign_launch' ? "bg-orange-400/10 text-orange-400" :
                          "bg-zinc-500/10 text-zinc-500"
                        )}>
                          {event.type === 'meeting' || event.type === 'client_meeting' ? <Users className="w-5 h-5" /> :
                           event.type === 'upload' ? <Upload className="w-5 h-5" /> :
                           event.type === 'deadline' ? <Flag className="w-5 h-5" /> :
                           event.type === 'campaign' || event.type === 'campaign_launch' ? <Megaphone className="w-5 h-5" /> :
                           <Calendar className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-white">{event.title}</p>
                            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">{event.type.replace('_', ' ')}</span>
                          </div>
                          {event.description && <p className="text-xs text-zinc-500 mt-1">{event.description}</p>}
                          {event.end_date && (
                            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-2">
                              Ends {format(new Date(event.end_date), 'MMM d')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-zinc-600 italic py-4 text-center">No events scheduled for this day.</p>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {/* Retainer Summary */}
          <div className="p-8 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
            <h3 className="text-xl font-bold font-display mb-8">Retainer Summary</h3>
            <div className="space-y-6">
              <div className="p-4 bg-mint/5 border border-mint/10 rounded-xl">
                <p className="text-[10px] font-bold text-mint uppercase tracking-widest">Monthly Retainer</p>
                <p className="text-3xl font-bold text-white mt-1">${retainer?.amount.toLocaleString()}</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Billing Cycle</span>
                  <span className="text-xs font-bold text-white uppercase">{retainer?.billing_cycle}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Next Invoice</span>
                  <span className="text-xs font-bold text-white">{retainer?.next_invoice_date}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Status</span>
                  <span className="px-2 py-0.5 bg-mint/10 text-mint text-[9px] font-bold rounded uppercase">{retainer?.status}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Linked Contracts */}
          <div className="p-8 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold font-display">Contracts</h3>
              <FileText className="w-5 h-5 text-zinc-600" />
            </div>
            <div className="space-y-4">
              {contracts.map(contract => (
                <div key={contract.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:border-sky/30 transition-all cursor-pointer group">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-sky transition-colors">{contract.title}</h4>
                      <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-1">Signed {contract.signed_at.split(' ')[0]}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-zinc-700 group-hover:text-sky" />
                  </div>
                </div>
              ))}
              <button className="w-full py-3 text-[10px] font-bold uppercase tracking-widest border border-dashed border-white/10 rounded-xl hover:bg-white/5 transition-all text-zinc-600 hover:text-white">
                Upload New Contract
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Timer Setup Modal */}
      <AnimatePresence>
        {showTimerSetup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-deep-night/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-deep-night border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-sky/20 flex items-center justify-center text-sky">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold font-display">Start Timer</h3>
              </div>
              <form onSubmit={handleStartTimer} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Service</label>
                  <select 
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky/20 appearance-none"
                    value={timerSetupData.service_id}
                    onChange={e => setTimerSetupData({ ...timerSetupData, service_id: e.target.value })}
                  >
                    <option value="" className="bg-deep-night">Select a service</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id} className="bg-deep-night">{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Task Description</label>
                  <textarea 
                    required
                    placeholder="What are you about to work on?"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky/20 h-24 resize-none"
                    value={timerSetupData.description}
                    onChange={e => setTimerSetupData({ ...timerSetupData, description: e.target.value })}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowTimerSetup(false)}
                    className="flex-1 py-3 text-xs font-bold uppercase tracking-widest border border-white/10 rounded-xl hover:bg-white/5 transition-all text-zinc-500"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 text-xs font-bold uppercase tracking-widest bg-sky text-deep-night rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(56,212,245,0.2)]"
                  >
                    Start Working
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Log Time Modal */}
      <AnimatePresence>
        {showLogTime && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-deep-night/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-deep-night border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-bold font-display mb-6">Log Time</h3>
              <form onSubmit={handleLogTime} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Service</label>
                  <select 
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-mint/20 appearance-none"
                    value={logTimeData.service_id}
                    onChange={e => setLogTimeData({ ...logTimeData, service_id: e.target.value })}
                  >
                    <option value="" className="bg-deep-night">Select a service</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id} className="bg-deep-night">{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Hours</label>
                    <input 
                      required
                      type="number" 
                      step="0.5"
                      placeholder="0.0"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-mint/20"
                      value={logTimeData.hours}
                      onChange={e => setLogTimeData({ ...logTimeData, hours: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Date</label>
                    <input 
                      required
                      type="date" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-mint/20"
                      value={logTimeData.date}
                      onChange={e => setLogTimeData({ ...logTimeData, date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Description</label>
                  <textarea 
                    required
                    placeholder="What did you work on?"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-mint/20 h-24 resize-none"
                    value={logTimeData.description}
                    onChange={e => setLogTimeData({ ...logTimeData, description: e.target.value })}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowLogTime(false)}
                    className="flex-1 py-3 text-xs font-bold uppercase tracking-widest border border-white/10 rounded-xl hover:bg-white/5 transition-all text-zinc-500"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 text-xs font-bold uppercase tracking-widest bg-mint text-deep-night rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(78,255,168,0.2)]"
                  >
                    Confirm
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Schedule Event Modal */}
      <AnimatePresence>
        {showScheduleEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-deep-night/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-deep-night border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-mint/20 flex items-center justify-center text-mint">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold font-display">Schedule Event</h3>
              </div>
              <form onSubmit={handleScheduleEvent} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Event Title</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Meeting with client, Campaign Launch, etc."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-mint/20"
                    value={eventData.title}
                    onChange={e => setEventData({ ...eventData, title: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Type</label>
                    <select 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-mint/20 appearance-none"
                      value={eventData.type}
                      onChange={e => setEventData({ ...eventData, type: e.target.value as any })}
                    >
                      <option value="meeting" className="bg-deep-night">Meeting</option>
                      <option value="upload" className="bg-deep-night">Upload</option>
                      <option value="deadline" className="bg-deep-night">Deadline</option>
                      <option value="campaign" className="bg-deep-night">Campaign</option>
                      <option value="internal" className="bg-deep-night">Internal</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Start Date</label>
                    <input 
                      required
                      type="date" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-mint/20"
                      value={eventData.date}
                      onChange={e => setEventData({ ...eventData, date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">End Date (Optional for multi-day)</label>
                  <input 
                    type="date" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-mint/20"
                    value={eventData.end_date}
                    onChange={e => setEventData({ ...eventData, end_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Description</label>
                  <textarea 
                    placeholder="Additional details..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-mint/20 h-24 resize-none"
                    value={eventData.description}
                    onChange={e => setEventData({ ...eventData, description: e.target.value })}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowScheduleEvent(false)}
                    className="flex-1 py-3 text-xs font-bold uppercase tracking-widest border border-white/10 rounded-xl hover:bg-white/5 transition-all text-zinc-500"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 text-xs font-bold uppercase tracking-widest bg-mint text-deep-night rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(78,255,168,0.2)]"
                  >
                    Schedule
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TaskDetailModal: React.FC<{ task: Task, onClose: () => void, onUpdate: () => void }> = ({ task, onClose, onUpdate }) => {
  const [brief, setBrief] = useState(task.brief || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveBrief = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief })
      });
      if (res.ok) {
        onUpdate();
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const today = new Date('2026-03-05');
  const internal = task.internal_deadline ? new Date(task.internal_deadline) : null;
  const external = task.external_deadline ? new Date(task.external_deadline) : null;
  const completed = task.completed_at ? new Date(task.completed_at) : null;

  let status = 'On Track';
  let statusColor = 'text-mint';
  let statusBg = 'bg-mint/10';

  if (completed) {
    if (external && completed > external) {
      status = 'Behind External';
      statusColor = 'text-rose-400';
      statusBg = 'bg-rose-400/10';
    } else if (internal && completed > internal) {
      status = 'Behind Internal';
      statusColor = 'text-orange-400';
      statusBg = 'bg-orange-400/10';
    } else {
      status = 'Completed On Time';
      statusColor = 'text-mint';
      statusBg = 'bg-mint/10';
    }
  } else {
    if (external && today > external) {
      status = 'Behind External';
      statusColor = 'text-rose-400';
      statusBg = 'bg-rose-400/10';
    } else if (internal && today > internal) {
      status = 'Behind Internal';
      statusColor = 'text-orange-400';
      statusBg = 'bg-orange-400/10';
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-deep-night/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-deep-night border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden relative"
      >
        <div className="flex items-center justify-between mb-8">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-mint/20 flex items-center justify-center text-mint">
               <FileText className="w-6 h-6" />
             </div>
             <div>
               <h3 className="text-2xl font-bold font-display">{task.title}</h3>
               <p className="text-xs text-zinc-500 mt-1 font-medium">{task.category || 'General'} • {task.priority} priority</p>
             </div>
           </div>
           <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors bg-white/5 rounded-xl">
             <ChevronRight className="w-4 h-4 rotate-180" />
           </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Timeline Status</p>
              <div className={cn("inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold font-display", statusBg, statusColor)}>
                {status}
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Internal Deadline</span>
                  <span className="text-sm font-bold text-white mt-1">{task.internal_deadline || 'Not set'}</span>
                </div>
                <Calendar className="w-4 h-4 text-zinc-600" />
              </div>
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">External Deadline</span>
                  <span className="text-sm font-bold text-white mt-1">{task.external_deadline || 'Not set'}</span>
                </div>
                <Globe className="w-4 h-4 text-zinc-600" />
              </div>
              {task.completed_at && (
                <div className="flex items-center justify-between p-4 bg-mint/5 rounded-xl border border-mint/10">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-mint uppercase tracking-widest">Completed At</span>
                    <span className="text-sm font-bold text-mint mt-1">{task.completed_at.split(' ')[0]}</span>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-mint" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 flex flex-col">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Task Brief</p>
            <textarea
              className="flex-1 w-full min-h-[200px] bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-mint/20 resize-none font-medium leading-relaxed"
              placeholder="Add a detailed brief for this task..."
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
            />
            <button
              onClick={handleSaveBrief}
              disabled={isSaving}
              className="w-full py-4 text-xs font-bold uppercase tracking-widest bg-mint text-deep-night rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(78,255,168,0.2)] disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Update Task Brief'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const TaskCard: React.FC<{ task: Task, onClick?: () => void }> = ({ task, onClick }) => {
  const today = new Date('2026-03-05');
  const internal = task.internal_deadline ? new Date(task.internal_deadline) : null;
  const external = task.external_deadline ? new Date(task.external_deadline) : null;
  const completed = task.completed_at ? new Date(task.completed_at) : null;

  let statusLabel = '';
  let statusColor = '';

  if (completed) {
    if (external && completed > external) {
      statusLabel = 'Behind Ext';
      statusColor = 'text-rose-400';
    } else if (internal && completed > internal) {
      statusLabel = 'Behind Int';
      statusColor = 'text-orange-400';
    }
  } else {
    if (external && today > external) {
      statusLabel = 'Behind Ext';
      statusColor = 'text-rose-400';
    } else if (internal && today > internal) {
      statusLabel = 'Behind Int';
      statusColor = 'text-orange-400';
    }
  }

  return (
    <div 
      onClick={onClick}
      className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:border-mint/30 transition-all group cursor-pointer"
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-2 h-2 rounded-full",
          task.priority === 'high' ? "bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.4)]" : 
          task.priority === 'medium' ? "bg-sky shadow-[0_0_10px_rgba(56,212,245,0.4)]" : "bg-zinc-600"
        )} />
        <div>
          <h4 className="text-sm font-bold text-white font-display leading-tight">{task.title}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">{task.category || 'General'}</span>
            <span className="text-zinc-700 text-[9px]">•</span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Due {task.due_date}</span>
            {statusLabel && (
              <>
                <span className="text-zinc-700 text-[9px]">•</span>
                <span className={cn("text-[9px] font-bold uppercase tracking-widest", statusColor)}>{statusLabel}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <button className="p-1.5 text-zinc-600 hover:text-mint transition-colors opacity-0 group-hover:opacity-100">
        <CheckCircle2 className="w-4 h-4" />
      </button>
    </div>
  );
};

const MiniCalendar = ({ events }: { events: CalendarEvent[] }) => {
  const [currentDate, setCurrentDate] = useState(new Date('2026-03-05')); // Using provided current time
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold font-display uppercase tracking-widest text-white">
          {format(currentDate, 'MMMM yyyy')}
        </h3>
        <div className="flex gap-1">
          <button 
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-1 text-zinc-500 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <button 
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-1 text-zinc-500 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day, i) => (
          <div key={`${day}-${i}`} className="text-center text-[10px] font-bold text-zinc-600">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, i) => {
          const hasEvent = events.some(e => isSameDay(new Date(e.date), day));
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isTodayDate = isToday(day);
          
          return (
            <div 
              key={i} 
              className={cn(
                "aspect-square flex items-center justify-center text-[11px] rounded-lg transition-all relative cursor-pointer",
                !isCurrentMonth && "text-zinc-800",
                isCurrentMonth && "text-zinc-400 hover:bg-white/5",
                isTodayDate && "bg-mint text-deep-night font-bold shadow-[0_0_15px_rgba(78,255,168,0.3)]",
                hasEvent && !isTodayDate && "after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-sky after:rounded-full"
              )}
            >
              {format(day, 'd')}
            </div>
          );
        })}
      </div>

      <div className="mt-6 space-y-3">
        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Upcoming Events</p>
        {events.slice(0, 3).map(event => (
          <div key={event.id} className="flex items-start gap-3 group">
            <div className={cn(
              "w-1 h-8 rounded-full mt-1",
              event.type === 'client_meeting' ? "bg-mint" : 
              event.type === 'campaign_launch' ? "bg-sky" : 
              event.type === 'review' ? "bg-orange-400" : "bg-zinc-600"
            )} />
            <div>
              <p className="text-xs font-bold text-white group-hover:text-mint transition-colors cursor-pointer">{event.title}</p>
              <p className="text-[10px] text-zinc-500 font-medium">{format(new Date(event.date), 'MMM d, h:mm a')}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center w-full gap-3 px-3 py-2 text-sm font-medium transition-all rounded-lg group",
      active 
        ? "bg-mint text-deep-night shadow-[0_0_20px_rgba(78,255,168,0.2)]" 
        : "text-zinc-400 hover:text-mint hover:bg-white/5"
    )}
  >
    <Icon className={cn("w-4 h-4", active ? "text-deep-night" : "text-zinc-500 group-hover:text-mint")} />
    {label}
  </button>
);

const StatCard = ({ label, value, trend, trendValue, prefix = "" }: { label: string, value: string | number, trend?: 'up' | 'down', trendValue?: string, prefix?: string }) => (
  <div className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">{label}</p>
        <h3 className="mt-2 text-3xl font-bold tracking-tight text-white font-display">
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
        </h3>
      </div>
      {trend && (
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase rounded-md",
          trend === 'up' ? "text-mint bg-mint/10" : "text-rose-400 bg-rose-400/10"
        )}>
          {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trendValue}
        </div>
      )}
    </div>
  </div>
);

// --- Views ---

const DashboardView = ({ overview, tasks, events, onTaskClick }: { overview: AgencyOverview | null, tasks: Task[], events: CalendarEvent[], onTaskClick: (task: Task) => void }) => {
  if (!overview) return null;

  const today = new Date('2026-03-05');
  const activeTasks = tasks.filter(t => t.status !== 'completed');
  const overdueTasks = activeTasks.filter(t => {
    const internal = t.internal_deadline ? new Date(t.internal_deadline) : null;
    const external = t.external_deadline ? new Date(t.external_deadline) : null;
    return (internal && internal < today) || (external && external < today);
  });
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const highPriorityActive = activeTasks.filter(t => t.priority === 'high').length;

  const data = [
    { name: 'Jan', revenue: 40000, churn: 2 },
    { name: 'Feb', revenue: 45000, churn: 1 },
    { name: 'Mar', revenue: 42000, churn: 3 },
    { name: 'Apr', revenue: 48000, churn: 0 },
    { name: 'May', revenue: 52000, churn: 1 },
    { name: 'Jun', revenue: 55000, churn: 2 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-display">Welcome back, Alex</h2>
          <p className="text-sm text-zinc-500 mt-1 font-medium">Here's what's happening across your agency today.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
            <Clock className="w-4 h-4 text-mint" />
            <span className="text-xs font-bold text-white">Thursday, March 5</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard 
              label="Active Workload" 
              value={activeTasks.length} 
              trend={activeTasks.length > 10 ? "up" : "down"} 
              trendValue={`${highPriorityActive} High Priority`} 
            />
            <StatCard 
              label="Behind Schedule" 
              value={overdueTasks.length} 
              trend={overdueTasks.length > 0 ? "up" : "down"} 
              trendValue={overdueTasks.length > 0 ? "Critical" : "On Track"} 
            />
            <StatCard 
              label="Completed (MTD)" 
              value={completedTasks.length} 
              trend="up" 
              trendValue="Velocity +15%" 
            />
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="p-8 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold font-display">Revenue Trend</h3>
                <div className="flex items-center gap-2 px-3 py-1 bg-mint/10 rounded-lg">
                  <div className="w-2 h-2 bg-mint rounded-full"></div>
                  <span className="text-[10px] font-bold text-mint uppercase">Revenue</span>
                </div>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4EFFA8" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4EFFA8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#71717a', fontWeight: 600}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#71717a', fontWeight: 600}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0A0F0D', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                      itemStyle={{ color: '#4EFFA8' }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#4EFFA8" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-8 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold font-display">My Priority Tasks</h3>
                <button className="text-[10px] font-bold text-mint uppercase tracking-widest hover:underline">View All</button>
              </div>
              <div className="space-y-4">
                {tasks.filter(t => t.priority === 'high').slice(0, 4).map(task => (
                  <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
                ))}
                {tasks.filter(t => t.priority !== 'high').slice(0, 2).map(task => (
                  <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 p-8 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
              <h3 className="text-xl font-bold font-display mb-8">Active Campaigns</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Q1 Launch</span>
                    <span className="px-2 py-0.5 bg-mint/10 text-mint text-[9px] font-bold rounded uppercase">Active</span>
                  </div>
                  <h4 className="font-bold text-white font-display">Acme Brand Refresh</h4>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-600">ROAS: 4.2x</span>
                    <span className="text-[10px] font-bold text-zinc-600">Budget: $12k</span>
                  </div>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">SEO Sprint</span>
                    <span className="px-2 py-0.5 bg-sky/10 text-sky text-[9px] font-bold rounded uppercase">In Progress</span>
                  </div>
                  <h4 className="font-bold text-white font-display">FinTech SEO Growth</h4>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-600">Rankings: +12</span>
                    <span className="text-[10px] font-bold text-zinc-600">Budget: $8k</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-8 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
              <h3 className="text-xl font-bold font-display mb-8">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button className="flex flex-col items-center justify-center gap-3 p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-mint/10 hover:border-mint/30 transition-all group">
                  <Plus className="w-5 h-5 text-zinc-500 group-hover:text-mint" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest group-hover:text-white">New Task</span>
                </button>
                <button className="flex flex-col items-center justify-center gap-3 p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-sky/10 hover:border-sky/30 transition-all group">
                  <Users className="w-5 h-5 text-zinc-500 group-hover:text-sky" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest group-hover:text-white">Add Lead</span>
                </button>
                <button className="flex flex-col items-center justify-center gap-3 p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-orange-400/10 hover:border-orange-400/30 transition-all group">
                  <Calendar className="w-5 h-5 text-zinc-500 group-hover:text-orange-400" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest group-hover:text-white">Meeting</span>
                </button>
                <button className="flex flex-col items-center justify-center gap-3 p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-rose-400/10 hover:border-rose-400/30 transition-all group">
                  <BarChart3 className="w-5 h-5 text-zinc-500 group-hover:text-rose-400" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest group-hover:text-white">Report</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <MiniCalendar events={events} />
          
          <div className="p-8 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
            <h3 className="text-xl font-bold font-display mb-8">Recent Activity</h3>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-mint/10 flex items-center justify-center flex-shrink-0">
                  <Heart className="w-4 h-4 text-mint" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">New lead from LinkedIn</p>
                  <p className="text-[10px] text-zinc-500 mt-1">2 hours ago</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-sky/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-sky" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Campaign "Acme Brand" launched</p>
                  <p className="text-[10px] text-zinc-500 mt-1">5 hours ago</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-orange-400/10 flex items-center justify-center flex-shrink-0">
                  <Target className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Monthly goal 85% achieved</p>
                  <p className="text-[10px] text-zinc-500 mt-1">Yesterday</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ClientLifecycleView = ({ clients }: { clients: Client[] }) => {
  const stages = ['prospect', 'proposal', 'onboarding', 'active', 'review', 'renewal'];
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight font-display">Client Success Pipeline</h2>
        <button className="flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-widest text-deep-night bg-mint rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(78,255,168,0.2)]">
          <Plus className="w-4 h-4" />
          Add Card
        </button>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-6 min-h-[600px] scrollbar-hide overscroll-x-contain">
        {stages.map(stage => (
          <div key={stage} className="flex-shrink-0 w-80">
            <div className="flex items-center justify-between mb-6 px-2">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                {stage.replace('_', ' ')}
                <span className="ml-2 text-zinc-600 font-normal">
                  ({clients.filter(c => c.lifecycle_stage === stage).length})
                </span>
              </h3>
              <button className="text-zinc-600 hover:text-mint transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              {clients.filter(c => c.lifecycle_stage === stage).map(client => (
                <motion.div
                  layoutId={client.id}
                  key={client.id}
                  className="p-5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm hover:border-mint/50 transition-all cursor-pointer group relative overflow-hidden"
                >
                  <div className={cn(
                    "absolute top-0 left-0 w-1 h-full",
                    client.health_label === 'Healthy' ? "bg-mint" : 
                    client.health_label === 'Stable' ? "bg-sky" : 
                    client.health_label === 'At Risk' ? "bg-orange-400" : "bg-rose-400"
                  )} />
                  
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-white font-display leading-tight">{client.name}</h4>
                      <p className={cn(
                        "text-[9px] font-bold uppercase tracking-widest mt-1",
                        client.health_label === 'Healthy' ? "text-mint" : 
                        client.health_label === 'Stable' ? "text-sky" : 
                        client.health_label === 'At Risk' ? "text-orange-400" : "text-rose-400"
                      )}>{client.health_label}</p>
                    </div>
                    <MoreVertical className="w-4 h-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  
                  <div className="mt-4 flex items-center gap-2">
                    <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full",
                          client.health_score > 80 ? "bg-mint" : client.health_score > 60 ? "bg-sky" : "bg-rose-400"
                        )}
                        style={{ width: `${client.health_score}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-600">{client.health_score}% Health</span>
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-zinc-600" />
                      <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Renewal: 12d</span>
                    </div>
                    <p className="text-sm font-bold text-white">${(client.retainer_amount || 0).toLocaleString()}<span className="text-[10px] text-zinc-500 ml-1">/mo</span></p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ClientsView = ({ clients, activeTimer, setActiveTimer, elapsedSeconds, formatTime }: { 
  clients: Client[], 
  activeTimer: any,
  setActiveTimer: any,
  elapsedSeconds: number,
  formatTime: (s: number) => string
}) => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  if (selectedClient) {
    return (
      <ClientDetailView 
        client={selectedClient} 
        onBack={() => setSelectedClient(null)} 
        activeTimer={activeTimer}
        setActiveTimer={setActiveTimer}
        elapsedSeconds={elapsedSeconds}
        formatTime={formatTime}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight font-display">Clients</h2>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search clients..." 
              className="pl-10 pr-4 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-mint/20 w-64 text-white placeholder:text-zinc-600"
            />
          </div>
          <button className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold uppercase tracking-widest text-deep-night bg-mint rounded-xl hover:scale-105 transition-all">
            <Plus className="w-4 h-4" />
            Add Client
          </button>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Client Name</th>
              <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Health</th>
              <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Communication</th>
              <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Contract End</th>
              <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Retainer</th>
              <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {clients.map(client => (
              <tr 
                key={client.id} 
                onClick={() => setSelectedClient(client)}
                className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
              >
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-deep-teal text-white flex items-center justify-center font-bold text-sm shadow-lg">
                      {client.name.charAt(0)}
                    </div>
                    <span className="font-bold text-white font-display">{client.name}</span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider",
                      client.health_label === 'Healthy' ? "bg-mint/10 text-mint" : 
                      client.health_label === 'Stable' ? "bg-sky/10 text-sky" : 
                      client.health_label === 'At Risk' ? "bg-orange-400/10 text-orange-400" : "bg-rose-400/10 text-rose-400"
                    )}>
                      {client.health_label}
                    </div>
                    <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          client.health_score > 80 ? "bg-mint" : client.health_score > 60 ? "bg-sky" : "bg-rose-400"
                        )}
                        style={{ width: `${client.health_score}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    <span className="text-xs font-medium text-zinc-400">2 days ago</span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className="text-xs font-medium text-zinc-400">Dec 31, 2024</span>
                </td>
                <td className="px-8 py-5">
                  <span className="text-sm font-bold text-white">
                    ${client.retainer_amount?.toLocaleString() || '0'}<span className="text-zinc-500 font-medium">/mo</span>
                  </span>
                </td>
                <td className="px-8 py-5">
                  <button className="p-2 text-zinc-600 hover:text-mint transition-colors bg-white/5 rounded-lg">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CampaignsView = ({ campaigns, clients, onRefresh }: { campaigns: Campaign[], clients: Client[], onRefresh: () => void }) => {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [metrics, setMetrics] = useState<CampaignMetric[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [newCampaign, setNewCampaign] = useState({
    client_id: '',
    name: '',
    type: 'PPC',
    budget: '',
    meta_ad_account_id: '',
    meta_access_token: '',
    meta_pixel_id: ''
  });

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCampaign,
          budget: parseFloat(newCampaign.budget)
        })
      });
      if (res.ok) {
        setShowNewModal(false);
        setNewCampaign({ client_id: '', name: '', type: 'PPC', budget: '', meta_ad_account_id: '', meta_access_token: '', meta_pixel_id: '' });
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSyncMeta = async () => {
    if (!selectedCampaign) return;
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/campaigns/${selectedCampaign.id}/sync-meta`, {
        method: 'POST'
      });
      if (res.ok) {
        // Refresh metrics
        fetch(`/api/campaigns/${selectedCampaign.id}/metrics`)
          .then(res => res.json())
          .then(setMetrics);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to sync Meta insights");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (selectedCampaign) {
      fetch(`/api/campaigns/${selectedCampaign.id}/metrics`)
        .then(async res => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          const contentType = res.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Expected JSON response");
          }
          return res.json();
        })
        .then(data => setMetrics(data))
        .catch(err => console.error("Failed to fetch metrics", err));
    }
  }, [selectedCampaign]);

  const totals = metrics.reduce((acc, m) => ({
    spend: acc.spend + (m.spend || 0),
    impressions: acc.impressions + (m.impressions || 0),
    clicks: acc.clicks + (m.clicks || 0),
    conversions: acc.conversions + (m.conversions || 0),
  }), { spend: 0, impressions: 0, clicks: 0, conversions: 0 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight font-display">Campaigns</h2>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-zinc-400 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button 
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold uppercase tracking-widest text-deep-night bg-mint rounded-xl hover:scale-105 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          {campaigns.map(campaign => (
            <div 
              key={campaign.id} 
              onClick={() => setSelectedCampaign(campaign)}
              className={cn(
                "p-6 bg-white/5 border rounded-2xl backdrop-blur-sm cursor-pointer transition-all",
                selectedCampaign?.id === campaign.id ? "border-mint ring-1 ring-mint" : "border-white/10 hover:border-white/30"
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">{campaign.client_name}</p>
                  <h3 className="text-xl font-bold mt-2 font-display text-white">{campaign.name}</h3>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                    campaign.status === 'launch' ? "bg-sky/10 text-sky" : "bg-white/5 text-zinc-500"
                  )}>
                    {campaign.status}
                  </span>
                  {campaign.meta_ad_account_id && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[8px] font-bold rounded uppercase tracking-widest">
                      <Globe className="w-2 h-2" />
                      Meta Connected
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-8 flex items-center justify-between text-sm">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-zinc-500 font-medium">
                    <Layers className="w-4 h-4 text-mint" />
                    {campaign.type}
                  </div>
                  <div className="flex items-center gap-2 text-zinc-500 font-medium">
                    <Calendar className="w-4 h-4 text-sky" />
                    Q1 2024
                  </div>
                </div>
                <div className="font-bold text-white text-lg">
                  ${campaign.budget.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="sticky top-8 h-fit">
          <AnimatePresence mode="wait">
            {selectedCampaign ? (
              <motion.div
                key={selectedCampaign.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-8 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm space-y-10"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-bold font-display text-white">{selectedCampaign.name}</h3>
                    <p className="text-sm text-zinc-500 mt-2">Real-time performance analytics</p>
                  </div>
                  {selectedCampaign.meta_ad_account_id && (
                    <button 
                      onClick={handleSyncMeta}
                      disabled={isSyncing}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/20 transition-all disabled:opacity-50"
                    >
                      <History className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Sync Meta</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Total Spend</p>
                    <p className="text-xl font-bold mt-2 text-white">${totals.spend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Impressions</p>
                    <p className="text-xl font-bold mt-2 text-sky">{Math.round(totals.impressions).toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Clicks</p>
                    <p className="text-xl font-bold mt-2 text-mint">{Math.round(totals.clicks).toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Conversions</p>
                    <p className="text-xl font-bold mt-2 text-orange-400">{Math.round(totals.conversions).toLocaleString()}</p>
                  </div>
                </div>

                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={metrics.slice(-21)}>
                      <defs>
                        <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38D4F5" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#38D4F5" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fill: '#71717a', fontWeight: 600}} 
                        tickFormatter={(val) => format(new Date(val), 'MMM d')}
                        dy={10}
                      />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#71717a', fontWeight: 600}} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#71717a', fontWeight: 600}} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0A0F0D', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Area yAxisId="left" type="monotone" dataKey="spend" fill="url(#colorSpend)" stroke="#38D4F5" strokeWidth={2} name="Spend ($)" />
                      <Line yAxisId="right" type="monotone" dataKey="conversions" stroke="#4EFFA8" strokeWidth={3} dot={{ r: 4, fill: '#4EFFA8' }} activeDot={{ r: 6 }} name="Conversions" />
                      <ReferenceLine 
                        yAxisId="left" 
                        y={selectedCampaign.budget / (metrics.length || 30)} 
                        stroke="#38D4F5" 
                        strokeDasharray="3 3" 
                        label={{ value: 'Daily Budget', position: 'right', fill: '#38D4F5', fontSize: 10, fontWeight: 'bold' }} 
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Budget Allocation Over Time</h4>
                    <span className="text-[10px] font-bold text-mint uppercase tracking-widest">
                      Daily Target: ${(selectedCampaign.budget / (metrics.length || 30)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics.slice(-14)}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fontSize: 10, fill: '#71717a', fontWeight: 600}} 
                          tickFormatter={(val) => format(new Date(val), 'MMM d')}
                          dy={10}
                        />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#71717a', fontWeight: 600}} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0A0F0D', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                          itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#4EFFA8' }}
                        />
                        <Bar dataKey="spend" fill="#4EFFA8" radius={[4, 4, 0, 0]} name="Daily Budget Usage" />
                        <ReferenceLine 
                          y={selectedCampaign.budget / (metrics.length || 30)} 
                          stroke="#38D4F5" 
                          strokeDasharray="3 3" 
                          label={{ value: 'Daily Budget Target', position: 'top', fill: '#38D4F5', fontSize: 10, fontWeight: 'bold' }} 
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="pt-8 border-t border-white/5">
                  <button className="w-full py-4 text-xs font-bold uppercase tracking-[0.2em] border border-white/10 rounded-xl hover:bg-white/5 transition-all text-zinc-400 hover:text-white">
                    Generate Client Report
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6">
                  <TrendingUp className="w-8 h-8 text-zinc-700" />
                </div>
                <h3 className="text-xl font-bold text-white font-display">Performance Insights</h3>
                <p className="text-sm text-zinc-600 mt-3 max-w-[280px] leading-relaxed">Select a campaign to unlock real-time data visualization and ROI tracking.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* New Campaign Modal */}
      <AnimatePresence>
        {showNewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-deep-night/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-deep-night border border-white/10 rounded-3xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold font-display">New Campaign</h3>
                <button onClick={() => setShowNewModal(false)} className="p-2 text-zinc-500 hover:text-white transition-colors bg-white/5 rounded-xl">
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </button>
              </div>

              <form onSubmit={handleCreateCampaign} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Client</label>
                    <select 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-mint/20 appearance-none"
                      value={newCampaign.client_id}
                      onChange={e => setNewCampaign({ ...newCampaign, client_id: e.target.value })}
                    >
                      <option value="" className="bg-deep-night">Select Client</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id} className="bg-deep-night">{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Type</label>
                    <select 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-mint/20 appearance-none"
                      value={newCampaign.type}
                      onChange={e => setNewCampaign({ ...newCampaign, type: e.target.value })}
                    >
                      <option value="PPC" className="bg-deep-night">PPC</option>
                      <option value="SEO" className="bg-deep-night">SEO</option>
                      <option value="Social" className="bg-deep-night">Social</option>
                      <option value="Email" className="bg-deep-night">Email</option>
                      <option value="Website" className="bg-deep-night">Website</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Campaign Name</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. Q1 Brand Awareness"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-mint/20"
                    value={newCampaign.name}
                    onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Budget ($)</label>
                  <input 
                    required
                    type="number" 
                    placeholder="0.00"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-mint/20"
                    value={newCampaign.budget}
                    onChange={e => setNewCampaign({ ...newCampaign, budget: e.target.value })}
                  />
                </div>

                <div className="pt-4 border-t border-white/5 space-y-6">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-400" />
                    <h4 className="text-sm font-bold text-white font-display">Meta Marketing API Setup</h4>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Ad Account ID</label>
                      <input 
                        type="text" 
                        placeholder="act_xxxxxxxxxxxx"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        value={newCampaign.meta_ad_account_id}
                        onChange={e => setNewCampaign({ ...newCampaign, meta_ad_account_id: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Access Token</label>
                      <input 
                        type="password" 
                        placeholder="EAAB..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        value={newCampaign.meta_access_token}
                        onChange={e => setNewCampaign({ ...newCampaign, meta_access_token: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pixel ID (Optional)</label>
                      <input 
                        type="text" 
                        placeholder="xxxxxxxxxxxx"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        value={newCampaign.meta_pixel_id}
                        onChange={e => setNewCampaign({ ...newCampaign, meta_pixel_id: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="flex-1 py-3 text-xs font-bold uppercase tracking-widest border border-white/10 rounded-xl hover:bg-white/5 transition-all text-zinc-500"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 text-xs font-bold uppercase tracking-widest bg-mint text-deep-night rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(78,255,168,0.2)]"
                  >
                    Create Campaign
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TeamView = ({ team }: { team: TeamMember[] }) => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight font-display">Team & Workload</h2>
        <button className="flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-widest text-deep-night bg-mint rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(78,255,168,0.2)]">
          <Plus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {team.map((member) => {
          const capacity = member.capacity_hours > 0 ? Math.round((member.allocated_hours / member.capacity_hours) * 100) : 0;
          
          return (
            <div key={member.id} className="p-8 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-deep-teal border border-white/10 flex items-center justify-center text-lg font-bold shadow-lg">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold font-display text-white">{member.name}</h3>
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mt-1">{member.role.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                  capacity > 90 ? "bg-rose-400/10 text-rose-400" : "bg-mint/10 text-mint"
                )}>
                  {capacity}% Capacity
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Revenue Managed</p>
                  <p className="text-xl font-bold text-white">${(member.revenue_managed || 0).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Retention Rate</p>
                  <p className="text-xl font-bold text-mint">{member.retention_rate}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">On-Time Delivery</p>
                  <p className="text-xl font-bold text-sky">{member.on_time_percentage}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">CSAT Score</p>
                  <p className="text-xl font-bold text-white">{member.satisfaction_score}/10</p>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Workload Distribution</span>
                  <span className="text-xs font-bold text-white">{capacity}%</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      capacity > 90 ? "bg-rose-400" : "bg-mint"
                    )}
                    style={{ width: `${capacity}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const InsightsView = ({ clients, overview }: { clients: Client[], overview: AgencyOverview | null }) => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight font-display">Predictive Insights</h2>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-bold text-white">2 Clients at Critical Risk</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="p-8 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
          <h3 className="text-xl font-bold font-display mb-8">Churn Prediction</h3>
          <div className="space-y-6">
            {clients.filter(c => c.health_score < 70).map((client) => (
              <div key={client.id} className="flex items-center justify-between p-4 bg-rose-400/5 border border-rose-400/10 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-rose-400/20 flex items-center justify-center text-rose-400 font-bold">
                    {client.name[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{client.name}</h4>
                    <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Critical Risk Signal</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-zinc-500">Predicted Churn</p>
                  <p className="text-sm font-bold text-rose-400">Next 30 Days</p>
                </div>
              </div>
            ))}
            <div className="pt-4">
              <button className="w-full py-3 text-[10px] font-bold uppercase tracking-widest border border-white/10 rounded-xl hover:bg-white/5 transition-all text-zinc-400">
                View All Risk Indicators
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
          <h3 className="text-xl font-bold font-display mb-8">Upsell Opportunities</h3>
          <div className="space-y-6">
            {[
              { client: 'FinTech Solutions', opportunity: 'Budget Expansion', signal: 'High ROAS (4.2x)', potential: '+$5,000/mo' },
              { client: 'Acme Corp', opportunity: 'Cross-sell SEO', signal: 'Organic Traffic Growth', potential: '+$3,500/mo' },
              { client: 'BioHealth Inc', opportunity: 'Social Media Management', signal: 'New Product Launch', potential: '+$2,800/mo' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-mint/5 border border-mint/10 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-mint/20 flex items-center justify-center text-mint font-bold">
                    {item.client[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{item.client}</h4>
                    <p className="text-[10px] font-bold text-mint uppercase tracking-widest">{item.opportunity}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-zinc-500">{item.signal}</p>
                  <p className="text-sm font-bold text-mint">{item.potential}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-8 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
        <h3 className="text-xl font-bold font-display mb-8">Revenue Forecast (Next 6 Months)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { month: 'Jul', base: 55000, expansion: 5000, new: 8000 },
              { month: 'Aug', base: 58000, expansion: 7000, new: 10000 },
              { month: 'Sep', base: 62000, expansion: 8000, new: 12000 },
              { month: 'Oct', base: 65000, expansion: 10000, new: 15000 },
              { month: 'Nov', base: 70000, expansion: 12000, new: 18000 },
              { month: 'Dec', base: 75000, expansion: 15000, new: 20000 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#71717a', fontWeight: 600}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#71717a', fontWeight: 600}} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0A0F0D', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                itemStyle={{ color: '#4EFFA8' }}
              />
              <Bar dataKey="base" stackId="a" fill="#0A5470" radius={[0, 0, 0, 0]} />
              <Bar dataKey="expansion" stackId="a" fill="#38D4F5" radius={[0, 0, 0, 0]} />
              <Bar dataKey="new" stackId="a" fill="#4EFFA8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'lifecycle' | 'clients' | 'campaigns' | 'team' | 'insights'>('dashboard');
  const [overview, setOverview] = useState<AgencyOverview | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Global Timer State
  const [activeTimer, setActiveTimer] = useState<{ startTime: number, service_id: string, description: string, client_id: string, client_name: string } | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let interval: any;
    if (activeTimer) {
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - activeTimer.startTime) / 1000));
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewRes, leadsRes, clientsRes, campaignsRes, tasksRes, eventsRes, teamRes] = await Promise.all([
          fetch('/api/agency/overview'),
          fetch('/api/leads'),
          fetch('/api/clients'),
          fetch('/api/campaigns'),
          fetch('/api/tasks'),
          fetch('/api/events'),
          fetch('/api/team')
        ]);

        const checkResponse = async (res: Response) => {
          if (!res.ok) {
            const text = await res.text();
            throw new Error(`HTTP error! status: ${res.status}, body: ${text.slice(0, 100)}`);
          }
          const contentType = res.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            const text = await res.text();
            throw new Error(`Expected JSON but got ${contentType}, body: ${text.slice(0, 100)}`);
          }
          return res.json();
        };

        const [overviewData, leadsData, clientsData, campaignsData, tasksData, eventsData, teamData] = await Promise.all([
          checkResponse(overviewRes),
          checkResponse(leadsRes),
          checkResponse(clientsRes),
          checkResponse(campaignsRes),
          checkResponse(tasksRes),
          checkResponse(eventsRes),
          checkResponse(teamRes)
        ]);

        setOverview(overviewData);
        setLeads(leadsData);
        setClients(clientsData);
        setCampaigns(campaignsData);
        setTasks(tasksData.map((t: any) => ({
          ...t,
          priority: t.priority || 'medium',
          category: t.category || 'General'
        })));
        setEvents(eventsData);
        setTeam(teamData);
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="flex h-screen bg-deep-night font-sans text-white overflow-hidden selection:bg-mint selection:text-deep-night">
      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 border-r border-white/5 bg-deep-night flex flex-col">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-mint rounded-2xl flex items-center justify-center shadow-[0_0_25px_rgba(78,255,168,0.3)]">
              <Layers className="w-6 h-6 text-deep-night" />
            </div>
            <span className="text-2xl font-bold tracking-tighter font-display">AgencyOS</span>
          </div>

          <nav className="space-y-2">
            <SidebarItem 
              icon={LayoutDashboard} 
              label="Overview" 
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')} 
            />
            <SidebarItem 
              icon={TrendingUp} 
              label="Client Success" 
              active={activeTab === 'lifecycle'} 
              onClick={() => setActiveTab('lifecycle')} 
            />
            <SidebarItem 
              icon={Users} 
              label="Clients" 
              active={activeTab === 'clients'} 
              onClick={() => setActiveTab('clients')} 
            />
            <SidebarItem 
              icon={Briefcase} 
              label="Campaigns" 
              active={activeTab === 'campaigns'} 
              onClick={() => setActiveTab('campaigns')} 
            />
            <SidebarItem 
              icon={Layers} 
              label="Team & Workload" 
              active={activeTab === 'team'} 
              onClick={() => setActiveTab('team')} 
            />
            <SidebarItem 
              icon={TrendingUp} 
              label="Insights" 
              active={activeTab === 'insights'} 
              onClick={() => setActiveTab('insights')} 
            />
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-white/5 bg-white/[0.01] space-y-6">
          {activeTimer && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl animate-pulse">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Active Timer</span>
                <span className="text-xs font-mono font-bold text-white">{formatTime(elapsedSeconds)}</span>
              </div>
              <p className="text-[11px] font-bold text-white truncate">{activeTimer.client_name}</p>
              <p className="text-[10px] text-zinc-500 truncate mt-0.5">{activeTimer.description}</p>
              <button 
                onClick={() => {
                  setActiveTab('clients');
                  // Note: selectedClient is local to ClientsView, so we can't easily set it here
                  // but navigating to 'clients' tab is a good start.
                }}
                className="w-full mt-3 py-2 text-[9px] font-bold uppercase tracking-widest bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
              >
                View Task
              </button>
            </div>
          )}
          <div>
            <SidebarItem icon={Settings} label="Settings" onClick={() => {}} />
            <div className="mt-8 flex items-center gap-4 px-3 py-2">
              <div className="w-10 h-10 rounded-2xl bg-deep-teal border border-white/10 flex items-center justify-center text-xs font-bold shadow-lg">AR</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate font-display">Alex Reed</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 truncate">Administrator</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-20 flex-shrink-0 border-b border-white/5 bg-deep-night/50 backdrop-blur-md flex items-center justify-between px-10">
          <div className="flex items-center gap-4">
            <h1 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em]">
              {activeTab.replace('_', ' ')}
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <button className="p-2.5 text-zinc-500 hover:text-mint transition-all relative bg-white/5 rounded-xl">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-mint rounded-full border-2 border-deep-night"></span>
            </button>
            <div className="h-8 w-px bg-white/5"></div>
            <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-all">
              Docs
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-10 scrollbar-thin scrollbar-thumb-white/10">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-96 gap-4">
                <div className="w-12 h-12 border-4 border-white/5 border-t-mint rounded-full animate-spin"></div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600">Initializing OS...</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  {activeTab === 'dashboard' && <DashboardView overview={overview} tasks={tasks} events={events} onTaskClick={setSelectedTask} />}
                  {activeTab === 'lifecycle' && <ClientLifecycleView clients={clients} />}
                  {activeTab === 'clients' && (
                    <ClientsView 
                      clients={clients} 
                      activeTimer={activeTimer}
                      setActiveTimer={setActiveTimer}
                      elapsedSeconds={elapsedSeconds}
                      formatTime={formatTime}
                    />
                  )}
                  {activeTab === 'campaigns' && (
                    <CampaignsView 
                      campaigns={campaigns} 
                      clients={clients}
                      onRefresh={async () => {
                        const res = await fetch('/api/campaigns');
                        const data = await res.json();
                        setCampaigns(data);
                      }}
                    />
                  )}
                  {activeTab === 'team' && <TeamView team={team} />}
                  {activeTab === 'insights' && <InsightsView clients={clients} overview={overview} />}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {selectedTask && (
          <TaskDetailModal 
            task={selectedTask} 
            onClose={() => setSelectedTask(null)} 
            onUpdate={() => {
              fetch('/api/tasks').then(res => res.json()).then(setTasks);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
