"use client";

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  BENCHMARK_OPTIONS,
  CONTENT_OPTIONS,
  CULTURE_OPTIONS,
  supportsProfileDetailTags,
} from '@/lib/taxonomy';
import type { BenchmarkTag, ContentTag, CultureTag } from '@/lib/taxonomy';

interface ProfileTagFieldsProps {
  benchmarkType: BenchmarkTag | '';
  cultureTags: CultureTag[];
  contentTags: ContentTag[];
  onBenchmarkTypeChange: (value: BenchmarkTag | '') => void;
  onCultureTagsChange: (value: CultureTag[]) => void;
  onContentTagsChange: (value: ContentTag[]) => void;
  disabled?: boolean;
  allowEmptyBenchmark?: boolean;
}

function toggleArrayItem<T extends string>(array: T[], value: T) {
  return array.includes(value)
    ? array.filter((item) => item !== value)
    : [...array, value];
}

export function ProfileTagFields({
  benchmarkType,
  cultureTags,
  contentTags,
  onBenchmarkTypeChange,
  onCultureTagsChange,
  onContentTagsChange,
  disabled = false,
  allowEmptyBenchmark = false,
}: ProfileTagFieldsProps) {
  const isIpBenchmark = supportsProfileDetailTags(benchmarkType);
  const isUnselected = benchmarkType === '';

  const handleBenchmarkChange = (value: BenchmarkTag | '') => {
    onBenchmarkTypeChange(value);
    if (!supportsProfileDetailTags(value)) {
      onCultureTagsChange([]);
      onContentTagsChange([]);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-secondary/20 p-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">标签分类</p>
          {allowEmptyBenchmark ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleBenchmarkChange('')}
              disabled={disabled || isUnselected}
              className="h-auto px-2 py-1 text-xs text-muted-foreground"
            >
              跳过并保存为未分类
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3 text-sm">
          {BENCHMARK_OPTIONS.map((option) => (
            <label key={option.value} className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="benchmark-type"
                value={option.value}
                checked={benchmarkType === option.value}
                onChange={() => handleBenchmarkChange(option.value)}
                disabled={disabled}
              />
              {option.label}
            </label>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          {isUnselected
            ? '当前未选择标签，保存后会自动归类为“未分类”。'
            : benchmarkType === 'uncategorized'
              ? '当前会保存为“未分类”，后续可在关注列表继续修改。'
              : '只有“IP对标”支持继续选择文化和内容子标签。'}
        </p>
      </div>

      <div className="space-y-2">
        <p className={cn('text-sm font-semibold', !isIpBenchmark && 'text-muted-foreground')}>
          文化（仅 IP 对标）
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          {CULTURE_OPTIONS.map((option) => (
            <label key={option.value} className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={cultureTags.includes(option.value)}
                onChange={() => onCultureTagsChange(toggleArrayItem(cultureTags, option.value))}
                disabled={disabled || !isIpBenchmark}
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className={cn('text-sm font-semibold', !isIpBenchmark && 'text-muted-foreground')}>
          内容类型（仅 IP 对标，可多选）
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          {CONTENT_OPTIONS.map((option) => (
            <label key={option.value} className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={contentTags.includes(option.value)}
                onChange={() => onContentTagsChange(toggleArrayItem(contentTags, option.value))}
                disabled={disabled || !isIpBenchmark}
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
