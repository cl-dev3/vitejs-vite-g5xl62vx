import { describe, expect, test } from 'vitest';
import { computeProject } from '../domain/compute';
import { createSampleProject } from '../domain/sample';
import type { Project } from '../domain/types';
import { specItems } from './patternInfo';

const base = (): Project => {
  const p = createSampleProject();
  return {
    ...p,
    meta: { ...p.meta, target: { headCircumferenceCm: 18, bodyHeightCm: 4 } },
  };
};

describe('specItems', () => {
  test('サンプルの材料表', () => {
    const p = base();
    const items = specItems(p, computeProject(p.rows));
    expect(items).toEqual([
      ['使用糸', 'コットン糸（合太） / 生成り'],
      ['使用針', '5/0号（3.0mm）'],
      ['ゲージ', '10cm四方で 20目 × 22段'],
      ['頭囲', '18cm'],
      ['高さ', '4cm'],
      ['総段数', '10段'],
      ['最大目数', '36目'],
    ]);
  });

  test('糸の名前が空なら「-」', () => {
    const p = base();
    p.meta.yarn = { name: '' };
    expect(specItems(p, computeProject(p.rows))[0]).toEqual(['使用糸', '-']);
  });
});
