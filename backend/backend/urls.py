from django.conf import settings
from django.urls import path, include, re_path
from django.contrib import admin

from common.media import serve_media

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('account.urls')),
    path('api/feste/', include('feste.urls')),
    path('api/chiese/', include('chiese.urls')),
    path('api/ricette/', include('ricette.urls')),
    path('api/personaggi/', include('personaggi.urls')),
    path('api/dialetto/', include('dialetto.urls')),
    path('api/map/', include('maps.urls')),
    path('api/polls/', include('polls.urls')),
    path('api/', include('reports.urls')),
    # Mounted in every environment, not only when DEBUG is false: the point of
    # one code path is that development exercises what production runs
    # (ADR-0007). The old `static()` helper silently did nothing outside DEBUG,
    # which is exactly how photos came to 404 on a deployment nobody had made
    # yet.
    re_path(
        r'^%s(?P<path>.*)$' % settings.MEDIA_URL.lstrip('/'),
        serve_media,
        name='media',
    ),
]

if settings.DEBUG and not settings.TESTING:
    from debug_toolbar.toolbar import debug_toolbar_urls

    urlpatterns = [
        *urlpatterns,
    ] + debug_toolbar_urls()
