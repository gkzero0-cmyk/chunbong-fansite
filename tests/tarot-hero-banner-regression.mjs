import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const tarot = fs.readFileSync(new URL('tarot.html', root), 'utf8');
const styles = fs.readFileSync(new URL('tarot-hero-banner.css', root), 'utf8');

assert.match(tarot, /href="tarot-hero-banner\.css"/, 'tarot page should load the dedicated hero banner stylesheet');
assert.match(tarot, /class="page-hero tarot-hero"[\s\S]*class="tarot-hero-grid"/, 'tarot hero should use a two-column wrapper');
assert.doesNotMatch(tarot, /src="assets\/tarot-consult-banner\.webp"/, 'tarot hero must not use the invalid local WebP asset');
assert.match(tarot, /<img[^>]+class="tarot-hero-banner"[^>]+src="https:\/\/res\.cloudinary\.com\/lyppgyei\/image\/upload\/[^"]+"/, 'tarot hero should use a browser-decodable hosted image source');
assert.match(styles, /\.tarot-hero-grid\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:/s, 'tarot hero should lay out copy and banner side by side on desktop');
assert.match(styles, /@media\(max-width:\s*700px\)[\s\S]*\.tarot-hero-grid\s*\{[^}]*grid-template-columns:\s*1fr/s, 'tarot hero banner should stack under the copy on mobile');

console.log('tarot hero banner regression checks passed');
