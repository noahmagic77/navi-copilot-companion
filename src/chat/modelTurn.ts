import type {ActivityState} from '../integration/activity';

export async function runModelTurn(options: {
  request: () => Promise<AsyncIterable<string>>;
  cancelled: () => boolean;
  fragment: (text: string) => void;
  state: (state: ActivityState, message?: string) => void;
}): Promise<string | undefined> {
  if (options.cancelled()) return;
  options.state('received');
  let answer = '';
  try {
    if(options.cancelled()){options.state('cancelled');return;}
    options.state('waiting');
    const result = await options.request();
    for await (const fragment of result) {
      if (options.cancelled()) { options.state('cancelled'); return; }
      answer += fragment;
      options.state('busy');
      options.fragment(fragment);
    }
    if (options.cancelled()) { options.state('cancelled'); return; }
    options.state('completed', answer);
    return answer;
  } catch (error) {
    if (options.cancelled()) { options.state('cancelled'); return; }
    options.state('error');
    throw error;
  }
}
