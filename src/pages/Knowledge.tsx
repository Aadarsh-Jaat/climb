import { useEffect, useState, useCallback } from 'react';
import { 
  Plus, BookOpen, Award, Star, Trash2, Edit3, CheckCircle, Circle, BookMarked, 
  GraduationCap, Target, Calendar, Clock, TrendingUp, ChevronRight, X, Save, AlertCircle, RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Skill, Book, Course } from '../types';

type Tab = 'skills' | 'books' | 'courses';
type EditMode = 'create' | 'edit';

export default function Knowledge() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('skills');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Skill form
  const [skillName, setSkillName] = useState('');
  const [skillLevel, setSkillLevel] = useState(3);
  const [skillCat, setSkillCat] = useState('general');
  const [skillStartDate, setSkillStartDate] = useState(today);
  const [skillCompletedDate, setSkillCompletedDate] = useState('');
  
  // Book form
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookStatus, setBookStatus] = useState('reading');
  const [bookPages, setBookPages] = useState('');
  const [bookPagesRead, setBookPagesRead] = useState('');
  const [bookStartDate, setBookStartDate] = useState(today);
  const [bookCompletedDate, setBookCompletedDate] = useState('');
  const [bookNotes, setBookNotes] = useState('');
  
  // Course form
  const [courseTitle, setCourseTitle] = useState('');
  const [coursePlatform, setCoursePlatform] = useState('');
  const [courseType, setCourseType] = useState('course');
  const [courseStatus, setCourseStatus] = useState('in_progress');
  const [courseProgress, setCourseProgress] = useState('0');
  const [courseStartDate, setCourseStartDate] = useState(today);
  const [courseCompletedDate, setCourseCompletedDate] = useState('');
  
  // UI state
  const [showBookProgressModal, setShowBookProgressModal] = useState<string | null>(null);
  const [tempPagesRead, setTempPagesRead] = useState<number>(0);

  const levelLabels = ['', 'Beginner', 'Basic', 'Intermediate', 'Advanced', 'Expert'];

  // Load all knowledge data with caching
  const reloadKnowledge = useCallback(async () => {
    if (!user) return;

    const [s, b, c] = await Promise.all([
      supabase.from('skills').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('books').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('courses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);

    if (s.error) console.error('Skills Error:', s.error);
    if (b.error) console.error('Books Error:', b.error);
    if (c.error) console.error('Courses Error:', c.error);

    setSkills((s.data || []) as Skill[]);
    setBooks((b.data || []) as Book[]);
    setCourses((c.data || []) as Course[]);
  }, [user]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await reloadKnowledge();
    setRefreshing(false);
  }, [user, reloadKnowledge]);

  // Warm up Supabase connection
  useEffect(() => {
    const warmupConnection = async () => {
      if (user) {
        try {
          await supabase.from('skills').select('count', { count: 'exact', head: true });
          console.log('Supabase connection ready for Knowledge');
        } catch (err) {
          console.log('Connection warmup failed');
        }
      }
    };
    warmupConnection();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      await reloadKnowledge();
      setLoading(false);
    };
    load();
  }, [user, reloadKnowledge]);

  // Reset form
  const resetForm = () => {
    setSkillName('');
    setSkillLevel(3);
    setSkillCat('general');
    setSkillStartDate(today);
    setSkillCompletedDate('');
    setBookTitle('');
    setBookAuthor('');
    setBookStatus('reading');
    setBookPages('');
    setBookPagesRead('');
    setBookStartDate(today);
    setBookCompletedDate('');
    setBookNotes('');
    setCourseTitle('');
    setCoursePlatform('');
    setCourseType('course');
    setCourseStatus('in_progress');
    setCourseProgress('0');
    setCourseStartDate(today);
    setCourseCompletedDate('');
    setEditMode('create');
    setEditingId(null);
    setShowForm(false);
  };

  // Generic retry function for insert/update operations
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

  // Skill CRUD
  const addSkill = async () => {
    if (!skillName.trim() || !user || saving) return;

    if (skillCompletedDate && skillStartDate && skillCompletedDate < skillStartDate) {
      alert('Completed date cannot be before start date');
      return;
    }

    setSaving(true);
    try {
      await withRetry(async () => {
        const { error } = await supabase.from('skills').insert({
          user_id: user.id,
          name: skillName.trim(),
          level: skillLevel,
          category: skillCat,
          start_date: skillStartDate || null,
          completed_date: skillCompletedDate || null,
          status: skillCompletedDate ? 'completed' : 'learning'
        });
        if (error) throw error;
      }, 'add skill');
      
      await reloadKnowledge();
      resetForm();
    } catch (err: any) {
      alert(`Failed to add skill: ${err?.message}`);
    } finally {
      setSaving(false);
    }
  };

  const updateSkill = async () => {
    if (!skillName.trim() || !user || saving || !editingId) return;

    if (skillCompletedDate && skillStartDate && skillCompletedDate < skillStartDate) {
      alert('Completed date cannot be before start date');
      return;
    }

    setSaving(true);
    try {
      await withRetry(async () => {
        const { error } = await supabase.from('skills')
          .update({
            name: skillName.trim(),
            level: skillLevel,
            category: skillCat,
            start_date: skillStartDate || null,
            completed_date: skillCompletedDate || null,
            status: skillCompletedDate ? 'completed' : 'learning'
          })
          .eq('id', editingId);
        if (error) throw error;
      }, 'update skill');
      
      await reloadKnowledge();
      resetForm();
    } catch (err: any) {
      alert(`Failed to update skill: ${err?.message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteSkill = async (id: string) => {
    if (!confirm('Delete this skill?')) return;
    await supabase.from('skills').delete().eq('id', id);
    await reloadKnowledge();
  };

  const editSkill = (skill: Skill) => {
    setSkillName(skill.name);
    setSkillLevel(skill.level);
    setSkillCat(skill.category || 'general');
    setSkillStartDate(skill.start_date?.split('T')[0] || today);
    setSkillCompletedDate(skill.completed_date?.split('T')[0] || '');
    setEditMode('edit');
    setEditingId(skill.id);
    setShowForm(true);
  };

  const toggleSkillStatus = async (skill: Skill) => {
    const newStatus = skill.status === 'completed' ? 'learning' : 'completed';
    const completedDate = newStatus === 'completed' ? today : null;
    
    const { error } = await supabase.from('skills')
      .update({ status: newStatus, completed_date: completedDate })
      .eq('id', skill.id);
    
    if (!error) await reloadKnowledge();
  };

  // Book CRUD
  const addBook = async () => {
    if (!bookTitle.trim() || !user || saving) return;

    if (bookCompletedDate && bookStartDate && bookCompletedDate < bookStartDate) {
      alert('Completed date cannot be before start date');
      return;
    }

    setSaving(true);
    try {
      await withRetry(async () => {
        const { error } = await supabase.from('books').insert({
          user_id: user.id,
          title: bookTitle.trim(),
          author: bookAuthor.trim(),
          status: bookStatus,
          start_date: bookStartDate || null,
          completed_date: bookCompletedDate || null,
          pages_total: Number(bookPages) || 0,
          pages_read: Number(bookPagesRead) || 0,
          notes: bookNotes.trim() || null
        });
        if (error) throw error;
      }, 'add book');
      
      await reloadKnowledge();
      resetForm();
    } catch (err: any) {
      alert(`Failed to add book: ${err?.message}`);
    } finally {
      setSaving(false);
    }
  };

  const updateBook = async () => {
    if (!bookTitle.trim() || !user || saving || !editingId) return;

    if (bookCompletedDate && bookStartDate && bookCompletedDate < bookStartDate) {
      alert('Completed date cannot be before start date');
      return;
    }

    setSaving(true);
    try {
      await withRetry(async () => {
        const { error } = await supabase.from('books')
          .update({
            title: bookTitle.trim(),
            author: bookAuthor.trim(),
            status: bookStatus,
            start_date: bookStartDate || null,
            completed_date: bookCompletedDate || null,
            pages_total: Number(bookPages) || 0,
            pages_read: Number(bookPagesRead) || 0,
            notes: bookNotes.trim() || null
          })
          .eq('id', editingId);
        if (error) throw error;
      }, 'update book');
      
      await reloadKnowledge();
      resetForm();
    } catch (err: any) {
      alert(`Failed to update book: ${err?.message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteBook = async (id: string) => {
    if (!confirm('Delete this book?')) return;
    await supabase.from('books').delete().eq('id', id);
    await reloadKnowledge();
  };

  const editBook = (book: Book) => {
    setBookTitle(book.title);
    setBookAuthor(book.author || '');
    setBookStatus(book.status);
    setBookPages(book.pages_total?.toString() || '');
    setBookPagesRead(book.pages_read?.toString() || '');
    setBookStartDate(book.start_date?.split('T')[0] || today);
    setBookCompletedDate(book.completed_date?.split('T')[0] || '');
    setBookNotes(book.notes || '');
    setEditMode('edit');
    setEditingId(book.id);
    setShowForm(true);
  };

  const updateBookProgress = async (bookId: string, newPagesRead: number) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    
    const newProgress = Math.min(newPagesRead, book.pages_total);
    const isCompleted = newProgress >= book.pages_total;
    const status = isCompleted ? 'completed' : book.status;
    const completedDate = isCompleted && !book.completed_date ? today : book.completed_date;
    
    const { error } = await supabase.from('books')
      .update({ 
        pages_read: newProgress, 
        status,
        completed_date: completedDate
      })
      .eq('id', bookId);
    
    if (!error) {
      await reloadKnowledge();
      setShowBookProgressModal(null);
    }
  };

  // Course CRUD
  const addCourse = async () => {
    if (!courseTitle.trim() || !user || saving) return;

    if (courseCompletedDate && courseStartDate && courseCompletedDate < courseStartDate) {
      alert('Completed date cannot be before start date');
      return;
    }

    setSaving(true);
    try {
      await withRetry(async () => {
        const { error } = await supabase.from('courses').insert({
          user_id: user.id,
          title: courseTitle.trim(),
          platform: coursePlatform.trim(),
          type: courseType,
          status: courseStatus,
          progress: Number(courseProgress) || 0,
          start_date: courseStartDate || null,
          completed_date: courseCompletedDate || null
        });
        if (error) throw error;
      }, 'add course');
      
      await reloadKnowledge();
      resetForm();
    } catch (err: any) {
      alert(`Failed to add course: ${err?.message}`);
    } finally {
      setSaving(false);
    }
  };

  const updateCourse = async () => {
    if (!courseTitle.trim() || !user || saving || !editingId) return;

    if (courseCompletedDate && courseStartDate && courseCompletedDate < courseStartDate) {
      alert('Completed date cannot be before start date');
      return;
    }

    setSaving(true);
    try {
      await withRetry(async () => {
        const { error } = await supabase.from('courses')
          .update({
            title: courseTitle.trim(),
            platform: coursePlatform.trim(),
            type: courseType,
            status: courseStatus,
            progress: Number(courseProgress) || 0,
            start_date: courseStartDate || null,
            completed_date: courseCompletedDate || null
          })
          .eq('id', editingId);
        if (error) throw error;
      }, 'update course');
      
      await reloadKnowledge();
      resetForm();
    } catch (err: any) {
      alert(`Failed to update course: ${err?.message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteCourse = async (id: string) => {
    if (!confirm('Delete this course?')) return;
    await supabase.from('courses').delete().eq('id', id);
    await reloadKnowledge();
  };

  const editCourse = (course: Course) => {
    setCourseTitle(course.title);
    setCoursePlatform(course.platform || '');
    setCourseType(course.type);
    setCourseStatus(course.status);
    setCourseProgress(course.progress.toString());
    setCourseStartDate(course.start_date?.split('T')[0] || today);
    setCourseCompletedDate(course.completed_date?.split('T')[0] || '');
    setEditMode('edit');
    setEditingId(course.id);
    setShowForm(true);
  };

  const updateCourseProgress = async (courseId: string, newProgress: number) => {
    const isCompleted = newProgress >= 100;
    const status = isCompleted ? 'completed' : 'in_progress';
    const completedDate = isCompleted ? today : null;
    
    const { error } = await supabase.from('courses')
      .update({ 
        progress: newProgress,
        status,
        completed_date: completedDate
      })
      .eq('id', courseId);
    
    if (!error) await reloadKnowledge();
  };

  // Stats calculation
  const completedCourses = courses.filter(c => c.status === 'completed').length;
  const totalPagesRead = books.reduce((sum, b) => sum + (b.pages_read || 0), 0);
  const avgSkillLevel = skills.length ? (skills.reduce((sum, s) => sum + s.level, 0) / skills.length).toFixed(1) : 0;

  const handleSubmit = () => {
    if (tab === 'skills') {
      if (editMode === 'create') addSkill();
      else updateSkill();
    } else if (tab === 'books') {
      if (editMode === 'create') addBook();
      else updateBook();
    } else if (tab === 'courses') {
      if (editMode === 'create') addCourse();
      else updateCourse();
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="flex justify-between items-center">
            <div className="h-8 w-32 bg-[var(--bg-secondary)] rounded-xl" />
            <div className="h-10 w-24 bg-[var(--bg-secondary)] rounded-xl" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]" />
            ))}
          </div>
          <div className="h-10 w-64 bg-[var(--bg-secondary)] rounded-xl" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-[var(--bg-card)] rounded-xl border border-[var(--border)]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Knowledge</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Track skills, books, and courses</p>
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
            onClick={() => { resetForm(); setShowForm(!showForm); }} 
            className="btn-primary flex items-center gap-2 py-2 px-4"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancel' : 'Add'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card p-4 text-center transition-all">
          <div className="flex items-center justify-center gap-2 text-knowledge mb-2">
            <Target className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{skills.length}</p>
          <p className="text-xs text-[var(--text-secondary)]">Skills</p>
          <p className="text-xs text-knowledge mt-1">Avg Lvl {avgSkillLevel}</p>
        </div>
        
        <div className="card p-4 text-center transition-all">
          <div className="flex items-center justify-center gap-2 text-knowledge mb-2">
            <BookMarked className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{books.length}</p>
          <p className="text-xs text-[var(--text-secondary)]">Books</p>
          <p className="text-xs text-knowledge mt-1">{totalPagesRead} pages read</p>
        </div>
        
        <div className="card p-4 text-center transition-all">
          <div className="flex items-center justify-center gap-2 text-knowledge mb-2">
            <GraduationCap className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{courses.length}</p>
          <p className="text-xs text-[var(--text-secondary)]">Courses</p>
        </div>
        
        <div className="card p-4 text-center transition-all">
          <div className="flex items-center justify-center gap-2 text-green-400 mb-2">
            <CheckCircle className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{completedCourses}</p>
          <p className="text-xs text-[var(--text-secondary)]">Completed</p>
          <p className="text-xs text-green-400 mt-1">Certifications</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-1 mb-6 w-fit">
        {(['skills', 'books', 'courses'] as Tab[]).map(t => (
          <button 
            key={t} 
            onClick={() => { setTab(t); resetForm(); setShowForm(false); }} 
            className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all flex items-center gap-2 ${
              tab === t ? 'bg-[var(--bg-card)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t === 'skills' && <Star className="w-4 h-4" />}
            {t === 'books' && <BookOpen className="w-4 h-4" />}
            {t === 'courses' && <Award className="w-4 h-4" />}
            {t}
          </button>
        ))}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card p-5 mb-6 animate-slide-up border-knowledge/20">
          <h3 className="font-medium mb-4 flex items-center gap-2 text-[var(--text-primary)]">
            {editMode === 'create' ? <Plus className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            {editMode === 'create' ? `Add New ${tab.slice(0, -1).charAt(0).toUpperCase() + tab.slice(0, -1).slice(1)}` : `Edit ${tab.slice(0, -1)}`}
          </h3>
          
          {/* Skill Form */}
          {tab === 'skills' && (
            <div className="space-y-4">
              <input 
                value={skillName} 
                onChange={e => setSkillName(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleSubmit()} 
                placeholder="Skill name (e.g., React, Public Speaking)..." 
                className="input-base" 
                autoFocus 
                disabled={saving}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Proficiency Level</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="range" 
                      min={1} 
                      max={5} 
                      value={skillLevel} 
                      onChange={e => setSkillLevel(parseInt(e.target.value))} 
                      className="flex-1 accent-knowledge" 
                      disabled={saving}
                    />
                    <span className="text-sm font-medium text-knowledge min-w-[70px]">{levelLabels[skillLevel]}</span>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Category</label>
                  <input 
                    value={skillCat} 
                    onChange={e => setSkillCat(e.target.value)} 
                    placeholder="e.g., Programming, Design, Marketing" 
                    className="input-base" 
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Start Date
                  </label>
                  <input
                    type="date"
                    value={skillStartDate}
                    onChange={e => setSkillStartDate(e.target.value)}
                    className="input-base"
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-1.5 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Completed Date (optional)
                  </label>
                  <input
                    type="date"
                    value={skillCompletedDate}
                    onChange={e => setSkillCompletedDate(e.target.value)}
                    className="input-base"
                    disabled={saving}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Book Form */}
          {tab === 'books' && (
            <div className="space-y-4">
              <input 
                value={bookTitle} 
                onChange={e => setBookTitle(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleSubmit()} 
                placeholder="Book title..." 
                className="input-base" 
                autoFocus 
                disabled={saving}
              />
              
              <input 
                value={bookAuthor} 
                onChange={e => setBookAuthor(e.target.value)} 
                placeholder="Author (optional)" 
                className="input-base" 
                disabled={saving}
              />
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <select value={bookStatus} onChange={e => setBookStatus(e.target.value)} className="input-base" disabled={saving}>
                  <option value="want_to_read">📖 Want to Read</option>
                  <option value="reading">📚 Currently Reading</option>
                  <option value="completed">✅ Completed</option>
                </select>
                
                <input 
                  type="number" 
                  value={bookPages} 
                  onChange={e => setBookPages(e.target.value)} 
                  placeholder="Total pages" 
                  className="input-base" 
                  disabled={saving}
                />
                
                <input 
                  type="number" 
                  value={bookPagesRead} 
                  onChange={e => setBookPagesRead(e.target.value)} 
                  placeholder="Pages read" 
                  className="input-base" 
                  disabled={saving}
                />
                
                <input 
                  type="date" 
                  value={bookStartDate} 
                  onChange={e => setBookStartDate(e.target.value)} 
                  className="input-base" 
                  disabled={saving}
                />
              </div>
              
              <textarea 
                value={bookNotes} 
                onChange={e => setBookNotes(e.target.value)} 
                placeholder="Notes, key takeaways, quotes..." 
                className="input-base min-h-[80px]" 
                disabled={saving}
              />
            </div>
          )}

          {/* Course Form */}
          {tab === 'courses' && (
            <div className="space-y-4">
              <input 
                value={courseTitle} 
                onChange={e => setCourseTitle(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleSubmit()} 
                placeholder="Course title..." 
                className="input-base" 
                autoFocus 
                disabled={saving}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input 
                  value={coursePlatform} 
                  onChange={e => setCoursePlatform(e.target.value)} 
                  placeholder="Platform (Udemy, Coursera, etc)" 
                  className="input-base" 
                  disabled={saving}
                />
                
                <select value={courseType} onChange={e => setCourseType(e.target.value)} className="input-base" disabled={saving}>
                  <option value="course">📘 Course</option>
                  <option value="certification">🎓 Certification</option>
                  <option value="workshop">🔧 Workshop</option>
                </select>
                
                <select value={courseStatus} onChange={e => setCourseStatus(e.target.value)} className="input-base" disabled={saving}>
                  <option value="in_progress">⚡ In Progress</option>
                  <option value="paused">⏸️ Paused</option>
                  <option value="completed">✅ Completed</option>
                </select>
              </div>
              
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Progress: {courseProgress}%</label>
                <input 
                  type="range" 
                  min={0} 
                  max={100} 
                  value={courseProgress} 
                  onChange={e => setCourseProgress(e.target.value)} 
                  className="w-full accent-knowledge" 
                  disabled={saving}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Start Date</label>
                  <input
                    type="date"
                    value={courseStartDate}
                    onChange={e => setCourseStartDate(e.target.value)}
                    className="input-base"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Completed Date</label>
                  <input
                    type="date"
                    value={courseCompletedDate}
                    onChange={e => setCourseCompletedDate(e.target.value)}
                    className="input-base"
                    disabled={saving}
                  />
                </div>
              </div>
            </div>
          )}
          
          <div className="flex gap-3 mt-6">
            <button onClick={handleSubmit} disabled={saving} className="btn-primary py-2 px-6">
              {saving ? 'Saving...' : (editMode === 'create' ? 'Add' : 'Update')}
            </button>
            <button onClick={resetForm} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {/* Content Lists */}
      <>
        {/* Skills List */}
        {tab === 'skills' && (
          skills.length === 0 ? (
            <EmptyState icon={Star} text="No skills yet. Add your first skill to track your learning journey." actionText="Add Skill" onAction={() => setShowForm(true)} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {skills.map(skill => {
                const isCompleted = skill.status === 'completed';
                return (
                  <div key={skill.id} className="card-hover p-4 group">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <button 
                            onClick={() => toggleSkillStatus(skill)}
                            className={`transition-colors ${isCompleted ? 'text-green-400' : 'text-[var(--text-muted)] hover:text-knowledge'}`}
                          >
                            {isCompleted ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                          </button>
                          <p className={`font-medium text-sm ${isCompleted ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
                            {skill.name}
                          </p>
                        </div>
                        
                        <div className="ml-6">
                          <div className="flex items-center gap-2 mb-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div
                                key={i}
                                className={`h-1.5 flex-1 rounded-full transition-all ${
                                  i < skill.level ? 'bg-knowledge' : 'bg-[var(--border)]'
                                }`}
                              />
                            ))}
                            <span className="text-[10px] text-knowledge ml-1">{levelLabels[skill.level]}</span>
                          </div>
                          
                          <div className="flex items-center gap-3 text-xs">
                            {skill.category && (
                              <span className="text-[var(--text-secondary)] px-2 py-0.5 rounded-full bg-[var(--bg-secondary)]">{skill.category}</span>
                            )}
                            {skill.start_date && (
                              <span className="text-[var(--text-secondary)] flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Started {new Date(skill.start_date).toLocaleDateString()}
                              </span>
                            )}
                            {skill.completed_date && (
                              <span className="text-green-400 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Completed {new Date(skill.completed_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => editSkill(skill)} className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors">
                          <Edit3 className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                        </button>
                        <button onClick={() => deleteSkill(skill.id)} className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5 text-[var(--text-secondary)] hover:text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Books List */}
        {tab === 'books' && (
          books.length === 0 ? (
            <EmptyState icon={BookOpen} text="No books yet. Start your reading journey." actionText="Add Book" onAction={() => setShowForm(true)} />
          ) : (
            <div className="space-y-3">
              {books.map(book => {
                const pct = book.pages_total ? Math.round((book.pages_read / book.pages_total) * 100) : 0;
                const statusConfig = {
                  reading: { color: 'text-knowledge', icon: '📖', label: 'Reading' },
                  completed: { color: 'text-green-400', icon: '✅', label: 'Completed' },
                  want_to_read: { color: 'text-[var(--text-secondary)]', icon: '📚', label: 'Want to Read' }
                };
                const config = statusConfig[book.status as keyof typeof statusConfig] || statusConfig.want_to_read;
                
                return (
                  <div key={book.id} className="card-hover p-4 group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm text-[var(--text-primary)]">{book.title}</p>
                          {book.author && <p className="text-xs text-[var(--text-secondary)]">by {book.author}</p>}
                        </div>
                        
                        {book.pages_total > 0 && (
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-3 h-3" /> {book.pages_read} / {book.pages_total} pages
                              </span>
                              <span>{pct}%</span>
                            </div>
                            <div className="progress-bar cursor-pointer" onClick={() => setShowBookProgressModal(book.id)}>
                              <div className="progress-fill bg-knowledge" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )}
                        
                        {book.notes && (
                          <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2">{book.notes}</p>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-xs font-medium ${config.color} flex items-center gap-1`}>
                          <span>{config.icon}</span> {config.label}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => editBook(book)} className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors">
                            <Edit3 className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                          </button>
                          <button onClick={() => deleteBook(book.id)} className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors">
                            <Trash2 className="w-3.5 h-3.5 text-[var(--text-secondary)] hover:text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Courses List */}
        {tab === 'courses' && (
          courses.length === 0 ? (
            <EmptyState icon={Award} text="No courses yet. Add your first course." actionText="Add Course" onAction={() => setShowForm(true)} />
          ) : (
            <div className="space-y-3">
              {courses.map(course => {
                const statusConfig = {
                  in_progress: { color: 'text-knowledge', icon: '⚡', label: 'In Progress' },
                  completed: { color: 'text-green-400', icon: '✅', label: 'Completed' },
                  paused: { color: 'text-[var(--text-secondary)]', icon: '⏸️', label: 'Paused' }
                };
                const config = statusConfig[course.status as keyof typeof statusConfig] || statusConfig.in_progress;
                
                return (
                  <div key={course.id} className="card-hover p-4 group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm text-[var(--text-primary)]">{course.title}</p>
                          {course.platform && (
                            <span className="text-xs text-[var(--text-secondary)] px-2 py-0.5 rounded-full bg-[var(--bg-secondary)]">{course.platform}</span>
                          )}
                          {course.type && (
                            <span className="text-xs text-knowledge/60 px-2 py-0.5 rounded-full bg-knowledge/10 capitalize">{course.type}</span>
                          )}
                        </div>
                        
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" /> Progress
                            </span>
                            <span>{course.progress}%</span>
                          </div>
                          <div className="progress-bar">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={course.progress}
                              onChange={(e) => updateCourseProgress(course.id, parseInt(e.target.value))}
                              className="w-full accent-knowledge cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-xs font-medium ${config.color} flex items-center gap-1`}>
                          <span>{config.icon}</span> {config.label}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => editCourse(course)} className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors">
                            <Edit3 className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                          </button>
                          <button onClick={() => deleteCourse(course.id)} className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors">
                            <Trash2 className="w-3.5 h-3.5 text-[var(--text-secondary)] hover:text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </>

      {/* Book Progress Modal */}
      {showBookProgressModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowBookProgressModal(null)}>
          <div className="card max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-medium mb-4 text-[var(--text-primary)]">Update Reading Progress</h3>
            <input
              type="number"
              value={tempPagesRead}
              onChange={e => setTempPagesRead(parseInt(e.target.value))}
              placeholder="Pages read"
              className="input-base mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => updateBookProgress(showBookProgressModal, tempPagesRead)} className="btn-primary flex-1">
                Update
              </button>
              <button onClick={() => setShowBookProgressModal(null)} className="btn-ghost flex-1">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, text, actionText, onAction }: { icon: React.ElementType; text: string; actionText?: string; onAction?: () => void }) {
  return (
    <div className="text-center py-16 card">
      <Icon className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
      <p className="text-[var(--text-secondary)] text-sm mb-4">{text}</p>
      {actionText && onAction && (
        <button onClick={onAction} className="btn-primary py-2 px-4 text-sm">
          <Plus className="w-4 h-4 inline mr-1" /> {actionText}
        </button>
      )}
    </div>
  );
}