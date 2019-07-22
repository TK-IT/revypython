export function classNames(classes: { [className: string]: any }) {
  let classNames = [];
  for (const k in classes) {
    if (classes[k]) classNames.push(k);
  }
  return classNames.join(" ");
}

function unique(x: string[]): string[] {
  const sorted = [].slice.call(x);
  sorted.sort();
  let k = 0;
  for (let i = 1; i < sorted.length; ++i) {
    if (sorted[k] != sorted[i]) {
      sorted[++k] = sorted[i];
    }
  }
  return sorted.slice(0, k + 1);
}

export function duplicates(x: string[]): string[] {
  const res = [].slice.call(x);
  res.sort();
  let prev = null;
  let k = 0;
  for (let i = 0; i < res.length; i += 1) {
    if (res[i] !== prev) {
      prev = res[i];
    } else {
      res[k++] = res[i];
    }
  }
  return unique(res.slice(0, k));
}

// http://ecmanaut.blogspot.dk/2006/07/encoding-decoding-utf8-in-javascript.html
export function encode_utf8(s: string): string {
  return unescape(encodeURIComponent(s));
}
