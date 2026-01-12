import { Injectable } from '@nestjs/common';
import { ConnectionService } from '../../src/connection/connection.service';

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

@Injectable()
export class MarketValidationService {
  constructor(private prisma: ConnectionService) {}

  async validateMarket(title: string, description: string): Promise<ValidationResult> {
    const checks = [
      this.checkEthics(title, description),
      this.checkManipulationRisk(title, description),
      this.checkValidity(title, description),
      this.checkDuplicates(title),
    ];

    for (const check of checks) {
      const result = await check;
      if (!result.isValid) {
        return result;
      }
    }

    return { isValid: true };
  }

  // 1. Duplicate & Similar Market Detection
  async checkDuplicates(title: string): Promise<ValidationResult> {
    const existingListings = await this.prisma.listing.findMany({
      select: { title: true },
      // Optimization: In real app, maybe limit by date or active status
    });

    const normalizedTitle = title.toLowerCase().trim();

    for (const listing of existingListings) {
      const existingTitle = listing.title.toLowerCase().trim();

      // Exact match
      if (existingTitle === normalizedTitle) {
        return { isValid: false, reason: 'Duplicate market detected: A market with this exact title already exists.' };
      }

      // Semantic similarity (Levenshtein distance)
      const distance = this.levenshtein(normalizedTitle, existingTitle);
      const maxLength = Math.max(normalizedTitle.length, existingTitle.length);
      const similarity = 1 - distance / maxLength;

      // Threshold: 0.75 (75% similar) - stricter duplicate check
      if (similarity > 0.75) {
        return { isValid: false, reason: `Similar market detected: This title is too similar to existing market "${listing.title}".` };
      }
    }

    return { isValid: true };
  }

  // 2. Ethical Compliance
  async checkEthics(title: string, description: string): Promise<ValidationResult> {
    const text = `${title} ${description || ''}`.toLowerCase();
    
    const harmfulPatterns = [
      /\bkill\b/, /\bsuicide\b/, /\bsuicidal\b/, /\bmurder\b/,
      /\bbomb\b/, /\bterrorist\b/, /\brape\b/, /\bweapon(s)?\b/,
      /\bdrug(s)?\b/, /\bdrug\s+trafficking\b/, /\billegal\b/,
      /\bharm\b/, /\bhurt\b/, /\bhate\b/, /\bracist\b/, /\bharass(ment)?\b/,
      /\bviolence\b/, /\bdeath\b/, /\bdie\b/, /\binjury\b/,
      /\baccident\b/, /\bfatal\b/, /\bdisaster\b/, /\bshooting\b/,
      /\bexploit(ation)?\b/, /\bdox(xing)?\b/,
      /\bslave(ry)?\b/, /\bsex(ual)?\b/, /\bporn\b/, /\babuse\b/,
      /\btorture\b/, /\battack\b/, /\bassassinate\b/,
      // Elections manipulation
      /\belection\s+manipulation\b/, /\brig\b.*\belection\b/, /\bvote\s+buying\b/, /\btamper(ing)?\s+with\s+vote(s)?\b/,
      // Criminal activity or fraud
      /\bfraud\b/, /\bscam\b/, /\bbrib(ery|e)\b/, /\bmoney\s+launder(ing)?\b/,
      // Self-harm or exploitation
      /\bself[-\s]?harm\b/, /\bexploit(ation)?\b/,
      // Targeted harm
      /\btargeted\s+harm\b/
    ];

    if (harmfulPatterns.some((r) => r.test(text))) {
      return { isValid: false, reason: 'Ethical Violation: Market content contains harmful, illegal, or violent themes.' };
    }

    // Targeted harassment check (basic heuristic)
    // Check for "specific person" patterns if not public figures (hard to distinguish without AI/DB)
    // For now, block obvious personal attacks
    if (/\b(ugly|stupid|idiot|hate|enemy|harass|harassment)\b/.test(text)) {
        return { isValid: false, reason: 'Ethical Violation: Content appears to target individuals or promote harassment.' };
    }

    return { isValid: true };
  }

  // 3. Manipulation Risk Analysis
  async checkManipulationRisk(title: string, description: string): Promise<ValidationResult> {
    const text = `${title} ${description || ''}`.toLowerCase();

    // Niche/Personal markets
    const personalPatterns = [
      /\bmy\s+friend\b/, /\bmy\s+school\b/, /\bmy\s+class\b/,
      /\bour\s+office\b/, /\bprivate\s+bet\b/, /\blocal\s+game\b/
    ];

    if (personalPatterns.some((r) => r.test(text))) {
      return { isValid: false, reason: 'Manipulation Risk: Market appears too niche or personal, making it prone to manipulation.' };
    }

    // Check for "creator controlled" outcomes
    if (/\b(i\s+will|we\s+will|creator\s+decides)\b/.test(text)) {
      return { isValid: false, reason: 'Manipulation Risk: Outcome appears to be controlled by the creator.' };
    }

    return { isValid: true };
  }

  // 4. Market Validity Checks
  async checkValidity(title: string, description: string): Promise<ValidationResult> {
    const text = `${title} ${description || ''}`.toLowerCase();

    // Check for date/resolution condition
    // Matches dates like 2024, Jan 1st, 12/31, etc. OR "when", "after", "before"
    const hasDate = /\b(202\d|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}\/\d{1,2})\b/.test(text);
    const hasCondition = /\b(will|if|when|after|before|by)\b/.test(text);

    if (!hasCondition && !hasDate) {
       // Relaxed check: Just need SOME condition
       return { isValid: false, reason: 'Market Validity: Resolution criteria or date is unclear. Please specify when or how this resolves.' };
    }

    // Contradictory outcomes (basic check)
    if (/\b(always|never)\b/.test(text) && /\b(maybe|sometimes)\b/.test(text)) {
         return { isValid: false, reason: 'Market Validity: Contradictory terms detected.' };
    }

    return { isValid: true };
  }

  // Helper: Levenshtein Distance
  private levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) == a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            Math.min(
              matrix[i][j - 1] + 1, // insertion
              matrix[i - 1][j] + 1 // deletion
            )
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}
