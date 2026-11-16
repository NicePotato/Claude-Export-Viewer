// Hands a file to the browser as a download. Nothing leaves the machine.
export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const textBlob = (text, type = 'text/markdown') => new Blob([text], { type: `${type};charset=utf-8` });
