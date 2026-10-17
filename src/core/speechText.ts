/** Plain transient bubble text; never HTML and at most 160 Unicode characters. */
export function speechText(value: string): string {
  const text=value.replace(/```[\s\S]*?```/g,' [Code im Chat] ').replace(/[\u0000-\u001f\u007f-\u009f]/g,' ').replace(/\s+/g,' ').trim();
  const chars=Array.from(text);return chars.length>160?chars.slice(0,159).join('')+'…':text;
}
