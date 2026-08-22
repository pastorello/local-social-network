from content.sanitize import sanitize_html


def test_sanitize_strips_script_tags():
    assert '<script>' not in sanitize_html('<p>Hello</p><script>alert(1)</script>')


def test_sanitize_strips_event_handlers():
    result = sanitize_html('<p onclick="alert(1)">Hello</p>')
    assert 'onclick' not in result
    assert 'Hello' in result


def test_sanitize_strips_iframes():
    assert '<iframe' not in sanitize_html('<iframe src="https://evil.example"></iframe>')


def test_sanitize_strips_javascript_urls_but_keeps_the_link_text():
    result = sanitize_html('<a href="javascript:alert(1)">click me</a>')
    assert 'javascript:' not in result
    assert 'click me' in result


def test_sanitize_keeps_the_allowlisted_tags():
    result = sanitize_html('<p>Some <strong>bold</strong> and <em>italic</em> text.</p>')
    assert result == '<p>Some <strong>bold</strong> and <em>italic</em> text.</p>'


def test_sanitize_keeps_a_safe_link_and_adds_rel():
    result = sanitize_html('<a href="https://example.com">example</a>')
    assert 'href="https://example.com"' in result
    assert 'rel="noopener noreferrer"' in result


def test_sanitize_unwraps_disallowed_tags_but_keeps_their_text():
    # h1 is deliberately excluded — a card's own title is the page's H1.
    result = sanitize_html('<h1>Not allowed</h1>')
    assert '<h1>' not in result
    assert 'Not allowed' in result
