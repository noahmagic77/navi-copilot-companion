import {createHash} from 'node:crypto';
export interface Problem {
  uri:string;severity:number;message:string;source?:string;code?:string;
  start:{line:number;character:number};end:{line:number;character:number};
}
export function problemKey(problem:Problem):string{return createHash('sha256').update(JSON.stringify(problem)).digest('hex');}
export function problemSetKey(problems:Problem[]):string|null{return problems.length?createHash('sha256').update(problems.map(problemKey).sort().join(':')).digest('hex'):null;}
/** Cycle the displayed order; a vanished diagnostic starts a fresh cycle. */
export function nextProblem(problems:Problem[],previousKey?:string):Problem|undefined{
  if(!problems.length)return undefined;
  const previous=problems.findIndex(problem=>problemKey(problem)===previousKey);
  return problems[(previous+1)%problems.length];
}
/** Prefer the diagnosis at the cursor; otherwise use the first error/warning. */
export function problemAtPosition(problems:Problem[],position:{line:number;character:number}):Problem|undefined{
  return problems.find(problem=>
    (position.line>problem.start.line||position.line===problem.start.line&&position.character>=problem.start.character)&&
    (position.line<problem.end.line||position.line===problem.end.line&&position.character<=problem.end.character))??problems[0];
}
export function sortedProblems(problems:Problem[]):Problem[]{return problems.filter(p=>p.severity===0||p.severity===1).sort((a,b)=>a.severity-b.severity||a.start.line-b.start.line||a.start.character-b.start.character||a.message.localeCompare(b.message));}
export function validProblemRange(problem:Problem,lineLengths:number[]):boolean {
  const {start,end}=problem;
  return [start.line,start.character,end.line,end.character].every(n=>Number.isSafeInteger(n)&&n>=0)&&
    start.line<lineLengths.length&&end.line<lineLengths.length&&start.character<=lineLengths[start.line]&&end.character<=lineLengths[end.line]&&
    (end.line>start.line||end.line===start.line&&end.character>=start.character);
}
