import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Target, 
  Scale, 
  HelpCircle, 
  Lightbulb, 
  ArrowRight, 
  TrendingUp, 
  AlertTriangle,
  Copy,
  Check,
  Split,
  Compass
} from 'lucide-react';

interface AiMessageRendererProps {
  content: string;
  onTurnIntoDecision?: () => void;
}

interface ParsedOption {
  badge: string;
  title: string;
  summary?: string;
  upsides: string[];
  tradeOffs: string[];
  otherNotes: string[];
}

interface ParsedBlock {
  type: 'markdown' | 'thinking_block' | 'comparison_group';
  category?: 'bottom_line' | 'trade_offs' | 'considerations' | 'insight' | 'next_steps';
  title?: string;
  content?: string;
  options?: ParsedOption[];
}

/**
 * Safely converts literal HTML line breaks (<br>, <br/>, <br />, <BR>, &lt;br&gt;)
 * into real React JSX <br /> elements across text and component subtrees.
 */
export function renderWithLineBreaks(children: React.ReactNode, keyPrefix = 'br'): React.ReactNode {
  if (children === null || children === undefined || typeof children === 'boolean' || typeof children === 'number') {
    return children;
  }

  if (typeof children === 'string') {
    const brRegex = /<\s*br\s*\/?>|&lt;\s*br\s*\/?&gt;/gi;
    if (!brRegex.test(children)) {
      return children;
    }

    const parts = children.split(brRegex);
    const result: React.ReactNode[] = [];
    parts.forEach((part, index) => {
      if (index > 0) {
        result.push(<br key={`${keyPrefix}-br-${index}`} />);
      }
      if (part) {
        result.push(part);
      }
    });
    return result.length === 1 ? result[0] : result;
  }

  if (Array.isArray(children)) {
    const flattened: React.ReactNode[] = [];
    children.forEach((child, index) => {
      const processed = renderWithLineBreaks(child, `${keyPrefix}-${index}`);
      if (Array.isArray(processed)) {
        processed.forEach((subChild, subIdx) => {
          if (React.isValidElement(subChild) && !subChild.key) {
            flattened.push(React.cloneElement(subChild, { key: `${keyPrefix}-${index}-${subIdx}` }));
          } else {
            flattened.push(subChild);
          }
        });
      } else if (React.isValidElement(processed)) {
        if (!processed.key) {
          flattened.push(React.cloneElement(processed, { key: `${keyPrefix}-${index}` }));
        } else {
          flattened.push(processed);
        }
      } else if (processed !== null && processed !== undefined) {
        flattened.push(processed);
      }
    });
    return flattened;
  }

  if (React.isValidElement(children)) {
    const props = children.props as any;
    if (props && 'children' in props && props.children !== undefined) {
      return React.cloneElement(children, {
        ...props,
        children: renderWithLineBreaks(props.children, `${keyPrefix}-c`)
      });
    }
  }

  return children;
}

/**
 * Intelligent parser that detects natural thinking structures:
 * - Option Comparisons (Option A vs Option B)
 * - Bottom Line (Summary/Actionable essence)
 * - Trade-offs (Tensions and balanced choices)
 * - What to Consider (Blind spots, unknowns, crucial factors)
 * - Insight (Perceptive observations)
 * - Next Steps (Actionable progression)
 */
