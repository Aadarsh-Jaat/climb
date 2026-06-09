import { useEffect, useState, useCallback } from 'react';
import { 
  Plus, Search, Pin, Trash2, Edit3, X, Check, 
  BookMarked, Lightbulb, Award, GraduationCap, 
  Briefcase, User, Calendar, AlertCircle, Sparkles,
  Copy, Maximize2, Minimize2, RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Note } from '../types';

const categories = [
  { id: 'personal', label: 'Personal', icon: <User className="w-3.5 h-3.5" />, color: 'text-[var(--text-secondary)]' },
  { id: 'business', label: 'Business', icon: <Briefcase className="w-3.5 h-3.5" />, color: 'text-business' },
  { id: 'ideas', label: 'Ideas', icon: <Lightbulb className="w-3.5 h-3.5" />, color: 'text-knowledge' },
  { id: 'wins', label: 'Wins', icon: <Award className="w-3.5 h-3.5" />, color: 'text-health' },
  { id: 'lessons', label: 'Lessons', icon: <GraduationCap className="w-3.5 h-3.5" />, color: 'text-wealth' },
  { id: 'research', label: 'Research', icon: <BookMarked className="w-3.5 h-3.5" />, color: 'text-career' },
];

export default function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('personal');
  const [pinned, setPinned] = useState(false);

  // Load notes with caching
  const loadNotes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('pinned', { ascending: false })
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      setNotes((data || []) as Note[]);
    } catch (err) {
      console.error('Load notes error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Refresh data
  const refreshData = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await loadNotes();
    setRefreshing(false);
  }, [user, loadNotes]);

  // Warm up Supabase connection
  useEffect(() => {
    const warmupConnection = async () => {
      if (user) {
        try {
          await supabase.from('notes').select('count', { count: 'exact', head: true });
          console.log('Supabase connection ready for Notes');
        } catch (err) {
          console.log('Connection warmup failed');
        }
      }
    };
    warmupConnection();
  }, [user]);

  useEffect(() => {
    if (user) {
      loadNotes();
    }
  }, [user, loadNotes]);

  const openNew = () => {
    setEditingNote(null);
    setTitle('');
    setContent('');
    setCategory('personal');
    setPinned(false);
    setShowForm(true);
    setIsFullscreen(false);
  };

  const openEdit = (note: Note) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content || '');
    setCategory(note.category);
    setPinned(note.pinned);
    setShowForm(true);
    setIsFullscreen(false);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingNote(null);
    setTitle('');
    setContent('');
    setCategory('personal');
    setPinned(false);
    setIsFullscreen(false);
  };

  // Generic retry function
  const withRetry = async (operation: () => Promise<any>, operationName: string, retryCount = 0): Promise<any> => {
    try {
      return await operation();
    } catch (err: any) {
      if (retryCount === 0 && (err.message === 'Failed to fetch' || err.message === 'Load failed')) {
        console.log(`Retrying ${operationName} after 500ms...`);
        await new Promise(resolve => setTimeout(resolve, 500));
        return withRetry(operation, operationName, 1);
      }
      throw err;
    }
  };

  const save = async () => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }
    if (!user) return;
    if (saving) return;

    setSaving(true);
    
    try {
      const noteData = {
        user_id: user.id,
        title: title.trim(),
        content: content.trim(),
        category,
        pinned,
        updated_at: new Date().toISOString(),
      };

      await withRetry(async () => {
        let result;
        if (editingNote) {
          result = await supabase
            .from('notes')
            .update(noteData)
            .eq('id', editingNote.id)
            .select()
            .single();
        } else {
          result = await supabase
            .from('notes')
            .insert(noteData)
            .select()
            .single();
        }
        
        if (result.error) throw result.error;
        return result.data;
      }, 'save note');
      
      await loadNotes();
      resetForm();
    } catch (err: any) {
      console.error('Save note failed:', err);
      alert(`Failed to save note: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (id: string) => {
    setShowDeleteModal(null);
    setSaving(true);
    
    try {
      await withRetry(async () => {
        const { error } = await supabase
          .from('notes')
          .delete()
          .eq('id', id);
        if (error) throw error;
      }, 'delete note');
      
      await loadNotes();
    } catch (err: any) {
      alert(`Failed to delete note: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const togglePin = async (note: Note) => {
    setSaving(true);
    
    try {
      await withRetry(async () => {
        const { error } = await supabase
          .from('notes')
          .update({ pinned: !note.pinned, updated_at: new Date().toISOString() })
          .eq('id', note.id);
        if (error) throw error;
      }, 'toggle pin');
      
      await loadNotes();
    } catch (err: any) {
      console.error('Toggle pin failed:', err);
      alert(`Failed to update pin: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    if (!text) {
      alert('Nothing to copy');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Copy failed:', err);
      alert('Failed to copy');
    }
  };

  const getWordCount = (text: string) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  const filtered = notes.filter(n => {
    const matchesSearch = !search || 
      n.title.toLowerCase().includes(search.toLowerCase()) || 
      n.content.toLowerCase().includes(search.toLowerCase());
    const matchesCat = !filterCat || n.category === filterCat;
    return matchesSearch && matchesCat;
  });

  const pinned_notes = filtered.filter(n => n.pinned);
  const regular_notes = filtered.filter(n => !n.pinned);

  // Loading skeleton
  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="flex justify-between items-center">
            <div className="h-8 w-32 bg-[var(--bg-secondary)] rounded-xl" />
            <div className="flex gap-2">
              <div className="h-10 w-20 bg-[var(--bg-secondary)] rounded-xl" />
              <div className="h-10 w-24 bg-[var(--bg-secondary)] rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]" />
            ))}
          </div>
          <div className="flex gap-3">
            <div className="flex-1 h-10 bg-[var(--bg-secondary)] rounded-xl" />
            <div className="w-40 h-10 bg-[var(--bg-secondary)] rounded-xl" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title">Notes</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Your second brain — capture ideas, wins, and lessons</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={refreshData} 
            disabled={refreshing}
            className="btn-secondary py-2 px-3 text-sm flex items-center gap-1"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="btn-secondary py-2 px-3 text-sm"
          >
            {viewMode === 'grid' ? '☰ List' : '⊞ Grid'}
          </button>
          <button onClick={openNew} className="btn-primary flex items-center gap-2 py-2 px-4">
            <Plus className="w-4 h-4" />New Note
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card p-3 text-center">
          <BookMarked className="w-4 h-4 text-knowledge mx-auto mb-1" />
          <p className="text-xl font-bold text-[var(--text-primary)]">{notes.length}</p>
          <p className="text-[10px] text-[var(--text-secondary)]">Total Notes</p>
        </div>
        <div className="card p-3 text-center">
          <Pin className="w-4 h-4 text-wealth mx-auto mb-1" />
          <p className="text-xl font-bold text-[var(--text-primary)]">{notes.filter(n => n.pinned).length}</p>
          <p className="text-[10px] text-[var(--text-secondary)]">Pinned</p>
        </div>
        <div className="card p-3 text-center">
          <Sparkles className="w-4 h-4 text-health mx-auto mb-1" />
          <p className="text-xl font-bold text-[var(--text-primary)]">{notes.filter(n => n.category === 'ideas').length}</p>
          <p className="text-[10px] text-[var(--text-secondary)]">Ideas</p>
        </div>
        <div className="card p-3 text-center">
          <Award className="w-4 h-4 text-wealth mx-auto mb-1" />
          <p className="text-xl font-bold text-[var(--text-primary)]">{notes.filter(n => n.category === 'wins').length}</p>
          <p className="text-[10px] text-[var(--text-secondary)]">Wins</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Search notes by title or content..." 
            className="input-base pl-10" 
          />
        </div>
        <div className="flex gap-2">
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="input-base w-40">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          {filterCat && (
            <button onClick={() => setFilterCat('')} className="btn-secondary px-3">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Note Editor Modal */}
      {showForm && (
        <div 
          className={`fixed inset-0 bg-black/90 flex items-center justify-center z-50 transition-all ${isFullscreen ? 'p-0' : 'p-4'}`} 
          onClick={(e) => {
            if (e.target === e.currentTarget && !isFullscreen) resetForm();
          }}
        >
          <div 
            className={`bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] flex flex-col transition-all ${
              isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-4xl max-h-[90vh]'
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <h3 className="font-medium flex items-center gap-2 text-[var(--text-primary)]">
                {editingNote ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editingNote ? 'Edit Note' : 'Create New Note'}
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className={`flex-1 overflow-y-auto p-6 ${isFullscreen ? 'p-8' : ''}`}>
              <div className="space-y-5 max-w-4xl mx-auto">
                <div>
                  <label className="text-sm text-[var(--text-secondary)] mb-2 block">Title</label>
                  <input 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && e.ctrlKey && save()} 
                    placeholder="Note title..." 
                    className="input-base text-lg font-medium" 
                    autoFocus 
                    disabled={saving}
                  />
                </div>
                
                <div>
                  <label className="text-sm text-[var(--text-secondary)] mb-2 block">Content</label>
                  <textarea 
                    value={content} 
                    onChange={e => setContent(e.target.value)} 
                    placeholder="Write your note here... Use this space to capture ideas, journal, or document important information."
                    className={`input-base resize-y font-mono text-sm leading-relaxed ${
                      isFullscreen ? 'min-h-[50vh]' : 'min-h-[300px]'
                    }`} 
                    rows={isFullscreen ? 20 : 12}
                    disabled={saving}
                  />
                </div>
                
                <div>
                  <label className="text-sm text-[var(--text-secondary)] mb-2 block">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setCategory(c.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all ${
                          category === c.id 
                            ? `${c.color} border-current bg-[var(--bg-secondary)]` 
                            : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]'
                        }`}
                        disabled={saving}
                      >
                        {c.icon}
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2">
                  <button 
                    onClick={() => setPinned(!pinned)} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition-all ${
                      pinned ? 'border-wealth bg-wealth/10 text-wealth' : 'border-[var(--border)] text-[var(--text-secondary)]'
                    }`}
                    disabled={saving}
                  >
                    <Pin className="w-4 h-4" />
                    {pinned ? 'Pinned' : 'Pin this note'}
                  </button>
                  
                  {content && (
                    <p className="text-xs text-[var(--text-secondary)]">
                      {getWordCount(content)} words · {content.length} characters
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-[var(--border)]">
              <button onClick={resetForm} className="btn-ghost py-2 px-5" disabled={saving}>
                Cancel
              </button>
              <button onClick={save} disabled={saving} className="btn-primary py-2 px-5 flex items-center gap-2">
                <Check className="w-4 h-4" />
                {saving ? 'Saving...' : (editingNote ? 'Update' : 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Content */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 card">
          <Edit3 className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
          <p className="text-[var(--text-secondary)] mb-2">
            {search || filterCat ? 'No notes match your search.' : 'Your second brain is empty.'}
          </p>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            {search || filterCat ? 'Try different keywords or clear filters.' : 'Start capturing ideas, wins, and lessons.'}
          </p>
          {!search && !filterCat && (
            <button onClick={openNew} className="btn-primary py-2 px-5">
              <Plus className="w-4 h-4 inline mr-2" />Create Your First Note
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {pinned_notes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Pin className="w-4 h-4 text-wealth" />
                <p className="section-header">Pinned Notes</p>
                <span className="text-xs text-[var(--text-secondary)]">({pinned_notes.length})</span>
              </div>
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-3'}>
                {pinned_notes.map(note => (
                  <NoteCard 
                    key={note.id} 
                    note={note} 
                    onEdit={openEdit} 
                    onDelete={(id) => setShowDeleteModal(id)} 
                    onTogglePin={togglePin}
                    viewMode={viewMode}
                    onCopy={copyToClipboard}
                  />
                ))}
              </div>
            </div>
          )}
          
          {regular_notes.length > 0 && (
            <div>
              {pinned_notes.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <BookMarked className="w-4 h-4 text-knowledge" />
                  <p className="section-header">All Notes</p>
                  <span className="text-xs text-[var(--text-secondary)]">({regular_notes.length})</span>
                </div>
              )}
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-3'}>
                {regular_notes.map(note => (
                  <NoteCard 
                    key={note.id} 
                    note={note} 
                    onEdit={openEdit} 
                    onDelete={(id) => setShowDeleteModal(id)} 
                    onTogglePin={togglePin}
                    viewMode={viewMode}
                    onCopy={copyToClipboard}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteModal(null)}>
          <div className="card max-w-sm w-full p-6 text-center" onClick={e => e.stopPropagation()}>
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="font-semibold mb-2 text-[var(--text-primary)]">Delete Note?</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => deleteNote(showDeleteModal)} className="btn-primary bg-red-500 hover:bg-red-600 flex-1">
                Delete
              </button>
              <button onClick={() => setShowDeleteModal(null)} className="btn-ghost flex-1">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Note Card Component
function NoteCard({ note, onEdit, onDelete, onTogglePin, viewMode, onCopy }: { 
  note: Note; 
  onEdit: (n: Note) => void; 
  onDelete: (id: string) => void; 
  onTogglePin: (n: Note) => void;
  viewMode: 'grid' | 'list';
  onCopy: (text: string) => void;
}) {
  const categoryInfo = categories.find(c => c.id === note.category) || categories[0];
  const previewText = note.content ? (note.content.length > 150 ? note.content.substring(0, 150) + '...' : note.content) : 'No content';
  
  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  if (viewMode === 'list') {
    return (
      <div className="card-hover p-4 group cursor-pointer" onClick={() => onEdit(note)}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs ${categoryInfo.color}`}>{categoryInfo.icon}</span>
              <h3 className="font-medium text-sm truncate text-[var(--text-primary)]">{note.title}</h3>
              {note.pinned && <Pin className="w-3 h-3 text-wealth flex-shrink-0" />}
            </div>
            {note.content && (
              <p className="text-xs text-[var(--text-secondary)] truncate">{previewText}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-[var(--text-muted)]">{getDateLabel(note.updated_at)}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={(e) => { e.stopPropagation(); onCopy(note.content || ''); }} 
                className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <Copy className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onTogglePin(note); }} 
                className={`p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors ${note.pinned ? 'text-wealth' : 'text-[var(--text-secondary)]'}`}
              >
                <Pin className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(note.id); }} 
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-red-400 hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-hover p-4 group cursor-pointer transition-all hover:scale-[1.02] hover:border-wealth/30" onClick={() => onEdit(note)}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`text-xs ${categoryInfo.color}`}>{categoryInfo.icon}</span>
          <h3 className="font-medium text-sm truncate text-[var(--text-primary)]">{note.title}</h3>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => { e.stopPropagation(); onCopy(note.content || ''); }} 
            className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onTogglePin(note); }} 
            className={`p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors ${note.pinned ? 'text-wealth' : 'text-[var(--text-secondary)]'}`}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(note.id); }} 
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-red-400 hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      {note.content && (
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3 mb-3">
          {previewText}
        </p>
      )}
      
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border)]">
        <span className={`text-[10px] ${categoryInfo.color} capitalize flex items-center gap-1`}>
          {categoryInfo.icon}
          {note.category}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5" />
            {getDateLabel(note.updated_at)}
          </span>
          {note.pinned && <Pin className="w-3 h-3 text-wealth" />}
        </div>
      </div>
    </div>
  );
}