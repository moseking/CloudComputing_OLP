import React from 'react';
import { ArrowRight, BookOpen, Layers, Pencil, ScrollText } from 'lucide-react';
import { SKILLS } from '../lib/learning.js';
import { cx } from './UI.jsx';

const icons = {
  theory: BookOpen,
  vocabulary: ScrollText,
  grammar: Layers,
  practice: Pencil,
};
const styles = {
  orange: 'border-orange-100 bg-[#fff0e8] text-[#db6426]',
  pink: 'border-pink-100 bg-[#ffeaf0] text-[#d45176]',
  green: 'border-emerald-100 bg-[#e5f6f1] text-[#25856d]',
  purple: 'border-violet-100 bg-[#f0eaff] text-[#8155ca]',
};
export default function SkillCards() {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {SKILLS.map((skill) => {
        const Icon = icons[skill.id];
        return (
          <a
            key={skill.id}
            href={`#/learn?section=${skill.id}`}
            className={cx(
              'group flex min-h-24 items-center gap-3 rounded-2xl border px-3 py-4 transition hover:-translate-y-0.5',
              styles[skill.tone],
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/80">
              <Icon size={22} strokeWidth={1.7} />
            </span>
            <span className="min-w-0">
              <strong className="block text-xs font-bold text-navy sm:text-sm">
                {skill.label}
              </strong>
              <span className="mt-1 block text-[10px] leading-relaxed text-navy/65">
                {skill.description}
              </span>
            </span>
            <ArrowRight
              className="ml-auto hidden shrink-0 opacity-60 group-hover:translate-x-0.5 2xl:block"
              size={16}
            />
          </a>
        );
      })}
    </div>
  );
}
