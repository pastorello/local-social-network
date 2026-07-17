from django.conf.urls.static import static
from django.conf import settings
from django.urls import path, include
from django.contrib import admin

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('account.urls')),
    path('api/posts/', include('posts.urls')),
    path('api/polls/', include('polls.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/', include('reports.urls')),
]  + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if not settings.TESTING:
    from debug_toolbar.toolbar import debug_toolbar_urls

    urlpatterns = [
        *urlpatterns,
    ] + debug_toolbar_urls()
