'use strict';
const { PromptChecker } = require('./PromptChecker.cjs');
const { SessionManager } = require('./SessionManager.cjs');
const { RecommendationEngine, VALID } = require('./RecommendationEngine.cjs');
/** Main use case / orchestration - outputs recommendations, not prompt content. */
class AnalysisEngine {
  constructor({ promptChecker = new PromptChecker(), sessions = new SessionManager(), recommendations = new RecommendationEngine() } = {}) {
    this.promptChecker = promptChecker;
    this.sessions = sessions;
    this.recommendations = recommendations;
  }
  analyzeManual(prompt) {
    const result = this.promptChecker.analyze(prompt);
    return { result, advice: this.recommendations.recommend(result.flags) };
  }
  fromHook(event) {
    if (!event || event.kind !== 'prompt') return [];
    const safeFlags = Array.isArray(event.flags) ? event.flags.filter(f => typeof f === 'string' && VALID.has(f)) : [];
    // Topic change is a weak signal; the recommendation is explicitly tentative.
    const change = this.sessions.registerPrompt(event.session, event.category);
    if (change.topicChanged) safeFlags.unshift('fresh-chat');
    return this.recommendations.recommend(safeFlags);
  }
}
module.exports = { AnalysisEngine };
