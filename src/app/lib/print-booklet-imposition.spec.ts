import { describe, expect, it } from 'vitest';
import {
  padToMultipleOfFour,
  padToMultipleOfFourWithBackCoverLast,
  saddleStitchImpose
} from './print-booklet-imposition';

describe('print-booklet-imposition', () => {
  describe('padToMultipleOfFour', () => {
    it('pads 3 to 4', () => {
      expect(padToMultipleOfFour([1, 2, 3], () => 0)).toEqual([1, 2, 3, 0]);
    });
    it('leaves 4 unchanged', () => {
      expect(padToMultipleOfFour([1, 2, 3, 4], () => 0)).toEqual([1, 2, 3, 4]);
    });
  });

  describe('padToMultipleOfFourWithBackCoverLast', () => {
    it('places back cover last with blanks before it', () => {
      expect(padToMultipleOfFourWithBackCoverLast([1, 2], () => 0, 'back')).toEqual([1, 2, 0, 'back']);
    });
    it('adds no pad when len+1 already divisible by 4', () => {
      expect(padToMultipleOfFourWithBackCoverLast([1, 2, 3], () => 0, 'back')).toEqual([1, 2, 3, 'back']);
    });
  });

  describe('saddleStitchImpose', () => {
    it('orders 4 reader pages as 4|1 then 2|3', () => {
      const pages = ['P1', 'P2', 'P3', 'P4'];
      const sides = saddleStitchImpose(pages);
      expect(sides).toHaveLength(2);
      expect(sides[0]).toEqual({ left: 'P4', right: 'P1' });
      expect(sides[1]).toEqual({ left: 'P2', right: 'P3' });
    });

    it('orders 8 reader pages in standard booklet order', () => {
      const pages = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
      const sides = saddleStitchImpose(pages);
      expect(sides).toHaveLength(4);
      expect(sides[0]).toEqual({ left: 'P8', right: 'P1' });
      expect(sides[1]).toEqual({ left: 'P2', right: 'P7' });
      expect(sides[2]).toEqual({ left: 'P6', right: 'P3' });
      expect(sides[3]).toEqual({ left: 'P4', right: 'P5' });
    });
  });
});
