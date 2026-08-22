"""The one chokepoint for rich-text safety (ADR-0004, ADR-0001 revision).

Every card type's write path calls `sanitize_html` before a body ever reaches
the database, so a future sanitization fix lands once and covers every type.
`RichText.vue` on the frontend renders this output via `v-html` — the only
place in the SPA that does — on the assumption that nothing reaches it without
passing through here first.
"""

import nh3

# h1 is deliberately excluded: a card's own title is the page's H1, so the
# body starts at h2. The tag set is exactly what the Tiptap StarterKit +
# Link extensions can produce — no more, no less.
ALLOWED_TAGS = {
    'p', 'br', 'strong', 'em', 's', 'code',
    'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'hr', 'a',
}
ALLOWED_ATTRIBUTES = {'a': {'href'}}

# nh3 already defaults to rejecting javascript: links and adding
# rel="noopener noreferrer" — spelling the schemes out is defense-in-depth,
# not compensation for an unsafe default.
ALLOWED_URL_SCHEMES = {'http', 'https', 'mailto'}


def sanitize_html(raw_html: str) -> str:
    return nh3.clean(
        raw_html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        url_schemes=ALLOWED_URL_SCHEMES,
    )
