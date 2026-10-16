'use strict';
/** NAVI rule-based prompt analysis. No external calls; source prompts are never stored. */
const { analyzePrompt, promptTemplate, adviceFor, topicOf } = require('../analyze.cjs');
class PromptChecker {
  analyze(prompt) { return analyzePrompt(typeof prompt === 'string' ? prompt : ''); }
  proposeTemplate(prompt) { return promptTemplate(prompt); }
  describe(flagIds) { return adviceFor(flagIds); }
  classify(prompt) { return topicOf(prompt); }
}
module.exports = { PromptChecker };
