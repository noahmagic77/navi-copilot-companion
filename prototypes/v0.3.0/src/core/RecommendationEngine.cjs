'use strict';
const { adviceFor } = require('../analyze.cjs');
const VALID = new Set(['clarify', 'scope', 'relevant-files', 'define-acceptance', 'structure', 'fresh-chat']);
/** Separates signals from user-facing wording, supports soft suggestions. */
class RecommendationEngine {
  constructor({ maxPerEvent = 3 } = {}) { this.maxPerEvent = maxPerEvent; }
  recommend(flags) {
    if (!Array.isArray(flags)) return [];
    return adviceFor([...new Set(flags)].filter(k => VALID.has(k)).slice(0, this.maxPerEvent));
  }
}
module.exports = { RecommendationEngine, VALID };
