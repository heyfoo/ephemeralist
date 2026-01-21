
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Notepad from './components/Notepad';
import DetailPane from './components/DetailPane';
import CalendarView from './components/CalendarView';
import ArtifactCard from './components/ArtifactCard';
import SpaceView from './components/SpaceView';
import { Task, Artifact, DomainType, SpaceContent } from './types';
import { generateId } from './utils/nlp';
import { queryAIStream } from './services/geminiService';
import { loadTasks, saveTasks, loadArtifacts, saveArtifact } from './services/dataService';
import { isSupabaseConfigured } from './services/supabaseClient';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [viewMode, setViewMode] = useState<'notepad' | 'calendar' | 'space'>('notepad');
  const [activeSpaceTask, setActiveSpaceTask] = useState<Task | null>(null);
  const [detailPaneTask, setDetailPaneTask] = useState<Task | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  // Track if initial load is complete to avoid saving during load
  const initialLoadComplete = useRef(false);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const [loadedTasks, loadedArtifacts] = await Promise.all([
        loadTasks(),
        loadArtifacts()
      ]);

      if (loadedTasks.length > 0) {
        setTasks(loadedTasks);
      } else {
        // Default empty task if no data
        setTasks([{
          id: generateId(),
          content: '',
          isCompleted: false,
          depth: 0,
          tag: 'None',
          meta: { created_at: new Date().toISOString() },
          collapsed: false
        }]);
      }

      if (loadedArtifacts.length > 0) {
        setArtifacts(loadedArtifacts);
      }

      setIsLoading(false);
      initialLoadComplete.current = true;
    };

    loadData();
  }, []);

  // Auto-save tasks when they change (debounced)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!initialLoadComplete.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveTasks(tasks);
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [tasks]);

  useEffect(() => {

    const handleGlobalKeys = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setViewMode(prev => prev === 'calendar' ? 'notepad' : 'calendar');
      }
      if (e.key === 'Escape') {
        if (viewMode === 'space') setViewMode('notepad');
        if (viewMode === 'calendar') setViewMode('notepad');
        setArtifacts(prev => prev.map(a => a.view === 'expanded' ? { ...a, view: 'grid' } : a));
        setDetailPaneTask(null);
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [viewMode]);

  const handleCreateArtifact = (query: string, sourceTaskId: string) => {
    const newId = generateId();
    const newArtifact: Artifact = {
      id: newId,
      sourceTaskId,
      query,
      content: '',
      status: 'generating',
      view: 'grid',
      created_at: new Date().toISOString()
    };

    setArtifacts(prev => [...prev, newArtifact]);
    setTasks(prev => prev.map(t => t.id === sourceTaskId ? { ...t, artifactIds: [...(t.artifactIds || []), newId] } : t));

    queryAIStream(query, tasks,
      (chunk) => setArtifacts(curr => curr.map(a => a.id === newId ? { ...a, content: chunk } : a)),
      (finalData) => {
        const completedArtifact: Artifact = {
          id: newId,
          sourceTaskId,
          query,
          content: '', // Will be set by the last chunk
          status: 'complete',
          view: 'grid',
          created_at: new Date().toISOString(),
          domain: finalData?.domain
        };

        setArtifacts(curr => {
          const updated = curr.map(a => {
            if (a.id === newId) {
              const finalArtifact = { ...a, status: 'complete' as const, domain: finalData?.domain };
              // Save completed artifact to Supabase
              saveArtifact(finalArtifact);
              return finalArtifact;
            }
            return a;
          });
          return updated;
        });

        if (finalData?.domain) {
          setTasks(prev => prev.map(t => t.id === sourceTaskId ? { ...t, meta: { ...t.meta, domain: finalData.domain } } : t));
        }

        if (finalData?.tasksToSchedule && finalData.tasksToSchedule.length > 0) {
          const today = new Date().toISOString().split('T')[0];
          const newTasks: Task[] = finalData.tasksToSchedule.map(t => ({
            id: generateId(),
            content: t.content,
            isCompleted: false,
            depth: 0,
            tag: (t.tag as any) || 'Execution',
            meta: {
              created_at: new Date().toISOString(),
              deadlineISO: t.deadlineISO || today,
              startTime: t.startTime,
              durationMinutes: t.durationMinutes,
              why: t.why,
              domain: finalData.domain,
              isAISubtask: true,
              parentTaskId: sourceTaskId
            },
            collapsed: false
          }));

          setTasks(prev => [...prev, ...newTasks]);
        }
      }
    );
  };

  const openSpaceById = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setActiveSpaceTask(task);
      setViewMode('space');
    }
  };

  const handleSpaceAISchedule = (parentTaskId: string, content: SpaceContent, newTs: Task[]) => {
    setTasks(prev => prev.map(t => {
      if (t.id === parentTaskId) {
        return { ...t, spaceContent: content };
      }
      return t;
    }));

    setTasks(prev => [...prev, ...newTs.map(t => ({
      ...t,
      meta: { ...t.meta, isAISubtask: true, parentTaskId }
    }))]);

    if (activeSpaceTask?.id === parentTaskId) {
      setActiveSpaceTask(prev => prev ? { ...prev, spaceContent: content } : null);
    }
  };

  const openSpace = (task: Task) => {
    setActiveSpaceTask(task);
    setViewMode('space');
  };

  const dockedArtifacts = artifacts.filter(a => a.view === 'docked');
  const floatingArtifacts = artifacts.filter(a => a.view === 'grid');

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#faf8f0]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-stone-300 border-t-orange-500 rounded-full mx-auto mb-4"
          />
          <p className="text-sm text-stone-500 tracking-wide">Loading your neural archive...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative flex overflow-hidden bg-[#faf8f0]">
      <AnimatePresence>
        {viewMode === 'calendar' && (
          <CalendarView
            key="cal"
            tasks={tasks}
            onBack={() => setViewMode('notepad')}
            onNavigateToSpace={openSpaceById}
          />
        )}
        {viewMode === 'space' && activeSpaceTask && (
          <SpaceView
            key="space"
            task={activeSpaceTask}
            onBack={() => setViewMode('notepad')}
            onAISchedule={(content, newTs) => handleSpaceAISchedule(activeSpaceTask.id, content, newTs)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        animate={{ width: isSidebarHovered ? 260 : 4 }}
        className="h-screen border-r border-stone-200 bg-white/80 backdrop-blur-md z-[100] relative group flex flex-col"
      >
        <div className={`p-6 transition-opacity duration-300 ${isSidebarHovered ? 'opacity-100' : 'opacity-0'}`}>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 mb-6">Neural Archive</h2>
          <div className="space-y-3">
            {dockedArtifacts.map(art => (
              <div
                key={art.id}
                className="p-3 border border-stone-100 rounded bg-stone-50 hover:bg-white cursor-pointer transition-all"
                onClick={() => setArtifacts(prev => prev.map(a => a.id === art.id ? { ...a, view: 'expanded' } : a))}
              >
                <div className="text-[8px] font-bold text-orange-400 uppercase tracking-widest mb-1">{art.domain || 'General'}</div>
                <div className="text-xs text-stone-600 truncate">{art.query}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.aside>

      <main className={`flex-1 relative transition-all duration-500 ${detailPaneTask ? 'mr-[400px]' : ''}`}>
        <Notepad
          tasks={tasks}
          setTasks={setTasks}
          onFocusTask={setDetailPaneTask}
          activeTaskId={null}
          onAICommand={handleCreateArtifact}
          artifacts={artifacts}
          onOpenArtifact={(id) => setArtifacts(prev => prev.map(a => a.id === id ? { ...a, view: 'expanded' } : a))}
          onOpenSpace={openSpace}
          onToggleCalendar={() => setViewMode('calendar')}
        />

        <div className="fixed inset-0 z-[80] pointer-events-none overflow-hidden">
          <AnimatePresence>
            {floatingArtifacts.map((art, index) => (
              <motion.div
                key={art.id}
                className="absolute pointer-events-auto"
                initial={{ bottom: 40, left: `calc(50% + ${(index - (floatingArtifacts.length - 1) / 2) * 280}px)` }}
                style={{ translateX: '-50%' }}
              >
                <ArtifactCard
                  artifact={art}
                  onClick={() => setArtifacts(prev => prev.map(a => a.id === art.id ? { ...a, view: 'expanded' } : a))}
                  onDock={(e) => {
                    e.stopPropagation();
                    setArtifacts(prev => prev.map(a => a.id === art.id ? { ...a, view: 'docked' } : a));
                  }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {artifacts.filter(a => a.view === 'expanded').map(art => (
            <ArtifactCard
              key={art.id}
              artifact={art}
              onClick={() => { }}
              onDock={(e) => {
                e.stopPropagation();
                setArtifacts(prev => prev.map(a => a.id === art.id ? { ...a, view: 'docked' } : a));
              }}
            />
          ))}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {detailPaneTask && viewMode === 'notepad' && (
          <aside className="fixed right-0 top-0 bottom-0 w-[400px] z-[60] shadow-2xl">
            <DetailPane
              task={detailPaneTask}
              onUpdate={(id, up) => setTasks(prev => prev.map(t => t.id === id ? { ...t, ...up } : t))}
              onClose={() => setDetailPaneTask(null)}
              allTasks={tasks}
            />
          </aside>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
