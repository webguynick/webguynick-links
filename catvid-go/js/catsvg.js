/* ==========================================================================
   CatVid GO — catsvg.js
   A cute vector cat, drawn in code. Powers stray breeds, the recolor
   customizer, and the upgraded Minnie/Biscuit placeholders. Every color is
   a parameter, so "customize your cat" really recolors the art.

   catSVG({ pattern, body, patch, patch2, eyes, collar, accessory }) → svg string
     pattern : solid | tabby | tuxedo | patchy | tortie | calico | points |
               rosettes | sphynx | floof | fold
     body    : main coat color        patch  : secondary/marking color
     patch2  : third color (calico)   eyes   : iris color
     collar  : collar color or null   accessory : none|bow|bell|flower|tophat
   ========================================================================== */

let _catSvgUid = 0;

function catSVG(opts) {
  const o = Object.assign(
    { pattern: 'solid', body: '#a8adb8', patch: '#7c828f', patch2: '#e08a3c',
      eyes: '#e8a33d', collar: null, accessory: 'none' },
    opts
  );
  const uid = `catclip${++_catSvgUid}`;
  const P = o.pattern;

  const isSphynx = P === 'sphynx';
  const isFloof = P === 'floof';
  const isFold = P === 'fold';

  // base shapes (shared by silhouette + clip path so markings never bleed out)
  const earL = isFold
    ? `<path d="M33 24 Q30 34 36 36 Q42 37 44 30 Q39 24 33 24z"`
    : `<path d="M33 12 L44 28 L30 32z"`;
  const earR = isFold
    ? `<path d="M67 24 Q70 34 64 36 Q58 37 56 30 Q61 24 67 24z"`
    : `<path d="M67 12 L56 28 L70 32z"`;
  const bigEarL = `<path d="M30 8 L45 28 L27 34z"`;   // sphynx satellite ears
  const bigEarR = `<path d="M70 8 L55 28 L73 34z"`;
  const silhouette = `
    ${isSphynx ? bigEarL : earL} fill="${o.body}"/>
    ${isSphynx ? bigEarR : earR} fill="${o.body}"/>
    <circle cx="50" cy="40" r="21" fill="${o.body}"/>
    <ellipse cx="50" cy="72" rx="${isFloof ? 29 : 25}" ry="${isFloof ? 21 : 18}" fill="${o.body}"/>
    <path d="M72 74 Q92 66 88 46 Q86 40 82 44 Q84 60 68 66z" fill="${o.body}"/>`;

  const clip = `
    <clipPath id="${uid}">
      ${isSphynx ? bigEarL : earL}/>
      ${isSphynx ? bigEarR : earR}/>
      <circle cx="50" cy="40" r="21"/>
      <ellipse cx="50" cy="72" rx="${isFloof ? 29 : 25}" ry="${isFloof ? 21 : 18}"/>
      <path d="M72 74 Q92 66 88 46 Q86 40 82 44 Q84 60 68 66z"/>
    </clipPath>`;

  // markings, clipped to the cat's silhouette
  let markings = '';
  if (P === 'tabby' || P === 'floof') {
    markings = `
      <g clip-path="url(#${uid})" fill="${o.patch}">
        <rect x="46" y="16" width="3.5" height="14" rx="2" transform="rotate(3 48 22)"/>
        <rect x="52" y="16" width="3.5" height="14" rx="2" transform="rotate(-3 54 22)"/>
        <rect x="30" y="58" width="5" height="22" rx="2.5" transform="rotate(14 32 68)"/>
        <rect x="42" y="60" width="5" height="24" rx="2.5" transform="rotate(6 44 72)"/>
        <rect x="55" y="60" width="5" height="24" rx="2.5" transform="rotate(-8 57 72)"/>
        <rect x="78" y="46" width="4" height="12" rx="2" transform="rotate(35 80 52)"/>
      </g>`;
  } else if (P === 'tuxedo') {
    markings = `
      <g clip-path="url(#${uid})">
        <ellipse cx="50" cy="70" rx="12" ry="15" fill="#f8f5ef"/>
        <ellipse cx="50" cy="48" rx="8" ry="7" fill="#f8f5ef"/>
        <ellipse cx="40" cy="87" rx="6" ry="5" fill="#f8f5ef"/>
        <ellipse cx="60" cy="87" rx="6" ry="5" fill="#f8f5ef"/>
        <path d="M46 30 L50 22 L54 30 Q50 34 46 30z" fill="#f8f5ef"/>
      </g>`;
  } else if (P === 'patchy') {
    markings = `
      <g clip-path="url(#${uid})" fill="${o.patch}">
        <ellipse cx="38" cy="26" rx="11" ry="10"/>
        <ellipse cx="62" cy="66" rx="13" ry="10"/>
        <path d="M72 74 Q92 66 88 46 Q86 40 82 44 Q84 60 68 66z"/>
      </g>`;
  } else if (P === 'tortie') {
    markings = `
      <g clip-path="url(#${uid})">
        <ellipse cx="40" cy="30" rx="8" ry="7" fill="${o.patch}"/>
        <ellipse cx="58" cy="44" rx="6" ry="5" fill="${o.patch}"/>
        <ellipse cx="36" cy="66" rx="8" ry="7" fill="${o.patch}"/>
        <ellipse cx="58" cy="76" rx="9" ry="7" fill="${o.patch}"/>
        <ellipse cx="80" cy="52" rx="5" ry="6" fill="${o.patch}"/>
        <ellipse cx="50" cy="26" rx="5" ry="4" fill="#e8cf9e"/>
        <ellipse cx="46" cy="82" rx="6" ry="5" fill="#e8cf9e"/>
        <ellipse cx="66" cy="62" rx="5" ry="4" fill="#e8cf9e"/>
      </g>`;
  } else if (P === 'calico') {
    markings = `
      <g clip-path="url(#${uid})">
        <ellipse cx="38" cy="26" rx="10" ry="9" fill="${o.patch}"/>
        <ellipse cx="62" cy="68" rx="12" ry="9" fill="${o.patch}"/>
        <ellipse cx="60" cy="28" rx="8" ry="7" fill="${o.patch2}"/>
        <ellipse cx="36" cy="72" rx="9" ry="8" fill="${o.patch2}"/>
        <path d="M72 74 Q92 66 88 46 Q86 40 82 44 Q84 60 68 66z" fill="${o.patch2}"/>
      </g>`;
  } else if (P === 'points') {
    markings = `
      <g clip-path="url(#${uid})" fill="${o.patch}">
        ${isSphynx ? bigEarL : earL}/>
        ${isSphynx ? bigEarR : earR}/>
        <ellipse cx="50" cy="45" rx="9" ry="7"/>
        <path d="M72 74 Q92 66 88 46 Q86 40 82 44 Q84 60 68 66z"/>
        <ellipse cx="40" cy="88" rx="6" ry="5"/>
        <ellipse cx="60" cy="88" rx="6" ry="5"/>
      </g>`;
  } else if (P === 'rosettes') {
    const spots = [[36, 64], [48, 74], [60, 64], [68, 76], [42, 84], [78, 52]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="none" stroke="${o.patch}" stroke-width="2.2"/>`)
      .join('');
    markings = `<g clip-path="url(#${uid})">${spots}
      <rect x="46" y="16" width="3" height="12" rx="1.5" fill="${o.patch}"/>
      <rect x="52" y="16" width="3" height="12" rx="1.5" fill="${o.patch}"/></g>`;
  } else if (P === 'sphynx') {
    markings = `
      <g clip-path="url(#${uid})" fill="none" stroke="${o.patch}" stroke-width="1.6" stroke-linecap="round">
        <path d="M36 62 Q50 66 64 62"/>
        <path d="M36 70 Q50 74 64 70"/>
        <path d="M38 78 Q50 82 62 78"/>
      </g>`;
  }

  // fluffy chest ruff for the Maine Coon
  const ruff = isFloof
    ? `<path d="M32 52 Q28 62 34 60 Q30 70 38 66 Q36 76 44 70 L56 70 Q64 76 62 66 Q70 70 66 60 Q72 62 68 52 Q58 60 50 60 Q42 60 32 52z" fill="${o.patch}" opacity=".55"/>`
    : '';

  // face
  const pupil = `<ellipse rx="2" ry="4.5" fill="#2B2826"`;
  const face = `
    <ellipse cx="42" cy="38" rx="5" ry="6" fill="${o.eyes}"/>
    <ellipse cx="58" cy="38" rx="5" ry="6" fill="${o.eyes}"/>
    ${pupil} cx="42" cy="38.5"/>
    ${pupil} cx="58" cy="38.5"/>
    <circle cx="43.2" cy="36" r="1.1" fill="#fff"/>
    <circle cx="59.2" cy="36" r="1.1" fill="#fff"/>
    <path d="M47.5 46 L52.5 46 L50 49z" fill="#e58a95"/>
    <path d="M50 49 Q50 52 46.5 52.5 M50 49 Q50 52 53.5 52.5" fill="none" stroke="#2B2826" stroke-width="1.2" stroke-linecap="round"/>
    <g stroke="${P === 'solid' && o.body === '#33302e' ? '#6b6560' : '#2B2826'}" stroke-width=".9" opacity=".65" stroke-linecap="round">
      <path d="M30 42 L18 40"/><path d="M30 46 L19 47"/>
      <path d="M70 42 L82 40"/><path d="M70 46 L81 47"/>
    </g>
    <path d="M33 ${isFold ? 27 : 18} L41 28 L33 31z" fill="#e5a0aa" opacity="${isFold ? 0 : 0.8}"/>
    <path d="M67 ${isFold ? 27 : 18} L59 28 L67 31z" fill="#e5a0aa" opacity="${isFold ? 0 : 0.8}"/>`;

  // collar + accessory
  let extras = '';
  if (o.collar) {
    extras += `<path d="M34 55 Q50 63 66 55 L66 60 Q50 68 34 60z" fill="${o.collar}"/>`;
    if (o.accessory === 'bell') extras += `<circle cx="50" cy="63" r="4" fill="#F4B942" stroke="#c9952a" stroke-width="1"/><circle cx="50" cy="64.5" r="1" fill="#2B2826"/>`;
  }
  const acc = {
    bow:    `<text x="66" y="24" font-size="14" text-anchor="middle">🎀</text>`,
    flower: `<text x="33" y="22" font-size="13" text-anchor="middle">🌸</text>`,
    tophat: `<text x="50" y="16" font-size="16" text-anchor="middle">🎩</text>`,
  }[o.accessory] || '';

  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="catsvg">
    <defs>${clip}</defs>
    ${silhouette}
    ${ruff}
    ${markings}
    ${face}
    ${extras}
    ${acc}
  </svg>`;
}

/* Built-in looks for the two stars (used when their real art isn't added).
   Minnie: tuxedo, yellow-green eyes. Biscuit: grey patches on white.       */
const STAR_LOOKS = {
  minnie:  { pattern: 'tuxedo', body: '#33302e', patch: '#f8f5ef', eyes: '#c6d94e' },
  biscuit: { pattern: 'patchy', body: '#ffffff', patch: '#9aa2ad', eyes: '#e8a33d' },
};
