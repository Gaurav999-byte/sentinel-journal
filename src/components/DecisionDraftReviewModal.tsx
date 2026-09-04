import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  Sparkles, 
  Trash2, 
  Plus, 
  ThumbsUp, 
  ThumbsDown, 
  AlertTriangle, 
  HelpCircle, 
  ArrowRight, 
  Calendar,
  Lock,
  Edit2
} from 'lucide-react';
import type { DecisionCardDraft } from '../types';

interface DecisionDraftReviewModalProps {
  draft: DecisionCardDraft;
  isOpen: boolean;
  isSaving: boolean;
  onApproveAndSave: (editedDraft: DecisionCardDraft) => void;
  onCancel: () => void;
}

export const DecisionDraftReviewModal: React.FC<DecisionDraftReviewModalProps> = ({
  draft,
  isOpen,
  isSaving,
  onApproveAndSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<DecisionCardDraft>({
    ...draft,
    pros: draft.pros || [],
    cons: draft.cons || [],
    unresolvedQuestions: draft.unresolvedQuestions || [],
    tradeOffs: draft.tradeOffs || [],
    risks: draft.risks || [],
    whatMatters: draft.whatMatters || [],
    options: draft.options || []
  });

  // New item inputs for array fields
  const [newOption, setNewOption] = useState('');
  const [newWhatMatters, setNewWhatMatters] = useState('');
  const [newPro, setNewPro] = useState('');
  const [newCon, setNewCon] = useState('');
  const [newTradeOff, setNewTradeOff] = useState('');
  const [newRisk, setNewRisk] = useState('');
  const [newQuestion, setNewQuestion] = useState('');

  if (!isOpen) return null;

  const confidenceScore = 
    formData.confidence === 'High' ? 85 : 
    formData.confidence === 'Medium' ? 65 : 40;

  // Array mutators
  const removeFromArray = (field: keyof DecisionCardDraft, index: number) => {
    const list = [...(formData[field] as string[])];
    list.splice(index, 1);
    setFormData({ ...formData, [field]: list });
  };

  const updateInArray = (field: keyof DecisionCardDraft, index: number, value: string) => {
    const list = [...(formData[field] as string[])];
    list[index] = value;
    setFormData({ ...formData, [field]: list });
  };

  const addToArray = (field: keyof DecisionCardDraft, value: string, clearFn: (v: string) => void) => {
    if (!value.trim()) return;
    const list = [...(formData[field] as string[]), value.trim()];
    setFormData({ ...formData, [field]: list });
    clearFn('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex justify-end">
      {/* Side Slide-Over Panel */}
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col font-sans text-slate-800 animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">Review Decision Card Draft</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                  Unsaved Draft
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Review and refine Sentinel's analysis before adding to your vault.
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            disabled={isSaving}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
            title="Cancel and discard draft"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security / Isolation Banner */}
        <div className="px-5 py-2.5 bg-blue-50/80 border-b border-blue-100 text-xs text-blue-900 flex items-center gap-2 shrink-0">
          <Lock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>
            This draft is in memory only. It will <strong>NOT</strong> be saved to your private database until you click <strong>Approve & Save</strong>.
          </span>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* 1. DECISION / QUESTION */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span>Decision / Core Dilemma</span>
              <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={formData.decision}
              onChange={(e) => setFormData({ ...formData, decision: e.target.value })}
              placeholder="What core decision is being formulated?"
              className="w-full text-sm font-semibold p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 bg-white"
            />
          </div>

          {/* 2. OPTIONS */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Options Considered ({formData.options.length})
            </label>
            <div className="space-y-2">
              {formData.options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400 w-4">{idx + 1}.</span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updateInArray('options', idx, e.target.value)}
                    className="flex-1 text-xs p-2 rounded-md border border-slate-200 text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
                  />
                  <button
                    type="button"
                    onClick={() => removeFromArray('options', idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                    title="Remove option"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addToArray('options', newOption, setNewOption);
                    }
                  }}
                  placeholder="Add another option..."
                  className="flex-1 text-xs p-2 rounded-md border border-dashed border-slate-300 placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => addToArray('options', newOption, setNewOption)}
                  disabled={!newOption.trim()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-medium rounded-md transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* 3. WHAT MATTERS (CRITERIA & VALUES) */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              What Matters / Guiding Values
            </label>
            <div className="flex flex-wrap gap-1.5">
              {formData.whatMatters.map((w, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-medium border border-slate-200"
                >
                  <span>{w}</span>
                  <button
                    type="button"
                    onClick={() => removeFromArray('whatMatters', idx)}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newWhatMatters}
                onChange={(e) => setNewWhatMatters(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addToArray('whatMatters', newWhatMatters, setNewWhatMatters);
                  }
                }}
                placeholder="Add criteria or value (e.g. Autonomy, Cashflow)..."
                className="flex-1 text-xs p-2 rounded-md border border-dashed border-slate-300 placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => addToArray('whatMatters', newWhatMatters, setNewWhatMatters)}
                disabled={!newWhatMatters.trim()}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-medium rounded-md transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 4. PROS & CONS (Two Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* PROS */}
            <div className="p-3.5 rounded-lg bg-emerald-50/50 border border-emerald-200/60 space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pros / Advantages</span>
              </div>
              <div className="space-y-1.5">
                {formData.pros.map((pro, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-xs text-emerald-950">
                    <span className="text-emerald-500 mt-1">•</span>
                    <input
                      type="text"
                      value={pro}
                      onChange={(e) => updateInArray('pros', idx, e.target.value)}
                      className="flex-1 text-xs p-1 bg-white/70 rounded border border-emerald-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeFromArray('pros', idx)}
                      className="text-emerald-400 hover:text-rose-600 p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-1 pt-1">
                  <input
                    type="text"
                    value={newPro}
                    onChange={(e) => setNewPro(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray('pros', newPro, setNewPro);
                      }
                    }}
                    placeholder="Add advantage..."
                    className="flex-1 text-xs p-1.5 bg-white rounded border border-emerald-200 placeholder:text-emerald-400 text-emerald-950 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => addToArray('pros', newPro, setNewPro)}
                    disabled={!newPro.trim()}
                    className="px-2 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* CONS */}
            <div className="p-3.5 rounded-lg bg-amber-50/50 border border-amber-200/60 space-y-2">
              <div className="flex items-center gap-1.5 text-amber-800 text-xs font-bold uppercase tracking-wider">
                <ThumbsDown className="w-3.5 h-3.5 text-amber-600" />
                <span>Cons / Disadvantages</span>
              </div>
              <div className="space-y-1.5">
                {formData.cons.map((con, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-xs text-amber-950">
                    <span className="text-amber-500 mt-1">•</span>
                    <input
                      type="text"
                      value={con}
                      onChange={(e) => updateInArray('cons', idx, e.target.value)}
                      className="flex-1 text-xs p-1 bg-white/70 rounded border border-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeFromArray('cons', idx)}
                      className="text-amber-400 hover:text-rose-600 p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-1 pt-1">
                  <input
                    type="text"
                    value={newCon}
                    onChange={(e) => setNewCon(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray('cons', newCon, setNewCon);
                      }
                    }}
                    placeholder="Add drawback..."
                    className="flex-1 text-xs p-1.5 bg-white rounded border border-amber-200 placeholder:text-amber-400 text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => addToArray('cons', newCon, setNewCon)}
                    disabled={!newCon.trim()}
                    className="px-2 py-1 bg-amber-600 text-white rounded text-xs hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* 5. TRADE-OFFS & RISKS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Trade-offs */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Trade-offs
              </label>
              <div className="space-y-1.5">
                {formData.tradeOffs.map((t, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <input
                      type="text"
                      value={t}
                      onChange={(e) => updateInArray('tradeOffs', idx, e.target.value)}
                      className="flex-1 text-xs p-1.5 rounded border border-slate-200 bg-slate-50/50"
                    />
                    <button
                      type="button"
                      onClick={() => removeFromArray('tradeOffs', idx)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newTradeOff}
                    onChange={(e) => setNewTradeOff(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray('tradeOffs', newTradeOff, setNewTradeOff);
                      }
                    }}
                    placeholder="Add trade-off (X vs Y)..."
                    className="flex-1 text-xs p-1.5 rounded border border-dashed border-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => addToArray('tradeOffs', newTradeOff, setNewTradeOff)}
                    disabled={!newTradeOff.trim()}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Risks & Unknowns */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Risks / Unknowns</span>
              </label>
              <div className="space-y-1.5">
                {formData.risks.map((r, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <input
                      type="text"
                      value={r}
                      onChange={(e) => updateInArray('risks', idx, e.target.value)}
                      className="flex-1 text-xs p-1.5 rounded border border-rose-200 bg-rose-50/30 text-rose-950"
                    />
                    <button
                      type="button"
                      onClick={() => removeFromArray('risks', idx)}
                      className="text-rose-400 hover:text-rose-600 p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newRisk}
                    onChange={(e) => setNewRisk(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray('risks', newRisk, setNewRisk);
                      }
                    }}
                    placeholder="Add risk or unknown..."
                    className="flex-1 text-xs p-1.5 rounded border border-dashed border-rose-300"
                  />
                  <button
                    type="button"
                    onClick={() => addToArray('risks', newRisk, setNewRisk)}
                    disabled={!newRisk.trim()}
                    className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* 6. UNRESOLVED QUESTIONS */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>Unresolved Questions</span>
            </label>
            <div className="space-y-1.5">
              {formData.unresolvedQuestions.map((q, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => updateInArray('unresolvedQuestions', idx, e.target.value)}
                    className="flex-1 text-xs p-2 rounded border border-slate-200 bg-slate-50/50 text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => removeFromArray('unresolvedQuestions', idx)}
                    className="text-slate-400 hover:text-rose-600 p-1.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addToArray('unresolvedQuestions', newQuestion, setNewQuestion);
                    }
                  }}
                  placeholder="Add critical question that needs answering..."
                  className="flex-1 text-xs p-2 rounded border border-dashed border-slate-300"
                />
                <button
                  type="button"
                  onClick={() => addToArray('unresolvedQuestions', newQuestion, setNewQuestion)}
                  disabled={!newQuestion.trim()}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* 7. RECOMMENDED NEXT ACTION & DEADLINE */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                <span>Recommended Next Action</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nextAction}
                onChange={(e) => setFormData({ ...formData, nextAction: e.target.value })}
                placeholder="What is the single most important immediate action?"
                className="w-full text-xs font-medium p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-blue-500 text-slate-900 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Optional Deadline</span>
              </label>
              <input
                type="text"
                value={formData.deadline || ''}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                placeholder="e.g. Next Friday, Q3 end"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-blue-500 text-slate-900 bg-white"
              />
            </div>
          </div>

          {/* 8. CONFIDENCE LEVEL */}
          <div className="space-y-2 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Confidence Assessment
              </label>
              <span className="text-xs font-bold text-blue-700">
                {formData.confidence} ({confidenceScore}%)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {(['Low', 'Medium', 'High'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setFormData({ ...formData, confidence: lvl })}
                  className={`flex-1 py-2 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
                    formData.confidence === lvl
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer Actions (Matching strict requirements: [Approve & Save] and [Cancel]) */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/90 flex items-center justify-between gap-3 shrink-0">
          <button
            id="draft-btn-cancel"
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200/80 bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            id="draft-btn-approve-save"
            type="button"
            onClick={() => onApproveAndSave(formData)}
            disabled={isSaving || !formData.decision.trim()}
            className="flex-1 max-w-xs px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Approve & Save</span>
          </button>
        </div>

      </div>
    </div>
  );
};
