
import React, { useState, useMemo } from 'react';
import { Task } from '../types';
import { COLORS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

interface CalendarViewProps {
  tasks: Task[];
  onBack: () => void;
  onNavigateToSpace: (taskId: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onBack, onNavigateToSpace }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDateISO, setSelectedDateISO] = useState<string | null>(null);

  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();
  const monthName = viewDate.toLocaleString('default', { month: 'long' });

  const goToPrevMonth = () => setViewDate(new Date(currentYear, currentMonth - 1, 1));
  const goToNextMonth = () => setViewDate(new Date(currentYear, currentMonth + 1, 1));
  const goToToday = () => setViewDate(new Date());

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);

  const days = useMemo(() => {
    const d = [];
    for (let i = 0; i < firstDayOfMonth; i++) d.push(null);
    for (let i = 1; i <= daysInMonth; i++) d.push(new Date(currentYear, currentMonth, i));
    while (d.length < 42) d.push(null);
    return d;
  }, [currentYear, currentMonth, firstDayOfMonth, daysInMonth]);

  const formatDateISO = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayISO = formatDateISO(new Date());

  const selectedDateTasks = useMemo(() => {
    if (!selectedDateISO) return [];
    return tasks
      .filter(t => t.meta.deadlineISO === selectedDateISO)
      .sort((a, b) => (a.meta.startTime || '00:00').localeCompare(b.meta.startTime || '00:00'));
  }, [tasks, selectedDateISO]);

  const handleTeleport = (task: Task) => {
    const hubId = task.meta.parentTaskId || task.id;
    setSelectedDateISO(null);
    onNavigateToSpace(hubId);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 w-full h-screen flex flex-col bg-[#faf8f0] z-[200] overflow-hidden"
    >
      <header className="h-20 border-b border-stone-200 flex items-center justify-between px-10 shrink-0">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-light tracking-tight text-stone-800">
            {monthName} <span className="text-stone-300 ml-1">{currentYear}</span>
          </h1>
          <div className="flex items-center gap-2 bg-stone-100/50 p-1 rounded-md border border-stone-200">
            <button onClick={goToPrevMonth} className="p-1.5 hover:bg-white rounded transition-colors text-stone-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={goToToday} className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-stone-500">Today</button>
            <button onClick={goToNextMonth} className="p-1.5 hover:bg-white rounded transition-colors text-stone-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        <button 
          onClick={onBack}
          className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 hover:text-stone-800 transition-all flex items-center gap-2 group"
        >
          <span className="opacity-50 group-hover:opacity-100">[ Esc ]</span>
          <span>Close Temporal Map</span>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7 h-full min-h-[700px]">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-4 border-b border-r border-stone-100 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-300 bg-stone-50/30">{day}</div>
          ))}
          
          {days.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} className="bg-stone-50/20 border-b border-r border-stone-100" />;
            const dateISO = formatDateISO(date);
            const dayTasks = tasks.filter(t => t.meta.deadlineISO === dateISO);
            const isToday = dateISO === todayISO;

            return (
              <div 
                key={dateISO} 
                onClick={() => setSelectedDateISO(dateISO)}
                className={`relative p-3 border-b border-r border-stone-100 min-h-[140px] group cursor-pointer transition-all hover:bg-white ${isToday ? 'bg-orange-50/20' : ''}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-xs font-mono select-none ${isToday ? 'text-orange-500 font-bold' : 'text-stone-400'}`}>
                    {date.getDate()}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {dayTasks.slice(0, 4).map(task => (
                    <div key={task.id} className="flex items-center gap-2 p-1">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${task.tag === 'Neural Reset' ? 'bg-stone-200 border border-stone-300' : ''}`} style={{ backgroundColor: task.tag === 'Neural Reset' ? undefined : COLORS.tags[task.tag] || COLORS.bullet }} />
                      <span className={`text-[10px] truncate ${task.tag === 'Neural Reset' ? 'text-stone-300 italic' : 'text-stone-600'}`}>{task.content}</span>
                    </div>
                  ))}
                  {dayTasks.length > 4 && <div className="text-[8px] text-stone-300 font-bold ml-3">+{dayTasks.length - 4}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selectedDateISO && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] flex items-center justify-center p-20">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-stone-900/40 backdrop-blur-md" onClick={() => setSelectedDateISO(null)} />
            
            <motion.div layoutId={`day-detail-${selectedDateISO}`} className="relative w-full max-w-2xl bg-white shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-8 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                <div>
                  <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-orange-400 mb-1">Temporal Alignment</h2>
                  <h3 className="text-xl font-light text-stone-800">{new Date(selectedDateISO).toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
                </div>
                <button onClick={() => setSelectedDateISO(null)} className="w-10 h-10 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto p-10">
                {selectedDateTasks.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-stone-300">
                    <p className="text-[10px] font-bold uppercase tracking-widest">No active pulses</p>
                  </div>
                ) : (
                  <div className="relative pl-12 space-y-8">
                    <div className="absolute left-4 top-2 bottom-2 w-px bg-stone-100" />
                    {selectedDateTasks.map((task) => (
                      <div key={task.id} className={`relative group/item ${task.tag === 'Neural Reset' ? 'opacity-40' : ''}`}>
                        <div className={`absolute -left-10 top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm transition-transform group-hover/item:scale-125`} style={{ backgroundColor: COLORS.tags[task.tag] || COLORS.bullet }} />
                        
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-bold font-mono text-stone-400 tabular-nums">{task.meta.startTime || '--:--'}</span>
                            <span className="text-[8px] font-bold uppercase tracking-widest text-stone-300 bg-stone-50 px-2 py-0.5 rounded">{task.meta.durationMinutes}m</span>
                            {task.meta.domain && (
                              <button 
                                onClick={() => handleTeleport(task)}
                                className="text-[8px] font-bold uppercase tracking-widest text-orange-400 ml-auto hover:text-orange-600 border border-transparent hover:border-orange-200 px-2 py-0.5 rounded transition-all"
                              >
                                Teleport to Hub ↗
                              </button>
                            )}
                          </div>
                          
                          <h4 className={`text-base font-medium ${task.isCompleted ? 'text-stone-300 line-through' : 'text-stone-800'}`}>{task.content}</h4>
                          {task.meta.why && <p className="text-[10px] text-stone-400 italic leading-relaxed mt-1">"{task.meta.why}"</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 bg-stone-50/50 border-t border-stone-100 flex justify-between items-center">
                <div className="text-[9px] font-bold uppercase tracking-widest text-stone-300">
                  Daily Cognitive Load: {selectedDateTasks.reduce((acc, curr) => acc + (curr.meta.durationMinutes || 0), 0)}m
                </div>
                <button onClick={() => setSelectedDateISO(null)} className="px-6 py-2 bg-stone-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-orange-600 transition-all">Synchronized</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CalendarView;
