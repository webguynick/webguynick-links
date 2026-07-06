// ============================================================================
//  EDIT THIS FILE to customize your links page.
//  Everything the public page shows comes from here.
// ============================================================================

module.exports = {
  // ---- Profile ------------------------------------------------------------
  profile: {
    name: 'WebGuyNick',
    handle: '@webguynick',
    // Short bio shown under your name. Keep it punchy.
    bio: 'Web developer, builder, and creator. Everything I do, all in one place.',
    // Avatar: a URL, or a local file placed in /public (e.g. '/avatar.jpg').
    avatar: '/avatar.svg',
    // Page <title> and share text.
    pageTitle: 'WebGuyNick — Links',
    // Theme colors (CSS values). Tweak to taste.
    theme: {
      bgStart: '#0f172a', // background gradient top
      bgEnd: '#1e1b4b',   // background gradient bottom
      accent: '#8b5cf6',  // buttons / highlights
      text: '#f8fafc',    // primary text
      muted: '#94a3b8',   // secondary text
    },
  },

  // ---- Main link buttons --------------------------------------------------
  //  id     : short unique slug used in tracking + the /r/<id> redirect URL
  //  title  : button label
  //  url    : where the button sends visitors
  //  subtitle (optional): small text under the title
  //  featured (optional): true = highlighted button
  links: [
    { id: 'website',   title: 'My Website',        url: 'https://webguynick.com',              subtitle: 'webguynick.com', featured: true },
    { id: 'youtube',   title: 'YouTube',           url: 'https://youtube.com/@webguynick' },
    { id: 'instagram', title: 'Instagram',         url: 'https://instagram.com/webguynick' },
    { id: 'tiktok',    title: 'TikTok',            url: 'https://tiktok.com/@webguynick' },
    { id: 'x',         title: 'X (Twitter)',       url: 'https://x.com/webguynick' },
    { id: 'github',    title: 'GitHub',            url: 'https://github.com/webguynick' },
    { id: 'email',     title: 'Email Me',          url: 'mailto:nick@webguynick.com',          subtitle: 'nick@webguynick.com' },
  ],

  // ---- Small social icon row (bottom of page) -----------------------------
  //  Same tracking applies. `icon` matches a key in the built-in icon set
  //  (see public/... rendered inline): youtube, instagram, tiktok, x,
  //  github, linkedin, facebook, twitch, email, website.
  socials: [
    { id: 'social-youtube',   icon: 'youtube',   url: 'https://youtube.com/@webguynick' },
    { id: 'social-instagram', icon: 'instagram', url: 'https://instagram.com/webguynick' },
    { id: 'social-x',         icon: 'x',         url: 'https://x.com/webguynick' },
    { id: 'social-github',    icon: 'github',    url: 'https://github.com/webguynick' },
    { id: 'social-email',     icon: 'email',     url: 'mailto:nick@webguynick.com' },
  ],
};
