/**
 * Split song lyrics into slides.
 *
 * @param {string} raw - Raw lyrics, sections separated by blank lines
 * @param {object} opts
 * @param {number} opts.maxLinesPerSlide - default 4
 * @param {number} opts.maxCharsPerSlide - default 220
 * @returns {Array<{ text: string, label?: string }>}
 */
export function splitLyrics(raw, opts = {}) {
    if (!raw || typeof raw !== 'string') return [];
    const maxLines = opts.maxLinesPerSlide ?? 4;
    const maxChars = opts.maxCharsPerSlide ?? 220;
  
    // Normalize newlines
    const normalized = raw.replace(/\r\n/g, '\n').trim();
    if (!normalized) return [];
  
    // Split by blank lines into "sections"
    const sections = normalized.split(/\n\s*\n+/).map(s => s.trim()).filter(Boolean);
  
    const slides = [];
  
    for (const section of sections) {
      // Detect section labels like [Verse 1] or "Chorus:"
      let label = null;
      let body = section;
  
      const labelMatch = section.match(/^\[([^\]]+)\]\s*\n?/);
      if (labelMatch) {
        label = labelMatch[1].trim();
        body = section.slice(labelMatch[0].length).trim();
      } else {
        const colonMatch = section.match(/^([A-Za-z][A-Za-z0-9 ]{1,30}):\s*\n/);
        if (colonMatch) {
          label = colonMatch[1].trim();
          body = section.slice(colonMatch[0].length).trim();
        }
      }
  
      // Split body into lines, further into slides by count and char budget
      const lines = body.split('\n').map(l => l.trimEnd()).filter(l => l.length > 0);
  
      let currentLines = [];
      let currentChars = 0;
      let slideIndex = 1;
  
      const flush = () => {
        if (currentLines.length === 0) return;
        slides.push({
          text: currentLines.join('\n'),
          label: label
            ? (sections.length === 1 || slides.filter(s => s.label === label).length === 0
                ? label
                : `${label} (${slideIndex})`)
            : null,
        });
        slideIndex++;
        currentLines = [];
        currentChars = 0;
      };
  
      for (const line of lines) {
        const wouldExceed = currentLines.length >= maxLines || (currentChars + line.length) > maxChars;
        if (wouldExceed && currentLines.length > 0) flush();
        currentLines.push(line);
        currentChars += line.length;
      }
      flush();
    }
  
    return slides;
  }