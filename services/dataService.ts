import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Task, Artifact } from '../types';

// Convert Task to database format (snake_case)
const toDbTask = (task: Task) => ({
    id: task.id,
    content: task.content,
    is_completed: task.isCompleted,
    depth: task.depth,
    tag: task.tag,
    meta: task.meta,
    collapsed: task.collapsed,
    artifact_ids: task.artifactIds || [],
    space_content: task.spaceContent || null,
});

// Convert database row to Task (camelCase)
const fromDbTask = (row: any): Task => ({
    id: row.id,
    content: row.content,
    isCompleted: row.is_completed,
    depth: row.depth,
    tag: row.tag,
    meta: row.meta,
    collapsed: row.collapsed,
    artifactIds: row.artifact_ids || [],
    spaceContent: row.space_content || undefined,
});

// Convert Artifact to database format
const toDbArtifact = (artifact: Artifact) => ({
    id: artifact.id,
    source_task_id: artifact.sourceTaskId,
    query: artifact.query,
    content: artifact.content,
    status: artifact.status,
    view: artifact.view,
    created_at: artifact.created_at,
    domain: artifact.domain || null,
});

// Convert database row to Artifact
const fromDbArtifact = (row: any): Artifact => ({
    id: row.id,
    sourceTaskId: row.source_task_id,
    query: row.query,
    content: row.content,
    status: row.status,
    view: row.view,
    created_at: row.created_at,
    domain: row.domain || undefined,
});

// =============== TASKS ===============

export const loadTasks = async (): Promise<Task[]> => {
    if (!isSupabaseConfigured() || !supabase) return [];

    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error loading tasks:', error);
        return [];
    }

    return (data || []).map(fromDbTask);
};

export const saveTask = async (task: Task): Promise<boolean> => {
    if (!isSupabaseConfigured() || !supabase) return false;

    const { error } = await supabase
        .from('tasks')
        .upsert(toDbTask(task), { onConflict: 'id' });

    if (error) {
        console.error('Error saving task:', error);
        return false;
    }

    return true;
};

export const saveTasks = async (tasks: Task[]): Promise<boolean> => {
    if (!isSupabaseConfigured() || !supabase) return false;
    if (tasks.length === 0) return true;

    const { error } = await supabase
        .from('tasks')
        .upsert(tasks.map(toDbTask), { onConflict: 'id' });

    if (error) {
        console.error('Error saving tasks:', error);
        return false;
    }

    return true;
};

export const deleteTask = async (id: string): Promise<boolean> => {
    if (!isSupabaseConfigured() || !supabase) return false;

    const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting task:', error);
        return false;
    }

    return true;
};

// =============== ARTIFACTS ===============

export const loadArtifacts = async (): Promise<Artifact[]> => {
    if (!isSupabaseConfigured() || !supabase) return [];

    const { data, error } = await supabase
        .from('artifacts')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error loading artifacts:', error);
        return [];
    }

    return (data || []).map(fromDbArtifact);
};

export const saveArtifact = async (artifact: Artifact): Promise<boolean> => {
    if (!isSupabaseConfigured() || !supabase) return false;

    const { error } = await supabase
        .from('artifacts')
        .upsert(toDbArtifact(artifact), { onConflict: 'id' });

    if (error) {
        console.error('Error saving artifact:', error);
        return false;
    }

    return true;
};

export const deleteArtifact = async (id: string): Promise<boolean> => {
    if (!isSupabaseConfigured() || !supabase) return false;

    const { error } = await supabase
        .from('artifacts')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting artifact:', error);
        return false;
    }

    return true;
};
