import { minutesToUnits, unitsToHours, minutesToHours, formatUnits } from '../services/roundingService.js';

describe('roundingService', () => {
  describe('minutesToUnits', () => {
    it('rounds 0 minutes to 0 units', () => {
      expect(minutesToUnits(0)).toBe(0);
    });

    it('rounds 1 minute up to 1 unit', () => {
      expect(minutesToUnits(1)).toBe(1);
    });

    it('rounds exactly 6 minutes to 1 unit', () => {
      expect(minutesToUnits(6)).toBe(1);
    });

    it('rounds 7 minutes up to 2 units', () => {
      expect(minutesToUnits(7)).toBe(2);
    });

    it('rounds 12 minutes to 2 units', () => {
      expect(minutesToUnits(12)).toBe(2);
    });

    it('rounds 13 minutes up to 3 units', () => {
      expect(minutesToUnits(13)).toBe(3);
    });

    it('rounds 45 minutes to 8 units', () => {
      expect(minutesToUnits(45)).toBe(8); // 45/6 = 7.5 → ceil = 8
    });

    it('rounds 60 minutes to 10 units', () => {
      expect(minutesToUnits(60)).toBe(10);
    });

    it('rounds 8 minutes (seed call data) to 2 units', () => {
      expect(minutesToUnits(8)).toBe(2);
    });

    it('handles negative minutes as 0', () => {
      expect(minutesToUnits(-5)).toBe(0);
    });
  });

  describe('unitsToHours', () => {
    it('converts 1 unit to 0.1 hours', () => {
      expect(unitsToHours(1)).toBe(0.1);
    });

    it('converts 8 units to 0.8 hours', () => {
      expect(unitsToHours(8)).toBe(0.8);
    });

    it('converts 10 units to 1.0 hours', () => {
      expect(unitsToHours(10)).toBe(1.0);
    });
  });

  describe('minutesToHours', () => {
    it('converts 12 minutes to 0.2 hours', () => {
      expect(minutesToHours(12)).toBe(0.2);
    });

    it('converts 45 minutes to 0.8 hours', () => {
      expect(minutesToHours(45)).toBe(0.8);
    });

    it('converts 60 minutes to 1.0 hours', () => {
      expect(minutesToHours(60)).toBe(1.0);
    });
  });

  describe('formatUnits', () => {
    it('formats units as a readable string', () => {
      expect(formatUnits(8)).toBe('0.8 h (8 units, ~48 min)');
    });

    it('handles singular unit correctly', () => {
      expect(formatUnits(1)).toBe('0.1 h (1 unit, ~6 min)');
    });
  });
});