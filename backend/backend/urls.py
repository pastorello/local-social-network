from django.conf.urls.static import static
from django.conf import settings
from django.urls import path, include
from django.contrib import admin
from debug_toolbar.toolbar import debug_toolbar_urls

from account.views import activateemail

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('account.urls')),
    path('api/posts/', include('post.urls')),
    path('api/polls/', include('polls.urls')),
    path('activateemail/', activateemail, name='activateemail'),
]  + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if not settings.TESTING:
    from debug_toolbar.toolbar import debug_toolbar_urls

    urlpatterns = [
        *urlpatterns,
    ] + debug_toolbar_urls()
