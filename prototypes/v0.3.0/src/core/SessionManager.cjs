'use strict';
/** Tracks session-level topic changes. Never stores prompt text. */
class SessionManager {
  constructor(maxSessions = 300) { this.lastTopic = new Map(); this.maxSessions = maxSessions; }
  registerPrompt(sessionHash, category) {
    if (!sessionHash || sessionHash === 'unknown' || category === 'unclassified') return { topicChanged: false };
    const prior = this.lastTopic.get(sessionHash);
    this.lastTopic.delete(sessionHash);
    this.lastTopic.set(sessionHash, category);
    if (this.lastTopic.size > this.maxSessions) this.lastTopic.delete(this.lastTopic.keys().next().value);
    return { topicChanged: Boolean(prior && prior !== category), prior, category };
  }
  reset() { this.lastTopic.clear(); }
}
module.exports = { SessionManager };
