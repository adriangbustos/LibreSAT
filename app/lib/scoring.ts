// ─────────────────────────────────────────────────────────────────────────────
// Official SAT Scaled Score Lookup Tables
// Source: Approximation based on publicly available College Board score tables
// R&W: 0–54 raw correct → 200–800
// Math: 0–44 raw correct → 200–800
// ─────────────────────────────────────────────────────────────────────────────

// Reading and Writing: 54 total scoreable questions (27 + 27)
const RW_SCALE: Record<number, number> = {
  0: 200, 1: 200, 2: 200, 3: 210, 4: 220, 5: 230, 6: 240, 7: 250, 8: 260,
  9: 270, 10: 280, 11: 290, 12: 300, 13: 310, 14: 320, 15: 330, 16: 340,
  17: 350, 18: 360, 19: 370, 20: 380, 21: 390, 22: 400, 23: 410, 24: 420,
  25: 430, 26: 440, 27: 450, 28: 460, 29: 470, 30: 480, 31: 490, 32: 500,
  33: 510, 34: 520, 35: 530, 36: 540, 37: 550, 38: 560, 39: 570, 40: 580,
  41: 600, 42: 610, 43: 620, 44: 630, 45: 650, 46: 660, 47: 680, 48: 700,
  49: 720, 50: 740, 51: 760, 52: 770, 53: 790, 54: 800
};

// Math: 44 total scoreable questions (22 + 22)
const MATH_SCALE: Record<number, number> = {
  0: 200, 1: 200, 2: 210, 3: 220, 4: 240, 5: 260, 6: 270, 7: 290, 8: 310,
  9: 320, 10: 340, 11: 350, 12: 370, 13: 390, 14: 400, 15: 420, 16: 440,
  17: 450, 18: 470, 19: 490, 20: 500, 21: 520, 22: 540, 23: 550, 24: 570,
  25: 580, 26: 600, 27: 610, 28: 630, 29: 640, 30: 650, 31: 670, 32: 680,
  33: 700, 34: 720, 35: 730, 36: 740, 37: 750, 38: 760, 39: 770, 40: 780,
  41: 790, 42: 790, 43: 800, 44: 800
};

// Diagnostic (single-section) uses same table scaled proportionally
// For 27-question modules (R&W diagnostic = 54 total, same table)
// For 22-question modules (Math diagnostic = 44 total, same table)

export function scaleRWScore(rawCorrect: number): number {
  const clamped = Math.max(0, Math.min(54, Math.round(rawCorrect)));
  return RW_SCALE[clamped] ?? 200;
}

export function scaleMathScore(rawCorrect: number): number {
  const clamped = Math.max(0, Math.min(44, Math.round(rawCorrect)));
  return MATH_SCALE[clamped] ?? 200;
}

export function scaleSingleSectionRW(rawCorrect: number, totalQuestions: number): number {
  // For custom/partial tests, proportionally scale
  if (totalQuestions === 0) return 200;
  const scaled54 = Math.round((rawCorrect / totalQuestions) * 54);
  return scaleRWScore(scaled54);
}

export function scaleSingleSectionMath(rawCorrect: number, totalQuestions: number): number {
  if (totalQuestions === 0) return 200;
  const scaled44 = Math.round((rawCorrect / totalQuestions) * 44);
  return scaleMathScore(scaled44);
}

export function calculateTotalScore(rwScaled: number, mathScaled: number): number {
  return Math.min(1600, Math.max(400, rwScaled + mathScaled));
}

export function getScorePercentile(score: number, maxScore: 800 | 1600 = 1600): number {
  // Rough percentile estimation
  const pct = ((score - (maxScore === 1600 ? 400 : 200)) / (maxScore - (maxScore === 1600 ? 400 : 200))) * 100;
  return Math.round(Math.max(1, Math.min(99, pct)));
}

export function parseSATNumber(str: string): number | null {
  if (!str) return null;
  const s = str.trim().replace(/,/g, '');
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 2) {
      const num = parseFloat(parts[0]);
      const den = parseFloat(parts[1]);
      if (!isNaN(num) && !isNaN(den) && den !== 0) {
        return num / den;
      }
    }
  } else {
    const val = parseFloat(s);
    if (!isNaN(val)) return val;
  }
  return null;
}

export function checkAnswer(userAns: string, correctAns: string): boolean {
  if (!userAns || !correctAns) return false;
  
  const uTrim = userAns.trim().toLowerCase();
  const cTrim = correctAns.trim().toLowerCase();
  
  if (uTrim === cTrim) return true;
  
  const uNum = parseSATNumber(uTrim);
  const cNum = parseSATNumber(cTrim);
  
  if (uNum !== null && cNum !== null) {
    // Check if mathematically equivalent within a tiny margin of error (e.g., float precision)
    return Math.abs(uNum - cNum) < 1e-6;
  }
  
  return false;
}
