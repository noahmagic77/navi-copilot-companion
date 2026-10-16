/** Original vector fairy. Each wing is a separate, locally animated part. */
export const fairyMarkup = `
<svg class="fairy-art" viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="navi-upper-wing" x1=".8" y1="1" x2=".2" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity=".24"/>
      <stop offset=".48" stop-color="#fff" stop-opacity=".62"/>
      <stop offset="1" stop-color="#fff" stop-opacity=".94"/>
    </linearGradient>
    <linearGradient id="navi-lower-wing" x1=".8" y1="0" x2=".2" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".22"/>
      <stop offset="1" stop-color="#fff" stop-opacity=".78"/>
    </linearGradient>
    <radialGradient id="navi-core" cx=".4" cy=".34" r=".7">
      <stop offset="0" stop-color="#fff"/>
      <stop offset=".55" stop-color="#fffdfc"/>
      <stop offset="1" stop-color="#e8e9ee"/>
    </radialGradient>
    <radialGradient id="navi-halo">
      <stop offset="0" stop-color="#fff" stop-opacity=".38"/>
      <stop offset=".38" stop-color="#fff" stop-opacity=".12"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle class="core-halo" cx="160" cy="155" r="85"/>
  <g class="wing wing--lower-left" fill="url(#navi-lower-wing)">
    <path d="M154 155 C130 160 94 181 92 218 C91 231 101 239 112 229 C135 208 150 183 154 155Z"/>
    <path class="veins" d="M151 163 Q120 191 100 223 M136 181 Q118 183 106 197 M124 197 Q124 213 112 226"/>
  </g>
  <g class="wing wing--lower-right" fill="url(#navi-lower-wing)">
    <path d="M166 155 C190 160 226 181 228 218 C229 231 219 239 208 229 C185 208 170 183 166 155Z"/>
    <path class="veins" d="M169 163 Q200 191 220 223 M184 181 Q202 183 214 197 M196 197 Q196 213 208 226"/>
  </g>
  <g class="wing wing--upper-left" fill="url(#navi-upper-wing)">
    <path d="M155 155 C125 150 81 124 61 81 C52 60 59 48 75 53 C119 66 148 110 155 155Z"/>
    <path class="veins" d="M148 145 Q100 105 66 61 M127 124 Q106 119 91 114 M109 104 Q102 84 83 67"/>
    <path class="veins veins--fine" d="M141 137 Q133 101 110 80 M112 111 Q87 95 71 74"/>
  </g>
  <g class="wing wing--upper-right" fill="url(#navi-upper-wing)">
    <path d="M165 155 C195 150 239 124 259 81 C268 60 261 48 245 53 C201 66 172 110 165 155Z"/>
    <path class="veins" d="M172 145 Q220 105 254 61 M193 124 Q214 119 229 114 M211 104 Q218 84 237 67"/>
    <path class="veins veins--fine" d="M179 137 Q187 101 210 80 M208 111 Q233 95 249 74"/>
  </g>
  <circle class="core-light" cx="160" cy="155" r="27"/>
  <ellipse class="core-glint" cx="152" cy="146" rx="9" ry="6" transform="rotate(-35 152 146)"/>
</svg>`;
