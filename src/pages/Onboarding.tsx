import { useState } from 'react';
import { Heart, BookOpen, Briefcase, DollarSign, Building2, TrendingUp, Check, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Pillar } from '../types';

const pillars: { id: Pillar; icon: React.ElementType; label: string; desc: string; color: string; bg: string }[] = [
  { id: 'health', icon: Heart, label: 'Health', desc: 'Fitness, weight, sleep', color: 'text-health', bg: 'border-health/30 bg-health/5' },
  { id: 'knowledge', icon: BookOpen, label: 'Knowledge', desc: 'Skills, books, learning', color: 'text-knowledge', bg: 'border-knowledge/30 bg-knowledge/5' },
  { id: 'career', icon: Briefcase, label: 'Career', desc: 'Growth, opportunities', color: 'text-career', bg: 'border-career/30 bg-career/5' },
  { id: 'wealth', icon: DollarSign, label: 'Wealth', desc: 'Net worth, investments', color: 'text-wealth', bg: 'border-wealth/30 bg-wealth/5' },
  { id: 'business', icon: Building2, label: 'Business', desc: 'Revenue, operations', color: 'text-business', bg: 'border-business/30 bg-business/5' },
];

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [selectedPillars, setSelectedPillars] = useState<Pillar[]>(['health', 'knowledge', 'career', 'wealth', 'business']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const togglePillar = (id: Pillar) => {
    setSelectedPillars(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleComplete = async () => {
    if (!user || selectedPillars.length === 0) return;
    setLoading(true);
    setError('');

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      name: name.trim() || 'User',
      age: age ? parseInt(age) : null,
      gender: gender || null,
      selected_pillars: selectedPillars,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    await refreshProfile();
    onComplete();
  };

  return (
    <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center p-6">
      <div className="w-full max-w-xl animate-fade-in">
        <div className="flex items-center gap-2 mb-12">
          <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-[#0B0B0B]" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-lg">Climb</span>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-10">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full text-xs font-medium flex items-center justify-center transition-all ${
                s < step ? 'bg-[#F5F5F5] text-[#0B0B0B]' :
                s === step ? 'bg-[#2A2A2A] text-[#F5F5F5] ring-1 ring-[#3A3A3A]' :
                'bg-[#1A1A1A] text-[#5A5A5A]'
              }`}>
                {s < step ? <Check className="w-3 h-3" /> : s}
              </div>
              {s < 3 && <div className={`h-px w-8 transition-all ${s < step ? 'bg-[#3A3A3A]' : 'bg-[#1E1E1E]'}`} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="animate-slide-up">
            <h1 className="text-2xl font-bold tracking-tight mb-2">What should we call you?</h1>
            <p className="text-sm text-[#A0A0A0] mb-8">Tell us a bit about yourself to personalize your experience.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#A0A0A0] mb-1.5">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Arjun Sharma"
                  className="input-base"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#A0A0A0] mb-1.5">Age <span className="text-[#5A5A5A]">(optional)</span></label>
                  <input
                    type="number"
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    placeholder="e.g. 25"
                    min={10}
                    max={100}
                    className="input-base"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A0A0A0] mb-1.5">Gender <span className="text-[#5A5A5A]">(optional)</span></label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                    className="input-base"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!name.trim()}
              className="btn-primary w-full mt-8 py-3 flex items-center justify-center gap-2"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-slide-up">
            <h1 className="text-2xl font-bold tracking-tight mb-2">Which areas matter to you?</h1>
            <p className="text-sm text-[#A0A0A0] mb-8">Select all that apply. You can always change this later.</p>
            <div className="space-y-3">
              {pillars.map(({ id, icon: Icon, label, desc, color, bg }) => {
                const selected = selectedPillars.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => togglePillar(id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-150 text-left ${
                      selected ? `${bg} border-opacity-60` : 'border-[#1E1E1E] bg-transparent hover:border-[#242424]'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selected ? 'bg-white/5' : 'bg-[#1A1A1A]'}`}>
                      <Icon className={`w-5 h-5 ${selected ? color : 'text-[#5A5A5A]'}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium text-sm ${selected ? 'text-[#F5F5F5]' : 'text-[#A0A0A0]'}`}>{label}</p>
                      <p className="text-xs text-[#5A5A5A]">{desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      selected ? 'bg-[#F5F5F5] border-[#F5F5F5]' : 'border-[#3A3A3A]'
                    }`}>
                      {selected && <Check className="w-3 h-3 text-[#0B0B0B]" />}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1 py-3">Back</button>
              <button
                onClick={() => setStep(3)}
                disabled={selectedPillars.length === 0}
                className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-slide-up">
            <h1 className="text-2xl font-bold tracking-tight mb-2">You're all set, {name}!</h1>
            <p className="text-sm text-[#A0A0A0] mb-8">Your personal operating system is ready. Let's start climbing.</p>

            <div className="card p-6 mb-8">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#5A5A5A] mb-0.5">Name</p>
                  <p className="text-sm font-medium">{name}</p>
                </div>
                {age && (
                  <div>
                    <p className="text-xs text-[#5A5A5A] mb-0.5">Age</p>
                    <p className="text-sm font-medium">{age}</p>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <p className="text-xs text-[#5A5A5A] mb-2">Selected Pillars</p>
                <div className="flex flex-wrap gap-2">
                  {pillars.filter(p => selectedPillars.includes(p.id)).map(({ icon: Icon, label, color }) => (
                    <span key={label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1A1A1A] border border-[#242424] text-xs">
                      <Icon className={`w-3 h-3 ${color}`} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400 mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="btn-secondary flex-1 py-3">Back</button>
              <button
                onClick={handleComplete}
                disabled={loading}
                className="btn-primary flex-1 py-3"
              >
                {loading ? 'Setting up...' : 'Open Dashboard'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