function parseMessageContent(text: string): ParsedBlock[] {
  if (!text || typeof text !== 'string') return [];

  // Normalize line endings
  const normalized = text.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  const blocks: ParsedBlock[] = [];
  let currentMarkdownLines: string[] = [];

  const flushMarkdown = () => {
    const md = currentMarkdownLines.join('\n').trim();
    if (md) {
      blocks.push({ type: 'markdown', content: md });
    }
    currentMarkdownLines = [];
  };

  // Helper to test if a line is a section header or bold title
  const matchSection = (line: string) => {
    const trimmed = line.trim();
    
    // Check for Option header: e.g. "### Option A: ...", "### Option 1: ...", "**Option A: ...**"
    const optionMatch = trimmed.match(/^(?:#{2,4}\s*|\*{2})(?:Option|Choice)\s*([A-Z0-9]+)[:\-–—]?\s*(.*?)(?:\*{2})?$/i);
    if (optionMatch) {
      return {
        type: 'option',
        badge: `OPTION ${optionMatch[1].toUpperCase()}`,
        title: optionMatch[2].replace(/\*{2}/g, '').trim() || `Option ${optionMatch[1]}`
      };
    }

    // Check for Bottom Line
    if (/(?:^#{2,4}\s*|\*{2}|🎯\s*)(?:The\s+)?Bottom Line|Takeaway|Executive Summary/i.test(trimmed)) {
      const cleanTitle = trimmed.replace(/^#{2,4}\s*|\*{2}|🎯|[:\-–—]/g, '').trim();
      return { type: 'thinking', category: 'bottom_line' as const, title: cleanTitle || 'Bottom Line' };
    }

    // Check for Trade-offs
    if (/(?:^#{2,4}\s*|\*{2}|⚖️\s*)(?:Key\s+)?Trade-?offs?(?:\s*&|\s*and)?(?:\s*Risks|\s*Considerations)?/i.test(trimmed)) {
      const cleanTitle = trimmed.replace(/^#{2,4}\s*|\*{2}|⚖️|[:\-–—]/g, '').trim();
      return { type: 'thinking', category: 'trade_offs' as const, title: cleanTitle || 'Trade-offs' };
    }

    // Check for What to Consider / Blind Spots
    if (/(?:^#{2,4}\s*|\*{2}|🔍\s*)(?:What to Consider|Key Considerations|Factors to Consider|Blind Spots|Key Unknowns|Questions to Ask)/i.test(trimmed)) {
      const cleanTitle = trimmed.replace(/^#{2,4}\s*|\*{2}|🔍|[:\-–—]/g, '').trim();
      return { type: 'thinking', category: 'considerations' as const, title: cleanTitle || 'What to Consider' };
    }

    // Check for Key Insight
    if (/(?:^#{2,4}\s*|\*{2}|💡\s*)(?:Key\s+)?Insight|Core Realization|Perceptive Observation|Perspective/i.test(trimmed)) {
      const cleanTitle = trimmed.replace(/^#{2,4}\s*|\*{2}|💡|[:\-–—]/g, '').trim();
      return { type: 'thinking', category: 'insight' as const, title: cleanTitle || 'Insight' };
    }

    // Check for Next Steps
    if (/(?:^#{2,4}\s*|\*{2}|→\s*|➔\s*)(?:Recommended\s+)?Next Steps?|Action Items?|Immediate Action/i.test(trimmed)) {
      const cleanTitle = trimmed.replace(/^#{2,4}\s*|\*{2}|→|➔|[:\-–—]/g, '').trim();
      return { type: 'thinking', category: 'next_steps' as const, title: cleanTitle || 'Next Steps' };
    }

    return null;
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const sectionMatch = matchSection(line);

    if (sectionMatch) {
      if (sectionMatch.type === 'option') {
        // We may have a group of comparison options!
        // Let's collect all consecutive options
        flushMarkdown();

        const optionsGroup: ParsedOption[] = [];
        
        while (i < lines.length) {
          const optHeader = matchSection(lines[i]);
          if (optHeader && optHeader.type === 'option') {
            const currentOption: ParsedOption = {
              badge: optHeader.badge || 'OPTION',
              title: optHeader.title || 'Option',
              summary: '',
              upsides: [],
              tradeOffs: [],
              otherNotes: []
            };

            i++;
            let currentMode: 'summary' | 'upside' | 'tradeoff' | 'notes' = 'summary';

            while (i < lines.length) {
              const nextLine = lines[i];
              const nextMatch = matchSection(nextLine);
              
              // If we encounter another option or thinking block or top-level header, stop this option
              if (nextMatch) break;
              if (/^#{1,3}\s+/.test(nextLine) && !/upside|trade-?off|pro|con|risk/i.test(nextLine)) break;

              const trimmed = nextLine.trim();

              // If a markdown table row is encountered, stop option mode so table renders as a clean matrix
              if (/^\|.*\|\s*$/.test(trimmed)) break;

              // Mode detection inside an option card
              if (/upside|pros?|benefits?|advantages?|strengths?/i.test(trimmed) && (trimmed.startsWith('**') || trimmed.startsWith('#') || trimmed.endsWith(':'))) {
                currentMode = 'upside';
              } else if (/trade-?offs?|cons?|risks?|downsides?|drawbacks?|costs?/i.test(trimmed) && (trimmed.startsWith('**') || trimmed.startsWith('#') || trimmed.endsWith(':'))) {
                currentMode = 'tradeoff';
              } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s+/.test(trimmed)) {
                const bulletText = trimmed.replace(/^[-*]\s+|\d+\.\s+/, '').trim();
                if (currentMode === 'upside') {
                  currentOption.upsides.push(bulletText);
                } else if (currentMode === 'tradeoff') {
                  currentOption.tradeOffs.push(bulletText);
                } else {
                  currentOption.otherNotes.push(bulletText);
                }
              } else if (trimmed) {
                if (currentMode === 'summary') {
                  currentOption.summary = (currentOption.summary ? currentOption.summary + ' ' : '') + trimmed;
                } else if (currentMode === 'upside') {
                  currentOption.upsides.push(trimmed);
                } else if (currentMode === 'tradeoff') {
                  currentOption.tradeOffs.push(trimmed);
                } else {
                  currentOption.otherNotes.push(trimmed);
                }
              }

              i++;
            }

            optionsGroup.push(currentOption);
          } else if (/^\s*(?:vs\.?|versus)\s*$/i.test(lines[i].trim())) {
            // skip plain "vs" line between options
            i++;
          } else {
            break;
          }
        }

        if (optionsGroup.length > 0) {
          // If we have at least 2 options, or an option with distinct upsides and tradeoffs, format as comparison
          blocks.push({
            type: 'comparison_group',
            options: optionsGroup
          });
        }
        continue;
      } else if (sectionMatch.type === 'thinking') {
        flushMarkdown();

        const category = sectionMatch.category!;
        const title = sectionMatch.title || 'Structured Reasoning';
        const blockContentLines: string[] = [];

        i++;
        while (i < lines.length) {
          const nextLine = lines[i];
          const nextMatch = matchSection(nextLine);
          if (nextMatch) break;
          // Stop at major headings that aren't sub-lists
          if (/^#{1,3}\s+/.test(nextLine)) break;

          blockContentLines.push(nextLine);
          i++;
        }

        const blockContent = blockContentLines.join('\n').trim();
        if (blockContent) {
          blocks.push({
            type: 'thinking_block',
            category,
            title,
            content: blockContent
          });
        }
        continue;
      }
    }

    currentMarkdownLines.push(line);
    i++;
  }

  flushMarkdown();
  return blocks;
}

export const AiMessageRenderer: React.FC<AiMessageRendererProps> = ({ 
  content,
  onTurnIntoDecision 
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const blocks = parseMessageContent(content);

  // Markdown component mappings for pristine typography, line-break rendering, and WCAG AA contrast
  const markdownComponents = {
    h1: ({ children }: any) => (
      <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-5 mb-2.5 tracking-tight border-b border-slate-100 pb-1.5">
        {renderWithLineBreaks(children, 'h1')}
      </h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-4 mb-2 tracking-tight">
        {renderWithLineBreaks(children, 'h2')}
      </h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-sm sm:text-base font-semibold text-slate-900 mt-3.5 mb-1.5">
        {renderWithLineBreaks(children, 'h3')}
      </h3>
    ),
    h4: ({ children }: any) => (
      <h4 className="text-xs sm:text-sm font-semibold text-slate-800 mt-2.5 mb-1 uppercase tracking-wider">
        {renderWithLineBreaks(children, 'h4')}
      </h4>
    ),
    p: ({ children }: any) => (
      <p className="text-[14.5px] leading-relaxed text-slate-700 mb-3 last:mb-0 font-normal">
        {renderWithLineBreaks(children, 'p')}
      </p>
    ),
    ul: ({ children }: any) => (
      <ul className="list-disc pl-5 my-2.5 space-y-1.5 text-slate-700 text-[14.5px] leading-relaxed">
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal pl-5 my-2.5 space-y-1.5 text-slate-700 text-[14.5px] leading-relaxed">
        {children}
      </ol>
    ),
    li: ({ children }: any) => (
      <li className="leading-relaxed marker:text-slate-400">
        {renderWithLineBreaks(children, 'li')}
      </li>
    ),
    strong: ({ children }: any) => (
      <strong className="font-semibold text-slate-900">
        {renderWithLineBreaks(children, 'st')}
      </strong>
    ),
    em: ({ children }: any) => (
      <em className="italic text-slate-800 font-normal">
        {renderWithLineBreaks(children, 'em')}
      </em>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-2 border-blue-500 bg-blue-50/40 pl-3.5 pr-3 py-2 rounded-r-lg my-3.5 italic text-slate-700 text-sm">
        {renderWithLineBreaks(children, 'bq')}
      </blockquote>
    ),
    table: ({ children }: any) => (
      <div className="overflow-x-auto my-3.5 rounded-lg border border-slate-200 shadow-xs">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: any) => (
      <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] tracking-wider">
        {children}
      </thead>
    ),
    th: ({ children }: any) => (
      <th className="px-3.5 py-2.5 border-b border-slate-200 align-top leading-snug">
        {renderWithLineBreaks(children, 'th')}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="px-3.5 py-2.5 border-b border-slate-100 text-slate-700 align-top leading-relaxed">
        {renderWithLineBreaks(children, 'td')}
      </td>
    ),
    hr: () => (
      <hr className="my-4 border-slate-200" />
    ),
    code: ({ children, className }: any) => (
      <code className="bg-slate-100 text-slate-800 text-xs px-1.5 py-0.5 rounded font-mono border border-slate-200/60">
        {children}
      </code>
    )
  };

  return (
    <div className="ai-response-container space-y-4 text-slate-800">
      {blocks.map((block, idx) => {
        if (block.type === 'markdown' && block.content) {
          return (
            <div key={idx} className="ai-markdown-block">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {block.content}
              </ReactMarkdown>
            </div>
          );
        }

        if (block.type === 'comparison_group' && block.options && block.options.length > 0) {
          return (
            <div key={idx} className="my-5">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                  <Split className="w-3.5 h-3.5" />
                  <span>Comparing Options</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  Structured trade-off breakdown
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {block.options.map((opt, optIdx) => (
                  <div
                    key={optIdx}
                    className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all p-4.5 flex flex-col justify-between"
                  >
                    <div>
                      {/* Badge & Title */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-slate-900 text-white shadow-2xs">
                          {opt.badge}
                        </span>
                      </div>
                      <h4 className="text-sm sm:text-base font-semibold text-slate-900 leading-snug">
                        {renderWithLineBreaks(opt.title, `opt-t-${optIdx}`)}
                      </h4>

                      {opt.summary && (
                        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                          {renderWithLineBreaks(opt.summary, `opt-s-${optIdx}`)}
                        </p>
                      )}

                      {/* Potential Upsides */}
                      {opt.upsides.length > 0 && (
                        <div className="mt-3.5 pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-1 text-xs font-semibold text-emerald-800 mb-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Potential Upside</span>
                          </div>
                          <ul className="space-y-1.5">
                            {opt.upsides.map((up, upIdx) => (
                              <li key={upIdx} className="text-xs text-slate-700 flex items-start gap-2 bg-emerald-50/40 px-2.5 py-1.5 rounded-md border border-emerald-100/60 leading-relaxed">
                                <span className="text-emerald-600 font-bold text-xs mt-0.5">•</span>
                                <span>{renderWithLineBreaks(up, `opt-u-${optIdx}-${upIdx}`)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Trade-offs & Risks */}
                      {opt.tradeOffs.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-1 text-xs font-semibold text-amber-900 mb-1.5">
                            <Scale className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Trade-offs & Costs</span>
                          </div>
                          <ul className="space-y-1.5">
                            {opt.tradeOffs.map((to, toIdx) => (
                              <li key={toIdx} className="text-xs text-slate-700 flex items-start gap-2 bg-amber-50/40 px-2.5 py-1.5 rounded-md border border-amber-100/60 leading-relaxed">
                                <span className="text-amber-600 font-bold text-xs mt-0.5">•</span>
                                <span>{renderWithLineBreaks(to, `opt-to-${optIdx}-${toIdx}`)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Additional notes if any */}
                      {opt.otherNotes.length > 0 && (
                        <div className="mt-2.5 text-xs text-slate-600 space-y-1">
                          {opt.otherNotes.map((note, noteIdx) => (
                            <div key={noteIdx} className="text-slate-600 text-[11px] leading-relaxed">
                              • {renderWithLineBreaks(note, `opt-n-${optIdx}-${noteIdx}`)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        if (block.type === 'thinking_block' && block.content) {
          switch (block.category) {
            case 'bottom_line':
              return (
                <div 
                  key={idx} 
                  className="rounded-xl p-4 sm:p-5 bg-slate-900 text-slate-50 border border-slate-800 shadow-sm my-3.5"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-blue-300 uppercase tracking-wider bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-800/60">
                      <Target className="w-3.5 h-3.5 text-blue-400" />
                      <span>{block.title || 'Bottom Line'}</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">Core Synthesis</span>
                  </div>
                  <div className="text-slate-100 text-[14px] leading-relaxed">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]} 
                      components={{
                        ...markdownComponents,
                        p: ({ children }: any) => <p className="leading-relaxed mb-2 last:mb-0 text-slate-100 font-normal">{renderWithLineBreaks(children, 'btm-p')}</p>,
                        strong: ({ children }: any) => <strong className="font-semibold text-white">{renderWithLineBreaks(children, 'btm-st')}</strong>,
                        li: ({ children }: any) => <li className="leading-relaxed text-slate-200 marker:text-blue-400">{renderWithLineBreaks(children, 'btm-li')}</li>
                      }}
                    >
                      {block.content}
                    </ReactMarkdown>
                  </div>
                </div>
              );

            case 'trade_offs':
              return (
                <div 
                  key={idx} 
                  className="rounded-xl p-4 sm:p-5 bg-amber-50/50 border border-amber-200/80 shadow-xs my-3.5"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900 uppercase tracking-wider bg-amber-100/80 px-2.5 py-1 rounded-md border border-amber-200">
                      <Scale className="w-3.5 h-3.5 text-amber-700" />
                      <span>{block.title || 'Trade-offs'}</span>
                    </span>
                    <span className="text-[11px] text-amber-800 font-medium">Equilibrium & Tensions</span>
                  </div>
                  <div className="text-slate-800 text-[14px] leading-relaxed">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]} 
                      components={{
                        ...markdownComponents,
                        li: ({ children }: any) => <li className="leading-relaxed text-slate-700 marker:text-amber-500">{renderWithLineBreaks(children, 'to-li')}</li>
                      }}
                    >
                      {block.content}
                    </ReactMarkdown>
                  </div>
                </div>
              );

            case 'considerations':
              return (
                <div 
                  key={idx} 
                  className="rounded-xl p-4 sm:p-5 bg-blue-50/40 border border-blue-200/70 shadow-xs my-3.5"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-blue-900 uppercase tracking-wider bg-blue-100/70 px-2.5 py-1 rounded-md border border-blue-200">
                      <HelpCircle className="w-3.5 h-3.5 text-blue-700" />
                      <span>{block.title || 'What to Consider'}</span>
                    </span>
                    <span className="text-[11px] text-blue-800 font-medium">Critical Unknowns & Levers</span>
                  </div>
                  <div className="text-slate-800 text-[14px] leading-relaxed">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]} 
                      components={{
                        ...markdownComponents,
                        li: ({ children }: any) => <li className="leading-relaxed text-slate-700 marker:text-blue-500">{renderWithLineBreaks(children, 'con-li')}</li>
                      }}
                    >
                      {block.content}
                    </ReactMarkdown>
                  </div>
                </div>
              );

            case 'insight':
              return (
                <div 
                  key={idx} 
                  className="rounded-xl p-4 sm:p-5 bg-indigo-50/40 border border-indigo-200/70 shadow-xs my-3.5"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-900 uppercase tracking-wider bg-indigo-100/70 px-2.5 py-1 rounded-md border border-indigo-200">
                      <Lightbulb className="w-3.5 h-3.5 text-indigo-700" />
                      <span>{block.title || 'Key Insight'}</span>
                    </span>
                    <span className="text-[11px] text-indigo-800 font-medium">Perspective</span>
                  </div>
                  <div className="text-slate-800 text-[14px] leading-relaxed">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]} 
                      components={{
                        ...markdownComponents,
                        li: ({ children }: any) => <li className="leading-relaxed text-slate-700 marker:text-indigo-500">{renderWithLineBreaks(children, 'ins-li')}</li>
                      }}
                    >
                      {block.content}
                    </ReactMarkdown>
                  </div>
                </div>
              );

            case 'next_steps':
              return (
                <div 
                  key={idx} 
                  className="rounded-xl p-4 sm:p-5 bg-emerald-50/40 border border-emerald-200/70 shadow-xs my-3.5"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-900 uppercase tracking-wider bg-emerald-100/70 px-2.5 py-1 rounded-md border border-emerald-200">
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{block.title || 'Next Steps'}</span>
                    </span>
                    <span className="text-[11px] text-emerald-800 font-medium">Concrete Actions</span>
                  </div>
                  <div className="text-slate-800 text-[14px] leading-relaxed">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]} 
                      components={{
                        ...markdownComponents,
                        li: ({ children }: any) => <li className="leading-relaxed text-slate-700 marker:text-emerald-500">{renderWithLineBreaks(children, 'ns-li')}</li>
                      }}
                    >
                      {block.content}
                    </ReactMarkdown>
                  </div>
                </div>
              );
          }
        }

        return null;
      })}

      {/* Subtle Bottom Action Bar on Gemini message */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
            title="Copy reflection to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy reflection</span>
              </>
            )}
          </button>
        </div>

        {onTurnIntoDecision && (
          <button
            onClick={onTurnIntoDecision}
            className="flex items-center gap-1 text-[11px] font-medium text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 px-2.5 py-1 rounded transition-colors cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Turn into Decision Card</span>
          </button>
        )}
      </div>
    </div>
  );
};
