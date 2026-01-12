"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketValidationService = void 0;
const common_1 = require("@nestjs/common");
const connection_service_1 = require("../../src/connection/connection.service");
let MarketValidationService = class MarketValidationService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async validateMarket(title, description) {
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
    async checkDuplicates(title) {
        const existingListings = await this.prisma.listing.findMany({
            select: { title: true },
        });
        const normalizedTitle = title.toLowerCase().trim();
        for (const listing of existingListings) {
            const existingTitle = listing.title.toLowerCase().trim();
            if (existingTitle === normalizedTitle) {
                return { isValid: false, reason: 'Duplicate market detected: A market with this exact title already exists.' };
            }
            const distance = this.levenshtein(normalizedTitle, existingTitle);
            const maxLength = Math.max(normalizedTitle.length, existingTitle.length);
            const similarity = 1 - distance / maxLength;
            if (similarity > 0.75) {
                return { isValid: false, reason: `Similar market detected: This title is too similar to existing market "${listing.title}".` };
            }
        }
        return { isValid: true };
    }
    async checkEthics(title, description) {
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
            /\belection\s+manipulation\b/, /\brig\b.*\belection\b/, /\bvote\s+buying\b/, /\btamper(ing)?\s+with\s+vote(s)?\b/,
            /\bfraud\b/, /\bscam\b/, /\bbrib(ery|e)\b/, /\bmoney\s+launder(ing)?\b/,
            /\bself[-\s]?harm\b/, /\bexploit(ation)?\b/,
            /\btargeted\s+harm\b/
        ];
        if (harmfulPatterns.some((r) => r.test(text))) {
            return { isValid: false, reason: 'Ethical Violation: Market content contains harmful, illegal, or violent themes.' };
        }
        if (/\b(ugly|stupid|idiot|hate|enemy|harass|harassment)\b/.test(text)) {
            return { isValid: false, reason: 'Ethical Violation: Content appears to target individuals or promote harassment.' };
        }
        return { isValid: true };
    }
    async checkManipulationRisk(title, description) {
        const text = `${title} ${description || ''}`.toLowerCase();
        const personalPatterns = [
            /\bmy\s+friend\b/, /\bmy\s+school\b/, /\bmy\s+class\b/,
            /\bour\s+office\b/, /\bprivate\s+bet\b/, /\blocal\s+game\b/
        ];
        if (personalPatterns.some((r) => r.test(text))) {
            return { isValid: false, reason: 'Manipulation Risk: Market appears too niche or personal, making it prone to manipulation.' };
        }
        if (/\b(i\s+will|we\s+will|creator\s+decides)\b/.test(text)) {
            return { isValid: false, reason: 'Manipulation Risk: Outcome appears to be controlled by the creator.' };
        }
        return { isValid: true };
    }
    async checkValidity(title, description) {
        const text = `${title} ${description || ''}`.toLowerCase();
        const hasDate = /\b(202\d|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}\/\d{1,2})\b/.test(text);
        const hasCondition = /\b(will|if|when|after|before|by)\b/.test(text);
        if (!hasCondition && !hasDate) {
            return { isValid: false, reason: 'Market Validity: Resolution criteria or date is unclear. Please specify when or how this resolves.' };
        }
        if (/\b(always|never)\b/.test(text) && /\b(maybe|sometimes)\b/.test(text)) {
            return { isValid: false, reason: 'Market Validity: Contradictory terms detected.' };
        }
        return { isValid: true };
    }
    levenshtein(a, b) {
        const matrix = [];
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
                }
                else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
                }
            }
        }
        return matrix[b.length][a.length];
    }
};
exports.MarketValidationService = MarketValidationService;
exports.MarketValidationService = MarketValidationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [connection_service_1.ConnectionService])
], MarketValidationService);
//# sourceMappingURL=market-validation.service.js.map